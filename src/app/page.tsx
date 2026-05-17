import Link from "next/link";
import { db } from "@/lib/db";
import { Card, Stat } from "@/components/Card";
import { Money } from "@/components/Money";
import { AlertsPanel } from "@/components/AlertsPanel";
import { computeClearSurplus } from "@/lib/finance/clearSurplus";
import { collectAlerts } from "@/lib/finance/alerts";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const now = new Date();
  const [accounts, surplus, recentTx, alerts] = await Promise.all([
    db.account.findMany({
      where: { archivedAt: null },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    }),
    computeClearSurplus("MONTH"),
    db.transaction.findMany({
      take: 5,
      orderBy: { date: "desc" },
      include: { account: true, category: true },
    }),
    collectAlerts(now),
  ]);

  if (accounts.length === 0) {
    return <EmptyState />;
  }

  const liquidAccounts = accounts.filter(
    (a) => a.type === "CURRENT" || a.type === "SAVINGS",
  );
  const debtAccounts = accounts.filter(
    (a) => a.type === "CREDIT_CARD" || a.type === "MORTGAGE",
  );

  const liquid = liquidAccounts.reduce((s, a) => s + a.currentBalance, 0);
  const debts = debtAccounts.reduce((s, a) => s + a.currentBalance, 0);
  const netWorth = accounts
    .filter((a) => a.includeInNetWorth)
    .reduce((s, a) => s + a.currentBalance, 0);

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <Stat
            label="Net worth"
            value={<Money pence={netWorth} />}
            tone={netWorth >= 0 ? "positive" : "negative"}
            hint={`${accounts.length} accounts tracked`}
          />
        </Card>
        <Card>
          <Stat
            label="Liquid cash"
            value={<Money pence={liquid} />}
            hint={`${liquidAccounts.length} spending / savings accounts`}
          />
        </Card>
        <Card>
          <Stat
            label="Total debts"
            value={<Money pence={debts} />}
            tone={debts < 0 ? "negative" : "neutral"}
            hint={`${debtAccounts.length} credit & mortgage accounts`}
          />
        </Card>
        <Card>
          <Stat
            label="Clear surplus"
            value={<Money pence={surplus.surplus} />}
            tone={surplus.surplus >= 0 ? "positive" : "negative"}
            hint={`After ${surplus.upcomingCount} committed item${
              surplus.upcomingCount === 1 ? "" : "s"
            } until ${surplus.horizonEnd.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
            })}`}
          />
        </Card>
      </div>

      <AlertsPanel alerts={alerts} />

      <div className="grid lg:grid-cols-2 gap-4">
        <Card
          title="Accounts"
          action={
            <Link className="text-sm text-(--color-accent)" href="/accounts">
              All accounts →
            </Link>
          }
        >
          <ul className="divide-y divide-(--color-border) -my-2">
            {accounts.map((a) => (
              <li
                key={a.id}
                className="py-2 flex items-center justify-between gap-3"
              >
                <Link
                  href={`/accounts/${a.id}`}
                  className="flex-1 truncate hover:underline"
                >
                  <div className="font-medium truncate">{a.name}</div>
                  <div className="text-xs text-(--color-muted-foreground)">
                    {a.institution ?? ""} ·{" "}
                    {a.type.replace("_", " ").toLowerCase()}
                  </div>
                </Link>
                <Money
                  pence={a.currentBalance}
                  colorBySign
                  className="text-sm font-medium"
                />
              </li>
            ))}
          </ul>
        </Card>

        <Card
          title="Recent transactions"
          action={
            <Link
              className="text-sm text-(--color-accent)"
              href="/transactions"
            >
              All transactions →
            </Link>
          }
        >
          {recentTx.length === 0 ? (
            <p className="text-sm text-(--color-muted-foreground)">
              No transactions yet. Import a statement from an account to get
              started.
            </p>
          ) : (
            <ul className="divide-y divide-(--color-border) -my-2">
              {recentTx.map((t) => (
                <li
                  key={t.id}
                  className="py-2 flex items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{t.description}</div>
                    <div className="text-xs text-(--color-muted-foreground)">
                      {t.account.name} ·{" "}
                      {t.date.toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })}
                      {t.category ? ` · ${t.category.name}` : ""}
                    </div>
                  </div>
                  <Money
                    pence={t.amount}
                    colorBySign
                    className="text-sm font-medium"
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center max-w-md mx-auto">
      <div className="text-5xl mb-4">£</div>
      <h1 className="text-2xl font-semibold mb-2">
        Welcome to your money dashboard
      </h1>
      <p className="text-(--color-muted-foreground) mb-6">
        Add your first account — a current account, savings pot, credit card, or
        mortgage — and then import a statement to get going.
      </p>
      <Link href="/accounts/new" className="btn-primary">
        Add an account
      </Link>
    </div>
  );
}
