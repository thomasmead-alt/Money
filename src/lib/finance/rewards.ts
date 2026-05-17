/**
 * Pick the best credit card for spending in a given category, given a list
 * of reward rules. A rule is applicable if either:
 *   - its categoryId matches, OR
 *   - its categoryId is null (everything-card)
 * and the rule has not expired.
 *
 * Ties broken by higher rate, then by no-cap (uncapped > capped).
 */

export interface RewardRuleInput {
  id: string;
  accountId: string;
  cardName: string;
  categoryId: string | null;
  ratePercent: number;
  monthlyCapPence: number | null;
  expiresAt: Date | null;
  isActive: boolean;
}

export interface BestCardForCategory {
  categoryId: string;
  categoryName: string;
  rule: RewardRuleInput | null;
  estimatedAnnualReward: number; // pence
}

export function bestCardForCategory(
  categoryId: string,
  rules: RewardRuleInput[],
  monthlySpendInCategoryPence: number,
  now: Date = new Date(),
): RewardRuleInput | null {
  const applicable = rules.filter((r) => {
    if (!r.isActive) return false;
    if (r.expiresAt && r.expiresAt < now) return false;
    return r.categoryId === categoryId || r.categoryId === null;
  });
  if (applicable.length === 0) return null;

  // Effective monthly reward = min(monthlySpend * rate, monthlyCap)
  const score = (r: RewardRuleInput): number => {
    const raw = monthlySpendInCategoryPence * (r.ratePercent / 100);
    const capped = r.monthlyCapPence != null
      ? Math.min(raw, r.monthlyCapPence)
      : raw;
    return capped;
  };

  applicable.sort((a, b) => {
    const sa = score(a);
    const sb = score(b);
    if (sa !== sb) return sb - sa;
    // tie-break: prefer category-specific over everything
    if ((a.categoryId == null) !== (b.categoryId == null)) {
      return a.categoryId == null ? 1 : -1;
    }
    return 0;
  });

  return applicable[0];
}

export function estimateAnnualReward(
  rule: RewardRuleInput,
  monthlySpendPence: number,
): number {
  const monthly =
    rule.monthlyCapPence != null
      ? Math.min(
          monthlySpendPence * (rule.ratePercent / 100),
          rule.monthlyCapPence,
        )
      : monthlySpendPence * (rule.ratePercent / 100);
  return Math.round(monthly * 12);
}
