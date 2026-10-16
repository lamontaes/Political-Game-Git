/**
 * A poll's margin of error is never zero when someone answered, even if every
 * respondent names the same candidate (found in Rancho Cordova, California on
 * the golden-path seed 578cf6adfcdc, where the old margin, built from the
 * leader's share, came out 0 and M2-06 failed). The played poll for that
 * place is in campaigns.test.ts; this holds the margin's shape.
 */
import { describe, expect, it } from "vitest";
import { pollMargin } from "./modules/campaigns";

describe("a poll's margin of error", () => {
  it("is null when nobody answered and positive otherwise", () => {
    expect(pollMargin(0, 0)).toBeNull();
    for (const n of [1, 5, 60, 400, 5000])
      for (const lead of [0, Math.floor(n / 2), n])
        expect(pollMargin(lead, n)!, `${lead} of ${n}`).toBeGreaterThan(0);
  });

  it("is widest near an even split, narrows as more answer, and agrees with the textbook interval in the middle", () => {
    expect(pollMargin(30, 60)!).toBeGreaterThan(pollMargin(54, 60)!);
    expect(pollMargin(300, 600)!).toBeLessThan(pollMargin(30, 60)!);
    // 1.96 * sqrt(0.25 / 1000) = 0.031 for a 1,000-person poll split evenly.
    expect(pollMargin(500, 1000)!).toBeCloseTo(0.031, 3);
  });
});
