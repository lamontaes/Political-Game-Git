import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import type { EntityId, World } from "../types";
import { childhoodRecord, CHILDHOOD_EXPOSURE_KEYS } from "./childhood";
import type { OutcomeLink } from "./index";
import { personOutcomeFactor } from "./person";

const id = (value: string) => value as EntityId;

/** A world holding only what a childhood record reads. */
function fixture(): World {
  const state = (
    membershipId: string,
    effectiveAt: string,
    status: "resident" | "ended",
  ) => ({
    id: id(`state:${membershipId}:${status}`),
    membershipId: id(membershipId),
    effectiveAt: makeIsoDate(effectiveAt),
    status,
    residenceRole: "primary",
  });
  return {
    startedAt: makeIsoDate("2026-01-01"),
    currentDate: makeIsoDate("2031-01-01"),
    people: {
      child: { birthDate: "2020-05-01", homeJurisdictionId: id("place:b") },
      adult: { birthDate: "1980-05-01", homeJurisdictionId: id("place:b") },
    },
    history: {
      householdMemberships: [
        // Home one from before the world opened, then home two in 2028.
        {
          id: id("m1"),
          personId: id("child"),
          householdId: id("h1"),
          startedAt: makeIsoDate("2020-05-01"),
        },
        {
          id: id("m2"),
          personId: id("child"),
          householdId: id("h2"),
          startedAt: makeIsoDate("2028-03-01"),
        },
      ],
      householdMembershipStates: [
        state("m1", "2020-05-01", "resident"),
        state("m1", "2028-03-01", "ended"),
        state("m2", "2028-03-01", "resident"),
      ],
      householdLocations: [
        // Home one moved in 2027 while the child lived there; its first address is not a move.
        {
          householdId: id("h1"),
          effectiveAt: makeIsoDate("2020-05-01"),
          supersedesLocationId: null,
        },
        {
          householdId: id("h1"),
          effectiveAt: makeIsoDate("2027-06-01"),
          supersedesLocationId: id("loc0"),
        },
        // Home one moved again after the child left: not the child's move.
        {
          householdId: id("h1"),
          effectiveAt: makeIsoDate("2029-06-01"),
          supersedesLocationId: id("loc1"),
        },
      ],
    },
  } as unknown as World;
}

describe("the childhood record", () => {
  it("counts a child's moves in the watched years and keeps earlier years unwatched, not empty", () => {
    const world = fixture();
    const record = childhoodRecord(
      world,
      id("child"),
      makeIsoDate("2031-01-01"),
    )!;
    expect(record.watchedFrom).toBe("2026-01-01");
    expect(record.unwatchedYears).toBeCloseTo(5.67, 1);
    expect(record.watchedYears).toBeCloseTo(5, 1);
    const moves = record.exposures.find(
      (row) => row.key === "housing.childhood-moves",
    )!;
    // The 2027 address change and the 2028 new home.
    expect(moves.amount).toBe(2);
    expect(record.exposures.map((row) => row.key)).toEqual(
      CHILDHOOD_EXPOSURE_KEYS,
    );
    for (const row of record.exposures.filter(
      (r) => r.key !== "housing.childhood-moves",
    )) {
      expect(row.amount).toBeNull();
      expect(row.unknownBecause).toMatch(/records no per-person figure/);
    }
    // Read before the second move, the record is as it was then.
    const earlier = childhoodRecord(
      world,
      id("child"),
      makeIsoDate("2027-12-31"),
    )!;
    expect(
      earlier.exposures.find((row) => row.key === "housing.childhood-moves")!
        .amount,
    ).toBe(1);
  });

  it("says an adult's childhood was never watched when the world opened after it", () => {
    const record = childhoodRecord(
      fixture(),
      id("adult"),
      makeIsoDate("2031-01-01"),
    )!;
    expect(record.childhoodEnd).toBe("1998-05-01");
    expect(record.watchedFrom).toBeNull();
    expect(record.exposures.every((row) => row.amount === null)).toBe(true);
    expect(
      childhoodRecord(fixture(), id("nobody"), makeIsoDate("2031-01-01")),
    ).toBeNull();
  });

  it("feeds an exposure-years link for that person; an unknown exposure or unset size moves nothing", () => {
    const link = (overrides: Partial<OutcomeLink>): OutcomeLink => ({
      key: "test",
      from: "housing.childhood-moves",
      to: "health.depression",
      strength: "weak",
      shape: { kind: "exposure-years" },
      size: 0.05,
      per: "move",
      lagMonths: 0,
      group: "test",
      owner: "F",
      evidence: "provisional",
      anchor: "test",
      source: "test",
      ...overrides,
    });
    const reading = personOutcomeFactor(
      fixture(),
      id("child"),
      "health.depression",
      makeIsoDate("2031-01-01"),
      [
        link({ key: "moves" }),
        link({
          key: "covered",
          from: "health.child-coverage-years",
          size: -0.02,
        }),
        link({ key: "unsized", size: null }),
        link({ key: "capped", size: 1, ceiling: 1.5 }),
      ],
    )!;
    expect(
      reading.personParts.map((part) => [part.key, part.status, part.factor]),
    ).toEqual([
      ["moves", "counted", 1.1],
      ["covered", "not-recorded-for-person", 1],
      ["unsized", "size-not-set", 1],
      ["capped", "counted", 1.5],
    ]);
    expect(reading.multiplier).toBeCloseTo(1.1 * 1.5, 12);
    expect(
      personOutcomeFactor(
        fixture(),
        id("nobody"),
        "health.depression",
        makeIsoDate("2031-01-01"),
      ),
    ).toBeNull();
  });
});
