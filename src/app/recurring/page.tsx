import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Card } from "@/components/Card";
import { Money } from "@/components/Money";
import { parseGBP } from "@/lib/money";
import type { Frequency } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

export default async function RecurringPage() {
  const recurring = await db.recurringExpense.findMany({
    where: { isActive: true },
    include: { account: true, category: true },
    orderBy: { nextDue: "asc" },
  });

  const accounts = await db.account.findMany({
    where: { archivedAt: null, type: { in: ["CURRENT", "SAVINGS"] } },
    orderBy: { name: "asc" },
  });

  async function create(formData: FormData) {
    "use server";
    const name = String(formData.get("name") ?? "").trim();
    const amount = parseGBP(String(formData.get("amount") ?? "0"));
    const accountId = String(formData.get("accountId") ?? "").trim();
    const frequency = String(formData.get("frequency") ?? "MONTHLY") as Frequency;
    const dateRaw = String(formData.get("startDate") ?? "");
    const startDate = new Date(dateRaw);
    if (!name || Number.isNaN(startDate.getTime()) || !accountId) {
      throw new Error("Name, account and start date are required");
    }
    const dayOfMonth = frequency === "MONTHLY" || frequency === "ANNUALLY"
      ? startDate.getDate()
      : null;
    const dayOfWeek = frequency === "WEEKLY" ? startDate.getDay() : null;
    const monthOfYear = frequency === "ANNUALLY" ? startDate.getMonth() + 1 : null;
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
    redirect("/recurring");
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Recurring expenses</h1>

      <Card title="Add a recurring expense">
        <form action={create} className="grid sm:grid-cols-6 gap-3 text-sm">
          <input
            name="name"
            placeholder="e.g. Netflix"
            required
            className="input sm:col-span-2"
          />
          <input
            name="amount"
            placeholder="-10.99"
            inputMode="decimal"
            required
            className="input"
          />
          <select name="accountId" required className="input">
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <select name="frequency" defaultValue="MONTHLY" className="input">
            <option value="DAILY">Daily</option>
            <option value="WEEKLY">Weekly</option>
            <option value="MONTHLY">Monthly</option>
            <option value="ANNUALLY">Annually</option>
          </select>
          <input
            name="startDate"
            type="date"
            defaultValue={today}
            required
            className="input"
          />
          <button
            type="submit"
            className="sm:col-span-6 justify-self-end btn-primary"
          >
            Add
          </button>
        </form>
      </Card>

      <Card title="Active recurring">
        {recurring.length === 0 ? (
          <p className="text-sm text-(--color-muted-foreground)">
            No recurring expenses yet.
          </p>
        ) : (
          <ul className="divide-y divide-(--color-border) -my-2">
            {recurring.map((r) => (
              <li
                key={r.id}
                className="py-2 flex items-center justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{r.name}</div>
                  <div className="text-xs text-(--color-muted-foreground)">
                    {r.frequency.toLowerCase()} · next{" "}
                    {r.nextDue.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })}{" "}
                    ·{" "}
                    <Link
                      href={`/accounts/${r.accountId}`}
                      className="hover:underline"
                    >
                      {r.account.name}
                    </Link>
                  </div>
                </div>
                <Money
                  pence={r.amount}
                  colorBySign
                  className="text-sm font-medium"
                />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
