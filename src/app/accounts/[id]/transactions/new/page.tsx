import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Card } from "@/components/Card";
import { parseGBP } from "@/lib/money";
import { recalculateBalance } from "@/lib/import/persist";

export default async function NewTransactionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const account = await db.account.findUnique({ where: { id } });
  if (!account) notFound();

  const categories = await db.category.findMany({ orderBy: { name: "asc" } });

  async function createTransaction(formData: FormData) {
    "use server";
    const date = new Date(String(formData.get("date") ?? ""));
    const amount = parseGBP(String(formData.get("amount") ?? "0"));
    const description = String(formData.get("description") ?? "").trim();
    const categoryId = String(formData.get("categoryId") ?? "").trim() || null;
    const status =
      String(formData.get("status") ?? "CLEARED") === "PENDING"
        ? "PENDING"
        : "CLEARED";

    if (!description) throw new Error("Description is required");
    if (Number.isNaN(date.getTime())) throw new Error("Valid date is required");

    await db.transaction.create({
      data: {
        accountId: id,
        date,
        amount,
        description,
        categoryId,
        status,
      },
    });

    if (status === "CLEARED") {
      await recalculateBalance(id);
    }
    redirect(`/accounts/${id}`);
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <a
          href={`/accounts/${id}`}
          className="text-xs text-(--color-muted-foreground) hover:underline"
        >
          ← {account.name}
        </a>
        <h1 className="text-2xl font-semibold mt-1">Add transaction</h1>
      </div>
      <Card>
        <form action={createTransaction} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="date" className="text-sm font-medium">
                Date
              </label>
              <input
                id="date"
                name="date"
                type="date"
                required
                defaultValue={today}
                className="input"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="amount" className="text-sm font-medium">
                Amount (£)
              </label>
              <input
                id="amount"
                name="amount"
                type="text"
                inputMode="decimal"
                required
                placeholder="-50.00 for outflow"
                className="input"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label htmlFor="description" className="text-sm font-medium">
              Description
            </label>
            <input id="description" name="description" required className="input" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="categoryId" className="text-sm font-medium">
                Category
              </label>
              <select id="categoryId" name="categoryId" className="input">
                <option value="">— uncategorised —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="status" className="text-sm font-medium">
                Status
              </label>
              <select
                id="status"
                name="status"
                defaultValue="CLEARED"
                className="input"
              >
                <option value="CLEARED">Cleared</option>
                <option value="PENDING">Pending</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center rounded-md bg-(--color-accent) text-(--color-accent-foreground) px-4 py-2 text-sm font-medium hover:opacity-90"
            >
              Save transaction
            </button>
          </div>
        </form>
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
