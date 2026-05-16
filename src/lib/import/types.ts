/**
 * Generic import types — all sources (CSV, OFX, future GoCardless) produce
 * these to be merged into the database.
 */

export interface ParsedTransaction {
  date: Date;
  postedDate?: Date;
  amount: number; // pence, signed (negative = outflow)
  description: string;
  merchant?: string;
  externalId?: string; // FITID for OFX, hash-based for CSV
}

export interface ImportResult {
  source: "CSV" | "OFX" | "GOCARDLESS" | "MANUAL";
  filename?: string;
  rowCount: number;
  duplicateCount: number;
  transactions: ParsedTransaction[];
  rawHash: string;
  warnings: string[];
}

export interface BankCsvProfile {
  id: string;
  label: string; // shown in UI
  encoding?: "utf-8" | "latin1";
  delimiter?: string;
  hasHeader?: boolean;
  dateColumn: string;
  dateFormat: string; // date-fns format string
  descriptionColumn: string;
  amountColumn?: string; // signed amount, used if debit/credit not present
  debitColumn?: string;
  creditColumn?: string;
  merchantColumn?: string;
  // CSV column index fallbacks if no headers
  columnIndices?: {
    date?: number;
    description?: number;
    amount?: number;
    debit?: number;
    credit?: number;
    merchant?: number;
  };
}
