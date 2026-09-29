import { describe, expect, it } from "vitest";

import {
  observerPlace,
  observerSetup,
  openObserverWorld,
} from "../presentation/observer-world";
import { currentPresidentOf } from "./crisis/offices";
import {
  MIDTERM_PENALTY_POINTS,
  nationalMoodDemocraticShift,
} from "./national-mood";
import { majorPartyOf } from "./statewide-electorate";
import { makeIsoDate } from "./dates";

describe("the national mood", () => {
  // A random place from all 56; the mood is national, so any place reads it.
  const seed = "b24-national-mood";
  const place = observerPlace(seed);
  const { world } = openObserverWorld(observerSetup(seed));

  it(`turns a midterm against the President's party (${place.key}, seed ${seed})`, () => {
    const president = currentPresidentOf(world)!;
    expect(president).not.toBeNull();
    const party = majorPartyOf(world, president.personId, world.currentDate);
    const midterm = nationalMoodDemocraticShift(
      world,
      makeIsoDate("2026-11-03"),
    );
    expect(party).not.toBeNull();
    expect(midterm).toBe(
      (party === "democratic" ? -1 : 1) * (MIDTERM_PENALTY_POINTS / 100),
    );
  });

  it("adds nothing in a presidential year or an odd year", () => {
    expect(nationalMoodDemocraticShift(world, makeIsoDate("2028-11-07"))).toBe(
      0,
    );
    expect(nationalMoodDemocraticShift(world, makeIsoDate("2027-11-02"))).toBe(
      0,
    );
  });
});
