import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Card, Stat } from "@/components/Card";
import { Money } from "@/components/Money";
import type { AccountType } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

const MANUAL_VALUATION_TYPES = new Set<AccountType>([
  "INVESTMENT",
  "PENSION",
  "PROPERTY",
  "VEHICLE",
  "OTHER_ASSET",
  "OTHER_LIABILITY",
  "LOAN",
]);

function isManualValued(type: AccountType): boolean {
  return MANUAL_VALUATION_TYPES.has(type);
}

export default async function AccountPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const account = await db.account.findUnique({ where: { id } });
  if (!account) notFound();

  const [transactions, importBatches, offers, recurringCount, mortgage] =
    await Promise.all([
      db.transaction.findMany({
        where: { accountId: id },
        orderBy: { date: "desc" },
        take: 50,
        include: { category: true },
      }),
      db.importBatch.findMany({
        where: { accountId: id },
        orderBy: { importedAt: "desc" },
        take: 5,
      }),
      db.creditCardOffer.findMany({
        where: { accountId: id, status: "ACTIVE" },
        orderBy: { promoEndDate: "asc" },
      }),
      db.recurringExpense.count({ where: { accountId: id, isActive: true } }),
      account.type === "MORTGAGE"
        ? db.mortgageDetails.findUnique({ where: { accountId: id } })
        : Promise.resolve(null),
    ]);
  const offerCount = offers.length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link
            href="/accounts"
            className="text-xs text-(--color-muted-foreground) hover:underline"
          >
            ← All accounts
          </Link>
          <h1 className="text-2xl font-semibold mt-1">{account.name}</h1>
          <p className="text-sm text-(--color-muted-foreground)">
            {account.institution ?? "—"} ·{" "}
            {account.type.replace(/_/g, " ").toLowerCase()} · {account.provider}
            {account.lastValuedAt && (
              <>
                {" "}
                · valued{" "}
                {account.lastValuedAt.toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </>
            )}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isManualValued(account.type) ? (
            <Link
              href={`/accounts/${account.id}/revalue`}
              className="btn-primary"
            >
              Revalue
            </Link>
          ) : (
            <Link
              href={`/accounts/${account.id}/import`}
              className="btn-primary"
            >
              Import statement
            </Link>
          )}
          <Link
            href={`/accounts/${account.id}/transactions/new`}
            className="btn-secondary"
          >
            Add transaction
          </Link>
          {account.type === "CREDIT_CARD" && (
            <Link
              href={`/accounts/${account.id}/offers/new`}
              className="btn-secondary"
            >
              Add offer
            </Link>
          )}
          {account.type === "MORTGAGE" && (
            <Link
              href={`/accounts/${account.id}/mortgage`}
              className="btn-secondary"
            >
              {mortgage ? "Edit mortgage details" : "Set up mortgage"}
            </Link>
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <Stat
            label="Current balance"
            value={<Money pence={account.currentBalance} />}
            tone={account.currentBalance >= 0 ? "positive" : "negative"}
          />
        </Card>
        <Card>
          <Stat
            label="Opening balance"
            value={<Money pence={account.openingBalance} />}
          />
        </Card>
        {account.creditLimit != null ? (
          <Card>
            <Stat
              label="Credit limit"
              value={<Money pence={account.creditLimit} />}
              hint={`${recurringCount} recurring · ${offerCount} active offers`}
            />
          </Card>
        ) : (
          <Card>
            <Stat
              label="Transactions"
              value={transactions.length === 50 ? "50+" : transactions.length}
              hint={`${recurringCount} recurring linked`}
            />
          </Card>
        )}
      </div>

      {account.type === "CREDIT_CARD" && offers.length > 0 && (
        <Card
          title={`Active offers (${offers.length})`}
          action={
            <Link
              href={`/accounts/${account.id}/offers/new`}
              className="text-sm text-(--color-accent)"
            >
              Add another →
            </Link>
          }
        >
          <ul className="divide-y divide-(--color-border) -my-2">
            {offers.map((o) => (
              <li
                key={o.id}
                className="py-3 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="font-medium text-sm">
                    {o.offerType.replace("_", " ").toLowerCase()}
                    {o.description ? ` — ${o.description}` : ""}
                  </div>
                  <div className="text-xs text-(--color-muted-foreground)">
                    <Money pence={o.amount} /> at {o.promoApr}% · reverts to{" "}
                    {o.postPromoApr}%
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">
                    Ends{" "}
                    {o.promoEndDate.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                  <div className="text-xs text-(--color-muted-foreground)">
                    Fee {o.feePercent}%
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="Transactions">
        {transactions.length === 0 ? (
          <p className="text-sm text-(--color-muted-foreground)">
            No transactions yet.{" "}
            <Link
              href={`/accounts/${account.id}/import`}
              className="text-(--color-accent) hover:underline"
            >
              Import a statement
            </Link>{" "}
            or{" "}
            <Link
              href={`/accounts/${account.id}/transactions/new`}
              className="text-(--color-accent) hover:underline"
            >
              add one manually
            </Link>
            .
          </p>
        ) : (
          <ul className="divide-y divide-(--color-border) -my-2">
            {transactions.map((t) => (
              <li
                key={t.id}
                className="py-2 flex items-center justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{t.description}</div>
                  <div className="text-xs text-(--color-muted-foreground)">
                    {t.date.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                    {t.category ? ` · ${t.category.name}` : ""}
                    {t.status === "PENDING" ? " · pending" : ""}
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

      {importBatches.length > 0 && (
        <Card title="Recent imports">
          <ul className="divide-y divide-(--color-border) -my-2 text-sm">
            {importBatches.map((b) => (
              <li
                key={b.id}
                className="py-2 flex items-center justify-between"
              >
                <div>
                  <div className="font-medium">
                    {b.filename ?? "Manual import"}
                  </div>
                  <div className="text-xs text-(--color-muted-foreground)">
                    {b.source} ·{" "}
                    {b.importedAt.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                </div>
                <div className="text-xs text-(--color-muted-foreground) tabular-nums">
                  {b.rowCount} new · {b.duplicateCount} dupes
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
