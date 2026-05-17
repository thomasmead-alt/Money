import { describe, expect, it } from "vitest";
import {
  bestCardForCategory,
  estimateAnnualReward,
  type RewardRuleInput,
} from "./rewards";

const baseRule: Omit<RewardRuleInput, "id" | "accountId" | "cardName"> = {
  categoryId: null,
  ratePercent: 1,
  monthlyCapPence: null,
  expiresAt: null,
  isActive: true,
};

describe("bestCardForCategory", () => {
  it("picks the higher-rate card when both apply", () => {
    const rules: RewardRuleInput[] = [
      {
        ...baseRule,
        id: "a",
        accountId: "x",
        cardName: "Chase",
        ratePercent: 1,
      },
      {
        ...baseRule,
        id: "b",
        accountId: "y",
        cardName: "Amex",
        ratePercent: 4,
        categoryId: "groceries",
      },
    ];
    const best = bestCardForCategory("groceries", rules, 50_000);
    expect(best?.id).toBe("b");
  });

  it("respects monthly cap and switches to a lower-rate uncapped card if cap exceeded", () => {
    const rules: RewardRuleInput[] = [
      {
        ...baseRule,
        id: "amex",
        accountId: "amex",
        cardName: "Amex",
        ratePercent: 5,
        monthlyCapPence: 500, // cap at £5/mo
      },
      {
        ...baseRule,
        id: "chase",
        accountId: "chase",
        cardName: "Chase",
        ratePercent: 1,
      },
    ];
    // Spend £400/mo. Amex would give 5% × £400 = £20 capped at £5.
    // Chase would give 1% × £400 = £4. Amex still wins.
    expect(bestCardForCategory("any", rules, 40_000)?.id).toBe("amex");

    // Spend £600/mo. Amex still capped at £5. Chase 1% × £600 = £6 → wins.
    expect(bestCardForCategory("any", rules, 60_000)?.id).toBe("chase");
  });

  it("returns null when no rules are active", () => {
    expect(bestCardForCategory("x", [], 10_000)).toBeNull();
  });

  it("ignores expired rules", () => {
    const rules: RewardRuleInput[] = [
      {
        ...baseRule,
        id: "a",
        accountId: "x",
        cardName: "Old promo",
        ratePercent: 10,
        expiresAt: new Date("2020-01-01"),
      },
      {
        ...baseRule,
        id: "b",
        accountId: "y",
        cardName: "Chase",
        ratePercent: 1,
      },
    ];
    expect(bestCardForCategory("x", rules, 10_000)?.id).toBe("b");
  });

  it("prefers category-specific over everything-card on a tie", () => {
    const rules: RewardRuleInput[] = [
      {
        ...baseRule,
        id: "all",
        accountId: "a",
        cardName: "Everything",
        ratePercent: 2,
      },
      {
        ...baseRule,
        id: "groceries",
        accountId: "b",
        cardName: "Groceries card",
        ratePercent: 2,
        categoryId: "groceries",
      },
    ];
    expect(bestCardForCategory("groceries", rules, 30_000)?.id).toBe(
      "groceries",
    );
  });
});

describe("estimateAnnualReward", () => {
  it("multiplies monthly by 12", () => {
    const rule: RewardRuleInput = {
      ...baseRule,
      id: "x",
      accountId: "x",
      cardName: "Test",
      ratePercent: 2,
    };
    expect(estimateAnnualReward(rule, 50_000)).toBe(50_000 * 0.02 * 12);
  });

  it("respects monthly cap", () => {
    const rule: RewardRuleInput = {
      ...baseRule,
      id: "x",
      accountId: "x",
      cardName: "Test",
      ratePercent: 5,
      monthlyCapPence: 500,
    };
    // £500/mo * 5% = £25, capped at £5
    expect(estimateAnnualReward(rule, 50_000)).toBe(500 * 12);
  });
});
