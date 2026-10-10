import { beforeAll, describe, expect, it } from "vitest";
import { characterHistoryContextPersonId } from "../simulation/character-history";
import { ageOnDate, makeIsoDate } from "../simulation/dates";
import {
  lifePlaceByKey,
  lifePlaces,
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "../simulation/life-places";
import { WORKING_AGE_MIN } from "../simulation/living-world/town-employment";
import {
  materializeTownHousehold,
  townHouseholdPeople,
  townHouseholdSkeleton,
} from "../simulation/living-world/town-residents";
import { PERSONALITY_TRAIT_REGISTRY } from "../simulation/personality-trait-registry";
import { createWorld } from "../simulation/world";
import { parameter as p } from "./parameters";
import { buildPopulation, POPULATION_VERSION } from "./population";
import { realLocalities } from "./places";
import type { CoreInput } from "./types";

const seed = "p8-household-source-parity";
const startedAt = "2021-01-01";
let opening: CoreInput;

beforeAll(() => {
  opening = buildPopulation({
    seed,
    startedAt,
    minimumPeople: p("populationTestMinimum"),
  });
});

describe("real-place one-time population import", () => {
  it("retains complete households and both child and adult people", () => {
    expect(opening.people.length).toBeGreaterThanOrEqual(
      p("populationTestMinimum"),
    );
    expect(new Set(opening.people.map((person) => person.id)).size).toBe(
      opening.people.length,
    );
    const byId = new Map(opening.people.map((person) => [person.id, person]));
    const assigned = new Set<string>();
    for (const household of opening.households) {
      expect(household.memberIds.length).toBeGreaterThan(p("zero"));
      for (const id of household.memberIds) {
        expect(assigned.has(id)).toBe(false);
        assigned.add(id);
        expect(byId.get(id)?.householdId).toBe(household.id);
        expect(byId.get(id)?.placeId).toBe(household.placeId);
      }
    }
    expect(assigned.size).toBe(opening.people.length);
    const children = (opening.familyLinks ?? [])
      .filter((link) => link.kind === "parent-child")
      .map((link) => byId.get(link.personIds[p("one")]!)!);
    expect(children.length).toBeGreaterThan(p("zero"));
    for (const child of children)
      expect(
        ageOnDate(makeIsoDate(child.birthDate), makeIsoDate(startedAt)),
      ).toBeLessThan(WORKING_AGE_MIN);
    expect(
      opening.people.some((person) => person.familyIds.length > p("zero")),
    ).toBe(true);
    expect(opening.people.every((person) => person.tier === "weekly")).toBe(
      true,
    );
  });

  it("keeps canonical identity and kin IDs without treating roommates as family", () => {
    const place = lifePlaceByKey(opening.placeMetadata!.placeKey!)!;
    const state = stateJurisdictionForKey(place.stateJurisdictionKey!)!;
    const context = createWorld({
      seed: `${POPULATION_VERSION}:${seed}:${place.key}`,
      currentDate: makeIsoDate(startedAt),
      people: [],
      jurisdictions: [place.context.jurisdiction, state],
    });
    const byId = new Map(opening.people.map((person) => [person.id, person]));
    const checkedShapes = new Set<string>();
    for (const [index, household] of opening.households.entries()) {
      const skeleton = townHouseholdSkeleton(
        context,
        place.context.jurisdiction.id,
        index,
      );
      const inputs = townHouseholdPeople(
        context,
        place.context.jurisdiction.id,
        index,
      );
      expect(household.memberIds).toEqual(
        inputs.map((input) =>
          characterHistoryContextPersonId(context, input.stableKey),
        ),
      );
      for (const input of inputs) {
        const person = byId.get(
          characterHistoryContextPersonId(context, input.stableKey),
        )!;
        expect([person.givenName, person.familyName, person.birthDate]).toEqual(
          [input.givenName, input.familyName, input.birthDate],
        );
      }
      if (checkedShapes.has(skeleton.shape)) continue;
      checkedShapes.add(skeleton.shape);
      const canonical = materializeTownHousehold(
        context,
        place.context.jurisdiction.id,
        index,
      );
      expect(canonical.history.households[p("zero")]!.id).toBe(household.id);
      const links = (opening.familyLinks ?? []).filter(
        (link) =>
          household.memberIds.includes(link.personIds[p("zero")]!) &&
          household.memberIds.includes(link.personIds[p("one")]!),
      );
      expect(links.map((link) => link.id).sort()).toEqual(
        [
          ...canonical.history.kinshipRelationships.map((link) => link.id),
          ...canonical.history.partnerships.map((link) => link.id),
        ].sort(),
      );
      for (const personId of household.memberIds) {
        const person = byId.get(personId)!;
        expect(person.looks?.appearanceSeed).toBe(
          canonical.people[personId]!.appearance?.seed,
        );
        if (skeleton.shape === "housemates") {
          expect(person.familyIds).toEqual([]);
          expect(person.knownIds).toEqual(
            household.memberIds.filter((other) => other !== personId),
          );
        }
        for (const other of person.familyIds)
          expect(byId.get(other)!.familyIds).toContain(personId);
      }
    }
    expect(checkedShapes).toContain("housemates");
    expect(checkedShapes).toContain("parent-with-children");
    expect(checkedShapes).toContain("couple-with-children");
  });

  it("retains real recorded job identity, employer, title, hours and sourced pay estimates", () => {
    expect(opening.jobs.length).toBeGreaterThan(p("zero"));
    const people = new Map(opening.people.map((person) => [person.id, person]));
    const employers = new Map(
      opening.organizations.map((organization) => [
        organization.id,
        organization,
      ]),
    );
    for (const job of opening.jobs) {
      const person = people.get(job.personId)!;
      expect(person.jobId).toBe(job.id);
      expect(employers.get(job.organizationId)?.name).toBeTruthy();
      expect(job.title).toBeTruthy();
      expect(job.hoursDaily).toBeGreaterThan(p("zero"));
      expect(job.wageDailyMinor).toBeGreaterThan(p("zero"));
      expect(Number.isSafeInteger(job.wageDailyMinor)).toBe(true);
      expect(
        ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(startedAt)),
      ).toBeGreaterThanOrEqual(WORKING_AGE_MIN);
      expect(job.source.tag).toBe("ESTIMATED");
      expect(job.source.citation).toContain("BLS");
      expect(
        person.pastFacts?.some(
          (fact) =>
            fact.id === `${job.id}:past:opening` && fact.date <= startedAt,
        ),
      ).toBe(true);
    }
  });

  it("preserves only generated opening facts and exposes its future-vintage estimates", () => {
    for (const person of opening.people) {
      expect(person.source.tag).toBe("ESTIMATED");
      expect(person.source.asOf).toBe(startedAt);
      expect(person.source.estimatedFrom).toContain(
        "not an observed census roster",
      );
      expect(
        person.pastFacts?.some(
          (fact) =>
            fact.kind === "birth-date" && fact.date === person.birthDate,
        ),
      ).toBe(true);
      expect(person.pastFacts?.every((fact) => fact.date <= startedAt)).toBe(
        true,
      );
      expect(Object.keys(person.traits).length).toBeLessThan(
        PERSONALITY_TRAIT_REGISTRY.length,
      );
      for (const [key, value] of Object.entries(person.traits)) {
        expect(Number.isFinite(value)).toBe(true);
        expect(person.traitSources?.[key]?.estimatedFrom).toContain(
          "Canonical sparse upbringing trait projection",
        );
      }
      expect(Number.isSafeInteger(person.liquidMinor)).toBe(true);
      expect(Number.isSafeInteger(person.livingCostDailyMinor)).toBe(true);
    }
    expect(opening.gaps.some((gap) => gap.startsWith("Opening vintage:"))).toBe(
      true,
    );
    expect(opening.gaps.some((gap) => gap.startsWith("Deep past:"))).toBe(true);
    expect(opening.placeMetadata?.cashSource).toContain(
      "families holding transaction accounts",
    );
    expect(opening.placeMetadata?.countyNames).toBeTruthy();
    expect(
      opening.people.every((person) => person.countyId !== undefined),
    ).toBe(true);
  });

  it("is seed-stable and extends identities without splitting a household", () => {
    const placeKey = opening.placeMetadata!.placeKey!;
    const repeated = buildPopulation({
      seed,
      placeKey,
      startedAt,
      minimumPeople: p("populationTestMinimum"),
    });
    expect(repeated).toEqual(opening);
    const extended = buildPopulation({
      seed,
      placeKey,
      startedAt,
      minimumPeople: opening.people.length + p("populationTestIncrement"),
    });
    expect(
      extended.households.slice(p("zero"), opening.households.length),
    ).toEqual(opening.households);
    expect(
      extended.people
        .slice(p("zero"), opening.people.length)
        .map((person) => [
          person.id,
          person.givenName,
          person.familyName,
          person.birthDate,
          person.householdId,
          person.countyId,
        ]),
    ).toEqual(
      opening.people.map((person) => [
        person.id,
        person.givenName,
        person.familyName,
        person.birthDate,
        person.householdId,
        person.countyId,
      ]),
    );
  });

  it("shares one data route across every listed state and territory without inventing a missing county", () => {
    const statesWithLocalities = new Set(
      realLocalities()
        .filter((place) => place.scope === "locality")
        .map((place) => place.stateJurisdictionKey),
    );
    for (const state of lifePlaceStateIdentities())
      expect(statesWithLocalities).toContain(state.jurisdictionKey);
    const missingGeography = realLocalities().find(
      (place) =>
        place.scope === "locality" &&
        place.context.jurisdiction.kind === "territory-place",
    )!;
    const territory = buildPopulation({
      seed,
      placeKey: missingGeography.key,
      startedAt,
      minimumPeople: p("populationTestIncrement"),
    });
    expect(territory.people.length).toBeGreaterThanOrEqual(
      p("populationTestIncrement"),
    );
    expect(
      territory.people.every(
        (person) => person.placeId === missingGeography.context.jurisdiction.id,
      ),
    ).toBe(true);
    expect(
      territory.people.every((person) => person.countyId === undefined),
    ).toBe(true);
    expect(
      territory.gaps.some((gap) => gap.startsWith("County context absent")),
    ).toBe(true);
  });

  it("builds the requested production-sized cohort with whole households", () => {
    const cohort = buildPopulation({ seed: `${seed}:target`, startedAt });
    expect(cohort.people.length).toBeGreaterThanOrEqual(p("targetPopulation"));
    expect(
      cohort.households.reduce(
        (count, household) => count + household.memberIds.length,
        p("zero"),
      ),
    ).toBe(cohort.people.length);
  });

  it("rejects invalid cohort sizes and nonlocality inputs before generation", () => {
    expect(() =>
      buildPopulation({ seed, startedAt, minimumPeople: p("zero") }),
    ).toThrow("positive whole count");
    const statePlace = lifePlaces().find((place) => place.scope === "state")!;
    expect(() =>
      buildPopulation({
        seed,
        startedAt,
        placeKey: statePlace.key,
        minimumPeople: p("one"),
      }),
    ).toThrow("recorded locality");
  });
});
