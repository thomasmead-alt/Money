import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Card } from "@/components/Card";
import { parseGBP } from "@/lib/money";
import type { AccountType } from "@/generated/prisma/enums";

async function createAccount(formData: FormData) {
  "use server";
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "CURRENT") as AccountType;
  const institution = String(formData.get("institution") ?? "").trim() || null;
  const openingBalance = parseGBP(String(formData.get("openingBalance") ?? "0"));
  const creditLimitRaw = String(formData.get("creditLimit") ?? "").trim();
  const creditLimit = creditLimitRaw ? parseGBP(creditLimitRaw) : null;

  if (!name) {
    throw new Error("Account name is required");
  }

  const account = await db.account.create({
    data: {
      name,
      type,
      institution,
      openingBalance,
      currentBalance: openingBalance,
      creditLimit,
      provider: "MANUAL",
    },
  });
  redirect(`/accounts/${account.id}`);
}

export default function NewAccountPage() {
  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Add an account</h1>
      <Card>
        <form action={createAccount} className="space-y-4">
          <Field label="Account name" htmlFor="name">
            <input
              id="name"
              name="name"
              required
              placeholder="e.g. Monzo Current Account"
              className="input"
            />
          </Field>
          <Field label="Type" htmlFor="type">
            <select id="type" name="type" required className="input" defaultValue="CURRENT">
              <option value="CURRENT">Current account</option>
              <option value="SAVINGS">Savings</option>
              <option value="CREDIT_CARD">Credit card</option>
              <option value="MORTGAGE">Mortgage</option>
            </select>
          </Field>
          <Field label="Institution" htmlFor="institution">
            <input
              id="institution"
              name="institution"
              placeholder="e.g. Monzo, HSBC, Barclays"
              className="input"
            />
          </Field>
          <Field
            label="Opening balance (£)"
            htmlFor="openingBalance"
            hint="Use a negative number for credit-card debt or mortgage outstanding (e.g. -12500)."
          >
            <input
              id="openingBalance"
              name="openingBalance"
              type="text"
              inputMode="decimal"
              required
              defaultValue="0"
              className="input"
            />
          </Field>
          <Field
            label="Credit limit (£, optional)"
            htmlFor="creditLimit"
            hint="Credit cards only."
          >
            <input
              id="creditLimit"
              name="creditLimit"
              type="text"
              inputMode="decimal"
              className="input"
            />
          </Field>
          <div className="flex justify-end gap-2">
            <button
              type="submit"
              className="inline-flex items-center rounded-md bg-(--color-accent) text-(--color-accent-foreground) px-4 py-2 text-sm font-medium hover:opacity-90"
            >
              Create account
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
        .input:focus {
          outline: 2px solid var(--color-accent);
          outline-offset: 1px;
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && (
        <p className="text-xs text-(--color-muted-foreground)">{hint}</p>
      )}
    </div>
  );
}
