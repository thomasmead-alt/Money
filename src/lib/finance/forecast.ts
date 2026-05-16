import { db } from "@/lib/db";
import { addMonths, isBefore, startOfDay } from "date-fns";
import { expandRecurring } from "./recurring";

export interface ForecastEvent {
  date: Date;
  amount: number; // pence
  label: string;
  source: "RECURRING" | "ONEOFF" | "MORTGAGE";
  accountId: string;
}

export interface ForecastPoint {
  date: string; // ISO date
  balance: number; // pence
  negative: boolean;
  events: ForecastEvent[];
}

export interface AccountForecast {
  accountId: string;
  accountName: string;
  startBalance: number;
  points: ForecastPoint[];
  minBalance: number;
  minBalanceDate: string | null;
}

/**
 * Build per-account 12-month cash-flow projections by rolling forward all
 * committed recurring expenses, scheduled one-offs, and mortgage payments.
 */
export async function forecastAccounts(
  monthsAhead: number = 12,
  now: Date = startOfDay(new Date()),
): Promise<AccountForecast[]> {
  const horizonEnd = addMonths(now, monthsAhead);

  const accounts = await db.account.findMany({
    where: { archivedAt: null },
    include: {
      recurringExpenses: { where: { isActive: true } },
      scheduledOneOffs: {
        where: { paidAt: null, date: { gte: now, lte: horizonEnd } },
      },
      mortgageDetails: true,
    },
  });

  const forecasts: AccountForecast[] = [];

  for (const account of accounts) {
    const events: ForecastEvent[] = [];

    for (const r of account.recurringExpenses) {
      const occurrences = expandRecurring(
        {
          frequency: r.frequency,
          interval: r.interval,
          startDate: r.startDate,
          endDate: r.endDate,
          dayOfMonth: r.dayOfMonth,
          dayOfWeek: r.dayOfWeek,
          monthOfYear: r.monthOfYear,
        },
        now,
        horizonEnd,
      );
      for (const d of occurrences) {
        events.push({
          date: d,
          amount: r.amount,
          label: r.name,
          source: "RECURRING",
          accountId: account.id,
        });
      }
    }

    for (const o of account.scheduledOneOffs) {
      events.push({
        date: o.date,
        amount: o.amount,
        label: o.name,
        source: "ONEOFF",
        accountId: account.id,
      });
    }

    if (account.mortgageDetails) {
      const m = account.mortgageDetails;
      let d = new Date(now);
      d.setDate(m.paymentDay);
      if (isBefore(d, now)) d = addMonths(d, 1);
      while (isBefore(d, horizonEnd)) {
        events.push({
          date: new Date(d),
          amount: -m.monthlyPayment, // mortgage payment is an outflow from the linked account
          label: "Mortgage payment",
          source: "MORTGAGE",
          accountId: account.id,
        });
        d = addMonths(d, 1);
      }
    }

    events.sort((a, b) => a.date.getTime() - b.date.getTime());

    const points: ForecastPoint[] = [];
    let balance = account.currentBalance;
    let minBalance = balance;
    let minBalanceDate: string | null = null;

    // Anchor today
    points.push({
      date: now.toISOString().slice(0, 10),
      balance,
      negative: balance < 0,
      events: [],
    });

    // Group events by day to produce one point per day with events.
    const byDay = new Map<string, ForecastEvent[]>();
    for (const e of events) {
      const key = e.date.toISOString().slice(0, 10);
      const arr = byDay.get(key) ?? [];
      arr.push(e);
      byDay.set(key, arr);
    }
    const keys = Array.from(byDay.keys()).sort();
    for (const key of keys) {
      const dayEvents = byDay.get(key)!;
      const delta = dayEvents.reduce((s, e) => s + e.amount, 0);
      balance += delta;
      if (balance < minBalance) {
        minBalance = balance;
        minBalanceDate = key;
      }
      points.push({
        date: key,
        balance,
        negative: balance < (account.minBalanceAlert ?? 0),
        events: dayEvents,
      });
    }

    forecasts.push({
      accountId: account.id,
      accountName: account.name,
      startBalance: account.currentBalance,
      points,
      minBalance,
      minBalanceDate,
    });
  }

  return forecasts;
}

/**
 * Aggregate per-account forecasts into a single "total liquid" series across
 * CURRENT and SAVINGS accounts.
 */
export function aggregateLiquid(
  forecasts: AccountForecast[],
  liquidAccountIds: Set<string>,
): ForecastPoint[] {
  const liquid = forecasts.filter((f) => liquidAccountIds.has(f.accountId));
  const allDates = new Set<string>();
  for (const f of liquid) for (const p of f.points) allDates.add(p.date);
  const sortedDates = Array.from(allDates).sort();

  // Carry-forward latest known balance per account at each date.
  const lastBalance = new Map<string, number>();
  const result: ForecastPoint[] = [];
  for (const date of sortedDates) {
    for (const f of liquid) {
      const point = f.points.find((p) => p.date === date);
      if (point) lastBalance.set(f.accountId, point.balance);
    }
    let total = 0;
    for (const f of liquid) {
      total += lastBalance.get(f.accountId) ?? f.startBalance;
    }
    result.push({
      date,
      balance: total,
      negative: total < 0,
      events: [],
    });
  }
  return result;
}
