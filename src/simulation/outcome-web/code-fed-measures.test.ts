import { describe, expect, it } from "vitest";
import minimumWages from "../../../data/research/money/minimum-wage-2026.json" with { type: "json" };
import web from "../../../data/research/outcome-web/links.json" with { type: "json" };
import { smallWorld } from "../../../tests/fixtures/small-world";
import { makeIsoDate } from "../dates";
import { stateJurisdictionForKey } from "../life-places";
import type { EntityId, World } from "../types";
import {
  OUTCOME_LINKS,
  OUTCOMES_PRODUCED,
  outcomeFactor,
  outcomeLinkStatus,
  outcomeMeasure,
  shapedLinkFactor,
  validateOutcomeLinkInventory,
} from ".";
import {
  PLACE_OUTCOME_BASES,
  placeOutcomesForMonth,
  type PlaceOutcomeRecord,
} from "./place-outcomes";

/*
 * Measures the game already records, read by the outcome web.
 *
 * The minimum wage against typical pay is the one box of the effects-map
 * audit ("Effects boxes", Oct 1) that checked out as a reader of saved
 * records with a link behind it: the state's wage in force and the place's
 * recorded median earnings. Every other box was checked and held back for a
 * stated reason (the pull request lists each).
 */

const MEDIAN_EARNINGS = "labor.median-earnings";
const RATIO = "labor.minimum-wage-to-median";
const LINK_KEY = "minimum-wage-to-low-wage-jobs";
const FIRST_MONTH = makeIsoDate("2026-01-01");

const washington = stateJurisdictionForKey("US-WA")!.id;
const kentucky = stateJurisdictionForKey("US-KY")!.id;
const americanSamoa = stateJurisdictionForKey("US-AS")?.id ?? null;

const startingWage = (stateKey: string): number => {
  const place = (
    minimumWages.places as Record<string, { basicHourly: number | null }>
  )[stateKey];
  return Math.max(minimumWages.federalHourly, place?.basicHourly ?? 0);
};

/** The small world with the production monthly pass written for one month. */
function withRecordedMonth(world: World, month = FIRST_MONTH): World {
  return {
    ...world,
    placeOutcomes: {
      months: [
        {
          month,
          records: placeOutcomesForMonth(world, month, [MEDIAN_EARNINGS]),
        },
      ],
    },
  };
}

/** The world with one place's median earnings replaced in its one month. */
function withMedianEarnings(
  world: World,
  placeKey: string,
  value: number,
): World {
  const months = world.placeOutcomes!.months.map((entry) => ({
    ...entry,
    records: entry.records.map((record): PlaceOutcomeRecord =>
      record.measure === MEDIAN_EARNINGS && record.placeKey === placeKey
        ? { ...record, value }
        : record,
    ),
  }));
  return { ...world, placeOutcomes: { months } };
}

describe("the minimum wage against typical pay", () => {
  const { world } = smallWorld({ place: "WA", people: 3 });
  const recorded = withRecordedMonth(world);
  const measure = outcomeMeasure(RATIO)!;
  const link = OUTCOME_LINKS.find((row) => row.key === LINK_KEY)!;

  it("is a measure the web reads, with its link's cause ready", () => {
    expect(measure).not.toBeNull();
    expect(measure.key).toBe(RATIO);
    expect(link.from).toBe(RATIO);
    // The cause is recorded now; what the link still waits on is its outcome,
    // which no producer computes. It was "cause-not-recorded" before.
    expect(OUTCOMES_PRODUCED.has(link.to)).toBe(false);
    expect(outcomeLinkStatus(link)).toBe("outcome-not-produced");
    expect(link.status).toBe("outcome-not-produced");
    expect(link.unsupportedReason).toBe("outcome-not-produced");
    expect(() => validateOutcomeLinkInventory(OUTCOME_LINKS)).not.toThrow();
  });

  it("reads the state's wage in force over its recorded median earnings per hour", () => {
    const earnings = PLACE_OUTCOME_BASES[MEDIAN_EARNINGS]!.places;
    for (const [id, key] of [
      [washington, "US-WA"],
      [kentucky, "US-KY"],
    ] as const) {
      const read = measure.read(recorded, id, FIRST_MONTH);
      expect(read, key).toBeCloseTo(
        startingWage(key) / (earnings[key]! / 2080),
        3,
      );
    }
    // Washington's wage is well above the federal floor, Kentucky's is the
    // floor: the reading tells them apart.
    expect(measure.read(recorded, washington, FIRST_MONTH)!).toBeGreaterThan(
      measure.read(recorded, kentucky, FIRST_MONTH)! * 1.5,
    );
  });

  it("follows the recorded earnings: pay that is twice as high halves the ratio", () => {
    const before = measure.read(recorded, kentucky, FIRST_MONTH)!;
    const base = PLACE_OUTCOME_BASES[MEDIAN_EARNINGS]!.places["US-KY"]!;
    const richer = withMedianEarnings(recorded, "US-KY", base * 2);
    expect(measure.read(richer, kentucky, FIRST_MONTH)!).toBeCloseTo(
      before / 2,
      6,
    );
  });

  it("reads null, never zero, where nothing is recorded", () => {
    // No month has been written yet.
    expect(measure.read(world, washington, FIRST_MONTH)).toBeNull();
    // A month is written, but the date asked about is before it.
    expect(
      measure.read(recorded, washington, makeIsoDate("2025-12-31")),
    ).toBeNull();
    // A record that holds no earnings.
    expect(
      measure.read(
        withMedianEarnings(recorded, "US-WA", 0),
        washington,
        FIRST_MONTH,
      ),
    ).toBeNull();
    // A territory with no basic rate and no recorded earnings.
    if (americanSamoa !== null)
      expect(measure.read(recorded, americanSamoa, FIRST_MONTH)).toBeNull();
    // Not a place the game keeps outcomes for.
    expect(
      measure.read(recorded, "jurisdiction_none" as EntityId, FIRST_MONTH),
    ).toBeNull();
  });

  it("carries the link's arithmetic: nothing below 0.59, then size per unit above it", () => {
    expect(link.shape).toEqual({ kind: "threshold", at: 0.59 });
    expect(shapedLinkFactor(link, 0.5, 0)).toBe(1);
    expect(shapedLinkFactor(link, 0.59, 0)).toBe(1);
    expect(shapedLinkFactor(link, 0.65, 0)).toBeCloseTo(1 - 0.25 * 0.06, 10);
  });

  it("has a baseline, so the link is not skipped once its outcome is produced", () => {
    const baselines = web.baselines as Record<string, { value: number }>;
    expect(baselines[RATIO]).toBeDefined();
    expect(Number.isFinite(baselines[RATIO]!.value)).toBe(true);
  });

  it("moves no outcome today: low-wage jobs have no producer, and the web says so", () => {
    const reading = outcomeFactor(
      recorded,
      kentucky,
      link.to,
      makeIsoDate("2026-06-01"),
    );
    expect(reading.multiplier).toBe(1);
    expect(reading.causes).toEqual([]);
  });
});
