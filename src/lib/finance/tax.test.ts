import { describe, expect, it } from "vitest";
import {
  daysRemainingInTaxYear,
  summariseAllowances,
  ukTaxYearBounds,
} from "./tax";

describe("ukTaxYearBounds", () => {
  it("returns 2026/27 in January 2027", () => {
    const b = ukTaxYearBounds(new Date("2027-01-15"));
    expect(b.label).toBe("2026/27");
    expect(b.start.toISOString().slice(0, 10)).toBe("2026-04-06");
    expect(b.end.toISOString().slice(0, 10)).toBe("2027-04-06");
  });

  it("returns 2026/27 on 6 Apr 2026 (start day)", () => {
    expect(ukTaxYearBounds(new Date("2026-04-06")).label).toBe("2026/27");
  });

  it("returns 2025/26 on 5 Apr 2026 (last day)", () => {
    expect(ukTaxYearBounds(new Date("2026-04-05")).label).toBe("2025/26");
  });
});

describe("daysRemainingInTaxYear", () => {
  it("computes positive days before year end", () => {
    expect(daysRemainingInTaxYear(new Date("2027-01-01"))).toBeGreaterThan(80);
  });
});

describe("summariseAllowances", () => {
  it("only counts transactions within the current tax year", () => {
    const inside = new Date("2026-05-10");
    const before = new Date("2026-03-10"); // last tax year
    const out = summariseAllowances(
      [
        { bucket: "ISA_CONTRIBUTION", amount: -500_000, date: inside },
        { bucket: "ISA_CONTRIBUTION", amount: -1_000_000, date: before },
      ],
      undefined,
      new Date("2026-06-01"),
    );
    const isa = out.find((r) => r.bucket === "ISA_CONTRIBUTION")!;
    expect(isa.used).toBe(500_000);
    expect(isa.txCount).toBe(1);
    expect(isa.remaining).toBe(20_000_00 - 500_000);
  });

  it("does not let same-category transfers cancel each other out", () => {
    // Tagging both sides of a transfer used to give £0 used because
    // -£500 + +£500 = 0. The fix is to only count outflows for ISA.
    const date = new Date("2026-05-01");
    const out = summariseAllowances(
      [
        { bucket: "ISA_CONTRIBUTION", amount: -500_00, date },
        { bucket: "ISA_CONTRIBUTION", amount: 500_00, date },
      ],
      undefined,
      new Date("2026-06-01"),
    );
    const isa = out.find((r) => r.bucket === "ISA_CONTRIBUTION")!;
    expect(isa.used).toBe(500_00);
    expect(isa.txCount).toBe(1);
  });

  it("caps percentUsed at 100", () => {
    const out = summariseAllowances(
      [
        {
          bucket: "DIVIDEND_INCOME",
          amount: 5_000_00,
          date: new Date("2026-06-01"),
        },
      ],
      undefined,
      new Date("2026-06-15"),
    );
    const dividend = out.find((r) => r.bucket === "DIVIDEND_INCOME")!;
    expect(dividend.percentUsed).toBe(100);
    expect(dividend.remaining).toBe(0);
  });
});
