import { db } from "@/lib/db";
import { Card, Stat } from "@/components/Card";
import { Money } from "@/components/Money";
import Link from "next/link";
import { parseGBP, formatGBP } from "@/lib/money";

export const dynamic = "force-dynamic";

interface SearchParams {
  account?: string;
  q?: string;
  category?: string;
  minAmount?: string;
  maxAmount?: string;
  from?: string;
  to?: string;
  pending?: string;
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

  const minAmountPence = sp.minAmount ? parseGBP(sp.minAmount) : null;
  const maxAmountPence = sp.maxAmount ? parseGBP(sp.maxAmount) : null;
  const fromDate = sp.from ? new Date(sp.from) : null;
  const toDate = sp.to ? new Date(sp.to) : null;
  const q = sp.q?.trim();

  // Multi-term description search: each whitespace-separated term must match.
  const descriptionAnd =
    q && q.length > 0
      ? q
          .split(/\s+/)
          .filter(Boolean)
          .map((term) => ({
            OR: [
              { description: { contains: term } },
              { merchant: { contains: term } },
            ],
          }))
      : null;

  const transactions = await db.transaction.findMany({
    where: {
      accountId: sp.account || undefined,
      categoryId: sp.category || undefined,
      status: sp.pending === "1" ? "PENDING" : undefined,
      amount: {
        gte: minAmountPence ?? undefined,
        lte: maxAmountPence ?? undefined,
      },
      date: {
        gte: fromDate ?? undefined,
        lte: toDate ?? undefined,
      },
      AND: descriptionAnd ?? undefined,
    },
    orderBy: { date: "desc" },
    take: 500,
    include: { account: true, category: true },
  });

  const totalIn = transactions
    .filter((t) => t.amount > 0)
    .reduce((s, t) => s + t.amount, 0);
  const totalOut = transactions
    .filter((t) => t.amount < 0)
    .reduce((s, t) => s + t.amount, 0);
  const net = totalIn + totalOut;
  const filtered =
    !!(
      q ||
      sp.account ||
      sp.category ||
      sp.minAmount ||
      sp.maxAmount ||
      sp.from ||
      sp.to ||
      sp.pending
    );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Transactions</h1>

      <Card title="Search">
        <form className="grid sm:grid-cols-6 gap-3 text-sm">
          <input
            name="q"
            placeholder="Search description or merchant..."
            defaultValue={sp.q ?? ""}
            className="input sm:col-span-3"
          />
          <select
            name="account"
            defaultValue={sp.account ?? ""}
            className="input"
          >
            <option value="">All accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <select
            name="category"
            defaultValue={sp.category ?? ""}
            className="input"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2 text-(--color-muted-foreground)">
            <input
              type="checkbox"
              id="pending"
              name="pending"
              value="1"
              defaultChecked={sp.pending === "1"}
            />
            <label htmlFor="pending" className="text-xs">
              Pending only
            </label>
          </div>

          <input
            name="from"
            type="date"
            defaultValue={sp.from ?? ""}
            className="input"
            aria-label="From date"
          />
          <input
            name="to"
            type="date"
            defaultValue={sp.to ?? ""}
            className="input"
            aria-label="To date"
          />
          <input
            name="minAmount"
            inputMode="decimal"
            placeholder="Min £"
            defaultValue={sp.minAmount ?? ""}
            className="input"
          />
          <input
            name="maxAmount"
            inputMode="decimal"
            placeholder="Max £"
            defaultValue={sp.maxAmount ?? ""}
            className="input"
          />
          <div className="sm:col-span-2 flex gap-2 justify-end">
            {filtered && (
              <Link href="/transactions" className="btn-secondary">
                Clear
              </Link>
            )}
            <button type="submit" className="btn-primary">
              Search
            </button>
          </div>
        </form>
      </Card>

      {filtered && (
        <div className="grid sm:grid-cols-4 gap-4">
          <Card>
            <Stat
              label="Matched"
              value={
                transactions.length === 500
                  ? "500+"
                  : transactions.length
              }
            />
          </Card>
          <Card>
            <Stat
              label="Money in"
              value={<Money pence={totalIn} />}
              tone="positive"
            />
          </Card>
          <Card>
            <Stat
              label="Money out"
              value={<Money pence={totalOut} />}
              tone="negative"
            />
          </Card>
          <Card>
            <Stat
              label="Net"
              value={<Money pence={net} />}
              tone={net >= 0 ? "positive" : "negative"}
              hint={
                transactions.length > 0
                  ? `Avg ${formatGBP(Math.round(net / transactions.length))}/tx`
                  : undefined
              }
            />
          </Card>
        </div>
      )}

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
                      {t.merchant && t.merchant !== t.description && (
                        <div className="text-xs text-(--color-muted-foreground)">
                          {t.merchant}
                        </div>
                      )}
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
                      <Money
                        pence={t.amount}
                        colorBySign
                        className="font-medium"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
