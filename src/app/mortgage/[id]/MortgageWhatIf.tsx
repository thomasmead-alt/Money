"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/Card";
import { Money } from "@/components/Money";
import {
  amortisationSchedule,
  summariseSchedule,
} from "@/lib/finance/amortisation";

interface Props {
  outstanding: number;
  ratePercent: number;
  termMonths: number;
  monthlyPayment: number;
}

export function MortgageWhatIf({
  outstanding,
  ratePercent,
  termMonths,
  monthlyPayment,
}: Props) {
  const [overpay, setOverpay] = useState<number>(0); // pence/month
  const [lumpSum, setLumpSum] = useState<number>(0); // pence one-off
  const [rate, setRate] = useState<number>(ratePercent);

  const start = useMemo(() => new Date(), []);

  const baseline = useMemo(
    () =>
      amortisationSchedule({
        principal: outstanding,
        annualRatePercent: ratePercent,
        termMonths,
        startDate: start,
        monthlyPayment,
      }),
    [outstanding, ratePercent, termMonths, monthlyPayment, start],
  );

  const scenario = useMemo(
    () =>
      amortisationSchedule({
        principal: Math.max(0, outstanding - lumpSum),
        annualRatePercent: rate,
        termMonths,
        startDate: start,
        monthlyPayment,
        overpaymentMonthly: overpay,
      }),
    [outstanding, lumpSum, rate, termMonths, monthlyPayment, overpay, start],
  );

  const baseSummary = summariseSchedule(baseline);
  const scenSummary = summariseSchedule(scenario);

  const interestSaved = baseSummary.totalInterest - scenSummary.totalInterest;
  const monthsSaved =
    baseSummary.termMonthsActual - scenSummary.termMonthsActual;

  return (
    <Card title="What-if calculator">
      <div className="grid sm:grid-cols-3 gap-4 mb-6 text-sm">
        <label className="space-y-2">
          <div className="flex justify-between">
            <span className="font-medium">Overpay £/month</span>
            <span className="tabular-nums">
              <Money pence={overpay} />
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100_000}
            step={5_00}
            value={overpay}
            onChange={(e) => setOverpay(Number(e.target.value))}
            className="w-full accent-(--color-accent)"
          />
          <div className="text-xs text-(--color-muted-foreground)">
            0 to £1,000 / month
          </div>
        </label>

        <label className="space-y-2">
          <div className="flex justify-between">
            <span className="font-medium">One-off lump sum</span>
            <span className="tabular-nums">
              <Money pence={lumpSum} />
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={Math.max(outstanding, 1)}
            step={1000_00}
            value={lumpSum}
            onChange={(e) => setLumpSum(Number(e.target.value))}
            className="w-full accent-(--color-accent)"
          />
          <div className="text-xs text-(--color-muted-foreground)">
            up to outstanding balance
          </div>
        </label>

        <label className="space-y-2">
          <div className="flex justify-between">
            <span className="font-medium">Rate %</span>
            <span className="tabular-nums">{rate.toFixed(2)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={Math.max(15, ratePercent + 5)}
            step={0.1}
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            className="w-full accent-(--color-accent)"
          />
          <div className="text-xs text-(--color-muted-foreground)">
            stress-test against a rate rise
          </div>
        </label>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-lg border border-(--color-border) p-4">
          <div className="text-xs uppercase tracking-wide text-(--color-muted-foreground)">
            Baseline (no changes)
          </div>
          <div className="mt-2 text-sm space-y-1">
            <div className="flex justify-between">
              <span>Total interest</span>
              <Money pence={baseSummary.totalInterest} className="font-medium" />
            </div>
            <div className="flex justify-between">
              <span>Payoff in</span>
              <span className="font-medium tabular-nums">
                {Math.floor(baseSummary.termMonthsActual / 12)}y{" "}
                {baseSummary.termMonthsActual % 12}m
              </span>
            </div>
            <div className="flex justify-between">
              <span>Payoff date</span>
              <span className="tabular-nums">
                {baseSummary.payoffDate.toLocaleDateString("en-GB", {
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-(--color-accent)/50 p-4 bg-(--color-accent)/5">
          <div className="text-xs uppercase tracking-wide text-(--color-accent)">
            Scenario
          </div>
          <div className="mt-2 text-sm space-y-1">
            <div className="flex justify-between">
              <span>Total interest</span>
              <Money pence={scenSummary.totalInterest} className="font-medium" />
            </div>
            <div className="flex justify-between">
              <span>Payoff in</span>
              <span className="font-medium tabular-nums">
                {Math.floor(scenSummary.termMonthsActual / 12)}y{" "}
                {scenSummary.termMonthsActual % 12}m
              </span>
            </div>
            <div className="flex justify-between">
              <span>Payoff date</span>
              <span className="tabular-nums">
                {scenSummary.payoffDate.toLocaleDateString("en-GB", {
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid sm:grid-cols-2 gap-3 text-sm">
        <div
          className={`rounded-md p-3 ${
            interestSaved >= 0
              ? "bg-(--color-positive)/10 text-(--color-positive)"
              : "bg-(--color-negative)/10 text-(--color-negative)"
          }`}
        >
          {interestSaved >= 0 ? "Saves" : "Costs extra"}{" "}
          <Money pence={Math.abs(interestSaved)} className="font-medium" /> in
          interest.
        </div>
        <div
          className={`rounded-md p-3 ${
            monthsSaved > 0
              ? "bg-(--color-positive)/10 text-(--color-positive)"
              : monthsSaved < 0
                ? "bg-(--color-negative)/10 text-(--color-negative)"
                : "bg-(--color-muted) text-(--color-muted-foreground)"
          }`}
        >
          {monthsSaved > 0
            ? `Paid off ${monthsSaved} month${monthsSaved === 1 ? "" : "s"} earlier.`
            : monthsSaved < 0
              ? `Paid off ${-monthsSaved} month${monthsSaved === -1 ? "" : "s"} later.`
              : "Same payoff date."}
        </div>
      </div>
    </Card>
  );
}
