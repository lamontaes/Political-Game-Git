/** The economy's months before the start are this world's own, by the rule its opening month follows (owner, Nov 13: "it's simulated"). */
import { describe, expect, it } from "vitest";
import { macroCoreData } from "./modules/macro";
import {
  historyMonths,
  macroWorldOffsets,
  publishedMonths,
  shiftMonth,
  worldPublishedMonth,
} from "./macro-model";
import { parameter } from "./parameters";

const data = macroCoreData();
const p = (key: string) => parameter(key, data.parameters);
const START = "2026-10-01";
const FIGURES = [
  "unemploymentPct",
  "priceIndex",
  "payrollJobsThousands",
  "hourlyEarnings",
  "policyRatePct",
  "treasury10Pct",
] as const;

describe("the economy's months before the start", () => {
  it("read the same as the months play opens from, on every month both hold", () => {
    for (const seed of ["world-a", "world-b", "world-c"])
      for (const month of historyMonths(START, seed, p)) {
        const past = worldPublishedMonth(month.month, START, seed, p);
        expect(past, month.month).toBeDefined();
        for (const key of FIGURES)
          if (past![key] !== undefined)
            expect(past![key], `${seed} ${month.month} ${key}`).toBe(
              month[key],
            );
      }
  });

  it("move a month fifteen years back by the world's offsets, the published figures giving only the base and shape", () => {
    const seed = "world-a";
    const o = macroWorldOffsets(seed, p);
    const opening = publishedMonths(START, p).at(-1)!.month;
    const month = shiftMonth(opening, -15 * 12, p);
    const past = worldPublishedMonth(month, START, seed, p)!;
    const now = worldPublishedMonth(opening, START, seed, p)!;
    const bare = (at: string) =>
      worldPublishedMonth(at, START, seed, noOffsets)!;
    // A rate offset moves every month alike.
    expect(past.unemploymentPct! - bare(month).unemploymentPct!).toBeCloseTo(
      o.unemploymentPoints,
      9,
    );
    // Pay: the wage-growth offset compounds back from the opening month.
    const ratio = past.hourlyEarnings! / now.hourlyEarnings!;
    const published =
      bare(month).hourlyEarnings! / bare(opening).hourlyEarnings!;
    expect(ratio / published).toBeCloseTo(
      (1 + o.wageGrowthPoints / 100) ** -15,
      9,
    );
    expect(ratio).not.toBe(published);
  });
});

/** The same parameters with every world spread at zero: the published month itself. */
function noOffsets(key: string): number {
  return key.startsWith("macroWorld") &&
    key !== "macroWorldUnemploymentLowestPct"
    ? 0
    : p(key);
}
