/**
 * Every county the game knows has its own ACS employment rate by age (pool
 * item research-residents-sourced-parameters, row SG-P8-resident-employment-proxy):
 * residents of any county, drawn from all 56 places on a seed nobody chose,
 * are placed by that county's civilian employed/resident-age rows and not by
 * the national proxy with its tunable scale.
 */
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import table from "./data/resident-employment-counties.json" with { type: "json" };
import { residentEmploymentRate } from "./opening-employment";

const counties = JSON.parse(
  readFileSync("data/source/counties/corpus.json", "utf8"),
) as { geoid: string; displayName: string; stateUsps: string }[];
const seed =
  process.env.RESIDENT_EMPLOYMENT_SEED ?? randomBytes(8).toString("hex");

describe(`county employment rates (run seed ${seed})`, () => {
  it("covers every county with a sane rate at every working age", () => {
    const rows = table.counties as Record<string, Record<string, number[]>>;
    const ageRows = [
      "16",
      "20",
      "22",
      "25",
      "30",
      "35",
      "45",
      "55",
      "60",
      "62",
      "65",
      "70",
      "75",
    ];
    for (const county of counties)
      for (const age of ageRows) {
        const read = residentEmploymentRate(Number(age), county.geoid);
        const where = `${county.displayName}, ${county.stateUsps} (${county.geoid}) age ${age}`;
        expect(read, where).toBeDefined();
        // A county with nobody of that age in its own table (a cell of zero) reads the national rate.
        if ((rows[county.geoid]?.[`acs-age-${age}`]?.[0] ?? 0) > 0)
          expect(read!.basis, where).toMatch(/^county-ACS/);
        expect(read!.rate, where).toBeGreaterThanOrEqual(0);
        expect(read!.rate, where).toBeLessThanOrEqual(1);
      }
  });

  it("falls back to the national age proxy only where no county row exists", () => {
    const read = residentEmploymentRate(40, "78010");
    expect(read?.basis).toBe(
      "national-CPS-age-with-tunable-missing-county-scale",
    );
  });
});
