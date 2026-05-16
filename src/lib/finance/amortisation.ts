import { addMonths } from "date-fns";

export interface AmortisationInput {
  principal: number; // pence
  annualRatePercent: number; // e.g. 4.25
  termMonths: number;
  startDate: Date;
  monthlyPayment?: number; // pence; if omitted, computed from annuity formula
  rateChanges?: Array<{ effectiveDate: Date; annualRatePercent: number }>;
  overpaymentMonthly?: number; // pence; extra principal each month
}

export interface AmortisationRow {
  month: number;
  date: Date;
  openingBalance: number;
  interest: number;
  principal: number;
  overpayment: number;
  payment: number;
  closingBalance: number;
}

/**
 * Standard mortgage amortisation. All inputs in pence; rate in percent.
 * Supports stepped rate changes (e.g. fixed → SVR) and a flat monthly overpayment.
 */
export function amortisationSchedule(
  input: AmortisationInput,
): AmortisationRow[] {
  const rateChanges = (input.rateChanges ?? [])
    .slice()
    .sort((a, b) => a.effectiveDate.getTime() - b.effectiveDate.getTime());

  const rows: AmortisationRow[] = [];
  let balance = input.principal;
  let rate = input.annualRatePercent;
  let payment = input.monthlyPayment ?? computeMonthlyPayment(
    input.principal,
    rate,
    input.termMonths,
  );

  for (let m = 1; m <= input.termMonths && balance > 0; m++) {
    const date = addMonths(input.startDate, m - 1);

    // Apply any rate change effective on or before this month.
    while (
      rateChanges.length > 0 &&
      rateChanges[0].effectiveDate.getTime() <= date.getTime()
    ) {
      const change = rateChanges.shift()!;
      rate = change.annualRatePercent;
      // Recompute payment to clear remaining balance over remaining term.
      const remaining = input.termMonths - (m - 1);
      payment = computeMonthlyPayment(balance, rate, remaining);
    }

    const monthlyRate = rate / 100 / 12;
    const interest = Math.round(balance * monthlyRate);
    let principalPaid = payment - interest;
    let overpayment = input.overpaymentMonthly ?? 0;

    if (principalPaid + overpayment > balance) {
      // Final payment — only pay off the balance.
      principalPaid = Math.max(0, balance);
      overpayment = 0;
    }
    const opening = balance;
    balance = Math.max(0, balance - principalPaid - overpayment);

    rows.push({
      month: m,
      date,
      openingBalance: opening,
      interest,
      principal: principalPaid,
      overpayment,
      payment: principalPaid + interest,
      closingBalance: balance,
    });

    if (balance === 0) break;
  }

  return rows;
}

/**
 * Standard annuity payment formula. principal P, monthly rate r, term n:
 *   M = P * r / (1 - (1+r)^-n)
 * Returns pence rounded.
 */
export function computeMonthlyPayment(
  principalPence: number,
  annualRatePercent: number,
  termMonths: number,
): number {
  if (termMonths <= 0) return principalPence;
  const r = annualRatePercent / 100 / 12;
  if (r === 0) return Math.round(principalPence / termMonths);
  const m = (principalPence * r) / (1 - Math.pow(1 + r, -termMonths));
  return Math.round(m);
}

export interface AmortisationSummary {
  totalInterest: number;
  totalPaid: number;
  payoffDate: Date;
  termMonthsActual: number;
}

export function summariseSchedule(rows: AmortisationRow[]): AmortisationSummary {
  const totalInterest = rows.reduce((s, r) => s + r.interest, 0);
  const totalPaid = rows.reduce(
    (s, r) => s + r.payment + r.overpayment,
    0,
  );
  return {
    totalInterest,
    totalPaid,
    payoffDate: rows[rows.length - 1]?.date ?? new Date(),
    termMonthsActual: rows.length,
  };
}
