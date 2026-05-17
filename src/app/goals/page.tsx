import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { Card } from "@/components/Card";
import { Money } from "@/components/Money";
import { parseGBP, formatGBP } from "@/lib/money";
import { computeGoalProgress } from "@/lib/finance/goals";
import type { GoalKind } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const [goals, accounts] = await Promise.all([
    db.goal.findMany({
      include: { linkedAccount: true },
      orderBy: [{ targetDate: "asc" }, { createdAt: "asc" }],
    }),
    db.account.findMany({
      where: { archivedAt: null, type: { in: ["CURRENT", "SAVINGS"] } },
      orderBy: { name: "asc" },
    }),
  ]);

  async function create(formData: FormData) {
    "use server";
    const name = String(formData.get("name") ?? "").trim();
    const kind = String(formData.get("kind") ?? "SAVINGS_TARGET") as GoalKind;
    const targetAmount = parseGBP(String(formData.get("targetAmount") ?? "0"));
    const currentAmount = parseGBP(String(formData.get("currentAmount") ?? "0"));
    const targetDateRaw = String(formData.get("targetDate") ?? "").trim();
    const targetDate = targetDateRaw ? new Date(targetDateRaw) : null;
    const monthlyRaw = String(formData.get("monthlyContribution") ?? "").trim();
    const monthlyContribution = monthlyRaw ? parseGBP(monthlyRaw) : null;
    const linkedAccountId =
      String(formData.get("linkedAccountId") ?? "").trim() || null;

    if (!name) throw new Error("Name required");
    if (targetAmount <= 0) throw new Error("Target amount must be positive");

    await db.goal.create({
      data: {
        name,
        kind,
        targetAmount,
        currentAmount,
        targetDate,
        monthlyContribution,
        linkedAccountId,
      },
    });
    redirect("/goals");
  }

  async function remove(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");
    if (!id) return;
    await db.goal.delete({ where: { id } });
    redirect("/goals");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Goals & sinking funds</h1>
      <p className="text-sm text-(--color-muted-foreground) -mt-3">
        Track savings targets (house deposit, emergency fund) and sinking
        funds (Christmas, MOT, insurance) so big annual costs feel routine.
      </p>

      <Card title="Add a goal">
        <form action={create} className="grid sm:grid-cols-6 gap-3 text-sm">
          <input
            name="name"
            placeholder="e.g. House deposit"
            required
            className="input sm:col-span-2"
          />
          <select name="kind" defaultValue="SAVINGS_TARGET" className="input">
            <option value="SAVINGS_TARGET">Savings target</option>
            <option value="SINKING_FUND">Sinking fund</option>
            <option value="DEBT_PAYOFF">Debt payoff</option>
          </select>
          <input
            name="targetAmount"
            placeholder="Target £"
            inputMode="decimal"
            required
            className="input"
          />
          <input
            name="currentAmount"
            placeholder="Already saved £"
            inputMode="decimal"
            defaultValue="0"
            className="input"
          />
          <input
            name="targetDate"
            type="date"
            className="input"
          />
          <input
            name="monthlyContribution"
            placeholder="Planned £/mo"
            inputMode="decimal"
            className="input"
          />
          <select
            name="linkedAccountId"
            defaultValue=""
            className="input sm:col-span-2"
          >
            <option value="">— no linked account —</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="sm:col-span-6 justify-self-end btn-primary"
          >
            Add goal
          </button>
        </form>
      </Card>

      {goals.length === 0 ? (
        <Card>
          <p className="text-sm text-(--color-muted-foreground)">
            No goals yet.
          </p>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {goals.map((g) => {
            const progress = computeGoalProgress(
              g.targetAmount,
              g.currentAmount,
              g.targetDate,
              g.monthlyContribution,
            );
            return (
              <Card key={g.id} title={g.name}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-(--color-muted-foreground)">
                    {g.kind.replace("_", " ").toLowerCase()}
                  </span>
                  <span className="font-medium tabular-nums">
                    <Money pence={g.currentAmount} /> /{" "}
                    <Money pence={g.targetAmount} />
                  </span>
                </div>
                <div className="mt-2 h-2 bg-(--color-muted) rounded-full overflow-hidden">
                  <div
                    className="h-full bg-(--color-accent)"
                    style={{ width: `${progress.percentComplete}%` }}
                  />
                </div>
                <div className="mt-3 text-xs text-(--color-muted-foreground) space-y-1">
                  <div>
                    {progress.percentComplete.toFixed(0)}% complete ·{" "}
                    <Money pence={progress.remaining} /> to go
                  </div>
                  {g.targetDate && (
                    <div>
                      Target {g.targetDate.toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                      {progress.monthsRemaining != null
                        ? ` · ${progress.monthsRemaining} month${progress.monthsRemaining === 1 ? "" : "s"} left`
                        : ""}
                    </div>
                  )}
                  {progress.requiredMonthly != null &&
                    progress.requiredMonthly > 0 && (
                      <div>
                        Need <Money pence={progress.requiredMonthly} />/mo to
                        hit target
                      </div>
                    )}
                  {progress.onTrack === true && (
                    <div className="text-(--color-positive) font-medium">
                      On track ✓
                    </div>
                  )}
                  {progress.onTrack === false && (
                    <div className="text-(--color-warning) font-medium">
                      Off track — increase contribution or extend target date
                    </div>
                  )}
                  {g.linkedAccount && (
                    <div>
                      Linked to{" "}
                      <Link
                        href={`/accounts/${g.linkedAccount.id}`}
                        className="hover:underline"
                      >
                        {g.linkedAccount.name}
                      </Link>
                    </div>
                  )}
                </div>
                <form action={remove} className="mt-3 text-right">
                  <input type="hidden" name="id" value={g.id} />
                  <button
                    type="submit"
                    className="text-xs text-(--color-negative) hover:underline"
                  >
                    delete goal
                  </button>
                </form>
              </Card>
            );
          })}
        </div>
      )}
      <p className="text-xs text-(--color-muted-foreground) text-right">
        Total target {formatGBP(goals.reduce((s, g) => s + g.targetAmount, 0))}
      </p>
    </div>
  );
}
