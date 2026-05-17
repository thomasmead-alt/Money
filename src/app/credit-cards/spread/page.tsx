import Link from "next/link";
import { db } from "@/lib/db";
import { Card } from "@/components/Card";
import { Money } from "@/components/Money";
import {
  suggestSpread,
  type PurchaseOffer,
  type SpreadableExpense,
} from "@/lib/finance/spreadOnCard";

export const dynamic = "force-dynamic";

const MAX_MONTHLY_PER_ITEM = 200_00; // £200/month per item by default

export default async function SpreadOnCardPage() {
  const now = new Date();
  const horizon = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

  const [scheduled, cards] = await Promise.all([
    db.scheduledOneOff.findMany({
      where: {
        paidAt: null,
        amount: { lt: 0 }, // outflows only
        date: { gte: now, lte: horizon },
      },
      include: { account: true, category: true },
      orderBy: { date: "asc" },
    }),
    db.account.findMany({
      where: { type: "CREDIT_CARD", archivedAt: null },
      include: {
        creditCardOffers: {
          where: { status: "ACTIVE", offerType: "PURCHASE" },
        },
      },
    }),
  ]);

  const expenses: SpreadableExpense[] = scheduled.map((s) => ({
    id: s.id,
    name: s.name,
    date: s.date,
    amount: Math.abs(s.amount),
  }));

  const offers: PurchaseOffer[] = cards.flatMap((c) =>
    c.creditCardOffers.map((o) => {
      const limit = c.creditLimit ?? 0;
      const usedAbs = Math.abs(Math.min(0, c.currentBalance));
      const headroom = Math.max(0, limit - usedAbs);
      return {
        offerId: o.id,
        accountId: c.id,
        cardName: c.name,
        availableHeadroom: headroom,
        promoEndDate: o.promoEndDate,
        feePercent: o.feePercent,
      };
    }),
  );

  const suggestions = suggestSpread(expenses, offers, MAX_MONTHLY_PER_ITEM);
  const matchedIds = new Set(suggestions.map((s) => s.expenseId));
  const unmatched = expenses.filter((e) => !matchedIds.has(e.id));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/credit-cards"
          className="text-xs text-(--color-muted-foreground) hover:underline"
        >
          ← Credit cards
        </Link>
        <h1 className="text-2xl font-semibold mt-1">
          Spread upcoming expenses on a 0% card
        </h1>
        <p className="text-sm text-(--color-muted-foreground) mt-1">
          For each scheduled one-off in the next 12 months, finds the best 0%
          purchase offer that lets you pay it off interest-free at no more than{" "}
          <span className="font-medium">£200/month</span> per item.
        </p>
      </div>

      {offers.length === 0 ? (
        <Card>
          <p className="text-sm text-(--color-muted-foreground)">
            No active 0% purchase offers found. Add one from a credit card
            account to see suggestions.
          </p>
        </Card>
      ) : suggestions.length === 0 ? (
        <Card>
          <p className="text-sm text-(--color-muted-foreground)">
            No upcoming scheduled one-offs match the available offers — try
            adding a holiday or large purchase under{" "}
            <Link
              href="/scheduled"
              className="text-(--color-accent) hover:underline"
            >
              Scheduled
            </Link>
            .
          </p>
        </Card>
      ) : (
        <Card title={`Suggestions (${suggestions.length})`}>
          <ul className="divide-y divide-(--color-border) -my-2">
            {suggestions.map((s) => (
              <li key={s.expenseId} className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{s.expenseName}</div>
                    <div className="text-xs text-(--color-muted-foreground)">
                      {s.expenseDate.toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      · <Money pence={s.amount} />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{s.cardName}</div>
                    <div className="text-xs text-(--color-muted-foreground)">
                      <Money pence={s.monthlyPaymentRequired} />/mo for{" "}
                      {s.monthsToPayoff} months
                    </div>
                  </div>
                </div>
                {s.feePaid > 0 && (
                  <div className="text-xs text-(--color-warning) mt-1">
                    Fee: <Money pence={s.feePaid} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {unmatched.length > 0 && (
        <Card title="Couldn't fit on a 0% card">
          <ul className="divide-y divide-(--color-border) -my-2 text-sm">
            {unmatched.map((e) => (
              <li
                key={e.id}
                className="py-2 flex items-center justify-between"
              >
                <span>
                  {e.name}{" "}
                  <span className="text-xs text-(--color-muted-foreground)">
                    · {e.date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </span>
                </span>
                <Money pence={e.amount} className="font-medium" />
              </li>
            ))}
          </ul>
          <p className="text-xs text-(--color-muted-foreground) mt-3">
            Either the offer headroom is insufficient, the promo period ends
            before the expense lands, or the required monthly repayment
            exceeds £200.
          </p>
        </Card>
      )}
    </div>
  );
}
