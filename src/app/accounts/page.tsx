import Link from "next/link";
import { db } from "@/lib/db";
import { Card } from "@/components/Card";
import { Money } from "@/components/Money";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  CURRENT: "Current accounts",
  SAVINGS: "Savings",
  CREDIT_CARD: "Credit cards",
  MORTGAGE: "Mortgages",
  INVESTMENT: "Investments",
  PENSION: "Pensions",
  PROPERTY: "Property",
  VEHICLE: "Vehicles",
  LOAN: "Loans",
  OTHER_ASSET: "Other assets",
  OTHER_LIABILITY: "Other liabilities",
};

export default async function AccountsPage() {
  const accounts = await db.account.findMany({
    where: { archivedAt: null },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  const grouped = new Map<string, typeof accounts>();
  for (const a of accounts) {
    const list = grouped.get(a.type) ?? [];
    list.push(a);
    grouped.set(a.type, list);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Accounts</h1>
        <Link href="/accounts/new" className="btn-primary">
          Add account
        </Link>
      </div>

      {accounts.length === 0 ? (
        <Card>
          <p className="text-sm text-(--color-muted-foreground)">
            No accounts yet. Add one to get started.
          </p>
        </Card>
      ) : (
        Array.from(grouped.entries()).map(([type, list]) => (
          <Card key={type} title={TYPE_LABEL[type] ?? type}>
            <ul className="divide-y divide-(--color-border) -my-2">
              {list.map((a) => (
                <li
                  key={a.id}
                  className="py-3 flex items-center justify-between"
                >
                  <Link
                    href={`/accounts/${a.id}`}
                    className="flex-1 truncate hover:underline"
                  >
                    <div className="font-medium">{a.name}</div>
                    <div className="text-xs text-(--color-muted-foreground)">
                      {a.institution ?? "—"} · {a.provider}
                    </div>
                  </Link>
                  <Money pence={a.currentBalance} colorBySign className="font-medium" />
                </li>
              ))}
            </ul>
          </Card>
        ))
      )}
    </div>
  );
}
