import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { Card } from "@/components/Card";
import { Money } from "@/components/Money";
import {
  detectSubscriptions,
  normaliseMerchant,
} from "@/lib/finance/subscriptions";
import type { Frequency } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

export default async function SubscriptionsPage() {
  const now = new Date();
  const lookback = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

  const [txs, existingRecurring] = await Promise.all([
    db.transaction.findMany({
      where: {
        date: { gte: lookback },
        // Exclude transactions already managed elsewhere: tax-bucketed
        // categories (ISA/pension/dividend/etc.) and transfer-kind categories.
        OR: [
          { categoryId: null },
          {
            category: {
              taxBucket: null,
              kind: { not: "TRANSFER" },
            },
          },
        ],
      },
      select: {
        id: true,
        date: true,
        amount: true,
        description: true,
        merchant: true,
        accountId: true,
      },
      orderBy: { date: "asc" },
    }),
    db.recurringExpense.findMany({
      where: { isActive: true },
      select: { name: true },
    }),
  ]);

  const candidates = detectSubscriptions(txs, now);

  // Hide candidates whose normalised name already exists as a managed recurring.
  const existingKeys = new Set(
    existingRecurring.map((r) => normaliseMerchant(r.name)),
  );
  const filtered = candidates.filter(
    (c) => !existingKeys.has(c.merchantKey),
  );

  // Build a lookup so promote() can pick the most-recent account.
  const txById = new Map(txs.map((t) => [t.id, t]));

  async function promote(formData: FormData) {
    "use server";
    const name = String(formData.get("name") ?? "").trim();
    const amount = Number(formData.get("amount") ?? 0);
    const frequency = String(formData.get("frequency") ?? "MONTHLY") as Frequency;
    const accountId = String(formData.get("accountId") ?? "").trim();
    if (!name || !accountId || !Number.isFinite(amount)) {
      throw new Error("Missing fields");
    }
    const startDate = new Date(String(formData.get("startDate") ?? new Date().toISOString()));
    const dayOfMonth =
      frequency === "MONTHLY" || frequency === "ANNUALLY"
        ? startDate.getDate()
        : null;
    const dayOfWeek = frequency === "WEEKLY" ? startDate.getDay() : null;
    const monthOfYear =
      frequency === "ANNUALLY" ? startDate.getMonth() + 1 : null;

    await db.recurringExpense.create({
      data: {
        name,
        amount,
        accountId,
        frequency,
        startDate,
        nextDue: startDate,
        dayOfMonth,
        dayOfWeek,
        monthOfYear,
        isCommitted: true,
      },
    });
    redirect("/subscriptions");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Detected subscriptions</h1>
      <p className="text-sm text-(--color-muted-foreground) -mt-3">
        Found by scanning the last 12 months of transactions for recurring
        merchants at regular cadence. Promote a candidate to a managed
        recurring expense so it shows up in budget &amp; forecast.
      </p>

      {filtered.length === 0 ? (
        <Card>
          <p className="text-sm text-(--color-muted-foreground)">
            No new subscription patterns detected. Either everything is
            already managed under{" "}
            <Link
              href="/recurring"
              className="text-(--color-accent) hover:underline"
            >
              Recurring
            </Link>
            , or there isn&apos;t enough transaction history yet.
          </p>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map((c) => {
            const lastTx = txById.get(
              c.matchingTransactionIds[c.matchingTransactionIds.length - 1],
            );
            const annualised =
              c.estimatedFrequency === "MONTHLY"
                ? c.averageAmount * 12
                : c.estimatedFrequency === "WEEKLY"
                  ? c.averageAmount * 52
                  : c.averageAmount;
            return (
              <Card key={c.merchantKey} title={c.displayName}>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-(--color-muted-foreground)">
                      Cadence
                    </span>
                    <span>
                      {c.estimatedFrequency.toLowerCase()} (~{c.cadenceDays}d)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-(--color-muted-foreground)">
                      Typical amount
                    </span>
                    <span className="font-medium">
                      <Money pence={c.averageAmount} colorBySign />
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-(--color-muted-foreground)">
                      Annualised
                    </span>
                    <Money pence={annualised} colorBySign className="font-medium" />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-(--color-muted-foreground)">
                      Seen
                    </span>
                    <span>
                      {c.occurrences}× since{" "}
                      {c.firstSeen.toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-(--color-muted-foreground)">
                      Confidence
                    </span>
                    <span>{Math.round(c.confidence * 100)}%</span>
                  </div>
                </div>
                <form action={promote} className="mt-4 flex flex-wrap gap-2">
                  <input type="hidden" name="name" value={c.displayName} />
                  <input
                    type="hidden"
                    name="amount"
                    value={c.averageAmount}
                  />
                  <input
                    type="hidden"
                    name="frequency"
                    value={c.estimatedFrequency}
                  />
                  <input
                    type="hidden"
                    name="startDate"
                    value={c.lastSeen.toISOString()}
                  />
                  <input
                    type="hidden"
                    name="accountId"
                    value={lastTx?.accountId ?? ""}
                  />
                  <button type="submit" className="btn-primary">
                    Promote to recurring
                  </button>
                </form>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
