import { describe, expect, it } from "vitest";
import { buildDeepPast } from "./deep-past";
import { parameter as p } from "./parameters";
import { buildPopulation } from "./population";

// P15 part 3: each child's school is a real campus keyed to their home, and
// residents of the same employer know a workgroup of coworkers.
describe("opening schools and coworkers", () => {
  const input = buildDeepPast(
    buildPopulation({
      seed: "p15-opening-circles",
      startedAt: "2021-01-01",
      minimumPeople: 600,
    }),
  );
  const residents = input.people.filter((person) => person.tier !== "husk");
  const facts = (kind: string) =>
    residents.flatMap((person) =>
      (person.pastFacts ?? [])
        .filter((fact) => fact.kind === kind)
        .map((fact) => ({ person, fact })),
    );

  it("seats children at real public schools, shared by children who live together", () => {
    const schools = facts("school:cohort-estimate");
    expect(schools.length).toBeGreaterThan(0);
    const named = schools.filter(
      ({ fact }) => fact.facts?.institutionSourceKey === "NCES-CCD",
    );
    expect(named.length).toBeGreaterThan(schools.length / 2);
    const byHousehold = new Map<string, Set<string>>();
    for (const { person, fact } of schools) {
      if (person.birthDate < "2003-01-02" || fact.facts?.stage !== "elementary")
        continue;
      const key = `${person.householdId}:${fact.facts.placeId}`;
      const set = byHousehold.get(key) ?? new Set();
      set.add(fact.facts.schoolName!);
      byHousehold.set(key, set);
    }
    for (const set of byHousehold.values()) expect(set.size).toBe(1);
    expect(
      new Set(named.map(({ fact }) => fact.facts?.institutionSourceId)).size,
    ).toBeGreaterThan(1);
  });

  it("links coworkers of one employer both ways, in groups about the tunable size", () => {
    const coworkers = facts("social:generated-coworker");
    expect(coworkers.length).toBeGreaterThan(0);
    const jobs = new Map(input.jobs.map((job) => [job.personId, job]));
    const byId = new Map(residents.map((person) => [person.id, person]));
    const groups = new Map<string, Set<string>>();
    for (const { person, fact } of coworkers) {
      const other = byId.get(fact.facts!.otherPersonId!)!;
      expect(jobs.get(person.id)!.organizationId).toBe(
        jobs.get(other.id)!.organizationId,
      );
      expect(person.knownIds).toContain(other.id);
      expect(
        (other.pastFacts ?? []).some(
          (row) =>
            row.kind === "social:generated-coworker" &&
            row.facts?.otherPersonId === person.id,
        ),
      ).toBe(true);
      const group = groups.get(fact.facts!.peerGroupId!) ?? new Set();
      group.add(person.id);
      groups.set(fact.facts!.peerGroupId!, group);
    }
    // Groups are drawn by person, so someone filled in alone joins the same
    // group as in a full town: sizes vary around the tunable size rather
    // than stopping at it.
    const sizes = [...groups.values()].map((group) => group.size);
    const mean = sizes.reduce((sum, size) => sum + size, 0) / sizes.length;
    expect(mean).toBeLessThanOrEqual(p("openingCoworkerGroupSize"));
    for (const size of sizes)
      expect(size).toBeLessThanOrEqual(2 * p("openingCoworkerGroupSize"));
  });
});
