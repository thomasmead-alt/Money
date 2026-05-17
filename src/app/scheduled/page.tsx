import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { Card } from "@/components/Card";
import { Money } from "@/components/Money";
import { parseGBP } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function ScheduledPage() {
  const [items, accounts, categories] = await Promise.all([
    db.scheduledOneOff.findMany({
      where: { paidAt: null },
      include: { account: true, category: true },
      orderBy: { date: "asc" },
    }),
    db.account.findMany({
      where: { archivedAt: null, type: { in: ["CURRENT", "SAVINGS"] } },
      orderBy: { name: "asc" },
    }),
    db.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  async function create(formData: FormData) {
    "use server";
    const name = String(formData.get("name") ?? "").trim();
    const amount = parseGBP(String(formData.get("amount") ?? "0"));
    const accountId = String(formData.get("accountId") ?? "").trim();
    const date = new Date(String(formData.get("date") ?? ""));
    const categoryId = String(formData.get("categoryId") ?? "").trim() || null;
    if (!name || !accountId || Number.isNaN(date.getTime())) {
      throw new Error("Name, account and date are required");
    }
    await db.scheduledOneOff.create({
      data: {
        name,
        amount,
        accountId,
        date,
        categoryId,
        isCommitted: true,
      },
    });
    redirect("/scheduled");
  }

  async function markPaid(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");
    if (!id) return;
    await db.scheduledOneOff.update({
      where: { id },
      data: { paidAt: new Date() },
    });
    redirect("/scheduled");
  }

  async function remove(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");
    if (!id) return;
    await db.scheduledOneOff.delete({ where: { id } });
    redirect("/scheduled");
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Scheduled one-offs</h1>
      <p className="text-sm text-(--color-muted-foreground) -mt-3">
        Holidays, Christmas, MOT, insurance renewals, big appliances — anything
        that lands once and you want the forecast to see coming.
      </p>

      <Card title="Add a scheduled item">
        <form action={create} className="grid sm:grid-cols-6 gap-3 text-sm">
          <input
            name="name"
            placeholder="e.g. Summer holiday"
            required
            className="input sm:col-span-2"
          />
          <input
            name="amount"
            placeholder="-1200"
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
          <select name="categoryId" defaultValue="" className="input">
            <option value="">— uncategorised —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            name="date"
            type="date"
            required
            defaultValue={today}
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

      <Card title={`Upcoming (${items.length})`}>
        {items.length === 0 ? (
          <p className="text-sm text-(--color-muted-foreground)">
            Nothing scheduled. Add a holiday or Christmas budget so the
            forecast factors it in.
          </p>
        ) : (
          <ul className="divide-y divide-(--color-border) -my-2">
            {items.map((it) => (
              <li
                key={it.id}
                className="py-3 flex items-center justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{it.name}</div>
                  <div className="text-xs text-(--color-muted-foreground)">
                    {it.date.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}{" "}
                    ·{" "}
                    <Link
                      href={`/accounts/${it.accountId}`}
                      className="hover:underline"
                    >
                      {it.account.name}
                    </Link>
                    {it.category ? ` · ${it.category.name}` : ""}
                  </div>
                </div>
                <Money
                  pence={it.amount}
                  colorBySign
                  className="text-sm font-medium"
                />
                <form action={markPaid}>
                  <input type="hidden" name="id" value={it.id} />
                  <button
                    type="submit"
                    className="text-xs text-(--color-accent) hover:underline"
                  >
                    mark paid
                  </button>
                </form>
                <form action={remove}>
                  <input type="hidden" name="id" value={it.id} />
                  <button
                    type="submit"
                    className="text-xs text-(--color-negative) hover:underline"
                  >
                    delete
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
