import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Card } from "@/components/Card";
import { parseGBP } from "@/lib/money";
import type { CreditCardOfferType } from "@/generated/prisma/enums";

export default async function NewOfferPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const account = await db.account.findUnique({ where: { id } });
  if (!account) notFound();
  if (account.type !== "CREDIT_CARD") {
    return (
      <div className="max-w-xl mx-auto">
        <p className="text-sm text-(--color-muted-foreground)">
          Offers can only be added to credit card accounts.
        </p>
      </div>
    );
  }

  async function createOffer(formData: FormData) {
    "use server";
    const offerType = String(formData.get("offerType") ?? "BALANCE_TRANSFER") as CreditCardOfferType;
    const description = String(formData.get("description") ?? "").trim() || null;
    const amount = parseGBP(String(formData.get("amount") ?? "0"));
    const feePercent = Number(formData.get("feePercent") ?? 0) || 0;
    const promoApr = Number(formData.get("promoApr") ?? 0) || 0;
    const postPromoApr = Number(formData.get("postPromoApr") ?? 0) || 0;
    const promoStartDate = new Date(String(formData.get("promoStartDate") ?? ""));
    const promoEndDate = new Date(String(formData.get("promoEndDate") ?? ""));
    const minPaymentPercent = Number(formData.get("minPaymentPercent") ?? 2.5) || 2.5;

    if (
      Number.isNaN(promoStartDate.getTime()) ||
      Number.isNaN(promoEndDate.getTime())
    ) {
      throw new Error("Both promo start and end dates are required");
    }
    if (promoEndDate <= promoStartDate) {
      throw new Error("Promo end date must be after start date");
    }

    const feeAmount = Math.round((amount * feePercent) / 100);

    await db.creditCardOffer.create({
      data: {
        accountId: id,
        offerType,
        description,
        amount,
        feePercent,
        feeAmount,
        promoApr,
        postPromoApr,
        promoStartDate,
        promoEndDate,
        minPaymentPercent,
        status: "ACTIVE",
      },
    });
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
        <h1 className="text-2xl font-semibold mt-1">Add a card offer</h1>
        <p className="text-sm text-(--color-muted-foreground) mt-1">
          Balance transfers, 0% purchases, and money-transfer offers all live
          here. Set the promo end date so you get warned 60 days before it
          expires.
        </p>
      </div>
      <Card>
        <form action={createOffer} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="offerType" className="text-sm font-medium">
              Offer type
            </label>
            <select
              id="offerType"
              name="offerType"
              required
              defaultValue="BALANCE_TRANSFER"
              className="input"
            >
              <option value="BALANCE_TRANSFER">Balance transfer</option>
              <option value="PURCHASE">0% on purchases</option>
              <option value="MONEY_TRANSFER">Money transfer</option>
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="description" className="text-sm font-medium">
              Description (optional)
            </label>
            <input
              id="description"
              name="description"
              placeholder="e.g. 0% BT 21 months — 2.99% fee"
              className="input"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="amount" className="text-sm font-medium">
                Amount on promo (£)
              </label>
              <input
                id="amount"
                name="amount"
                type="text"
                inputMode="decimal"
                defaultValue="0"
                className="input"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="feePercent" className="text-sm font-medium">
                Fee %
              </label>
              <input
                id="feePercent"
                name="feePercent"
                type="number"
                step="0.01"
                defaultValue="0"
                className="input"
              />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="promoStartDate" className="text-sm font-medium">
                Promo start
              </label>
              <input
                id="promoStartDate"
                name="promoStartDate"
                type="date"
                required
                defaultValue={today}
                className="input"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="promoEndDate" className="text-sm font-medium">
                Promo end
              </label>
              <input
                id="promoEndDate"
                name="promoEndDate"
                type="date"
                required
                className="input"
              />
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label htmlFor="promoApr" className="text-sm font-medium">
                Promo APR %
              </label>
              <input
                id="promoApr"
                name="promoApr"
                type="number"
                step="0.01"
                defaultValue="0"
                className="input"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="postPromoApr" className="text-sm font-medium">
                Reverts to APR %
              </label>
              <input
                id="postPromoApr"
                name="postPromoApr"
                type="number"
                step="0.01"
                defaultValue="22.9"
                className="input"
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="minPaymentPercent"
                className="text-sm font-medium"
              >
                Min payment %
              </label>
              <input
                id="minPaymentPercent"
                name="minPaymentPercent"
                type="number"
                step="0.01"
                defaultValue="2.5"
                className="input"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" className="btn-primary">
              Save offer
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
