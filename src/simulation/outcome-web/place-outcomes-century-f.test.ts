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
 * A century in ten worlds, one measure at a time: CLOUD F's health, schooling,
 * earnings, broadband and transit outcomes each start at their real 2024
 * level, drift every month, and nothing pulls them back. So the same place ends in
 * different places in different worlds (spread), never leaves the measure's
 * plausible range (bounds), and is not held at its start (no pinning).
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

const WORLDS = [
  "century-1",
  "century-2",
  "century-3",
  "century-4",
  "century-5",
  "century-6",
  "century-7",
  "century-8",
  "century-9",
  "century-10",
];
const MONTHS = 1200;

/** A seeded world with no laws and no recorded economy: drift alone. */
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
 * Every place's record for one measure at year 10 and year 100, and whether
 * any month left the bounds. Only the last month is kept in the world, which
 * is all the monthly pass reads.
 */
function century(seed: string, measure: string) {
  let world = emptyWorld(seed);
  let month = makeIsoDate("2026-01-01");
  const decade: PlaceOutcomeRecord[] = [];
  let outOfBounds: PlaceOutcomeRecord[] = [];
  let records: readonly PlaceOutcomeRecord[] = [];
  const drift = PLACE_OUTCOME_BASES[measure]!.drift!;
  for (let index = 0; index < MONTHS; index += 1) {
    records = placeOutcomesForMonth(world, month, [measure]);
    outOfBounds = outOfBounds.concat(
      records.filter(
        (record) =>
          !Number.isFinite(record.value) ||
          record.structural! < drift.minPct ||
          record.structural! > drift.maxPct,
      ),
    );
    if (index === 119) decade.push(...records);
    world = {
      ...world,
      currentDate: month,
      placeOutcomes: { months: [{ month, records }] },
    } as World;
    month = nextMonth(month);
  }
  return { decade, end: records, outOfBounds };
}

/**
 * A level in the space it drifts in: log-odds for a share (a percent), logs
 * for a rate. A share near its ceiling moves little in logs but as freely as
 * any other in log-odds.
 */
function driftSpace(measure: string, value: number): number {
  const scale = PLACE_OUTCOME_BASES[measure]!.scale;
  if (scale === "level") return value;
  if (scale === "rate") return Math.log(value);
  const share = value / 100;
  return Math.log(share / (1 - share));
}

const logMove = (record: PlaceOutcomeRecord) =>
  Math.abs(
    driftSpace(record.measure, record.structural!) -
      driftSpace(record.measure, record.base),
  );

const median = (values: readonly number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)]!;
};

describe("food, reading, degrees, broadband, asthma, overdoses, earnings and transit over a century in ten worlds", () => {
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

  it("each is a place outcome with its own drift and plausible bounds, starting from real bases only", () => {
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
    it(`${measure}: worlds end apart, nothing leaves its range, and nothing is pinned to its start`, () => {
      const runs = WORLDS.map((seed) => century(seed, measure));
      const places = Object.keys(PLACE_OUTCOME_BASES[measure]!.places);

      // Bounds: every month of every world.
      for (const run of runs) expect(run.outOfBounds).toEqual([]);

      // Spread: each place ends somewhere different in each world, far apart.
      for (const placeKey of places) {
        const ends = runs.map((run) =>
          run.end.find((record) => record.placeKey === placeKey)!,
        );
        expect(new Set(ends.map((record) => record.structural)).size).toBe(
          WORLDS.length,
        );
        const logs = ends.map((record) =>
          driftSpace(measure, record.structural!),
        );
        expect(
          Math.max(...logs) - Math.min(...logs),
          `${placeKey} spread`,
        ).toBeGreaterThan(0.25);
      }

      // No pinning: the distance from the start keeps growing over the
      // century instead of settling back, and almost no place sits at it.
      const tenYears = median(runs.flatMap((run) => run.decade.map(logMove)));
      const hundredYears = median(runs.flatMap((run) => run.end.map(logMove)));
      expect(hundredYears).toBeGreaterThan(tenYears * 1.5);
      const nearStart = runs
        .flatMap((run) => run.end)
        .filter((record) => logMove(record) < 0.02).length;
      expect(nearStart / (runs.length * places.length)).toBeLessThan(0.1);
    }, 240_000);
  }
});
