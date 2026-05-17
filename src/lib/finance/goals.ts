import { differenceInCalendarMonths } from "date-fns";

export interface GoalProgress {
  percentComplete: number; // 0..100
  remaining: number; // pence
  monthsRemaining: number | null;
  requiredMonthly: number | null; // pence to hit target by date
  onTrack: boolean | null;
}

export function computeGoalProgress(
  targetAmount: number,
  currentAmount: number,
  targetDate: Date | null,
  monthlyContribution: number | null,
  now: Date = new Date(),
): GoalProgress {
  const remaining = Math.max(0, targetAmount - currentAmount);
  const percentComplete =
    targetAmount > 0
      ? Math.max(0, Math.min(100, (currentAmount / targetAmount) * 100))
      : 0;

  let monthsRemaining: number | null = null;
  let requiredMonthly: number | null = null;
  let onTrack: boolean | null = null;

  if (targetDate) {
    const m = differenceInCalendarMonths(targetDate, now);
    monthsRemaining = Math.max(0, m);
    if (monthsRemaining > 0 && remaining > 0) {
      requiredMonthly = Math.ceil(remaining / monthsRemaining);
      if (monthlyContribution != null) {
        onTrack = monthlyContribution >= requiredMonthly;
      }
    } else if (remaining === 0) {
      onTrack = true;
      requiredMonthly = 0;
    } else {
      // target date has passed and not hit
      onTrack = false;
    }
  }

  return {
    percentComplete,
    remaining,
    monthsRemaining,
    requiredMonthly,
    onTrack,
  };
}
