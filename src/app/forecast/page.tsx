import { db } from "@/lib/db";
import { Card } from "@/components/Card";
import { Money } from "@/components/Money";
import { forecastAccounts, aggregateLiquid } from "@/lib/finance/forecast";
import { ForecastChart } from "./ForecastChart";

export const dynamic = "force-dynamic";

export default async function ForecastPage() {
  const [accounts, forecasts] = await Promise.all([
    db.account.findMany({
      where: { archivedAt: null },
      orderBy: { name: "asc" },
    }),
    forecastAccounts(12),
  ]);

  const liquidIds = new Set(
    accounts
      .filter((a) => a.type === "CURRENT" || a.type === "SAVINGS")
      .map((a) => a.id),
  );
  const liquid = aggregateLiquid(forecasts, liquidIds);

  const minPoint =
    liquid.length === 0
      ? null
      : liquid.reduce((m, p) => (p.balance < m.balance ? p : m), liquid[0]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">12-month forecast</h1>

      <Card title="Total liquid cash projection">
        {liquid.length === 0 ? (
          <p className="text-sm text-(--color-muted-foreground)">
            Add at least one current or savings account, plus a few recurring
            expenses, to see a projection here.
          </p>
        ) : (
          <>
            <ForecastChart data={liquid} />
            {minPoint && (
              <p className="text-sm text-(--color-muted-foreground) mt-3">
                Lowest projected balance:{" "}
                <Money pence={minPoint.balance} colorBySign /> on{" "}
                {new Date(minPoint.date).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            )}
          </>
        )}
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        {forecasts.map((f) => (
          <Card
            key={f.accountId}
            title={f.accountName}
            action={
              <div className="text-xs text-(--color-muted-foreground)">
                start <Money pence={f.startBalance} />
              </div>
            }
          >
            <ForecastChart data={f.points} compact />
            <div className="flex justify-between text-xs text-(--color-muted-foreground) mt-2">
              <span>
                min: <Money pence={f.minBalance} colorBySign />
              </span>
              {f.minBalanceDate && (
                <span>
                  on{" "}
                  {new Date(f.minBalanceDate).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
