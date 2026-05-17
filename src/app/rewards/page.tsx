import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Card } from "@/components/Card";
import { Money } from "@/components/Money";
import { parseGBP } from "@/lib/money";
import {
  bestCardForCategory,
  estimateAnnualReward,
  type RewardRuleInput,
} from "@/lib/finance/rewards";

export const dynamic = "force-dynamic";

export default async function RewardsPage() {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

  const [cards, categories, rules, recentSpend] = await Promise.all([
    db.account.findMany({
      where: { type: "CREDIT_CARD", archivedAt: null },
      orderBy: { name: "asc" },
    }),
    db.category.findMany({
      where: { kind: "EXPENSE" },
      orderBy: { name: "asc" },
    }),
    db.cardRewardRule.findMany({
      include: { account: true, category: true },
      orderBy: { ratePercent: "desc" },
    }),
    db.transaction.groupBy({
      by: ["categoryId"],
      where: {
        date: { gte: sixMonthsAgo },
        amount: { lt: 0 },
        categoryId: { not: null },
      },
      _sum: { amount: true },
    }),
  ]);

  const monthlySpendByCategoryId = new Map<string, number>();
  for (const row of recentSpend) {
    if (!row.categoryId) continue;
    monthlySpendByCategoryId.set(
      row.categoryId,
      Math.round(Math.abs(row._sum.amount ?? 0) / 6),
    );
  }

  const inputRules: RewardRuleInput[] = rules.map((r) => ({
    id: r.id,
    accountId: r.accountId,
    cardName: r.account.name,
    categoryId: r.categoryId,
    ratePercent: r.ratePercent,
    monthlyCapPence: r.monthlyCapPence,
    expiresAt: r.expiresAt,
    isActive: r.isActive,
  }));

  type Suggestion = {
    categoryId: string;
    categoryName: string;
    monthlySpend: number;
    bestRule: RewardRuleInput | null;
    annualReward: number;
  };

  const suggestions: Suggestion[] = categories.map((c) => {
    const monthlySpend = monthlySpendByCategoryId.get(c.id) ?? 0;
    const best = bestCardForCategory(c.id, inputRules, monthlySpend, now);
    return {
      categoryId: c.id,
      categoryName: c.name,
      monthlySpend,
      bestRule: best,
      annualReward: best ? estimateAnnualReward(best, monthlySpend) : 0,
    };
  });
  suggestions.sort((a, b) => b.annualReward - a.annualReward);
  const totalAnnualReward = suggestions.reduce(
    (s, x) => s + x.annualReward,
    0,
  );

  async function createRule(formData: FormData) {
    "use server";
    const accountId = String(formData.get("accountId") ?? "").trim();
    const catRaw = String(formData.get("categoryId") ?? "").trim();
    const categoryId = catRaw || null;
    const ratePercent = Number(formData.get("ratePercent") ?? 0) || 0;
    const description = String(formData.get("description") ?? "").trim() || null;
    const capRaw = String(formData.get("monthlyCapPence") ?? "").trim();
    const monthlyCapPence = capRaw ? parseGBP(capRaw) : null;
    if (!accountId || ratePercent <= 0) {
      throw new Error("Card and rate are required");
    }
    await db.cardRewardRule.create({
      data: {
        accountId,
        categoryId,
        ratePercent,
        description,
        monthlyCapPence,
        isActive: true,
      },
    });
    redirect("/rewards");
  }

  async function deleteRule(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");
    if (!id) return;
    await db.cardRewardRule.delete({ where: { id } });
    redirect("/rewards");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Rewards &amp; cashback</h1>
      <p className="text-sm text-(--color-muted-foreground) -mt-3">
        For each spending category, the app picks the credit card that earns
        the most given your typical monthly spend (averaged over the last 6
        months).
      </p>

      {cards.length === 0 ? (
        <Card>
          <p className="text-sm text-(--color-muted-foreground)">
            Add a credit card account first under{" "}
            <Link
              href="/accounts/new"
              className="text-(--color-accent) hover:underline"
            >
              Accounts
            </Link>
            .
          </p>
        </Card>
      ) : (
        <>
          <Card title="Add a reward rule">
            <form
              action={createRule}
              className="grid sm:grid-cols-6 gap-3 text-sm"
            >
              <select
                name="accountId"
                required
                defaultValue=""
                className="input sm:col-span-2"
              >
                <option value="" disabled>
                  Choose card
                </option>
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                name="categoryId"
                defaultValue=""
                className="input sm:col-span-2"
              >
                <option value="">Everything</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <input
                name="ratePercent"
                type="number"
                step="0.01"
                min="0"
                placeholder="Rate %"
                required
                className="input"
              />
              <input
                name="monthlyCapPence"
                inputMode="decimal"
                placeholder="Monthly cap £ (optional)"
                className="input"
              />
              <input
                name="description"
                placeholder="Description (optional)"
                className="input sm:col-span-5"
              />
              <button
                type="submit"
                className="btn-primary sm:col-span-1"
              >
                Add
              </button>
            </form>
          </Card>

          {rules.length > 0 && (
            <Card title="Active reward rules">
              <ul className="divide-y divide-(--color-border) -my-2 text-sm">
                {rules.map((r) => (
                  <li
                    key={r.id}
                    className="py-2 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-medium">
                        {r.account.name} — {r.ratePercent}% on{" "}
                        {r.category?.name ?? "everything"}
                      </div>
                      <div className="text-xs text-(--color-muted-foreground)">
                        {r.description ?? ""}
                        {r.monthlyCapPence != null && (
                          <>
                            {r.description ? " · " : ""}
                            cap <Money pence={r.monthlyCapPence} />
                            /mo
                          </>
                        )}
                      </div>
                    </div>
                    <form action={deleteRule}>
                      <input type="hidden" name="id" value={r.id} />
                      <button
                        type="submit"
                        className="text-xs text-(--color-negative) hover:underline"
                      >
                        delete
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card
            title={`Best card per category (est. annual reward ${
              totalAnnualReward > 0
                ? `≈ ${new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(totalAnnualReward / 100)}`
                : "—"
            })`}
          >
            {rules.length === 0 ? (
              <p className="text-sm text-(--color-muted-foreground)">
                Add a reward rule above to see per-category suggestions.
              </p>
            ) : (
              <div className="overflow-x-auto -mx-5">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-(--color-muted-foreground) uppercase tracking-wide">
                    <tr>
                      <th className="px-5 py-2 font-medium">Category</th>
                      <th className="px-5 py-2 font-medium">
                        Avg monthly spend
                      </th>
                      <th className="px-5 py-2 font-medium">Best card</th>
                      <th className="px-5 py-2 font-medium text-right">
                        Annual reward (est.)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-(--color-border)">
                    {suggestions.map((s) => (
                      <tr key={s.categoryId}>
                        <td className="px-5 py-2 font-medium">
                          {s.categoryName}
                        </td>
                        <td className="px-5 py-2 text-(--color-muted-foreground) tabular-nums">
                          <Money pence={s.monthlySpend} />
                        </td>
                        <td className="px-5 py-2">
                          {s.bestRule ? (
                            <>
                              {s.bestRule.cardName}{" "}
                              <span className="text-xs text-(--color-muted-foreground)">
                                ({s.bestRule.ratePercent}%
                                {s.bestRule.categoryId == null
                                  ? " everywhere"
                                  : ""}
                                )
                              </span>
                            </>
                          ) : (
                            <span className="text-(--color-muted-foreground)">
                              no rule
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-2 text-right tabular-nums font-medium">
                          {s.annualReward > 0 ? (
                            <Money pence={s.annualReward} colorBySign />
                          ) : (
                            <span className="text-(--color-muted-foreground)">
                              —
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
