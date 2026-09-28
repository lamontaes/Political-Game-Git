import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import type { IsoDate, World } from "../types";
import {
  DEFAULT_PLACE_OUTCOME_DRIFT,
  PLACE_OUTCOME_BASES,
  placeOutcomesForMonth,
  type PlaceOutcomeRecord,
} from "./place-outcomes";

/*
 * A century in ten worlds, one measure at a time: the environment, public
 * safety and homelessness outcomes each start at their real 2024 level, drift
 * every month, and nothing pulls them back. So the same place ends in
 * different places in different worlds (spread), never leaves the measure's
 * plausible range (bounds), and is not held at its start (no pinning).
 */

const MEASURES = [
  "env.particulates",
  "env.drinking-water-violations",
  "crime.violent",
  "housing.homelessness",
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

const logMove = (record: PlaceOutcomeRecord) =>
  Math.abs(Math.log(record.structural! / record.base));

const median = (values: readonly number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)]!;
};

describe("environment, public safety and homelessness over a century in ten worlds", () => {
  it("each is a place outcome with its own drift and plausible bounds, starting from real bases only", () => {
    for (const measure of MEASURES) {
      const definition = PLACE_OUTCOME_BASES[measure];
      expect(definition, measure).toBeDefined();
      expect(definition!.drift, measure).toBeDefined();
      expect(definition!.drift).not.toBe(DEFAULT_PLACE_OUTCOME_DRIFT);
      for (const [placeKey, base] of Object.entries(definition!.places)) {
        // An unsourced place is left out (unknown), never written as zero.
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
        const logs = ends.map((record) => Math.log(record.structural!));
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
