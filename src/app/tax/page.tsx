import Link from "next/link";
import { db } from "@/lib/db";
import { Card, Stat } from "@/components/Card";
import { Money } from "@/components/Money";
import {
  daysRemainingInTaxYear,
  summariseAllowances,
  ukTaxYearBounds,
  type TaxBucket,
} from "@/lib/finance/tax";

export const dynamic = "force-dynamic";

const ALL_BUCKETS: TaxBucket[] = [
  "ISA_CONTRIBUTION",
  "PENSION_CONTRIBUTION",
  "DIVIDEND_INCOME",
  "SAVINGS_INTEREST",
  "TAXABLE_GAINS",
];

export default async function TaxPage() {
  const now = new Date();
  const bounds = ukTaxYearBounds(now);
  const daysLeft = daysRemainingInTaxYear(now);

  // Categories that have been tagged with a tax bucket drive the calc.
  const taggedCats = await db.category.findMany({
    where: { taxBucket: { not: null } },
  });
  const categoryToBucket = new Map<string, TaxBucket>(
    taggedCats.map((c) => [c.id, c.taxBucket as TaxBucket]),
  );

  const taggedIds = Array.from(categoryToBucket.keys());
  const txs = taggedIds.length
    ? await db.transaction.findMany({
        where: {
          categoryId: { in: taggedIds },
          date: { gte: bounds.start, lt: bounds.end },
        },
        select: { amount: true, date: true, categoryId: true },
      })
    : [];

  const tagged = txs.map((t) => ({
    amount: t.amount,
    date: t.date,
    bucket: categoryToBucket.get(t.categoryId!)!,
  }));

  const summary = summariseAllowances(tagged, undefined, now);

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold">UK tax allowances</h1>
        <div className="text-sm text-(--color-muted-foreground)">
          Tax year{" "}
          <span className="font-medium text-(--color-foreground)">
            {bounds.label}
          </span>{" "}
          · ends 5 April · <span className="font-medium">{daysLeft} days left</span>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {summary.map((u) => (
          <Card key={u.bucket}>
            <Stat
              label={u.label}
              value={<Money pence={u.remaining} />}
              tone={
                u.percentUsed >= 90
                  ? "warning"
                  : u.percentUsed > 0
                    ? "positive"
                    : "neutral"
              }
              hint={
                <span>
                  <Money pence={u.used} /> used of{" "}
                  <Money pence={u.cap} /> · {Math.round(u.percentUsed)}%
                </span>
              }
            />
            <div className="mt-3 h-1.5 bg-(--color-muted) rounded-full overflow-hidden">
              <div
                className="h-full bg-(--color-accent)"
                style={{ width: `${u.percentUsed}%` }}
              />
            </div>
          </Card>
        ))}
      </div>

      <Card title="How allowances are computed">
        <div className="text-sm text-(--color-muted-foreground) space-y-2">
          <p>
            The app sums transactions in the current tax year (6 April – 5
            April) that are assigned to categories tagged with a tax bucket.
          </p>
          <p>
            Tag categories under{" "}
            <Link
              href="/settings"
              className="text-(--color-accent) hover:underline"
            >
              Settings → Categories
            </Link>{" "}
            — set <code className="px-1 py-0.5 rounded bg-(--color-muted) text-xs">tax bucket</code>{" "}
            to ISA, pension, dividend, savings interest, or taxable gain.
            Existing transactions in that category will be picked up
            automatically.
          </p>
          <p>
            Caps use 2025/26 figures: ISA £20,000, pension annual allowance
            £60,000, dividend allowance £500, savings interest PSA £1,000
            (basic-rate), CGT exemption £3,000. Caps haven&apos;t changed for
            2026/27.
          </p>
          {ALL_BUCKETS.filter(
            (b) => !taggedCats.some((c) => c.taxBucket === b),
          ).length > 0 && (
            <p className="text-(--color-warning)">
              Tip: you have no category tagged for{" "}
              {ALL_BUCKETS.filter(
                (b) => !taggedCats.some((c) => c.taxBucket === b),
              )
                .map((b) => b.replace(/_/g, " ").toLowerCase())
                .join(", ")}
              . Those allowances will read £0 used.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
