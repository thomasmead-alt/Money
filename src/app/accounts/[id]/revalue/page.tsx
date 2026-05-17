import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { Card } from "@/components/Card";
import { Money } from "@/components/Money";
import { parseGBP } from "@/lib/money";
import { recalculateBalance } from "@/lib/import/persist";

const MANUAL_VALUATION_TYPES = new Set([
  "INVESTMENT",
  "PENSION",
  "PROPERTY",
  "VEHICLE",
  "OTHER_ASSET",
  "OTHER_LIABILITY",
  "LOAN",
]);

export default async function RevaluePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const account = await db.account.findUnique({ where: { id } });
  if (!account) notFound();

  if (!MANUAL_VALUATION_TYPES.has(account.type)) {
    return (
      <div className="max-w-xl mx-auto">
        <p className="text-sm text-(--color-muted-foreground)">
          Revaluation only applies to manual-valuation accounts (property,
          pension, investment, vehicle, loan).
        </p>
      </div>
    );
  }

  async function revalue(formData: FormData) {
    "use server";
    const newValue = parseGBP(String(formData.get("newValue") ?? "0"));
    const dateRaw = String(formData.get("date") ?? "");
    const date = dateRaw ? new Date(dateRaw) : new Date();
    const note = String(formData.get("note") ?? "").trim() || "Revaluation";
    if (Number.isNaN(date.getTime())) throw new Error("Invalid date");

    const fresh = await db.account.findUnique({ where: { id } });
    if (!fresh) return;
    const delta = newValue - fresh.currentBalance;
    if (delta === 0) {
      // still bump the lastValuedAt date
      await db.account.update({
        where: { id },
        data: { lastValuedAt: date },
      });
      redirect(`/accounts/${id}`);
      return;
    }

    await db.transaction.create({
      data: {
        accountId: id,
        date,
        amount: delta,
        description: note,
        status: "CLEARED",
      },
    });
    await db.account.update({
      where: { id },
      data: { lastValuedAt: date },
    });
    await recalculateBalance(id);
    redirect(`/accounts/${id}`);
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <Link
          href={`/accounts/${id}`}
          className="text-xs text-(--color-muted-foreground) hover:underline"
        >
          ← {account.name}
        </Link>
        <h1 className="text-2xl font-semibold mt-1">Revalue this account</h1>
        <p className="text-sm text-(--color-muted-foreground) mt-1">
          Enter the new value — the app records a transaction for the delta
          so your historical net worth stays accurate. Current value:{" "}
          <span className="font-medium">
            <Money pence={account.currentBalance} />
          </span>
          {account.lastValuedAt && (
            <>
              {" "}
              · last revalued{" "}
              {account.lastValuedAt.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </>
          )}
        </p>
      </div>

      <Card>
        <form action={revalue} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="newValue" className="text-sm font-medium">
                New value (£)
              </label>
              <input
                id="newValue"
                name="newValue"
                type="text"
                inputMode="decimal"
                required
                placeholder="e.g. 380000 or -12500"
                className="input"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="date" className="text-sm font-medium">
                Valuation date
              </label>
              <input
                id="date"
                name="date"
                type="date"
                defaultValue={today}
                className="input"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label htmlFor="note" className="text-sm font-medium">
              Note (optional)
            </label>
            <input
              id="note"
              name="note"
              placeholder="e.g. Property valuation report Jan 2026"
              className="input"
            />
          </div>
          <div className="flex justify-end">
            <button type="submit" className="btn-primary">
              Save revaluation
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
