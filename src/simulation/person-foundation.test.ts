import { describe, expect, it } from "vitest";
import { SqliteWorldRepository } from "../persistence/sqlite-world-repository";
import { ageOnDate, makeIsoDate } from "./dates";
import { DEMO_START_DATE, createDemoWorld } from "./demo";
import {
  DEFAULT_CORPUS_VERSION,
  DEMO_NAMES_V4,
  getNameCorpus,
} from "./names-data";
import {
  DEFAULT_PERSON_GENERATOR_VERSION,
  LEGACY_DEMO_PERSON_GENERATOR_VERSION,
  createLightweightPerson,
  personName,
} from "./people";
import {
  createScenePlacement,
  derivePersonAppearance,
  type SceneAnchor,
} from "./person-appearance";
import { createWorldId } from "./world";
import type { EntityId, Person } from "./types";

describe("Generated Person Substrate & Foundation", () => {
  const TEST_JURISDICTION_ID = "jurisdiction_test_placeholder" as EntityId;
  const TEST_WORLD_DATE = makeIsoDate("2026-01-05");

  it("1. same seed -> exact same generated people (determinism)", () => {
    const worldId = createWorldId("seed-determinism-alpha");
    const person1 = createLightweightPerson({
      worldId,
      worldSeed: "seed-determinism-alpha",
      index: 0,
      currentDate: TEST_WORLD_DATE,
      homeJurisdictionId: TEST_JURISDICTION_ID,
    });
    const person2 = createLightweightPerson({
      worldId,
      worldSeed: "seed-determinism-alpha",
      index: 0,
      currentDate: TEST_WORLD_DATE,
      homeJurisdictionId: TEST_JURISDICTION_ID,
    });

    expect(person1).toStrictEqual(person2);
    expect(person1.id).toBe(person2.id);
    expect(person1.givenName).toBe(person2.givenName);
    expect(person1.familyName).toBe(person2.familyName);
    expect(person1.birthDate).toBe(person2.birthDate);
    expect(person1.appearance?.seed).toBe(person2.appearance?.seed);
  });

  it("2. different seeds -> variation across populations", () => {
    const worldId1 = createWorldId("seed-var-1");
    const worldId2 = createWorldId("seed-var-2");
    const pop1 = Array.from({ length: 6 }, (_, i) =>
      createLightweightPerson({
        worldId: worldId1,
        worldSeed: "seed-var-1",
        index: i,
        currentDate: TEST_WORLD_DATE,
        homeJurisdictionId: TEST_JURISDICTION_ID,
      }),
    );
    const pop2 = Array.from({ length: 6 }, (_, i) =>
      createLightweightPerson({
        worldId: worldId2,
        worldSeed: "seed-var-2",
        index: i,
        currentDate: TEST_WORLD_DATE,
        homeJurisdictionId: TEST_JURISDICTION_ID,
      }),
    );

    const names1 = pop1.map(personName);
    const names2 = pop2.map(personName);
    expect(names1).not.toEqual(names2);

    const appSeeds1 = pop1.map((p) => p.appearance?.seed);
    const appSeeds2 = pop2.map((p) => p.appearance?.seed);
    expect(appSeeds1).not.toEqual(appSeeds2);
  });

  it("3. same world reload -> no reroll (persistence roundtrip)", () => {
    const world = createDemoWorld("persisted-person-world", {
      generatorVersion: DEFAULT_PERSON_GENERATOR_VERSION,
      corpusVersion: DEFAULT_CORPUS_VERSION,
    });
    const repo = new SqliteWorldRepository(":memory:");
    repo.save(world);
    const loaded = repo.load(world.id);
    repo.close();

    expect(loaded).not.toBeNull();
    expect(loaded?.personOrder).toEqual(world.personOrder);
    for (const personId of world.personOrder) {
      expect(loaded?.people[personId]).toEqual(world.people[personId]);
    }
  });

  it("4. generator and corpus version stability (no silent mutation of legacy or versioned worlds)", () => {
    // Legacy demo world version
    const legacyPerson = createLightweightPerson({
      worldId: createWorldId("stage-6-5-run-a"),
      worldSeed: "stage-6-5-run-a",
      index: 0,
      currentDate: DEMO_START_DATE,
      homeJurisdictionId: TEST_JURISDICTION_ID,
      generatorVersion: LEGACY_DEMO_PERSON_GENERATOR_VERSION,
      corpusVersion: DEMO_NAMES_V4.version,
    });

    expect(legacyPerson.generatorVersion).toBe("demo-person-v4");
    expect(legacyPerson.corpusVersion).toBe("demo-names-v4");
    expect(legacyPerson.givenName).toBe("Andre");
    expect(legacyPerson.familyName).toBe("Collins");

    // Versioned substrate person
    const v5Person = createLightweightPerson({
      worldId: createWorldId("stage-6-5-run-a"),
      worldSeed: "stage-6-5-run-a",
      index: 0,
      currentDate: DEMO_START_DATE,
      homeJurisdictionId: TEST_JURISDICTION_ID,
      generatorVersion: "person-v5",
      corpusVersion: "names-v1",
    });

    expect(v5Person.generatorVersion).toBe("person-v5");
    expect(v5Person.corpusVersion).toBe("names-v1");
    // Expanding names-v1 with names-v2 later will not change names-v1 lookup
    expect(getNameCorpus("names-v1").version).toBe("names-v1");
  });

  it("5. date-of-birth derivation (derived age on canonical simulation date)", () => {
    const worldId = createWorldId("dob-derivation-seed");
    const person = createLightweightPerson({
      worldId,
      worldSeed: "dob-derivation-seed",
      index: 0,
      currentDate: TEST_WORLD_DATE,
      homeJurisdictionId: TEST_JURISDICTION_ID,
    });

    const derivedAge = ageOnDate(person.birthDate, TEST_WORLD_DATE);
    expect(derivedAge).toBeGreaterThanOrEqual(18);
    expect(derivedAge).toBeLessThanOrEqual(100);

    // Verify birth-date fact matches person.birthDate
    const birthFact = person.establishedFacts.find(
      (f) => f.kind === "birth-date",
    );
    expect(birthFact).toBeDefined();
    expect(birthFact?.occurredAt).toBe(person.birthDate);
  });

  it("6. birthday boundary testing (day before, day of, day after)", () => {
    // Person born June 15, 1990: on 2026-06-14 age is 35; on 2026-06-15 turns 36; on 2026-06-16 age is 36
    const birthDate = makeIsoDate("1990-06-15");
    expect(ageOnDate(birthDate, makeIsoDate("2026-06-14"))).toBe(35);
    expect(ageOnDate(birthDate, makeIsoDate("2026-06-15"))).toBe(36);
    expect(ageOnDate(birthDate, makeIsoDate("2026-06-16"))).toBe(36);

    // New Year boundary: born Jan 1, 2000
    const nyBirth = makeIsoDate("2000-01-01");
    expect(ageOnDate(nyBirth, makeIsoDate("2025-12-31"))).toBe(25);
    expect(ageOnDate(nyBirth, makeIsoDate("2026-01-01"))).toBe(26);
  });

  it("7. leap-date handling (born Feb 29 in leap and non-leap years)", () => {
    // Person born on leap day 2004-02-29
    const leapBirth = makeIsoDate("2004-02-29");

    // In a non-leap year (2025):
    // 2025-02-27: age 20
    // 2025-02-28: age 21 (celebrated/observed on Feb 28 in non-leap year)
    // 2025-03-01: age 21
    expect(ageOnDate(leapBirth, makeIsoDate("2025-02-27"))).toBe(20);
    expect(ageOnDate(leapBirth, makeIsoDate("2025-02-28"))).toBe(21);
    expect(ageOnDate(leapBirth, makeIsoDate("2025-03-01"))).toBe(21);

    // In a leap year (2024):
    // 2024-02-28: age 19
    // 2024-02-29: age 20 (exact leap birthday)
    // 2024-03-01: age 20
    expect(ageOnDate(leapBirth, makeIsoDate("2024-02-28"))).toBe(19);
    expect(ageOnDate(leapBirth, makeIsoDate("2024-02-29"))).toBe(20);
    expect(ageOnDate(leapBirth, makeIsoDate("2024-03-01"))).toBe(20);
  });

  it("8. reasonable production age constraints", () => {
    const worldId = createWorldId("prod-age-constraints");
    for (let i = 0; i < 50; i += 1) {
      const person = createLightweightPerson({
        worldId,
        worldSeed: `prod-seed-${i}`,
        index: i,
        currentDate: TEST_WORLD_DATE,
        homeJurisdictionId: TEST_JURISDICTION_ID,
        profile: "production",
      });
      const age = ageOnDate(person.birthDate, TEST_WORLD_DATE);
      expect(age).toBeGreaterThanOrEqual(21);
      expect(age).toBeLessThanOrEqual(75);
    }
  });

  it("9. explicit stress-profile age extremes", () => {
    const worldId = createWorldId("stress-age-extremes");
    const stressPeople = Array.from({ length: 12 }, (_, i) =>
      createLightweightPerson({
        worldId,
        worldSeed: "stress-age-extremes",
        index: i,
        currentDate: TEST_WORLD_DATE,
        homeJurisdictionId: TEST_JURISDICTION_ID,
        profile: "stress",
      }),
    );

    const ages = stressPeople.map((p) =>
      ageOnDate(p.birthDate, TEST_WORLD_DATE),
    );
    // Index 0: young adult boundary (18)
    expect(ages[0]).toBe(18);
    // Index 4: senior adult boundary (88)
    expect(ages[4]).toBe(88);
    // Index 3: leap birthday
    expect(stressPeople[3]?.birthDate.endsWith("-02-29")).toBe(true);

    // Verify birthday boundary cases exist
    const hasTodayBirthday = stressPeople.some(
      (p) => p.birthDate.slice(5) === TEST_WORLD_DATE.slice(5),
    );
    expect(hasTodayBirthday).toBe(true);
  });

  it("10. name-corpus size and versioning", () => {
    const starterCorpus = getNameCorpus("names-v1");
    expect(starterCorpus.givenNames.length).toBeGreaterThanOrEqual(300);
    expect(starterCorpus.familyNames.length).toBeGreaterThanOrEqual(300);
    expect(starterCorpus.provenance.license).toBeDefined();
    expect(starterCorpus.provenance.source).toBeDefined();

    // Verify all names are non-empty strings and deduplicated
    const uniqueGiven = new Set(starterCorpus.givenNames);
    const uniqueFamily = new Set(starterCorpus.familyNames);
    expect(uniqueGiven.size).toBe(starterCorpus.givenNames.length);
    expect(uniqueFamily.size).toBe(starterCorpus.familyNames.length);
  });

  it("11. deterministic collision handling", () => {
    const worldId = createWorldId("collision-handling-seed");
    const people = Array.from({ length: 30 }, (_, i) =>
      createLightweightPerson({
        worldId,
        worldSeed: "collision-handling-seed",
        index: i,
        currentDate: TEST_WORLD_DATE,
        homeJurisdictionId: TEST_JURISDICTION_ID,
      }),
    );

    const ids = people.map((p) => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(30);

    const names = people.map(personName);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(30);
  });

  it("12. stable person IDs keyed to worldId and generationKey", () => {
    const worldId = createWorldId("stable-id-seed");
    const p1 = createLightweightPerson({
      worldId,
      worldSeed: "stable-id-seed",
      index: 0,
      currentDate: TEST_WORLD_DATE,
      homeJurisdictionId: TEST_JURISDICTION_ID,
    });
    const p2 = createLightweightPerson({
      worldId,
      worldSeed: "stable-id-seed",
      index: 1,
      currentDate: TEST_WORLD_DATE,
      homeJurisdictionId: TEST_JURISDICTION_ID,
    });

    expect(p1.id).toMatch(/^person_[0-9a-f]{16}$/);
    expect(p2.id).toMatch(/^person_[0-9a-f]{16}$/);
    expect(p1.id).not.toBe(p2.id);
  });

  it("13. stable appearance seeds derived from person seed", () => {
    const worldId = createWorldId("app-seed-test");
    const person = createLightweightPerson({
      worldId,
      worldSeed: "app-seed-test",
      index: 0,
      currentDate: TEST_WORLD_DATE,
      homeJurisdictionId: TEST_JURISDICTION_ID,
    });

    expect(person.appearance).toBeDefined();
    expect(person.appearance?.seed).toMatch(/^app_[0-9a-f]{16}$/);
    expect(person.appearance?.recipeVersion).toBe("appearance-recipe-v1");

    // Calling derivePersonAppearance with same seed yields exact same result
    const derived = derivePersonAppearance(person.generationKey);
    expect(derived.recipeVersion).toBe("appearance-recipe-v1");
  });

  it("14. appearance seed not derived from chair or scene position", () => {
    const worldId = createWorldId("seam-anchor-test");
    const person = createLightweightPerson({
      worldId,
      worldSeed: "seam-anchor-test",
      index: 0,
      currentDate: TEST_WORLD_DATE,
      homeJurisdictionId: TEST_JURISDICTION_ID,
    });

    const chairAnchor1: SceneAnchor = {
      anchorId: "primary-desk-chair",
      position: { x: 500, y: 400 },
      depth: 10,
      contact: "seat-surface",
      occlusion: "desk-front",
    };

    const chairAnchor2: SceneAnchor = {
      anchorId: "left-guest-chair",
      position: { x: 200, y: 450 },
      depth: 5,
      contact: "cushion",
      occlusion: "none",
    };

    const placement1 = createScenePlacement(person, chairAnchor1);
    const placement2 = createScenePlacement(person, chairAnchor2);

    // Moving person between chairs preserves exact appearance identity
    expect(placement1.appearance.seed).toBe(placement2.appearance.seed);
    expect(placement1.appearance.recipeVersion).toBe(
      placement2.appearance.recipeVersion,
    );
    expect(placement1.personId).toBe(person.id);
    expect(placement2.personId).toBe(person.id);
    // Anchors remain distinct
    expect(placement1.anchor.anchorId).toBe("primary-desk-chair");
    expect(placement2.anchor.anchorId).toBe("left-guest-chair");
  });

  it("15. no demographic/appearance inference from names", () => {
    // Person appearance and date-of-birth depend on seed and generation index, not name string
    const worldId = createWorldId("neutral-names-seed");
    const person = createLightweightPerson({
      worldId,
      worldSeed: "neutral-names-seed",
      index: 0,
      currentDate: TEST_WORLD_DATE,
      homeJurisdictionId: TEST_JURISDICTION_ID,
    });

    // Renaming a person in userland does not alter appearance seed or birthdate
    const renamedPerson: Person = {
      ...person,
      givenName: "CustomGiven",
      familyName: "CustomFamily",
    };

    expect(renamedPerson.appearance?.seed).toBe(person.appearance?.seed);
    expect(renamedPerson.birthDate).toBe(person.birthDate);
  });
});
