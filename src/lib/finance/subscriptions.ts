import { differenceInDays } from "date-fns";

export interface SubscriptionCandidate {
  merchantKey: string; // normalised
  displayName: string; // human-readable
  averageAmount: number; // pence (signed; outflows negative)
  estimatedFrequency: "WEEKLY" | "MONTHLY" | "ANNUALLY";
  cadenceDays: number; // median interval between hits
  occurrences: number;
  totalSpend: number; // pence
  lastSeen: Date;
  firstSeen: Date;
  matchingTransactionIds: string[];
  confidence: number; // 0..1
}

interface InputTx {
  id: string;
  date: Date;
  amount: number;
  description: string;
  merchant: string | null;
}

/**
 * Detect recurring subscriptions from transaction history.
 *
 * Algorithm:
 *  1. Normalise each tx's merchant/description into a key (lowercase,
 *     strip punctuation, drop trailing locations/numbers).
 *  2. Cluster by key; keep clusters with >=3 hits and consistent amounts
 *     (within £2 or 15% tolerance).
 *  3. Compute median interval; classify as WEEKLY (5-9d), MONTHLY (25-35d),
 *     or ANNUALLY (350-380d). Anything else is rejected.
 *  4. Score confidence by amount-variance, interval-variance, and recency.
 */
export function detectSubscriptions(
  transactions: InputTx[],
  now: Date = new Date(),
): SubscriptionCandidate[] {
  const byKey = new Map<string, InputTx[]>();
  for (const tx of transactions) {
    if (tx.amount >= 0) continue; // subscriptions are outflows
    const key = normaliseMerchant(tx.merchant ?? tx.description);
    if (!key) continue;
    const arr = byKey.get(key) ?? [];
    arr.push(tx);
    byKey.set(key, arr);
  }

  const candidates: SubscriptionCandidate[] = [];
  for (const [key, txs] of byKey) {
    if (txs.length < 3) continue;
    txs.sort((a, b) => a.date.getTime() - b.date.getTime());

    const amounts = txs.map((t) => t.amount);
    const avg = Math.round(
      amounts.reduce((s, a) => s + a, 0) / amounts.length,
    );
    if (!amountsConsistent(amounts, avg)) continue;

    const intervals = pairIntervals(txs);
    if (intervals.length < 2) continue;
    const cadence = median(intervals);

    const freq = classifyCadence(cadence);
    if (!freq) continue;

    const variance = stdDev(intervals);
    const recency = differenceInDays(now, txs[txs.length - 1].date);
    const recencyPenalty = recency > 60 ? 0.5 : recency > 35 ? 0.2 : 0;
    const intervalConsistency = Math.max(
      0,
      1 - variance / Math.max(1, cadence) / 2,
    );
    const amountConsistency = Math.max(
      0,
      1 - amountVariance(amounts, avg),
    );
    const confidence = Math.max(
      0,
      Math.min(
        1,
        0.5 * intervalConsistency + 0.5 * amountConsistency - recencyPenalty,
      ),
    );

    candidates.push({
      merchantKey: key,
      displayName: humanLabel(txs[0]),
      averageAmount: avg,
      estimatedFrequency: freq,
      cadenceDays: Math.round(cadence),
      occurrences: txs.length,
      totalSpend: amounts.reduce((s, a) => s + a, 0),
      lastSeen: txs[txs.length - 1].date,
      firstSeen: txs[0].date,
      matchingTransactionIds: txs.map((t) => t.id),
      confidence,
    });
  }

  return candidates.sort((a, b) => b.confidence - a.confidence);
}

export function normaliseMerchant(raw: string): string {
  return raw
    .toLowerCase()
    // strip card-acquirer noise
    .replace(/\b(card payment to|faster payment to|direct debit to|dd to|payment to|to )\b/g, "")
    // punctuation → space
    .replace(/[^a-z0-9 ]+/g, " ")
    // drop any standalone numeric token (refs, dates, phone fragments)
    .replace(/\b\d+\b/g, "")
    // strip common location / corporate suffixes
    .replace(/\b(uk|gb|london|gbr|ldn|onl|online|web|ref|ltd|limited)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function humanLabel(tx: InputTx): string {
  const source = tx.merchant ?? tx.description;
  return source
    .split(/\s+/)
    .slice(0, 4)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function pairIntervals(txs: InputTx[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < txs.length; i++) {
    out.push(differenceInDays(txs[i].date, txs[i - 1].date));
  }
  return out;
}

function median(xs: number[]): number {
  const s = xs.slice().sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function stdDev(xs: number[]): number {
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const v =
    xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length;
  return Math.sqrt(v);
}

function amountsConsistent(amounts: number[], avg: number): boolean {
  const tolerance = Math.max(200, Math.abs(avg) * 0.15); // £2 or 15%
  return amounts.every((a) => Math.abs(a - avg) <= tolerance);
}

function amountVariance(amounts: number[], avg: number): number {
  if (avg === 0) return 0;
  const maxDev = Math.max(...amounts.map((a) => Math.abs(a - avg)));
  return maxDev / Math.abs(avg);
}

function classifyCadence(
  days: number,
): "WEEKLY" | "MONTHLY" | "ANNUALLY" | null {
  if (days >= 5 && days <= 9) return "WEEKLY";
  if (days >= 25 && days <= 35) return "MONTHLY";
  if (days >= 350 && days <= 380) return "ANNUALLY";
  // fortnightly approximation → treat as weekly for now
  if (days >= 12 && days <= 16) return "WEEKLY";
  return null;
}
