import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import type { IsoDate, World } from "../types";
import {
  DEFAULT_PLACE_OUTCOME_DRIFT,
  PLACE_OUTCOME_BASES,
  placeOutcomeValue,
  placeOutcomesForMonth,
  type PlaceOutcomeRecord,
} from "./place-outcomes";

/*
 * A century, one measure at a time: CLOUD F's health, schooling, earnings,
 * broadband and transit outcomes each start at their real 2024 level and, with
 * no law change and no crisis, stay exactly there for a hundred years, in every
 * place they are measured and in every world. Nothing is drawn, so two worlds
 * with different seeds are the same record for record, and nothing leaves the
 * measure's plausible range (bounds).
 */

const MEASURES = [
  "household.food-insecurity",
  "school.reading-proficient-pct",
  "school.college-completion-pct",
  "broadband.home-access",
  "health.child-asthma-pct",
  "health.overdose-deaths",
  "labor.median-earnings",
  "transit.service-access",
  "population.in-migration",
  "population.out-migration",
  "gov.borrowing-cost",
] as const;

const MONTHS = 1200;
const TEN_YEARS = 120;

/** A seeded world with no laws and no recorded economy. */
function emptyWorld(seed: string): World {
  return {
    seed,
    currentDate: makeIsoDate("2026-01-01"),
    policyCatalog: { propositions: {} },
    history: { legislativeMeasures: [], legislativeEnactments: [] },
  } as unknown as World;
}

function nextMonth(month: IsoDate): IsoDate {
  const date = new Date(`${month}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + 1);
  return makeIsoDate(date.toISOString().slice(0, 10));
}

/**
 * Every place's record for one measure over `months` months of a world, month
 * by month, keeping the first ten years and the last month (only the last
 * month is kept in the world, which is all the monthly pass reads). Also the
 * records that left the bounds or moved off their start.
 */
function century(seed: string, measure: string, months: number) {
  let world = emptyWorld(seed);
  let month = makeIsoDate("2026-01-01");
  const decade: PlaceOutcomeRecord[] = [];
  let outOfBounds: PlaceOutcomeRecord[] = [];
  let moved: PlaceOutcomeRecord[] = [];
  let records: readonly PlaceOutcomeRecord[] = [];
  const drift = PLACE_OUTCOME_BASES[measure]!.drift!;
  for (let index = 0; index < months; index += 1) {
    records = placeOutcomesForMonth(world, month, [measure]);
    outOfBounds = outOfBounds.concat(
      records.filter(
        (record) =>
          !Number.isFinite(record.value) ||
          record.structural! < drift.minPct ||
          record.structural! > drift.maxPct,
      ),
    );
    moved = moved.concat(
      records.filter(
        (record) =>
          record.structural !== record.base ||
          record.multiplier !== 1 ||
          record.value !== record.base ||
          record.causes.length > 0,
      ),
    );
    if (index < TEN_YEARS) decade.push(...records);
    world = {
      ...world,
      currentDate: month,
      placeOutcomes: { months: [{ month, records }] },
    } as World;
    month = nextMonth(month);
  }
  return { decade, end: records, outOfBounds, moved };
}

describe("food, reading, degrees, broadband, asthma, overdoses, earnings and transit over a century with nothing to move them", () => {
  it("a level adds each link's effect in its own unit, so a law reads the same way below zero", () => {
    const level = PLACE_OUTCOME_BASES["gov.borrowing-cost"]!;
    expect(level.scale).toBe("level");
    // A law adding 0.4 basis points raises a level below zero, not lowers it.
    expect(placeOutcomeValue(level, -3, 1.4, [1.4])).toBeCloseTo(-2.6, 10);
    expect(placeOutcomeValue(level, 5, 1.4 * 0.9, [1.4, 0.9])).toBeCloseTo(
      5.3,
      10,
    );
    // Shares and rates still multiply.
    const share = PLACE_OUTCOME_BASES["household.food-insecurity"]!;
    expect(placeOutcomeValue(share, 10, 0.98, [0.98])).toBeCloseTo(9.8, 10);
  });

  it("each is a place outcome with its own plausible bounds, starting from real bases only", () => {
    for (const measure of MEASURES) {
      const definition = PLACE_OUTCOME_BASES[measure];
      expect(definition, measure).toBeDefined();
      expect(definition!.drift, measure).toBeDefined();
      expect(definition!.drift).not.toBe(DEFAULT_PLACE_OUTCOME_DRIFT);
      for (const [placeKey, base] of Object.entries(definition!.places)) {
        // An unsourced place is left out (unknown), never written as zero.
        // A level (borrowing cost over AAA) may sit at or below zero; nothing
        // else may.
        expect(Number.isFinite(base), `${measure} ${placeKey}`).toBe(true);
        if (definition!.scale !== "level")
          expect(base, `${measure} ${placeKey}`).toBeGreaterThan(0);
        expect(base).toBeGreaterThanOrEqual(definition!.drift!.minPct);
        expect(base).toBeLessThanOrEqual(definition!.drift!.maxPct);
      }
    }
  });

  for (const measure of MEASURES) {
    it(`${measure}: every place stays exactly at its start for a hundred years, whatever the seed`, () => {
      const run = century("century-1", measure, MONTHS);
      const other = century("century-2", measure, TEN_YEARS);
      const places = Object.keys(PLACE_OUTCOME_BASES[measure]!.places).sort();

      // Every place the measure has a base for has a record, every month.
      expect(run.end.map((record) => record.placeKey).sort()).toEqual(places);
      expect(run.decade).toHaveLength(places.length * TEN_YEARS);

      // Bounds: every month of the world.
      expect(run.outOfBounds).toEqual([]);

      // No drift: nothing is drawn, so with no law and no crisis no place
      // moves in any month of the century, and none is pulled back either.
      expect(run.moved).toEqual([]);
      for (const record of run.end)
        expect(record.value, record.placeKey).toBe(record.base);

      // The seed is not a cause: a world with another seed is the same for
      // its first ten years, and the first ten years of this one are the
      // start, repeated.
      expect(other.decade).toEqual(run.decade);
      expect(other.moved).toEqual([]);
    }, 240_000);
  }
});
