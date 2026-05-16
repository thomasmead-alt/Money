import { describe, expect, it } from "vitest";
import { formatGBP, parseGBP, poundsToPence, sumPence } from "./money";

describe("money helpers", () => {
  it("converts pounds to pence without float drift", () => {
    expect(poundsToPence(10.1)).toBe(1010);
    expect(poundsToPence(-3.5)).toBe(-350);
    expect(poundsToPence(0.1 + 0.2)).toBe(30);
  });

  it("parses GBP strings tolerantly", () => {
    expect(parseGBP("£12.34")).toBe(1234);
    expect(parseGBP("12,345.67")).toBe(1234567);
    expect(parseGBP("-50")).toBe(-5000);
    expect(parseGBP("  £-7.50 ")).toBe(-750);
    expect(parseGBP("")).toBe(0);
  });

  it("formats negatives with proper sign", () => {
    expect(formatGBP(-1234)).toMatch(/-£12\.34/);
  });

  it("sums pence", () => {
    expect(sumPence([100, 200, -50])).toBe(250);
  });
});
