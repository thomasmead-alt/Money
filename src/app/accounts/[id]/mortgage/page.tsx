import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Card } from "@/components/Card";
import { parseGBP, formatGBP } from "@/lib/money";
import { computeMonthlyPayment } from "@/lib/finance/amortisation";
import type { MortgageRateType } from "@/generated/prisma/enums";

export default async function MortgageSetupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const account = await db.account.findUnique({
    where: { id },
    include: { mortgageDetails: true },
  });
  if (!account) notFound();
  if (account.type !== "MORTGAGE") {
    return (
      <div className="max-w-xl mx-auto">
        <p className="text-sm text-(--color-muted-foreground)">
          This page is only available for mortgage accounts.
        </p>
      </div>
    );
  }

  const currentBalanceAbs = Math.abs(account.currentBalance);
  const hasExistingDetails = account.mortgageDetails != null;

  async function save(formData: FormData) {
    "use server";
    const originalPrincipal = parseGBP(
      String(formData.get("originalPrincipal") ?? "0"),
    );
    const currentRate = Number(formData.get("currentRate") ?? 0) || 0;
    const rateType = String(formData.get("rateType") ?? "FIXED") as MortgageRateType;
    const rateEndRaw = String(formData.get("rateEndDate") ?? "").trim();
    const rateEndDate = rateEndRaw ? new Date(rateEndRaw) : null;
    const termMonths = Number(formData.get("termMonths") ?? 0) || 0;
    const startDate = new Date(String(formData.get("startDate") ?? ""));
    const paymentDay = Number(formData.get("paymentDay") ?? 1) || 1;
    const monthlyPaymentRaw = String(formData.get("monthlyPayment") ?? "").trim();
    let monthlyPayment = monthlyPaymentRaw
      ? parseGBP(monthlyPaymentRaw)
      : 0;

    if (originalPrincipal <= 0) throw new Error("Original principal required");
    if (termMonths <= 0) throw new Error("Term in months required");
    if (Number.isNaN(startDate.getTime())) throw new Error("Start date required");

    // Compute monthly payment from remaining balance if not provided.
    if (monthlyPayment <= 0) {
      monthlyPayment = computeMonthlyPayment(
        currentBalanceAbs || originalPrincipal,
        currentRate,
        termMonths,
      );
    }

    if (hasExistingDetails) {
      await db.mortgageDetails.update({
        where: { accountId: id },
        data: {
          originalPrincipal,
          currentRate,
          rateType,
          rateEndDate,
          termMonths,
          startDate,
          monthlyPayment,
          paymentDay,
        },
      });
    } else {
      await db.mortgageDetails.create({
        data: {
          accountId: id,
          originalPrincipal,
          currentRate,
          rateType,
          rateEndDate,
          termMonths,
          startDate,
          monthlyPayment,
          paymentDay,
        },
      });
    }
    redirect("/mortgage");
  }

  const m = account.mortgageDetails;
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
        <h1 className="text-2xl font-semibold mt-1">
          {m ? "Edit mortgage details" : "Set up mortgage details"}
        </h1>
        <p className="text-sm text-(--color-muted-foreground) mt-1">
          Current outstanding balance is{" "}
          <span className="font-medium">
            {formatGBP(Math.abs(account.currentBalance))}
          </span>
          . Leave monthly payment blank to compute it automatically from rate
          and remaining term.
        </p>
      </div>
      <Card>
        <form action={save} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="originalPrincipal" className="text-sm font-medium">
                Original principal (£)
              </label>
              <input
                id="originalPrincipal"
                name="originalPrincipal"
                type="text"
                inputMode="decimal"
                required
                defaultValue={
                  m ? (m.originalPrincipal / 100).toFixed(2) : ""
                }
                className="input"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="termMonths" className="text-sm font-medium">
                Term (months)
              </label>
              <input
                id="termMonths"
                name="termMonths"
                type="number"
                min="1"
                required
                defaultValue={m?.termMonths ?? 300}
                className="input"
              />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="currentRate" className="text-sm font-medium">
                Current rate %
              </label>
              <input
                id="currentRate"
                name="currentRate"
                type="number"
                step="0.01"
                required
                defaultValue={m?.currentRate ?? ""}
                className="input"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="rateType" className="text-sm font-medium">
                Rate type
              </label>
              <select
                id="rateType"
                name="rateType"
                defaultValue={m?.rateType ?? "FIXED"}
                className="input"
              >
                <option value="FIXED">Fixed</option>
                <option value="TRACKER">Tracker</option>
                <option value="SVR">Standard variable</option>
              </select>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="rateEndDate" className="text-sm font-medium">
                Rate end date (if fixed)
              </label>
              <input
                id="rateEndDate"
                name="rateEndDate"
                type="date"
                defaultValue={
                  m?.rateEndDate
                    ? m.rateEndDate.toISOString().slice(0, 10)
                    : ""
                }
                className="input"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="startDate" className="text-sm font-medium">
                Mortgage start date
              </label>
              <input
                id="startDate"
                name="startDate"
                type="date"
                required
                defaultValue={
                  m?.startDate
                    ? m.startDate.toISOString().slice(0, 10)
                    : today
                }
                className="input"
              />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="monthlyPayment" className="text-sm font-medium">
                Monthly payment (£, optional)
              </label>
              <input
                id="monthlyPayment"
                name="monthlyPayment"
                type="text"
                inputMode="decimal"
                placeholder="Auto-calculate"
                defaultValue={
                  m ? (m.monthlyPayment / 100).toFixed(2) : ""
                }
                className="input"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="paymentDay" className="text-sm font-medium">
                Payment day of month
              </label>
              <input
                id="paymentDay"
                name="paymentDay"
                type="number"
                min="1"
                max="28"
                defaultValue={m?.paymentDay ?? 1}
                className="input"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" className="btn-primary">
              {m ? "Save changes" : "Set up mortgage"}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
