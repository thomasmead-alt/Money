import { Card } from "@/components/Card";
import { Money } from "@/components/Money";
import { netWorthSeries, spendByCategoryOverTime } from "@/lib/finance/trends";
import { NetWorthChart } from "./NetWorthChart";
import { SpendByCategoryChart } from "./SpendByCategoryChart";

export const dynamic = "force-dynamic";

export default async function TrendsPage() {
  const [netWorth, spend] = await Promise.all([
    netWorthSeries(12),
    spendByCategoryOverTime(6),
  ]);

  const latest = netWorth[netWorth.length - 1];
  const earliest = netWorth[0];
  const yoyDelta = latest && earliest ? latest.netWorth - earliest.netWorth : 0;

  // Take top-6 categories for the chart; rest go into "Other" line.
  const top = spend.slice(0, 6);
  const totalSpend = spend.reduce((s, c) => s + c.total, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Trends</h1>

      <Card title="Net worth — last 13 months">
        {netWorth.length === 0 ? (
          <p className="text-sm text-(--color-muted-foreground)">
            Not enough data yet — add accounts and a few months of transactions
            to see the trajectory.
          </p>
        ) : (
          <>
            <NetWorthChart data={netWorth} />
            <div className="mt-3 text-sm text-(--color-muted-foreground)">
              Latest: <Money pence={latest.netWorth} colorBySign /> ·{" "}
              {yoyDelta >= 0 ? "up" : "down"}{" "}
              <Money pence={Math.abs(yoyDelta)} /> since{" "}
              {new Date(earliest.date + "-01").toLocaleDateString("en-GB", {
                month: "short",
                year: "numeric",
              })}
            </div>
          </>
        )}
      </Card>

      <Card title="Spend by category — last 6 months">
        {spend.length === 0 ? (
          <p className="text-sm text-(--color-muted-foreground)">
            No expense transactions yet.
          </p>
        ) : (
          <>
            <SpendByCategoryChart data={top} />
            <div className="mt-4 overflow-x-auto -mx-5">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-(--color-muted-foreground) uppercase tracking-wide">
                  <tr>
                    <th className="px-5 py-2 font-medium">Category</th>
                    <th className="px-5 py-2 font-medium text-right">
                      6-month total
                    </th>
                    <th className="px-5 py-2 font-medium text-right">
                      Monthly avg
                    </th>
                    <th className="px-5 py-2 font-medium text-right">
                      % of spend
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--color-border)">
                  {spend.map((row) => (
                    <tr key={row.categoryId ?? "uncategorised"}>
                      <td className="px-5 py-2">{row.categoryName}</td>
                      <td className="px-5 py-2 text-right tabular-nums">
                        <Money pence={row.total} />
                      </td>
                      <td className="px-5 py-2 text-right tabular-nums">
                        <Money pence={Math.round(row.total / 6)} />
                      </td>
                      <td className="px-5 py-2 text-right tabular-nums text-(--color-muted-foreground)">
                        {((row.total / Math.max(1, totalSpend)) * 100).toFixed(
                          1,
                        )}
                        %
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
