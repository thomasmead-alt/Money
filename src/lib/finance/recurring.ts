import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  endOfMonth,
  getDaysInMonth,
  isAfter,
  isBefore,
  isEqual,
  setDate,
  setDay,
  setMonth,
  startOfDay,
} from "date-fns";
import type { Frequency } from "@/generated/prisma/enums";

export interface RecurringRule {
  frequency: Frequency;
  interval: number;
  startDate: Date;
  endDate: Date | null;
  dayOfMonth: number | null;
  dayOfWeek: number | null; // 0=Sun .. 6=Sat
  monthOfYear: number | null; // 1..12
}

/**
 * Expand a recurring rule into the list of occurrence dates between [from, to] inclusive.
 *
 * Edge cases:
 * - dayOfMonth > days in month: clamped to last day of month (e.g. 31 → 28/29/30).
 * - DST is handled by date-fns at the day level.
 * - Stops at endDate if set, even if it falls inside the range.
 */
export function expandRecurring(
  rule: RecurringRule,
  from: Date,
  to: Date,
): Date[] {
  const start = startOfDay(rule.startDate);
  const rangeStart = startOfDay(from);
  const rangeEnd = startOfDay(to);
  const hardEnd = rule.endDate ? startOfDay(rule.endDate) : null;

  if (isAfter(start, rangeEnd)) return [];
  if (hardEnd && isBefore(hardEnd, rangeStart)) return [];

  const interval = Math.max(1, rule.interval);
  const results: Date[] = [];

  let cursor = nextAnchor(rule, start);
  // Fast-forward to the range. We advance until we're within or past rangeStart.
  let safety = 0;
  while (isBefore(cursor, rangeStart) && safety++ < 10000) {
    cursor = step(rule, cursor, interval);
  }

  while (
    (isEqual(cursor, rangeEnd) || isBefore(cursor, rangeEnd)) &&
    (!hardEnd || isBefore(cursor, hardEnd) || isEqual(cursor, hardEnd)) &&
    safety++ < 10000
  ) {
    if (
      (isEqual(cursor, rangeStart) || isAfter(cursor, rangeStart)) &&
      (isEqual(cursor, start) || isAfter(cursor, start))
    ) {
      results.push(cursor);
    }
    cursor = step(rule, cursor, interval);
  }

  return results;
}

function nextAnchor(rule: RecurringRule, start: Date): Date {
  // For MONTHLY we honour dayOfMonth; for WEEKLY dayOfWeek; for ANNUALLY monthOfYear+dayOfMonth.
  switch (rule.frequency) {
    case "DAILY":
      return start;
    case "WEEKLY":
      if (rule.dayOfWeek != null) {
        const aligned = setDay(start, rule.dayOfWeek, { weekStartsOn: 0 });
        return isBefore(aligned, start) ? addWeeks(aligned, 1) : aligned;
      }
      return start;
    case "MONTHLY": {
      if (rule.dayOfMonth != null) {
        const dom = clampDayOfMonth(start, rule.dayOfMonth);
        const aligned = setDate(start, dom);
        return isBefore(aligned, start) ? addMonths(aligned, 1) : aligned;
      }
      return start;
    }
    case "ANNUALLY": {
      let d = start;
      if (rule.monthOfYear != null) d = setMonth(d, rule.monthOfYear - 1);
      if (rule.dayOfMonth != null) {
        d = setDate(d, clampDayOfMonth(d, rule.dayOfMonth));
      }
      return isBefore(d, start) ? addYears(d, 1) : d;
    }
  }
}

function step(rule: RecurringRule, from: Date, interval: number): Date {
  switch (rule.frequency) {
    case "DAILY":
      return addDays(from, interval);
    case "WEEKLY":
      return addWeeks(from, interval);
    case "MONTHLY": {
      const next = addMonths(from, interval);
      if (rule.dayOfMonth != null) {
        return setDate(next, clampDayOfMonth(next, rule.dayOfMonth));
      }
      return next;
    }
    case "ANNUALLY": {
      const next = addYears(from, interval);
      if (rule.dayOfMonth != null) {
        return setDate(next, clampDayOfMonth(next, rule.dayOfMonth));
      }
      return next;
    }
  }
}

function clampDayOfMonth(date: Date, dom: number): number {
  const max = getDaysInMonth(date);
  return Math.min(Math.max(1, dom), max);
}

/**
 * Compute the next occurrence on or after `after` for the rule. Useful for
 * keeping RecurringExpense.nextDue fresh after a payment.
 */
export function nextOccurrence(
  rule: RecurringRule,
  after: Date,
): Date | null {
  const horizon = addYears(after, 5);
  const found = expandRecurring(rule, after, horizon);
  return found[0] ?? null;
}

export function endOfMonthLocal(date: Date): Date {
  return endOfMonth(date);
}
