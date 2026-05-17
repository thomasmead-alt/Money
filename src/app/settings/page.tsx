import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card } from "@/components/Card";

export const dynamic = "force-dynamic";

const TAX_BUCKETS = [
  { value: "", label: "—" },
  { value: "ISA_CONTRIBUTION", label: "ISA contribution" },
  { value: "PENSION_CONTRIBUTION", label: "Pension contribution" },
  { value: "DIVIDEND_INCOME", label: "Dividend income" },
  { value: "SAVINGS_INTEREST", label: "Savings interest" },
  { value: "TAXABLE_GAINS", label: "Taxable capital gain" },
];

export default async function SettingsPage() {
  const categories = await db.category.findMany({ orderBy: { name: "asc" } });

  async function createCategory(formData: FormData) {
    "use server";
    const name = String(formData.get("name") ?? "").trim();
    const kind = String(formData.get("kind") ?? "EXPENSE") as
      | "INCOME"
      | "EXPENSE"
      | "TRANSFER";
    if (!name) throw new Error("Name required");
    await db.category.create({ data: { name, kind } });
    redirect("/settings");
  }

  async function setTaxBucket(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");
    const bucket = String(formData.get("taxBucket") ?? "").trim() || null;
    if (!id) return;
    await db.category.update({
      where: { id },
      data: { taxBucket: bucket },
    });
    redirect("/settings");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <Card title="Categories">
        <form
          action={createCategory}
          className="grid sm:grid-cols-4 gap-3 mb-6 text-sm"
        >
          <input
            name="name"
            placeholder="Category name"
            required
            className="input sm:col-span-2"
          />
          <select name="kind" defaultValue="EXPENSE" className="input">
            <option value="EXPENSE">Expense</option>
            <option value="INCOME">Income</option>
            <option value="TRANSFER">Transfer</option>
          </select>
          <button type="submit" className="btn-primary">
            Add category
          </button>
        </form>

        {categories.length === 0 ? (
          <p className="text-sm text-(--color-muted-foreground)">
            No categories yet.
          </p>
        ) : (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-(--color-muted-foreground) uppercase tracking-wide">
                <tr>
                  <th className="px-5 py-2 font-medium">Name</th>
                  <th className="px-5 py-2 font-medium">Kind</th>
                  <th className="px-5 py-2 font-medium">Tax bucket</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--color-border)">
                {categories.map((c) => (
                  <tr key={c.id}>
                    <td className="px-5 py-2 font-medium">{c.name}</td>
                    <td className="px-5 py-2 text-(--color-muted-foreground)">
                      {c.kind.toLowerCase()}
                    </td>
                    <td className="px-5 py-2">
                      <form action={setTaxBucket} className="flex gap-2">
                        <input type="hidden" name="id" value={c.id} />
                        <select
                          name="taxBucket"
                          defaultValue={c.taxBucket ?? ""}
                          className="input"
                        >
                          {TAX_BUCKETS.map((b) => (
                            <option key={b.value} value={b.value}>
                              {b.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          className="text-xs text-(--color-accent) hover:underline"
                        >
                          save
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="About">
        <div className="text-sm space-y-1 text-(--color-muted-foreground)">
          <p>
            All data is stored locally in{" "}
            <code className="px-1 py-0.5 rounded bg-(--color-muted) text-xs">
              ./data/money.db
            </code>
            . Back it up by copying that file.
          </p>
          <p>
            Open Banking via GoCardless can be added later — the data model is
            ready for it.
          </p>
        </div>
      </Card>
    </div>
  );
}
