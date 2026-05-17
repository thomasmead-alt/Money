import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Export every domain model as one JSON file. Plain-text, version-control
 * friendly, restorable by an import script (TODO Phase 5).
 */
export async function GET() {
  const [
    accounts,
    transactions,
    categories,
    categoryRules,
    recurring,
    scheduled,
    offers,
    mortgages,
    budgets,
    budgetLines,
    forecastScenarios,
    forecastOverrides,
    importBatches,
    balanceSnapshots,
    goals,
    rewardRules,
    settings,
  ] = await Promise.all([
    db.account.findMany(),
    db.transaction.findMany(),
    db.category.findMany(),
    db.categoryRule.findMany(),
    db.recurringExpense.findMany(),
    db.scheduledOneOff.findMany(),
    db.creditCardOffer.findMany(),
    db.mortgageDetails.findMany(),
    db.budgetPeriod.findMany(),
    db.budgetLine.findMany(),
    db.forecastScenario.findMany(),
    db.forecastOverride.findMany(),
    db.importBatch.findMany(),
    db.balanceSnapshot.findMany(),
    db.goal.findMany(),
    db.cardRewardRule.findMany(),
    db.setting.findMany(),
  ]);

  const payload = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    accounts,
    transactions,
    categories,
    categoryRules,
    recurringExpenses: recurring,
    scheduledOneOffs: scheduled,
    creditCardOffers: offers,
    mortgageDetails: mortgages,
    budgetPeriods: budgets,
    budgetLines,
    forecastScenarios,
    forecastOverrides,
    importBatches,
    balanceSnapshots,
    goals,
    cardRewardRules: rewardRules,
    settings,
  };

  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `money-${stamp}.json`;

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
