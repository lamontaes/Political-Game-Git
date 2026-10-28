import { describe, expect, it } from "vitest";
import { parameter as p } from "./parameters";
import { buildPopulation } from "./population";
import { enrichCivicInputs } from "./civic-inputs";
import { createLifeCore } from "./life";
import { workgroupOf } from "./shared-history";

// P15 part 3: residents of the same employer know a workgroup of coworkers.
// (Each child's school is the school engine's run before the start,
// src/core2/past-school.test.ts.)
describe("opening coworkers", () => {
  const input = buildPopulation({
    seed: "p15-opening-circles",
    startedAt: "2021-01-01",
    minimumPeople: 600,
  });
  const residents = input.people.filter((person) => person.tier !== "husk");

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
