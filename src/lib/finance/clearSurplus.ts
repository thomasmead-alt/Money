import { db } from "@/lib/db";
import { addDays, endOfMonth, startOfDay } from "date-fns";
import { expandRecurring } from "./recurring";

export type HorizonKind = "PAYDAY" | "MONTH" | "DAYS_30" | "DAYS_60";

export interface ClearSurplus {
  horizonEnd: Date;
  clearedSpendingBalance: number;
  committedOutflows: number; // negative
  pendingOutflows: number; // negative
  upcomingCount: number;
  surplus: number; // pence
}

/**
 * "Budget on clear" — what's actually free to spend after every committed
 * outflow between now and the chosen horizon. All values in pence.
 *
 * Only CURRENT and SAVINGS accounts contribute to the cleared balance;
 * credit cards and mortgages are liabilities and are excluded.
 */
export async function computeClearSurplus(
  horizon: HorizonKind = "MONTH",
  now: Date = new Date(),
): Promise<ClearSurplus> {
  const horizonEnd = computeHorizonEnd(horizon, now);

  const spendingAccounts = await db.account.findMany({
    where: {
      type: { in: ["CURRENT", "SAVINGS"] },
      archivedAt: null,
    },
    select: { id: true, currentBalance: true },
  });

  const clearedSpendingBalance = spendingAccounts.reduce(
    (s, a) => s + a.currentBalance,
    0,
  );

  // Pending transactions (already booked but not cleared) on those accounts.
  const accountIds = spendingAccounts.map((a) => a.id);
  const pending = await db.transaction.aggregate({
    where: { accountId: { in: accountIds }, status: "PENDING" },
    _sum: { amount: true },
  });
  const pendingOutflows = Math.min(0, pending._sum.amount ?? 0);

  // Committed recurring expenses expanded into the horizon.
  const recurring = await db.recurringExpense.findMany({
    where: { isCommitted: true, isActive: true, accountId: { in: accountIds } },
  });
  let recurringOutflow = 0;
  let recurringCount = 0;
  for (const r of recurring) {
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
    recurringCount += occurrences.length;
    recurringOutflow += occurrences.length * Math.min(0, r.amount);
  }

  // Scheduled one-offs within horizon.
  const oneOffs = await db.scheduledOneOff.findMany({
    where: {
      isCommitted: true,
      paidAt: null,
      accountId: { in: accountIds },
      date: { gte: startOfDay(now), lte: horizonEnd },
    },
    select: { amount: true },
  });
  const oneOffOutflow = oneOffs
    .map((o) => Math.min(0, o.amount))
    .reduce((s, a) => s + a, 0);

  const committedOutflows = recurringOutflow + oneOffOutflow;

  const surplus =
    clearedSpendingBalance + committedOutflows + pendingOutflows;

  return {
    horizonEnd,
    clearedSpendingBalance,
    committedOutflows,
    pendingOutflows,
    upcomingCount: recurringCount + oneOffs.length,
    surplus,
  };
}

function computeHorizonEnd(horizon: HorizonKind, now: Date): Date {
  switch (horizon) {
    case "MONTH":
      return endOfMonth(now);
    case "DAYS_30":
      return addDays(now, 30);
    case "DAYS_60":
      return addDays(now, 60);
    case "PAYDAY":
      // Heuristic: 25th of the month or next 25th if past. Settings-overridable later.
      {
        const d = new Date(now);
        d.setDate(25);
        if (d.getTime() < now.getTime()) {
          d.setMonth(d.getMonth() + 1);
        }
        return d;
      }
  }
}
