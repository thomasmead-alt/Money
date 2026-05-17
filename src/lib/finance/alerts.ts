import { db } from "@/lib/db";
import { addDays, differenceInDays } from "date-fns";
import { expandRecurring } from "./recurring";
import { forecastAccounts, aggregateLiquid } from "./forecast";

export type AlertSeverity = "info" | "warning" | "critical";

export interface Alert {
  id: string;
  severity: AlertSeverity;
  title: string;
  detail: string;
  href?: string;
  dueAt?: Date;
}

/**
 * Collect smart alerts for the dashboard:
 *  - Direct debit due within N days where the linked account won't cover it.
 *  - Credit-card promo rate ending in <60 days.
 *  - Mortgage rate ending in <180 days.
 *  - 12-month forecast dips below the account's minBalanceAlert.
 */
export async function collectAlerts(now: Date = new Date()): Promise<Alert[]> {
  const alerts: Alert[] = [];
  const horizon = addDays(now, 14);

  const accounts = await db.account.findMany({
    where: { archivedAt: null },
    include: {
      mortgageDetails: true,
      creditCardOffers: { where: { status: "ACTIVE" } },
      recurringExpenses: {
        where: { isActive: true, isCommitted: true },
      },
      scheduledOneOffs: {
        where: { paidAt: null, date: { gte: now, lte: horizon } },
      },
    },
  });

  // Per spending account, see if the next 14 days of committed outflows would
  // dip the running balance below zero.
  for (const account of accounts) {
    if (account.type !== "CURRENT" && account.type !== "SAVINGS") continue;
    const events: Array<{ date: Date; amount: number; label: string }> = [];
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
        horizon,
      );
      for (const d of occurrences) {
        events.push({ date: d, amount: r.amount, label: r.name });
      }
    }
    for (const o of account.scheduledOneOffs) {
      events.push({ date: o.date, amount: o.amount, label: o.name });
    }
    events.sort((a, b) => a.date.getTime() - b.date.getTime());

    let balance = account.currentBalance;
    let firstDip: { date: Date; label: string; balance: number } | null = null;
    for (const e of events) {
      balance += e.amount;
      if (balance < 0 && !firstDip) {
        firstDip = { date: e.date, label: e.label, balance };
      }
    }
    if (firstDip) {
      alerts.push({
        id: `low-balance:${account.id}`,
        severity: "critical",
        title: `${account.name} could go overdrawn`,
        detail: `${firstDip.label} on ${firstDip.date.toLocaleDateString(
          "en-GB",
          { day: "numeric", month: "short" },
        )} would take the balance to ${formatPence(firstDip.balance)}.`,
        href: `/accounts/${account.id}`,
        dueAt: firstDip.date,
      });
    }
  }

  // Promo offers ending soon
  for (const account of accounts) {
    for (const offer of account.creditCardOffers) {
      const days = differenceInDays(offer.promoEndDate, now);
      if (days < 0) continue;
      if (days <= 60) {
        alerts.push({
          id: `promo-expiry:${offer.id}`,
          severity: days <= 21 ? "critical" : "warning",
          title: `${account.name}: ${offerLabel(offer.offerType)} ends in ${days} day${days === 1 ? "" : "s"}`,
          detail: `${formatPence(offer.amount)} currently on promo at ${offer.promoApr}% — reverts to ${offer.postPromoApr}% on ${offer.promoEndDate.toLocaleDateString(
            "en-GB",
            { day: "numeric", month: "short", year: "numeric" },
          )}.`,
          href: `/credit-cards`,
          dueAt: offer.promoEndDate,
        });
      }
    }
  }

  // Mortgage rate ending
  for (const account of accounts) {
    const m = account.mortgageDetails;
    if (!m?.rateEndDate) continue;
    const days = differenceInDays(m.rateEndDate, now);
    if (days < 0 || days > 180) continue;
    alerts.push({
      id: `mortgage-rate-end:${m.id}`,
      severity: days <= 60 ? "warning" : "info",
      title: `${account.name} rate ends in ${days} days`,
      detail: `Your ${m.rateType.toLowerCase()} rate of ${m.currentRate}% ends on ${m.rateEndDate.toLocaleDateString(
        "en-GB",
        { day: "numeric", month: "short", year: "numeric" },
      )}. Start shopping for a remortgage if you haven't already.`,
      href: `/mortgage`,
      dueAt: m.rateEndDate,
    });
  }

  // 12-month forecast dips below configured minBalanceAlert
  const forecasts = await forecastAccounts(12, now);
  const liquidIds = new Set(
    accounts
      .filter((a) => a.type === "CURRENT" || a.type === "SAVINGS")
      .map((a) => a.id),
  );
  const liquid = aggregateLiquid(forecasts, liquidIds);
  const lowest = liquid.length
    ? liquid.reduce((m, p) => (p.balance < m.balance ? p : m), liquid[0])
    : null;
  if (lowest && lowest.balance < 0) {
    alerts.push({
      id: `forecast-negative`,
      severity: "warning",
      title: "Forecast goes negative within 12 months",
      detail: `Total liquid cash dips to ${formatPence(
        lowest.balance,
      )} around ${new Date(lowest.date).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })}.`,
      href: "/forecast",
      dueAt: new Date(lowest.date),
    });
  }

  // Sort by severity then date
  const order: Record<AlertSeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };
  return alerts.sort((a, b) => {
    if (order[a.severity] !== order[b.severity])
      return order[a.severity] - order[b.severity];
    return (a.dueAt?.getTime() ?? 0) - (b.dueAt?.getTime() ?? 0);
  });
}

function offerLabel(type: string): string {
  if (type === "BALANCE_TRANSFER") return "0% balance transfer";
  if (type === "PURCHASE") return "0% purchase promo";
  if (type === "MONEY_TRANSFER") return "money-transfer promo";
  return type;
}

function formatPence(p: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(p / 100);
}
