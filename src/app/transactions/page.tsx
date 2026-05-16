import { db } from "@/lib/db";
import { Card } from "@/components/Card";
import { Money } from "@/components/Money";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface SearchParams {
  account?: string;
  q?: string;
  category?: string;
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const accounts = await db.account.findMany({
    where: { archivedAt: null },
    orderBy: { name: "asc" },
  });
  const categories = await db.category.findMany({ orderBy: { name: "asc" } });

  const transactions = await db.transaction.findMany({
    where: {
      accountId: sp.account ? sp.account : undefined,
      categoryId: sp.category ? sp.category : undefined,
      description: sp.q ? { contains: sp.q } : undefined,
    },
    orderBy: { date: "desc" },
    take: 200,
    include: { account: true, category: true },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Transactions</h1>
      <Card>
        <form className="grid sm:grid-cols-4 gap-3 text-sm">
          <input
            name="q"
            placeholder="Search description..."
            defaultValue={sp.q ?? ""}
            className="input"
          />
          <select name="account" defaultValue={sp.account ?? ""} className="input">
            <option value="">All accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <select name="category" defaultValue={sp.category ?? ""} className="input">
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-md bg-(--color-accent) text-(--color-accent-foreground) px-3 py-1.5 text-sm font-medium hover:opacity-90"
          >
            Filter
          </button>
        </form>
      </Card>

      <Card>
        {transactions.length === 0 ? (
          <p className="text-sm text-(--color-muted-foreground)">
            No transactions match your filters.
          </p>
        ) : (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-(--color-muted-foreground) uppercase tracking-wide">
                <tr>
                  <th className="px-5 py-2 font-medium">Date</th>
                  <th className="px-5 py-2 font-medium">Description</th>
                  <th className="px-5 py-2 font-medium">Account</th>
                  <th className="px-5 py-2 font-medium">Category</th>
                  <th className="px-5 py-2 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--color-border)">
                {transactions.map((t) => (
                  <tr key={t.id}>
                    <td className="px-5 py-2 whitespace-nowrap text-(--color-muted-foreground)">
                      {t.date.toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "2-digit",
                      })}
                    </td>
                    <td className="px-5 py-2">
                      <div className="font-medium">{t.description}</div>
                      {t.status === "PENDING" && (
                        <div className="text-xs text-(--color-warning)">
                          Pending
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-2 text-(--color-muted-foreground)">
                      <Link
                        href={`/accounts/${t.accountId}`}
                        className="hover:underline"
                      >
                        {t.account.name}
                      </Link>
                    </td>
                    <td className="px-5 py-2 text-(--color-muted-foreground)">
                      {t.category?.name ?? "—"}
                    </td>
                    <td className="px-5 py-2 text-right">
                      <Money pence={t.amount} colorBySign className="font-medium" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <style>{`
        .input {
          display: block;
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid var(--color-border);
          background: var(--color-card);
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          color: var(--color-foreground);
        }
      `}</style>
    </div>
  );
}
