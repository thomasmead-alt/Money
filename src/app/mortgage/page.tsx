import Link from "next/link";
import { db } from "@/lib/db";
import { Card, Stat } from "@/components/Card";
import { Money } from "@/components/Money";
import {
  amortisationSchedule,
  summariseSchedule,
} from "@/lib/finance/amortisation";

export const dynamic = "force-dynamic";

export default async function MortgagePage() {
  const mortgages = await db.account.findMany({
    where: { type: "MORTGAGE", archivedAt: null },
    include: { mortgageDetails: true },
  });

  if (mortgages.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Mortgages</h1>
        <Card>
          <p className="text-sm text-(--color-muted-foreground)">
            No mortgage accounts yet.{" "}
            <Link
              href="/accounts/new"
              className="text-(--color-accent) hover:underline"
            >
              Add a mortgage
            </Link>{" "}
            to see the amortisation schedule and overpayment what-if.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Mortgages</h1>
      {mortgages.map((m) => {
        const details = m.mortgageDetails;
        if (!details) {
          return (
            <Card key={m.id} title={m.name}>
              <p className="text-sm text-(--color-muted-foreground)">
                No mortgage details set up yet for this account.
              </p>
            </Card>
          );
        }
        const remaining = Math.abs(m.currentBalance);
        const schedule = amortisationSchedule({
          principal: remaining,
          annualRatePercent: details.currentRate,
          termMonths: details.termMonths,
          startDate: new Date(),
          monthlyPayment: details.monthlyPayment,
        });
        const summary = summariseSchedule(schedule);
        const overpaySchedule = amortisationSchedule({
          principal: remaining,
          annualRatePercent: details.currentRate,
          termMonths: details.termMonths,
          startDate: new Date(),
          monthlyPayment: details.monthlyPayment,
          overpaymentMonthly: 10000, // £100/mo what-if
        });
        const overpaySummary = summariseSchedule(overpaySchedule);
        const interestSaved =
          summary.totalInterest - overpaySummary.totalInterest;

        return (
          <Card
            key={m.id}
            title={m.name}
            action={
              <Link
                href={`/accounts/${m.id}`}
                className="text-sm text-(--color-accent)"
              >
                Account details →
              </Link>
            }
          >
            <div className="grid sm:grid-cols-4 gap-4">
              <Stat
                label="Outstanding"
                value={<Money pence={remaining} />}
                tone="negative"
              />
              <Stat
                label="Rate"
                value={`${details.currentRate.toFixed(2)}%`}
                hint={details.rateType.toLowerCase()}
              />
              <Stat
                label="Monthly payment"
                value={<Money pence={details.monthlyPayment} />}
              />
              <Stat
                label="Total interest"
                value={<Money pence={summary.totalInterest} />}
                hint={`Paid off in ${Math.round(
                  summary.termMonthsActual / 12,
                )}y ${summary.termMonthsActual % 12}m`}
              />
            </div>

            <div className="mt-6 rounded-lg border border-(--color-border) p-4 bg-(--color-muted)/40">
              <div className="text-sm font-medium mb-1">
                Overpay £100/month what-if
              </div>
              <div className="text-sm text-(--color-muted-foreground)">
                Pays off {summary.termMonthsActual - overpaySummary.termMonthsActual} months earlier — saving roughly{" "}
                <Money pence={interestSaved} colorBySign /> in interest.
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
