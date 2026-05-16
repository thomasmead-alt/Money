import { describe, expect, it } from "vitest";
import { parseCsv } from "./csv";
import { monzoProfile } from "./profiles";

const SAMPLE = `Transaction ID,Date,Time,Type,Name,Emoji,Category,Amount,Currency,Local amount,Local currency,Notes and #tags,Address,Receipt,Description,Category split
tx_1,01/03/2026,12:00:00,Card payment,Tesco,🛒,Groceries,-22.50,GBP,-22.50,GBP,,,,Tesco superstore,
tx_2,02/03/2026,09:15:00,Faster payment,Salary,💷,Income,3450.00,GBP,3450.00,GBP,,,,Salary ACME,
`;

describe("parseCsv (Monzo)", () => {
  it("parses rows and applies signed amount", () => {
    const out = parseCsv(SAMPLE, monzoProfile, "monzo.csv");
    expect(out.transactions).toHaveLength(2);
    expect(out.transactions[0].amount).toBe(-2250);
    expect(out.transactions[1].amount).toBe(345_000);
    expect(out.transactions[0].externalId).toMatch(/^csv:/);
  });

  it("produces deterministic dedupe hashes", () => {
    const out1 = parseCsv(SAMPLE, monzoProfile);
    const out2 = parseCsv(SAMPLE, monzoProfile);
    expect(out1.transactions[0].externalId).toBe(
      out2.transactions[0].externalId,
    );
    expect(out1.rawHash).toBe(out2.rawHash);
  });
});
