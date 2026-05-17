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

  const MANUAL_VALUATION_TYPES: AccountType[] = [
    "INVESTMENT",
    "PENSION",
    "PROPERTY",
    "VEHICLE",
    "OTHER_ASSET",
    "OTHER_LIABILITY",
    "LOAN",
  ];

  const account = await db.account.create({
    data: {
      name,
      type,
      institution,
      openingBalance,
      currentBalance: openingBalance,
      creditLimit,
      lastValuedAt: MANUAL_VALUATION_TYPES.includes(type) ? new Date() : null,
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
              <optgroup label="Spending">
                <option value="CURRENT">Current account</option>
                <option value="SAVINGS">Savings</option>
              </optgroup>
              <optgroup label="Debt">
                <option value="CREDIT_CARD">Credit card</option>
                <option value="MORTGAGE">Mortgage</option>
                <option value="LOAN">Loan / BNPL / car finance</option>
                <option value="OTHER_LIABILITY">Other liability</option>
              </optgroup>
              <optgroup label="Assets">
                <option value="INVESTMENT">Investment (ISA / GIA / SIPP)</option>
                <option value="PENSION">Pension</option>
                <option value="PROPERTY">Property</option>
                <option value="VEHICLE">Vehicle</option>
                <option value="OTHER_ASSET">Other asset</option>
              </optgroup>
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
            <button type="submit" className="btn-primary">
              Create account
            </button>
          </div>
        </form>
      </Card>
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
