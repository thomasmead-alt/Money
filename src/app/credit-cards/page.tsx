import Link from "next/link";
import { db } from "@/lib/db";
import { Card } from "@/components/Card";
import { Money } from "@/components/Money";
import {
  optimiseBalanceTransfers,
  type DebtSource,
  type DestinationOffer,
} from "@/lib/finance/balanceTransfer";

export const dynamic = "force-dynamic";

export default async function CreditCardsPage() {
  const cards = await db.account.findMany({
    where: { type: "CREDIT_CARD", archivedAt: null },
    include: { creditCardOffers: { where: { status: "ACTIVE" } } },
    orderBy: { name: "asc" },
  });

  const sources: DebtSource[] = cards
    .filter((c) => c.currentBalance < 0)
    .map((c) => ({
      accountId: c.id,
      name: c.name,
      balance: Math.abs(c.currentBalance),
      apr:
        c.creditCardOffers.find((o) => o.offerType === "BALANCE_TRANSFER")
          ?.postPromoApr ?? 22.9,
    }));

  const offers: DestinationOffer[] = cards.flatMap((c) =>
    c.creditCardOffers
      .filter((o) => o.offerType === "BALANCE_TRANSFER")
      .map((o) => {
        const limit = c.creditLimit ?? 0;
        const usedAbs = Math.abs(Math.min(0, c.currentBalance));
        const headroom = Math.max(0, limit - usedAbs);
        const promoMonths = Math.max(
          1,
          Math.round(
            (o.promoEndDate.getTime() - Date.now()) /
              (1000 * 60 * 60 * 24 * 30),
          ),
        );
        return {
          offerId: o.id,
          accountId: c.id,
          name: `${c.name} — 0% BT until ${o.promoEndDate.toLocaleDateString("en-GB", { month: "short", year: "numeric" })}`,
          availableHeadroom: headroom,
          feePercent: o.feePercent,
          promoApr: o.promoApr,
          promoMonths,
        };
      }),
  );

  const result = optimiseBalanceTransfers(sources, offers);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-semibold">Credit cards</h1>
        <Link href="/credit-cards/spread" className="btn-secondary">
          Spread upcoming expenses →
        </Link>
      </div>

      <Card title="Your cards">
        {cards.length === 0 ? (
          <p className="text-sm text-(--color-muted-foreground)">
            No credit cards yet.{" "}
            <Link
              href="/accounts/new"
              className="text-(--color-accent) hover:underline"
            >
              Add one
            </Link>
            .
          </p>
        ) : (
          <ul className="divide-y divide-(--color-border) -my-2">
            {cards.map((c) => (
              <li
                key={c.id}
                className="py-3 flex items-center justify-between"
              >
                <div>
                  <div className="font-medium">
                    <Link
                      href={`/accounts/${c.id}`}
                      className="hover:underline"
                    >
                      {c.name}
                    </Link>
                  </div>
                  <div className="text-xs text-(--color-muted-foreground)">
                    Limit{" "}
                    {c.creditLimit != null ? (
                      <Money pence={c.creditLimit} />
                    ) : (
                      "not set"
                    )}{" "}
                    · {c.creditCardOffers.length} active offer
                    {c.creditCardOffers.length === 1 ? "" : "s"}
                  </div>
                </div>
                <Money
                  pence={c.currentBalance}
                  colorBySign
                  className="font-medium"
                />
              </li>
            ))}
          </ul>
        )}
      </Card>

      {sources.length > 0 && offers.length > 0 && (
        <Card title="Balance transfer suggestions">
          {result.moves.length === 0 ? (
            <p className="text-sm text-(--color-muted-foreground)">
              No moves identified — debt and offers don&apos;t match up cleanly.
            </p>
          ) : (
            <>
              <ul className="divide-y divide-(--color-border) -my-2">
                {result.moves.map((m, i) => (
                  <li
                    key={i}
                    className="py-3 flex items-center justify-between gap-3"
                  >
                    <div className="text-sm">
                      Move <Money pence={m.amount} /> from{" "}
                      <span className="font-medium">{m.fromName}</span> to{" "}
                      <span className="font-medium">{m.toName}</span>
                      <div className="text-xs text-(--color-muted-foreground) mt-0.5">
                        Fee <Money pence={m.fee} /> · saves roughly{" "}
                        <Money pence={m.monthlySaving} />/month
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="text-(--color-positive) font-medium">
                        + <Money pence={m.totalSaving} />
                      </div>
                      <div className="text-xs text-(--color-muted-foreground)">
                        net over promo
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-4 text-sm text-(--color-muted-foreground)">
                Total estimated saving:{" "}
                <Money pence={result.totalSaving} colorBySign /> (after fees of{" "}
                <Money pence={result.totalFees} />).
              </div>
              {result.warnings.map((w, i) => (
                <p
                  key={i}
                  className="text-xs text-(--color-warning) mt-2"
                >
                  {w}
                </p>
              ))}
            </>
          )}
        </Card>
      )}
    </div>
  );
}
