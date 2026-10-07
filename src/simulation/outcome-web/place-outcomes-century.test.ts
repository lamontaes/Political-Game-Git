import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import { stateJurisdictionForKey } from "../life-places";
import type { EntityId, IsoDate, World } from "../types";
import {
  DEFAULT_PLACE_OUTCOME_DRIFT,
  PLACE_OUTCOME_BASES,
  placeOutcomesForMonth,
  type PlaceOutcomeRecord,
} from "./place-outcomes";

/*
 * A century, one measure at a time: the environment, public safety and
 * homelessness outcomes each start at their real 2024 level and, with no law
 * change and no crisis, stay exactly there for a hundred years, in every place
 * they are measured and in every world. Nothing is drawn: no monthly noise, no
 * society-wide wave, so two worlds with different seeds are the same record
 * for record. A measure still moves when a built link's cause changes, and
 * stays where the cause put it.
 */

const MEASURES = [
  "env.particulates",
  "env.drinking-water-violations",
  "crime.violent",
  "housing.homelessness",
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
function century(
  seed: string,
  measure: string,
  months: number,
  start: World = emptyWorld(seed),
) {
  let world = start;
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

describe("environment, public safety and homelessness over a century with nothing to move them", () => {
  it("each is a place outcome with its own plausible bounds, starting from real bases only", () => {
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

  it("a built link still moves a measure in a century world, and it stays where the cause put it", () => {
    const PERMIT = "proposition_carry_permit" as EntityId;
    const texas = stateJurisdictionForKey("US-TX")!.id;
    // Unseeded, so the link acts at its researched size, not a drawn one.
    const world = {
      ...emptyWorld("century-law"),
      seed: undefined,
      policyCatalog: {
        propositions: {
          [PERMIT]: {
            id: PERMIT,
            stableKey:
              "us-policy-positions:justice-public-safety.permit-to-carry-concealed",
          },
        },
      },
      history: {
        legislativeMeasures: [
          {
            id: "measure_tx" as EntityId,
            stableKey: "test:tx",
            sequence: 1,
            jurisdictionId: texas,
            rulePackId: "test",
            designation: "HB 1",
            shortTitle: "Require a permit to carry concealed",
            summary: "A test act.",
            origin: "member-introduction",
            subjectClass: "general-policy",
            originChamberKey: "house",
            sponsorPersonId: null,
            introducedAt: makeIsoDate("2040-01-01"),
            sourceDocumentKey: null,
            policyAlternativeIds: [],
            propositionIds: [PERMIT],
            propositionAnswers: [{ propositionId: PERMIT, answer: "yes" }],
          },
        ],
        legislativeEnactments: [
          {
            id: "enactment_tx" as EntityId,
            stableKey: "test:tx:enactment",
            sequence: 1001,
            measureId: "measure_tx" as EntityId,
            resolvedAt: makeIsoDate("2040-06-01"),
            outcome: "enacted",
            actDesignation: null,
            effectiveAt: makeIsoDate("2041-01-01"),
            outcomeEventId: "event_tx" as EntityId,
          },
        ],
      },
    } as unknown as World;
    const run = century("century-law", "crime.violent", MONTHS, world);
    const base = PLACE_OUTCOME_BASES["crime.violent"]!.places;
    const texasEnd = run.end.find((record) => record.placeKey === "US-TX")!;
    // A year after it takes effect the permit law has cut Texas about 10%,
    // and the cut is still there at the end of the century.
    expect(texasEnd.multiplier).toBeCloseTo(0.9, 10);
    expect(texasEnd.value).toBeCloseTo(base["US-TX"]! * 0.9, 1);
    expect(texasEnd.structural).toBe(base["US-TX"]);
    expect(texasEnd.causes.map((cause) => cause.key)).toEqual([
      "carry-permit-to-violent-crime",
    ]);
    // Every other place is where it started, and Texas was too until a year
    // after the law took effect: only the cause moved anything.
    for (const record of run.end.filter((row) => row.placeKey !== "US-TX"))
      expect(record.value, record.placeKey).toBe(record.base);
    expect(run.moved.every((record) => record.placeKey === "US-TX")).toBe(true);
    expect(run.moved.map((record) => record.month).sort()[0]).toBe(
      "2042-01-01",
    );
  }, 240_000);
});
