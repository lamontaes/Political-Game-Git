/**
 * PW-4 step 1: the law in force at the opening does not lapse.
 *
 * A starting-law row is a published figure for one period, but the statute or
 * ordinance behind it is standing law. Tripwire: no series in force at the
 * opening stops within the game's first ten years unless its row names the
 * sunset clause in its source (`sunset: { date, source }`). A phase that ends
 * because the next phase begins is not a lapse.
 */
import { describe, expect, it } from "vitest";
import startingLaw from "./data/laws/starting-law.json" with { type: "json" };

interface Row {
  readonly series: string;
  readonly tier: string;
  readonly level: string;
  readonly effectiveDate: string;
  readonly endDate: string | null;
  readonly standing?: string;
  readonly sunset?: { readonly date: string; readonly source: string };
}

const rows = (
  startingLaw as unknown as { jurisdictions: Record<string, readonly Row[]> }
).jurisdictions;

/** The bench's opening date (`src/bench/m0-check.ts`). */
const OPENING = "2026-10-12";
/** The tripwire's horizon: the game's first ten years. */
const HORIZON_YEARS = 10;
const HORIZON = `${Number(OPENING.slice(0, 4)) + HORIZON_YEARS}${OPENING.slice(4)}`;

describe("PW-4: starting law carries forward", () => {
  it("no law in force at the opening lapses in the first ten years without a cited sunset", () => {
    const lapses: string[] = [];
    for (const [jurisdiction, list] of Object.entries(rows)) {
      for (const row of list) {
        if (row.endDate === null) continue;
        if (row.endDate <= OPENING || row.endDate > HORIZON) continue;
        const followed = list.some(
          (next) =>
            next.series === row.series &&
            next.tier === row.tier &&
            next.level === row.level &&
            next.effectiveDate === row.endDate,
        );
        if (followed) continue;
        if (row.sunset?.source && row.sunset.date === row.endDate) continue;
        lapses.push(`${jurisdiction} ${row.series} ${row.tier} ends ${row.endDate}`);
      }
    }
    expect(lapses).toEqual([]);
  });

  it("the federal income tax and Social Security rows stand past January 1, 2027, citing standing law", () => {
    const federal = rows.US ?? [];
    for (const series of ["income-tax", "social-security-tax"]) {
      const inForce = federal.filter(
        (row) =>
          row.series === series &&
          row.effectiveDate <= "2027-02-01" &&
          (row.endDate === null || "2027-02-01" < row.endDate),
      );
      expect(inForce.length, series).toBe(1);
      expect(inForce[0]!.standing, series).toBeTruthy();
    }
  });
});
