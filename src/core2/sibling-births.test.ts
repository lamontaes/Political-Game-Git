import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { ageOnDate, daysBetween, makeIsoDate } from "./kernel/dates";
import { P } from "./parameters";
import { buildPopulation } from "./population";
import { spacedSiblingBirths } from "./sibling-births";

// Owner's playtest, Oct 24 (play-stop-20): a sister born seven days after the
// player. Brothers and sisters are born at least nine months apart.
const gap = P.siblingBirthGapDays;
const apart = (a: string, b: string) =>
  Math.abs(daysBetween(makeIsoDate(a), makeIsoDate(b)));

describe("siblings' births", () => {
  it("moves a sibling drawn a week from another, keeping both their ages", () => {
    const on = "2025-01-20";
    const [first, second] = spacedSiblingBirths(on, [
      "2007-01-28",
      "2007-02-10",
    ]);
    expect(first).toBe("2007-01-28");
    expect(apart(first!, second!)).toBeGreaterThanOrEqual(gap);
    expect(ageOnDate(second!, on)).toBe(ageOnDate("2007-02-10", on));
  });

  it("keeps a chosen birthday and moves the sibling beside it", () => {
    const on = "2025-01-20";
    const [sister] = spacedSiblingBirths(on, ["2007-02-10"], ["2007-02-03"]);
    expect(apart(sister!, "2007-02-03")).toBeGreaterThanOrEqual(gap);
  });

  it("keeps a minor a minor and leaves siblings already apart where they were", () => {
    const on = "2025-01-20";
    // Three born within a month, all 17: no year holds all three, so one moves
    // to 16, never to 18.
    const births = spacedSiblingBirths(on, [
      "2007-03-01",
      "2007-03-15",
      "2007-04-01",
    ]);
    for (const date of births) expect(ageOnDate(date, on)).toBeLessThan(18);
    for (let i = 0; i < births.length; i += 1)
      for (let j = i + 1; j < births.length; j += 1)
        expect(apart(births[i]!, births[j]!)).toBeGreaterThanOrEqual(gap);
    expect(spacedSiblingBirths(on, ["2010-05-01", "2012-09-30"])).toEqual([
      "2010-05-01",
      "2012-09-30",
    ]);
  });
});

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "sibling-births");

describe("brothers and sisters at home in a drawn town", () => {
  it(`are born at least nine months apart, in ${place.name} (${place.key}), seed ${seed}`, () => {
    const input = buildPopulation({
      seed: place.seed,
      placeKey: place.key,
      startedAt: "2025-01-20",
      minimumPeople: 1000,
    });
    const byId = new Map(input.people.map((person) => [person.id, person]));
    let pairs = 0;
    for (const person of input.people)
      for (const fact of person.pastFacts ?? []) {
        if (fact.kind !== "family:sibling") continue;
        const sibling = byId.get(fact.facts!.otherPersonId!);
        // A brother or sister who lives in the same home.
        if (!sibling || sibling.householdId !== person.householdId) continue;
        pairs += 1;
        expect(
          apart(person.birthDate, sibling.birthDate),
          `${person.id} (born ${person.birthDate}) and ${sibling.id} (born ${sibling.birthDate})`,
        ).toBeGreaterThanOrEqual(gap);
      }
    expect(pairs, "brothers and sisters living together").toBeGreaterThan(0);
    process.stdout.write(
      `sibling births: ${place.name} (${place.key}), seed ${seed}: ${pairs / 2} pairs at home\n`,
    );
  }, 300_000);
});
