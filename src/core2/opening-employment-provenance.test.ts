import { describe, expect, it } from "vitest";
import { lifePlaceStateIdentities } from "../simulation/life-places";
import { stableHash } from "../simulation/ids";
import { buildPopulation } from "./population";
import { realLocalities } from "./places";
import { parameter as p } from "./parameters";
import openingData from "./data/opening-employment.json" with { type: "json" };
import type { OpeningEmploymentAllocation } from "./opening-employment";

const seed = "p8-opening-supported-role-source-parity",
  startedAt = "2021-01-01";

describe("opening-only employment source and preservation", () => {
  it("preserves original canonical paid jobs, families and employer identities while adding only supported recorded roles", () => {
    const original = buildPopulation({
      seed,
      startedAt,
      minimumPeople: p("populationTestMinimum"),
      openingEmployment: false,
      scheduledWork: false,
    });
    const expanded = buildPopulation({
      seed,
      startedAt,
      placeKey: original.placeMetadata!.placeKey!,
      minimumPeople: p("populationTestMinimum"),
      openingEmployment: true,
      scheduledWork: true,
    });
    expect(expanded.households).toEqual(original.households);
    expect(expanded.familyLinks).toEqual(original.familyLinks);
    const people = new Map(expanded.people.map((row) => [row.id, row]));
    for (const before of original.people) {
      const after = people.get(before.id)!;
      expect([
        after.id,
        after.givenName,
        after.familyName,
        after.birthDate,
        after.placeId,
        after.countyId,
        after.householdId,
        after.familyIds,
        after.knownIds,
        after.looks,
        after.traits,
        after.traitSources,
      ]).toEqual([
        before.id,
        before.givenName,
        before.familyName,
        before.birthDate,
        before.placeId,
        before.countyId,
        before.householdId,
        before.familyIds,
        before.knownIds,
        before.looks,
        before.traits,
        before.traitSources,
      ]);
      for (const fact of before.pastFacts ?? [])
        expect(after.pastFacts).toContainEqual(fact);
    }
    const jobs = new Map(expanded.jobs.map((row) => [row.id, row]));
    for (const job of original.jobs) expect(jobs.get(job.id)).toEqual(job);
    const identity = (row: (typeof original.organizations)[number]) => ({
      id: row.id,
      name: row.name,
      placeId: row.placeId,
      kind: row.kind,
      classification: row.classification,
      governmentFacts: row.governmentFacts,
    });
    expect(expanded.organizations.map(identity)).toEqual(
      original.organizations.map(identity),
    );
    const originalIds = new Set(original.jobs.map((row) => row.id));
    for (const job of expanded.jobs) {
      if (originalIds.has(job.id)) continue;
      expect(openingData.supportedOccupations).toContain(
        job.occupationClassification,
      );
      expect(
        original.jobs.some(
          (template) =>
            template.organizationId === job.organizationId &&
            template.title === job.title &&
            template.occupationClassification === job.occupationClassification,
        ),
      ).toBe(true);
      expect(job.source.tag).toBe("ESTIMATED");
      expect(job.source.estimatedFrom).toContain("not an application");
      expect(job.source.citation).toContain("BLS");
      expect(Number.isSafeInteger(job.wageDailyMinor)).toBe(true);
      const person = people.get(job.personId)!;
      expect(
        person.pastFacts?.some(
          (fact) =>
            fact.id === `${job.id}:past:opening` &&
            fact.date >= person.birthDate &&
            fact.date <= startedAt,
        ),
      ).toBe(true);
    }
    expect(expanded.focusPlaceIds).toEqual([]);
    expect(expanded.visiblePlaceIds).toContain(
      expanded.people[p("zero")]!.placeId,
    );
    expect(expanded.workCommitments?.length).toBe(
      expanded.jobs.filter((job) => job.hoursDaily > p("zero")).length,
    );
  });

  it("uses one generic supported-role/source-gap route across every sourced state and territory", () => {
    const localities = realLocalities(),
      seen = new Set<string>();
    for (const state of lifePlaceStateIdentities()) {
      const available = localities
        .filter(
          (row) =>
            row.stateJurisdictionKey === state.jurisdictionKey &&
            row.scope === "locality",
        )
        .sort((a, b) =>
          stableHash(`${seed}:${a.key}`).localeCompare(
            stableHash(`${seed}:${b.key}`),
          ),
        );
      const place = available[p("zero")]!;
      expect(place).toBeDefined();
      const input = buildPopulation({
        seed: `${seed}:${state.jurisdictionKey}`,
        startedAt,
        placeKey: place.key,
        minimumPeople: p("populationTestIncrement"),
        openingEmployment: true,
        scheduledWork: false,
      });
      seen.add(state.jurisdictionKey);
      expect(
        input.people.every(
          (person) => person.placeId === place.context.jurisdiction.id,
        ),
      ).toBe(true);
      const receipt: OpeningEmploymentAllocation["receipt"] = JSON.parse(
        input.placeMetadata!.openingEmploymentReceipt!,
      );
      expect(receipt.tag).toBe("ESTIMATED");
      expect(receipt.unassignedCandidates).toBeGreaterThanOrEqual(p("zero"));
      expect(receipt.supportedSourceWeight).toBeLessThanOrEqual(
        receipt.sourceWeight,
      );
      for (const age of receipt.ageTargets) {
        expect(age.rate).toBeGreaterThanOrEqual(p("zero"));
        expect(age.rate).toBeLessThanOrEqual(p("one"));
        expect(age.source).toBeTruthy();
        if (!age.basis.startsWith("county-ACS-")) {
          expect(age.basis).toContain("tunable-missing-county");
          expect(
            input.gaps.some((gap) =>
              gap.includes("no sourced local or territorial employment rate"),
            ),
          ).toBe(true);
        }
      }
      const employers = new Set(input.organizations.map((row) => row.id));
      for (const job of input.jobs)
        expect(employers.has(job.organizationId)).toBe(true);
      expect(
        input.people.every((person) =>
          person.familyIds.every((id) =>
            input.people.some((other) => other.id === id),
          ),
        ),
      ).toBe(true);
    }
    expect(seen.size).toBe(lifePlaceStateIdentities().length);
  });
});
