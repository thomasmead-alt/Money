import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Card, Stat } from "@/components/Card";
import { Money } from "@/components/Money";
import { MortgageWhatIf } from "./MortgageWhatIf";

export const dynamic = "force-dynamic";

export default async function MortgageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const account = await db.account.findUnique({
    where: { id },
    include: { mortgageDetails: true },
  });
  if (!account || account.type !== "MORTGAGE") notFound();
  const details = account.mortgageDetails;
  const outstanding = Math.abs(account.currentBalance);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/mortgage"
          className="text-xs text-(--color-muted-foreground) hover:underline"
        >
          ← All mortgages
        </Link>
        <h1 className="text-2xl font-semibold mt-1">{account.name}</h1>
      </div>

      {!details ? (
        <Card>
          <p className="text-sm text-(--color-muted-foreground) mb-3">
            No mortgage details set up yet — configure them first.
          </p>
          <Link href={`/accounts/${account.id}/mortgage`} className="btn-primary">
            Set up mortgage
          </Link>
        </Card>
      ) : (
        <>
          <div className="grid sm:grid-cols-4 gap-4">
            <Card>
              <Stat
                label="Outstanding"
                value={<Money pence={outstanding} />}
                tone="negative"
              />
            </Card>
            <Card>
              <Stat
                label="Rate"
                value={`${details.currentRate.toFixed(2)}%`}
                hint={details.rateType.toLowerCase()}
              />
            </Card>
            <Card>
              <Stat
                label="Monthly payment"
                value={<Money pence={details.monthlyPayment} />}
              />
            </Card>
            <Card>
              <Stat
                label="Term"
                value={`${Math.round(details.termMonths / 12)}y ${details.termMonths % 12}m`}
                hint={
                  details.rateEndDate
                    ? `Rate ends ${details.rateEndDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
                    : ""
                }
              />
            </Card>
          </div>

          <MortgageWhatIf
            outstanding={outstanding}
            ratePercent={details.currentRate}
            termMonths={details.termMonths}
            monthlyPayment={details.monthlyPayment}
          />

          <div className="flex justify-end">
            <Link
              href={`/accounts/${account.id}/mortgage`}
              className="btn-secondary"
            >
              Edit mortgage details
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
