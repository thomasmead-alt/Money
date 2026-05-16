import { describe, expect, it } from "vitest";
import {
  amortisationSchedule,
  computeMonthlyPayment,
  summariseSchedule,
} from "./amortisation";

describe("computeMonthlyPayment", () => {
  it("matches the standard annuity formula", () => {
    // £200,000 at 5% over 25 years (300 months) ≈ £1,169.18 per month.
    const m = computeMonthlyPayment(20_000_000, 5, 300);
    // pence
    expect(m).toBeGreaterThan(116_800);
    expect(m).toBeLessThan(117_100);
  });

  it("handles zero rate", () => {
    expect(computeMonthlyPayment(120_000, 0, 12)).toBe(10_000);
  });
});

describe("amortisationSchedule", () => {
  it("repays the loan within the term", () => {
    const rows = amortisationSchedule({
      principal: 10_000_000, // £100,000
      annualRatePercent: 5,
      termMonths: 120, // 10 years
      startDate: new Date("2026-01-01"),
    });
    const summary = summariseSchedule(rows);
    expect(rows[rows.length - 1].closingBalance).toBe(0);
    expect(summary.termMonthsActual).toBeLessThanOrEqual(120);
    expect(summary.totalInterest).toBeGreaterThan(0);
  });

  it("overpayment shortens the term", () => {
    const noOverpay = amortisationSchedule({
      principal: 10_000_000,
      annualRatePercent: 5,
      termMonths: 120,
      startDate: new Date("2026-01-01"),
    });
    const overpay = amortisationSchedule({
      principal: 10_000_000,
      annualRatePercent: 5,
      termMonths: 120,
      startDate: new Date("2026-01-01"),
      overpaymentMonthly: 20_000, // £200/mo
    });
    expect(overpay.length).toBeLessThan(noOverpay.length);
  });
});
