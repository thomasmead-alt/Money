import { describe, expect, it } from "vitest";
import {
  optimiseBalanceTransfers,
  type DebtSource,
  type DestinationOffer,
} from "./balanceTransfer";

describe("optimiseBalanceTransfers", () => {
  it("moves expensive debt to a 0% offer when there is headroom", () => {
    const sources: DebtSource[] = [
      { accountId: "a", name: "Expensive card", balance: 200_000, apr: 24.9 },
    ];
    const offers: DestinationOffer[] = [
      {
        offerId: "o1",
        accountId: "b",
        name: "New 0% BT",
        availableHeadroom: 500_000,
        feePercent: 2.99,
        promoApr: 0,
        promoMonths: 21,
      },
    ];
    const result = optimiseBalanceTransfers(sources, offers);
    expect(result.moves).toHaveLength(1);
    expect(result.moves[0].amount).toBe(200_000);
    expect(result.unmovedDebt).toBe(0);
    expect(result.totalSaving).toBeGreaterThan(0);
  });

  it("refuses to move debt to the same account", () => {
    const result = optimiseBalanceTransfers(
      [{ accountId: "a", name: "A", balance: 100_000, apr: 22 }],
      [
        {
          offerId: "o1",
          accountId: "a",
          name: "Same card",
          availableHeadroom: 500_000,
          feePercent: 0,
          promoApr: 0,
          promoMonths: 12,
        },
      ],
    );
    expect(result.moves).toHaveLength(0);
    expect(result.unmovedDebt).toBe(100_000);
  });

  it("warns when offer headroom is insufficient", () => {
    const result = optimiseBalanceTransfers(
      [{ accountId: "a", name: "A", balance: 1_000_000, apr: 22 }],
      [
        {
          offerId: "o1",
          accountId: "b",
          name: "Small offer",
          availableHeadroom: 100_000,
          feePercent: 2,
          promoApr: 0,
          promoMonths: 18,
        },
      ],
    );
    // 5% buffer means only ~95,000 will actually be moved.
    expect(result.moves[0].amount).toBeLessThanOrEqual(95_000);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.unmovedDebt).toBeGreaterThan(0);
  });
});
