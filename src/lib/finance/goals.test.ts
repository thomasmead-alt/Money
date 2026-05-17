import { describe, expect, it } from "vitest";
import { computeGoalProgress } from "./goals";

describe("computeGoalProgress", () => {
  it("computes percentComplete and remaining", () => {
    const p = computeGoalProgress(1_000_000, 250_000, null, null);
    expect(p.percentComplete).toBeCloseTo(25);
    expect(p.remaining).toBe(750_000);
  });

  it("flags on-track when monthly contribution covers required pace", () => {
    const target = new Date();
    target.setMonth(target.getMonth() + 10);
    const p = computeGoalProgress(
      1_000_000,
      0,
      target,
      120_000, // £1,200/mo planned
      new Date(),
    );
    expect(p.requiredMonthly).toBeLessThanOrEqual(120_000);
    expect(p.onTrack).toBe(true);
  });

  it("flags off-track when contribution is too small", () => {
    const target = new Date();
    target.setMonth(target.getMonth() + 10);
    const p = computeGoalProgress(
      1_000_000,
      0,
      target,
      50_000, // £500/mo
      new Date(),
    );
    expect(p.onTrack).toBe(false);
  });

  it("returns onTrack=true if goal is already met", () => {
    const target = new Date();
    target.setMonth(target.getMonth() + 3);
    const p = computeGoalProgress(1000, 1000, target, 0, new Date());
    expect(p.onTrack).toBe(true);
    expect(p.remaining).toBe(0);
  });
});
