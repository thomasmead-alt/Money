// Money is stored as signed integer pence everywhere. Never use floats.
// Positive = inflow / credit balance. Negative = outflow / debit balance.

export type Pence = number;

export function poundsToPence(pounds: number): Pence {
  return Math.round(pounds * 100);
}

export function penceToPounds(pence: Pence): number {
  return pence / 100;
}

const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const gbpCompact = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatGBP(pence: Pence): string {
  return gbp.format(penceToPounds(pence));
}

export function formatGBPCompact(pence: Pence): string {
  return gbpCompact.format(penceToPounds(pence));
}

export function parseGBP(input: string): Pence {
  const cleaned = input.replace(/[£,\s]/g, "").trim();
  if (!cleaned || cleaned === "-" || cleaned === ".") return 0;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return 0;
  return poundsToPence(n);
}

export function sumPence(values: Iterable<Pence>): Pence {
  let total = 0;
  for (const v of values) total += v;
  return total;
}
