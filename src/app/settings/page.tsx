import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card } from "@/components/Card";

export const dynamic = "force-dynamic";

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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <Card title="Categories">
        <form action={createCategory} className="grid sm:grid-cols-4 gap-3 mb-4 text-sm">
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
          <ul className="divide-y divide-(--color-border) -my-2">
            {categories.map((c) => (
              <li
                key={c.id}
                className="py-2 flex items-center justify-between text-sm"
              >
                <span className="font-medium">{c.name}</span>
                <span className="text-xs text-(--color-muted-foreground)">
                  {c.kind.toLowerCase()}
                </span>
              </li>
            ))}
          </ul>
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
