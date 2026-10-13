import { describe, expect, it } from "vitest";
import { drawPlace } from "../../tests/golden-path/place";
import { ageOnDate, makeIsoDate } from "../simulation/dates";
import { lifePlaceByJurisdictionId } from "../simulation/life-places";
import type { EntityId } from "../simulation/types";
import { buildDeepPast } from "./deep-past";
import { collegesNear, COLLEGE_STAGE } from "./opening-college";
import { profileFor } from "./opening-profile";
import { buildPopulation } from "./population";
import colleges from "./data/opening-colleges.json" with { type: "json" };

// SG-P15-college-enrollment: in drawn towns whose county has a college,
// young adults with some college are enrolled at one in their county, about
// as often as their state's 18-to-24-year-olds are, and their classmates
// there know them.
const SHARES = colleges.shareByState as Record<string, number>;
const towns: {
  place: ReturnType<typeof drawPlace>;
  input: ReturnType<typeof buildDeepPast>;
}[] = [];
for (let draw = 0; towns.length < 3 && draw < 12; draw += 1) {
  const place = drawPlace(
    process.env.GOLDEN_PATH_SEED ?? "college",
    `college-${draw}`,
  );
  const input = buildDeepPast(
    buildPopulation({
      seed: place.seed,
      placeKey: place.key,
      startedAt: "2021-01-01",
      minimumPeople: 800,
    }),
  );
  if (input.people.some((person) => collegesNear(person).length))
    towns.push({ place, input });
}
const age = (birthDate: string, at: string) =>
  ageOnDate(makeIsoDate(birthDate), makeIsoDate(at));
const collegeFact = (person: {
  pastFacts?: readonly { kind: string; facts?: Record<string, string> }[];
}) =>
  person.pastFacts?.find(
    (fact) =>
      fact.kind === "school:cohort-estimate" &&
      fact.facts?.stage === COLLEGE_STAGE,
  );

describe(`college students in ${towns.map(({ place }) => `${place.name} (seed ${place.seed.slice(0, 12)})`).join(", ")}`, () => {
  it("enrolls about the state's share of young adults, all with some college, at a college in their county", () => {
    expect(towns.length).toBeGreaterThan(0);
    let enrolled = 0;
    let expected = 0;
    for (const { input } of towns) {
      const young = input.people.filter(
        (person) =>
          person.tier !== "husk" &&
          age(person.birthDate, input.startedAt) >= 18 &&
          age(person.birthDate, input.startedAt) <= 24,
      );
      const state =
        lifePlaceByJurisdictionId(young[0]!.placeId as EntityId)
          ?.stateJurisdictionKey?.split("-")
          .at(-1) ?? "";
      expected += (SHARES[state] ?? colleges.nationalShare) * young.length;
      for (const person of input.people) {
        const fact = collegeFact(person);
        if (!fact) continue;
        enrolled += 1;
        expect(age(person.birthDate, input.startedAt)).toBeGreaterThanOrEqual(
          18,
        );
        expect(age(person.birthDate, input.startedAt)).toBeLessThanOrEqual(24);
        expect(
          profileFor(person, input.seed, input.startedAt)?.education,
        ).not.toBe("no-college");
        expect(collegesNear(person).map(([id]) => id)).toContain(
          fact.facts!.institutionSourceId,
        );
        expect(fact.date <= input.startedAt).toBe(true);
      }
    }
    // Capped by who has some college; never above the state's share.
    expect(enrolled).toBeGreaterThan(0);
    expect(enrolled).toBeLessThanOrEqual(Math.ceil(expected) + towns.length);
    expect(enrolled).toBeGreaterThanOrEqual(0.5 * expected);
  });

  it("gives college students classmates there who know them", () => {
    let withClassmates = 0;
    let students = 0;
    for (const { input } of towns)
      for (const person of input.people) {
        const fact = collegeFact(person);
        if (!fact) continue;
        students += 1;
        if (
          person.pastFacts?.some(
            (row) =>
              row.kind === "social:generated-school-acquaintance" &&
              row.facts?.schoolName === fact.facts!.schoolName,
          )
        )
          withClassmates += 1;
      }
    expect(withClassmates).toBeGreaterThan(0);
    expect(withClassmates).toBeLessThanOrEqual(students);
  });
});
