import { describe, expect, it } from "vitest";

import { addDays } from "../simulation";
import type { EntityId, World } from "../simulation";
import { smallWorld } from "../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../tests/support/random-place";
import {
  composeDayOpening,
  dayOpeningLine,
  type DayOpeningFacts,
} from "./day-opening-english";
import type { PartGradeLedger } from "./english-grades";

/**
 * The line that opens an ordinary day is written from the world's facts and
 * never reads the same two days running in the same place.
 */

const START = "2026-01-05";

// A small real world, read on the dates the tests name. The line reads the
// world's identity, seed, clock and the viewer's recorded voice.
const SEED = "day-opening";
const PLACE = drawRandomPlace(SEED);
const base = smallWorld({ place: PLACE.key, seed: SEED }).world;

function worldOn(date: string): World {
  return { ...base, startedAt: START, currentDate: date };
}

const player = base.personOrder[0]!;

const mountOlive: DayOpeningFacts = {
  placeName: "Mount Olive",
  placeJurisdictionId: "jurisdiction:3745100" as EntityId,
  waitingIds: ["work-item:a" as EntityId, "work-item:b" as EntityId],
  housemateName: "Ashley",
  housemateSourceIds: ["person:ashley" as EntityId],
};

function linesFor(facts: DayOpeningFacts, days: number): string[] {
  return Array.from({ length: days }, (_, day) =>
    dayOpeningLine(worldOn(addDays(START, day)), player, facts),
  );
}

describe("the opening line of an ordinary day", () => {
  it("says the day, the town, what is waiting and who is home", () => {
    const line = dayOpeningLine(worldOn(START), player, mountOlive);
    expect(line).toContain("Mount Olive");
    expect(line).toMatch(/Monday/);
    expect(line).toMatch(/[Tt]wo things/);
    expect(line).toContain("Ashley");
  });

  it("never reads the same two days running in the same place", () => {
    const lines = linesFor(mountOlive, 420);
    for (let day = 1; day < lines.length; day += 1)
      expect(lines[day]).not.toBe(lines[day - 1]);
    // Measured: with the day of the week and lists of four, five and three
    // lines, the same words do not come back within a year here.
    const lastSeen = new Map<string, number>();
    let shortestGap = Infinity;
    lines.forEach((line, day) => {
      const seen = lastSeen.get(line);
      if (seen !== undefined) shortestGap = Math.min(shortestGap, day - seen);
      lastSeen.set(line, day);
    });
    expect(shortestGap).toBeGreaterThanOrEqual(365);
  });

  it("reads differently in another town on the same day", () => {
    const other: DayOpeningFacts = {
      ...mountOlive,
      placeName: "Lincoln City",
      placeJurisdictionId: "jurisdiction:4142600" as EntityId,
    };
    const here = linesFor(mountOlive, 30);
    const there = linesFor(other, 30);
    const same = here.filter(
      (line, day) => line.replace("Mount Olive", "Lincoln City") === there[day],
    ).length;
    expect(same).toBeLessThan(30);
  });

  it("follows the record: no town, nothing waiting, nobody home", () => {
    const line = dayOpeningLine(worldOn(START), player, {
      placeName: null,
      placeJurisdictionId: null,
      waitingIds: [],
      housemateName: null,
      housemateSourceIds: [],
    });
    expect(line).toMatch(/Monday/);
    expect(line).not.toMatch(/ in [A-Z][a-z]+ [A-Z]/);
    expect(line).toMatch(/[Nn]othing|[Nn]obody|empty/);
    expect(line.split(". ").length).toBeLessThanOrEqual(2);
  });
});

describe(`the owner's grades on the day's opening (${PLACE.displayName}, seed ${SEED})`, () => {
  it("passes over a wording the owner held back and says another", () => {
    const before = composeDayOpening(worldOn(START), player, mountOlive);
    expect(before.parts.length).toBeGreaterThan(0);
    const held = before.parts[0]!;
    const ledger: PartGradeLedger = {
      schema: "english-part-grades/1",
      batches: ["batch-test"],
      parts: {
        [held]: {
          good: 0,
          bad: 1,
          fix: 0,
          sharedGood: 0,
          sharedBad: 0,
          sharedFix: 0,
        },
      },
    };
    const after = composeDayOpening(worldOn(START), player, mountOlive, ledger);
    expect(after.parts).not.toContain(held);
    expect(after.text).not.toBe(before.text);
    expect(after.text).toContain("Mount Olive");
    expect(dayOpeningLine(worldOn(START), player, mountOlive)).toBe(
      before.text,
    );
  });
});
