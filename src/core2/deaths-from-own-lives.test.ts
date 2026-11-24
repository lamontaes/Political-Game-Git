import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { periodDeathChance } from "./births-counted";
import { ssa2023AnnualProbability } from "./health-mortality-table";
import { BASE_RATE_TABLES } from "./world-base-rates";

// Pins 23, rows 6 and 7 (Nov 17): a full person's strain and a counted
// person's chance of dying start from the one published hazard curve, with
// no per-world factor and no state ratio on top. What differs between worlds
// is the people's own conditions, care, coverage and housing.
describe("deaths come from the one hazard curve and the people's own records", () => {
  it("a counted person's yearly chance is the period table's row for their sex and age", () => {
    for (const age of [0, 18, 40, 67, 90, 130])
      for (const sex of ["male", "female"] as const)
        expect(periodDeathChance(sex, age)).toBe(
          Number(ssa2023AnnualProbability(Math.min(age, 119), sex)),
        );
  });
  it("no world factor or state ratio scales deaths in either tier", () => {
    expect(BASE_RATE_TABLES).not.toContain("mortality");
    for (const file of ["births-counted.ts", "modules/health.ts"])
      expect(
        readFileSync(new URL(`./${file}`, import.meta.url), "utf8"),
        file,
      ).not.toMatch(/worldRateFactor\([^)]*"mortality"|stateMortality/);
  });
});
