import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../src/simulation/dates";
import {
  bandRatios,
  cohortPeople,
  runSyntheticCohort,
} from "./fixtures/synthetic-cohort";

/*
 * Ruling 39: the calibration test. A synthetic cohort of person records with
 * ages, sexes and starting conditions drawn as world creation draws them,
 * stepped a year at a time for twenty years with the same functions the
 * mortality window and onset handlers call, with no world, clock or
 * households. Deaths per person-year in each age band, and the first-year
 * crude rate, must each be within 25% of the SSA 2023 table's rate for the
 * same people. The table checks the totals only; no person's day is drawn.
 *
 * About 3,000 people check the bands from 15 up and the first year. Under 15
 * the table expects under one death among them in twenty years, so that band
 * is read from a cohort of 20,000 children aged 0 to 14 (about 31 expected).
 */
const SEED = "ruling-39-cohort-1";
const START = makeIsoDate("2026-01-01");
const YEARS = 20;
const TOLERANCE = 0.25;
const CASE_LIMIT = 60_000;

describe(`Ruling 39 synthetic-cohort calibration (seed ${SEED})`, () => {
  it(
    "matches the table's deaths per person-year from 15 up, and the first-year crude rate, within 25%",
    () => {
      const result = runSyntheticCohort(
        SEED,
        cohortPeople(3_000, START),
        START,
        YEARS,
      );
      const ratios = bandRatios(result);
      const first = result.firstYearDeaths / result.tableFirstYearDeaths;
      console.info(
        `Ruling 39 cohort (${result.people} people, ${YEARS} years): ` +
          `deaths ${JSON.stringify(result.deaths)}; ` +
          `ratio to table ${JSON.stringify(
            Object.fromEntries(
              Object.entries(ratios).map(([band, ratio]) => [
                band,
                Number(ratio.toFixed(2)),
              ]),
            ),
          )}; first year ${((1000 * result.firstYearDeaths) / result.people).toFixed(1)} per 1,000 against ${((1000 * result.tableFirstYearDeaths) / result.people).toFixed(1)}.`,
      );
      for (const band of ["15-64", "65-84", "85+"] as const)
        expect(Math.abs(ratios[band] - 1), band).toBeLessThanOrEqual(TOLERANCE);
      expect(Math.abs(first - 1), "first-year crude rate").toBeLessThanOrEqual(
        TOLERANCE,
      );
    },
    CASE_LIMIT,
  );

  it(
    "matches the table's deaths per person-year under 15 within 25%",
    () => {
      const result = runSyntheticCohort(
        SEED,
        cohortPeople(20_000, START, { fromAge: 0, toAge: 14 }),
        START,
        YEARS,
      );
      const ratio = bandRatios(result)["under 15"];
      console.info(
        `Ruling 39 children (${result.people}): ${result.deaths["under 15"]} deaths under 15 against ${result.tableDeaths["under 15"].toFixed(1)} in the table (ratio ${ratio.toFixed(2)}).`,
      );
      expect(Math.abs(ratio - 1)).toBeLessThanOrEqual(TOLERANCE);
    },
    CASE_LIMIT,
  );
});
