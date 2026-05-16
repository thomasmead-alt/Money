import Papa from "papaparse";
import { parse as parseDateFn } from "date-fns";
import { createHash } from "node:crypto";
import type { BankCsvProfile } from "./types";
import type { ImportResult, ParsedTransaction } from "./types";
import { parseGBP } from "@/lib/money";

export function parseCsv(
  text: string,
  profile: BankCsvProfile,
  filename?: string,
): ImportResult {
  const result = Papa.parse<Record<string, string> | string[]>(text, {
    header: profile.hasHeader ?? true,
    delimiter: profile.delimiter ?? ",",
    skipEmptyLines: true,
  });

  const warnings: string[] = [];
  if (result.errors.length) {
    for (const e of result.errors.slice(0, 5)) {
      warnings.push(`Row ${e.row}: ${e.message}`);
    }
  }

  const transactions: ParsedTransaction[] = [];
  for (const row of result.data) {
    try {
      const tx = mapRow(row, profile);
      if (tx) transactions.push(tx);
    } catch (err) {
      warnings.push(
        `Could not parse row: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // Compute externalId hash per transaction for dedupe.
  for (const tx of transactions) {
    if (!tx.externalId) {
      const h = createHash("sha256");
      h.update(
        `${tx.date.toISOString().slice(0, 10)}|${tx.amount}|${normalise(
          tx.description,
        )}`,
      );
      tx.externalId = `csv:${h.digest("hex").slice(0, 24)}`;
    }
  }

  const rawHash = createHash("sha256").update(text).digest("hex");

  return {
    source: "CSV",
    filename,
    rowCount: transactions.length,
    duplicateCount: 0,
    transactions,
    rawHash,
    warnings,
  };
}

function mapRow(
  row: Record<string, string> | string[],
  profile: BankCsvProfile,
): ParsedTransaction | null {
  const get = (key: string, idx?: number): string => {
    if (Array.isArray(row)) {
      return idx != null ? (row[idx] ?? "") : "";
    }
    return (row[key] ?? "").trim();
  };

  const dateRaw = get(
    profile.dateColumn,
    profile.columnIndices?.date,
  );
  if (!dateRaw) return null;
  const date = parseDateFn(dateRaw, profile.dateFormat, new Date());
  if (Number.isNaN(date.getTime())) {
    throw new Error(`bad date "${dateRaw}"`);
  }

  const description = get(
    profile.descriptionColumn,
    profile.columnIndices?.description,
  );

  let amount = 0;
  if (profile.amountColumn) {
    const raw = get(profile.amountColumn, profile.columnIndices?.amount);
    amount = parseGBP(raw);
  } else if (profile.debitColumn || profile.creditColumn) {
    const debit = profile.debitColumn
      ? parseGBP(get(profile.debitColumn, profile.columnIndices?.debit))
      : 0;
    const credit = profile.creditColumn
      ? parseGBP(get(profile.creditColumn, profile.columnIndices?.credit))
      : 0;
    amount = credit - debit;
  }

  const merchant = profile.merchantColumn
    ? get(profile.merchantColumn, profile.columnIndices?.merchant)
    : undefined;

  return {
    date,
    amount,
    description: description || merchant || "(no description)",
    merchant: merchant || undefined,
  };
}

function normalise(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}
