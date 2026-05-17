import { db } from "@/lib/db";
import {
  addMonths,
  endOfMonth,
  startOfMonth,
  subMonths,
  format,
} from "date-fns";

export interface NetWorthPoint {
  date: string; // ISO yyyy-MM
  liquid: number;
  debts: number;
  netWorth: number;
}

/**
 * Reconstruct net worth at month-end going back N months by walking the
 * transaction ledger forwards from each account's openingBalance.
 *
 * Excludes archived accounts and respects includeInNetWorth.
 */
export async function netWorthSeries(
  monthsBack: number = 12,
  now: Date = new Date(),
): Promise<NetWorthPoint[]> {
  const accounts = await db.account.findMany({
    where: { archivedAt: null },
  });
  const accountIds = accounts.map((a) => a.id);

  const txs = await db.transaction.findMany({
    where: { accountId: { in: accountIds } },
    select: { accountId: true, date: true, amount: true },
    orderBy: { date: "asc" },
  });

  const txByAccount = new Map<string, { date: Date; amount: number }[]>();
  for (const tx of txs) {
    const arr = txByAccount.get(tx.accountId) ?? [];
    arr.push(tx);
    txByAccount.set(tx.accountId, arr);
  }

  const points: NetWorthPoint[] = [];
  for (let i = monthsBack; i >= 0; i--) {
    const monthEnd = endOfMonth(subMonths(now, i));
    let liquid = 0;
    let debts = 0;
    for (const account of accounts) {
      let balance = account.openingBalance;
      const list = txByAccount.get(account.id) ?? [];
      for (const tx of list) {
        if (tx.date.getTime() <= monthEnd.getTime()) balance += tx.amount;
        else break;
      }
      if (!account.includeInNetWorth) continue;
      if (account.type === "CURRENT" || account.type === "SAVINGS") {
        liquid += balance;
      } else {
        debts += balance;
      }
    }
    points.push({
      date: format(monthEnd, "yyyy-MM"),
      liquid,
      debts,
      netWorth: liquid + debts,
    });
  }
  return points;
}

export interface CategorySpendRow {
  categoryId: string | null;
  categoryName: string;
  months: { month: string; spend: number }[]; // outflows as positive pence
  total: number;
}

export async function spendByCategoryOverTime(
  monthsBack: number = 6,
  now: Date = new Date(),
): Promise<CategorySpendRow[]> {
  const from = startOfMonth(subMonths(now, monthsBack - 1));
  const to = endOfMonth(now);
  const months: string[] = [];
  for (let i = 0; i < monthsBack; i++) {
    months.push(format(addMonths(from, i), "yyyy-MM"));
  }

  const txs = await db.transaction.findMany({
    where: { date: { gte: from, lte: to }, amount: { lt: 0 } },
    include: { category: true },
  });

  const byCategory = new Map<string | null, CategorySpendRow>();
  for (const tx of txs) {
    const key = tx.category?.id ?? null;
    const name = tx.category?.name ?? "Uncategorised";
    const row = byCategory.get(key) ?? {
      categoryId: key,
      categoryName: name,
      months: months.map((m) => ({ month: m, spend: 0 })),
      total: 0,
    };
    const monthKey = format(tx.date, "yyyy-MM");
    const m = row.months.find((x) => x.month === monthKey);
    if (m) m.spend += Math.abs(tx.amount);
    row.total += Math.abs(tx.amount);
    byCategory.set(key, row);
  }

  return Array.from(byCategory.values()).sort((a, b) => b.total - a.total);
}
