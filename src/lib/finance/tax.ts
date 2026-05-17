import { differenceInCalendarDays } from "date-fns";

/**
 * The UK personal tax year runs 6 April → 5 April.
 */
export function ukTaxYearBounds(now: Date = new Date()): {
  start: Date;
  end: Date;
  label: string;
} {
  const year = now.getMonth() < 3 || (now.getMonth() === 3 && now.getDate() < 6)
    ? now.getFullYear() - 1
    : now.getFullYear();
  const start = new Date(year, 3, 6); // 6 April (months are 0-indexed → 3)
  const end = new Date(year + 1, 3, 6); // 6 April next year (exclusive)
  const label = `${year}/${String((year + 1) % 100).padStart(2, "0")}`;
  return { start, end, label };
}

export function daysRemainingInTaxYear(now: Date = new Date()): number {
  const { end } = ukTaxYearBounds(now);
  return Math.max(0, differenceInCalendarDays(end, now));
}

export type TaxBucket =
  | "ISA_CONTRIBUTION"
  | "PENSION_CONTRIBUTION"
  | "DIVIDEND_INCOME"
  | "SAVINGS_INTEREST"
  | "TAXABLE_GAINS";

export interface AllowanceConfig {
  isaAllowance: number; // pence
  pensionAnnualAllowance: number;
  dividendAllowance: number;
  savingsInterestAllowance: number; // PSA (basic-rate default)
  cgtAllowance: number;
}

// 2025/26+ UK allowances (correct as of writing; user-overridable in /tax).
export const DEFAULT_UK_ALLOWANCES: AllowanceConfig = {
  isaAllowance: 20_000_00,
  pensionAnnualAllowance: 60_000_00,
  dividendAllowance: 500_00,
  savingsInterestAllowance: 1_000_00,
  cgtAllowance: 3_000_00,
};

export interface AllowanceUsage {
  bucket: TaxBucket;
  label: string;
  cap: number;
  used: number;
  remaining: number;
  percentUsed: number;
  txCount: number;
}

interface TaggedTransaction {
  amount: number;
  date: Date;
  bucket: TaxBucket;
}

// Outflow buckets count only negative-amount transactions; income buckets
// count only positive. Stops same-category transfers (debit + credit) from
// cancelling each other out.
const SIGN_BY_BUCKET: Record<TaxBucket, "outflow" | "income"> = {
  ISA_CONTRIBUTION: "outflow",
  PENSION_CONTRIBUTION: "outflow",
  DIVIDEND_INCOME: "income",
  SAVINGS_INTEREST: "income",
  TAXABLE_GAINS: "income",
};

export function summariseAllowances(
  transactions: TaggedTransaction[],
  allowances: AllowanceConfig = DEFAULT_UK_ALLOWANCES,
  now: Date = new Date(),
): AllowanceUsage[] {
  const { start, end } = ukTaxYearBounds(now);
  const inYear = transactions.filter(
    (t) => t.date >= start && t.date < end,
  );

  const sumBy = (bucket: TaxBucket): { used: number; count: number } => {
    const direction = SIGN_BY_BUCKET[bucket];
    const rows = inYear.filter(
      (t) =>
        t.bucket === bucket &&
        (direction === "outflow" ? t.amount < 0 : t.amount > 0),
    );
    return {
      used: rows.reduce((s, r) => s + Math.abs(r.amount), 0),
      count: rows.length,
    };
  };

  const isa = sumBy("ISA_CONTRIBUTION");
  const pension = sumBy("PENSION_CONTRIBUTION");
  const dividend = sumBy("DIVIDEND_INCOME");
  const interest = sumBy("SAVINGS_INTEREST");
  const gains = sumBy("TAXABLE_GAINS");

  const build = (
    bucket: TaxBucket,
    label: string,
    cap: number,
    used: number,
    count: number,
  ): AllowanceUsage => ({
    bucket,
    label,
    cap,
    used,
    remaining: Math.max(0, cap - used),
    percentUsed: cap === 0 ? 0 : Math.min(100, (used / cap) * 100),
    txCount: count,
  });

  return [
    build(
      "ISA_CONTRIBUTION",
      "ISA allowance",
      allowances.isaAllowance,
      isa.used,
      isa.count,
    ),
    build(
      "PENSION_CONTRIBUTION",
      "Pension annual allowance",
      allowances.pensionAnnualAllowance,
      pension.used,
      pension.count,
    ),
    build(
      "DIVIDEND_INCOME",
      "Dividend allowance",
      allowances.dividendAllowance,
      dividend.used,
      dividend.count,
    ),
    build(
      "SAVINGS_INTEREST",
      "Savings interest (PSA)",
      allowances.savingsInterestAllowance,
      interest.used,
      interest.count,
    ),
    build(
      "TAXABLE_GAINS",
      "Capital gains exemption",
      allowances.cgtAllowance,
      gains.used,
      gains.count,
    ),
  ];
}
