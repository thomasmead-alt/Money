import { Card, Stat } from "@/components/Card";
import { Money } from "@/components/Money";
import { computeClearSurplus } from "@/lib/finance/clearSurplus";

export const dynamic = "force-dynamic";

export default async function BudgetPage() {
  const surplus = await computeClearSurplus("MONTH");
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Budget</h1>
      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <Stat
            label="Cleared balance"
            value={<Money pence={surplus.clearedSpendingBalance} />}
            hint="Current + Savings only"
          />
        </Card>
        <Card>
          <Stat
            label="Committed outflows"
            value={<Money pence={surplus.committedOutflows} />}
            tone={surplus.committedOutflows < 0 ? "negative" : "neutral"}
            hint={`${surplus.upcomingCount} items until ${surplus.horizonEnd.toLocaleDateString(
              "en-GB",
              { day: "numeric", month: "short" },
            )}`}
          />
        </Card>
        <Card>
          <Stat
            label="Clear surplus"
            value={<Money pence={surplus.surplus} />}
            tone={surplus.surplus >= 0 ? "positive" : "negative"}
            hint="What's actually free to spend or save"
          />
        </Card>
      </div>
      <Card title="How this works">
        <div className="text-sm space-y-2 text-(--color-muted-foreground)">
          <p>
            The clear surplus is the answer to the question{" "}
            <em>&quot;how much do I really have, after the bills that haven&apos;t left yet?&quot;</em>
          </p>
          <p>
            It takes your cleared balance across current and savings accounts,
            subtracts pending transactions, every committed recurring expense
            due before the horizon, and every scheduled one-off (holidays, MOT,
            Christmas) in the same window.
          </p>
          <p>
            Categorised budget envelopes will land here in the next iteration —
            this card is the foundation.
          </p>
        </div>
      </Card>
    </div>
  );
}
