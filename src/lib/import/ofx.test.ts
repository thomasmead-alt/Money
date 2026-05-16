import { describe, expect, it } from "vitest";
import { parseOfx } from "./ofx";

const SAMPLE = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260301
<TRNAMT>-12.99
<FITID>2026030100001
<NAME>Netflix
<MEMO>Monthly subscription
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260325
<TRNAMT>3450.00
<FITID>2026032500001
<NAME>ACME Ltd
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>
`;

describe("parseOfx", () => {
  it("extracts STMTTRN rows", () => {
    const result = parseOfx(SAMPLE, "sample.ofx");
    expect(result.transactions).toHaveLength(2);
    expect(result.transactions[0]).toMatchObject({
      amount: -1299,
      description: "Netflix",
      externalId: "ofx:2026030100001",
    });
    expect(result.transactions[1].amount).toBe(345_000);
  });
});
