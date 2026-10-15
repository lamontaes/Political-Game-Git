import { describe, expect, it } from "vitest";
import { ageOnDate, makeIsoDate } from "./kernel/dates";
import schools from "./data/opening-schools.json" with { type: "json" };
import { buildDeepPast } from "./deep-past";
import { OPENING_KIN } from "./opening-kin";
import { buildPopulation } from "./population";

// M0-06, step 1: a life at 18. In a random place, the 18-year-old's parents
// and siblings follow the kin rules, schools are real schools from the place
// data, and every fact shown has a record behind it.
const schoolIds = new Set<string>();
for (const rows of Object.values(
  schools.byGeoid as unknown as Record<string, readonly (readonly unknown[])[]>,
))
  for (const row of rows) schoolIds.add(String(row[0]));

// The golden-path runner draws the place and seed from all 56.
const drawn = process.env.GOLDEN_PATH_SEED;
const placeKey = drawn ? process.env.GOLDEN_PATH_PLACE_KEY : undefined;
describe.each(drawn ? [drawn] : ["m0-06-a", "m0-06-b", "m0-06-c"])(
  "a life at 18 (seed %s)",
  (seed) => {
    const input = buildDeepPast(
      buildPopulation({
        seed,
        placeKey,
        startedAt: "2021-01-01",
        minimumPeople: 1000,
      }),
    );
    const byId = new Map(input.people.map((person) => [person.id, person]));
    const age = (birthDate: string, on = input.startedAt) =>
      ageOnDate(makeIsoDate(birthDate), makeIsoDate(on));
    const player = input.people.find(
      (person) => person.tier !== "husk" && age(person.birthDate) === 18,
    )!;
    const facts = player.pastFacts ?? [];
    const relatives = (relation: string) =>
      facts
        .filter((fact) => fact.kind === `family:${relation}`)
        .map((fact) => byId.get(fact.facts!.otherPersonId!)!);

    it(`finds an 18-year-old in ${input.placeMetadata?.placeName}`, () => {
      expect(player).toBeDefined();
    });

    it("gives them parents of child-bearing age at their birth, and siblings who share a parent", () => {
      const parents = relatives("parent");
      const minAge = OPENING_KIN.fertilityByAge.rows[0]!.minAge;
      for (const parent of parents) {
        expect(parent).toBeDefined();
        const at = age(parent.birthDate, player.birthDate);
        expect(at).toBeGreaterThanOrEqual(minAge);
        expect(at).toBeLessThan(70);
      }
      for (const sibling of relatives("sibling")) {
        expect(sibling).toBeDefined();
        const shared = (sibling.pastFacts ?? []).some(
          (fact) =>
            fact.kind === "family:parent" &&
            parents.some((parent) => fact.facts?.otherPersonId === parent.id),
        );
        expect(shared).toBe(true);
      }
    });

    it("schools them at real schools from the place data, or by real naming patterns", () => {
      const attended = facts.filter(
        (fact) => fact.kind === "school:cohort-estimate",
      );
      expect(attended.length).toBeGreaterThan(0);
      for (const fact of attended) {
        const id = fact.facts?.institutionSourceId;
        if (fact.facts?.institutionSourceKey === "NCES-CCD")
          expect(schoolIds.has(id!)).toBe(true);
        else
          expect(fact.facts?.schoolName).toMatch(
            /School|Academy|High|Elementary|Middle/,
          );
      }
    });

    it("backs every fact shown with a source and every named person with a record", () => {
      for (const fact of facts) {
        expect(["SOURCED", "ESTIMATED"]).toContain(fact.source.tag);
        expect(fact.source.citation.length).toBeGreaterThan(0);
        const other = fact.facts?.otherPersonId;
        if (other) expect(byId.has(other)).toBe(true);
        const context = fact.facts?.contextFactId;
        if (context) expect(facts.some((row) => row.id === context)).toBe(true);
        // A relative is named by their own record.
        if (fact.kind.startsWith("family:")) expect(other).toBeDefined();
      }
    });
  },
);
