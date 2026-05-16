import { db } from "@/lib/db";
import type { ImportResult } from "./types";

/**
 * Persist a parsed ImportResult to the DB:
 *  - Create an ImportBatch
 *  - Insert new transactions, skipping rows whose externalId already exists
 *  - Recompute the account's cached currentBalance
 *
 * Re-importing the same file is a no-op: the rawHash matches a prior batch.
 */
export async function persistImport(
  accountId: string,
  result: ImportResult,
): Promise<{
  batchId: string | null;
  inserted: number;
  duplicates: number;
  duplicateFile: boolean;
  warnings: string[];
}> {
  const existing = await db.importBatch.findFirst({
    where: { accountId, rawHash: result.rawHash },
    select: { id: true },
  });
  if (existing) {
    return {
      batchId: existing.id,
      inserted: 0,
      duplicates: result.transactions.length,
      duplicateFile: true,
      warnings: [
        ...result.warnings,
        "This exact file has been imported before — no rows added.",
      ],
    };
  }

  const batch = await db.importBatch.create({
    data: {
      accountId,
      source: result.source,
      filename: result.filename,
      rowCount: result.transactions.length,
      rawHash: result.rawHash,
    },
  });

  let inserted = 0;
  let duplicates = 0;

  for (const tx of result.transactions) {
    try {
      await db.transaction.create({
        data: {
          accountId,
          date: tx.date,
          postedDate: tx.postedDate ?? null,
          amount: tx.amount,
          description: tx.description,
          merchant: tx.merchant ?? null,
          externalId: tx.externalId ?? null,
          importBatchId: batch.id,
          status: "CLEARED",
        },
      });
      inserted++;
    } catch (err) {
      // Unique (accountId, externalId) violation → existing row, count as dupe.
      if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
        duplicates++;
      } else {
        throw err;
      }
    }
  }

  await db.importBatch.update({
    where: { id: batch.id },
    data: { duplicateCount: duplicates, rowCount: inserted },
  });

  await recalculateBalance(accountId);

  return {
    batchId: batch.id,
    inserted,
    duplicates,
    duplicateFile: false,
    warnings: result.warnings,
  };
}

export async function recalculateBalance(accountId: string): Promise<number> {
  const account = await db.account.findUnique({
    where: { id: accountId },
    select: { openingBalance: true },
  });
  if (!account) return 0;
  const agg = await db.transaction.aggregate({
    where: { accountId },
    _sum: { amount: true },
  });
  const total = account.openingBalance + (agg._sum.amount ?? 0);
  await db.account.update({
    where: { id: accountId },
    data: { currentBalance: total },
  });
  return total;
}
