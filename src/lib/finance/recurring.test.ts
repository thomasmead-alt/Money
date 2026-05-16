import { describe, expect, it } from "vitest";
import { expandRecurring } from "./recurring";

describe("expandRecurring", () => {
  it("expands a daily rule", () => {
    const start = new Date("2026-01-01");
    const out = expandRecurring(
      {
        frequency: "DAILY",
        interval: 1,
        startDate: start,
        endDate: null,
        dayOfMonth: null,
        dayOfWeek: null,
        monthOfYear: null,
      },
      new Date("2026-01-05"),
      new Date("2026-01-10"),
    );
    expect(out.map((d) => d.toISOString().slice(0, 10))).toEqual([
      "2026-01-05",
      "2026-01-06",
      "2026-01-07",
      "2026-01-08",
      "2026-01-09",
      "2026-01-10",
    ]);
  });

  it("expands a monthly rule, clamping to last day of month for Feb", () => {
    const out = expandRecurring(
      {
        frequency: "MONTHLY",
        interval: 1,
        startDate: new Date("2026-01-31"),
        endDate: null,
        dayOfMonth: 31,
        dayOfWeek: null,
        monthOfYear: null,
      },
      new Date("2026-01-31"),
      new Date("2026-04-15"),
    );
    expect(out.map((d) => d.toISOString().slice(0, 10))).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
    ]);
  });

  it("expands an annual rule on a fixed month/day", () => {
    const out = expandRecurring(
      {
        frequency: "ANNUALLY",
        interval: 1,
        startDate: new Date("2025-04-15"),
        endDate: null,
        dayOfMonth: 15,
        dayOfWeek: null,
        monthOfYear: 4,
      },
      new Date("2025-01-01"),
      new Date("2027-12-31"),
    );
    expect(out.map((d) => d.toISOString().slice(0, 10))).toEqual([
      "2025-04-15",
      "2026-04-15",
      "2027-04-15",
    ]);
  });

  it("respects endDate", () => {
    const out = expandRecurring(
      {
        frequency: "WEEKLY",
        interval: 1,
        startDate: new Date("2026-01-05"),
        endDate: new Date("2026-01-19"),
        dayOfMonth: null,
        dayOfWeek: 1,
        monthOfYear: null,
      },
      new Date("2026-01-01"),
      new Date("2026-02-28"),
    );
    expect(out.map((d) => d.toISOString().slice(0, 10))).toEqual([
      "2026-01-05",
      "2026-01-12",
      "2026-01-19",
    ]);
  });

  it("returns empty when range is before startDate", () => {
    const out = expandRecurring(
      {
        frequency: "MONTHLY",
        interval: 1,
        startDate: new Date("2027-01-01"),
        endDate: null,
        dayOfMonth: 1,
        dayOfWeek: null,
        monthOfYear: null,
      },
      new Date("2026-01-01"),
      new Date("2026-06-01"),
    );
    expect(out).toEqual([]);
  });
});
