import { describe, expect, it } from "vitest";
import { buildDeepPast } from "./deep-past";
import { parameter as p } from "./parameters";
import { buildPopulation } from "./population";
import { enrichCivicInputs } from "./civic-inputs";
import { createLifeCore } from "./life";
import { workgroupOf } from "./shared-history";

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

  it("opens each worker known to a workgroup of the employer's staff, both ways, in groups about the tunable size", () => {
    // The workgroup is read from the jobs engine's staff (engine map line
    // 12), not a generated fact; the opening meets it through the
    // encounters engine.
    const core = createLifeCore(enrichCivicInputs(input));
    const groups = new Map<string, number>();
    let met = 0;
    for (const person of core.people.values()) {
      const job = person.jobId ? core.jobs.get(person.jobId) : undefined;
      if (!job || job.endsAt) continue;
      const mates = workgroupOf(core, person.id);
      groups.set(person.id, mates.length + 1);
      for (const id of mates) {
        const other = core.people.get(id)!;
        expect(core.jobs.get(other.jobId!)!.organizationId).toBe(
          job.organizationId,
        );
        expect(person.knownIds).toContain(id);
        expect(other.knownIds).toContain(person.id);
        expect(
          core.relationships.has(
            person.id < id ? `${person.id}:${id}` : `${id}:${person.id}`,
          ),
        ).toBe(true);
        met += 1;
      }
    }
    expect(met).toBeGreaterThan(0);
    for (const size of groups.values())
      expect(size).toBeLessThanOrEqual(3 * p("openingCoworkerGroupSize"));
    expect(
      residents.some((person) =>
        (person.pastFacts ?? []).some((fact) =>
          fact.kind.startsWith("social:generated"),
        ),
      ),
    ).toBe(false);
  });
});
