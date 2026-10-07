import { describe, expect, it } from "vitest";
import { drawRandomPlace } from "../../../tests/support/random-place";
import { makeIsoDate } from "../dates";
import { stateJurisdictionForKey } from "../life-places";
import { createWorld } from "../world";
import { outcomeFactor, outcomeRangeViolations } from ".";
import { PLACE_OUTCOME_BASES, placeOutcomesForMonth } from "./place-outcomes";

const seed = "session20-outcome-range-checks";
const place = drawRandomPlace(seed);
const placeKey = place.stateJurisdictionKey!;
const jurisdiction = stateJurisdictionForKey(placeKey)!;
const month = makeIsoDate("2026-01-01");
const base = PLACE_OUTCOME_BASES["crime.violent"]!.places[placeKey]!;

function worldWithCrimeLevel(ratio: number) {
  return {
    ...createWorld({
      seed,
      currentDate: month,
      jurisdictions: [jurisdiction],
      people: [],
    }),
    placeOutcomes: {
      months: [
        {
          month,
          records: [
            {
              measure: "crime.violent",
              placeKey,
              jurisdictionId: jurisdiction.id,
              month,
              base,
              value: base * ratio,
              multiplier: ratio,
              causes: [],
            },
          ],
        },
      ],
    },
  };
}

describe(`outcome ranges in ${place.displayName} (seed ${seed})`, () => {
  it("keeps the calculated link and product above both catalog ceilings", () => {
    const reading = outcomeFactor(
      worldWithCrimeLevel(4),
      jurisdiction.id,
      "crime.burglary",
      month,
    );
    expect(reading.multiplier).toBeCloseTo(4);
    expect(
      reading.causes.find((cause) => cause.key === "crime-level-to-burglary")!
        .factor,
    ).toBeCloseTo(4);
    expect(outcomeRangeViolations(reading)).toEqual([
      {
        kind: "link",
        key: "crime-level-to-burglary",
        value: reading.multiplier,
        floor: 0.25,
        ceiling: 3,
      },
      {
        kind: "target",
        key: "crime.burglary",
        value: reading.multiplier,
        floor: 0.25,
        ceiling: 3,
      },
    ]);
    expect(reading.multiplier).toBeCloseTo(4);
  });

  it("keeps zero below both floors, and records the violations", () => {
    const reading = outcomeFactor(
      worldWithCrimeLevel(0),
      jurisdiction.id,
      "crime.burglary",
      month,
    );
    expect(reading.multiplier).toBeCloseTo(0);
    expect(outcomeRangeViolations(reading).map((entry) => entry.kind)).toEqual([
      "link",
      "target",
    ]);
  });

  it("returns no violation for an unchanged level", () => {
    const reading = outcomeFactor(
      worldWithCrimeLevel(1),
      jurisdiction.id,
      "crime.burglary",
      month,
    );
    expect(reading.multiplier).toBe(1);
    expect(outcomeRangeViolations(reading)).toEqual([]);
  });

  it("persists monthly checks beside their own cause records", () => {
    const world = worldWithCrimeLevel(4);
    const records = placeOutcomesForMonth(world, month, [
      "household.poverty-pct",
    ]);
    for (const record of records) {
      const reading = outcomeFactor(
        world,
        record.jurisdictionId,
        record.measure,
        month,
      );
      expect(record.rangeViolations).toEqual(outcomeRangeViolations(reading));
    }
    expect(records.some((record) => record.placeKey === placeKey)).toBe(true);
  });
});
