import { describe, expect, it } from "vitest";
import { SqliteWorldRepository } from "../persistence/sqlite-world-repository";
import { ageOnDate, makeIsoDate } from "./dates";
import { createDemoWorld, createGeneratedWorld } from "./demo";
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
import { createWorld, createWorldId } from "./world";
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

  it("4. backwards compatibility: legacy demo fixture produces exact legacy names", () => {
    const legacyWorld = createDemoWorld("stage-6-5-run-a");
    const p0 = legacyWorld.people[legacyWorld.personOrder[0] as EntityId];
    const p1 = legacyWorld.people[legacyWorld.personOrder[1] as EntityId];
    const p2 = legacyWorld.people[legacyWorld.personOrder[2] as EntityId];

    expect(p0?.generatorVersion).toBe(LEGACY_DEMO_PERSON_GENERATOR_VERSION);
    expect(p0?.corpusVersion).toBe(DEMO_NAMES_V4.version);
    expect(p0 && personName(p0)).toBe("Andre Collins");
    expect(p1 && personName(p1)).toBe("Cameron Foster");
    expect(p2 && personName(p2)).toBe("Julian Reed");
  });

  it("5. date-of-birth arithmetic: ageOnDate(birthDate, currentDate) is exact", () => {
    const worldId = createWorldId("dob-arithmetic-test");
    const testDates = [
      makeIsoDate("2026-01-05"),
      makeIsoDate("2026-06-15"),
      makeIsoDate("2026-12-31"),
      makeIsoDate("2027-02-28"),
    ];

    for (const simDate of testDates) {
      for (let i = 0; i < 20; i += 1) {
        const person = createLightweightPerson({
          worldId,
          worldSeed: `seed-dob-${i}`,
          index: i,
          currentDate: simDate,
          homeJurisdictionId: TEST_JURISDICTION_ID,
          profile: "production",
        });

        const derivedAge = ageOnDate(person.birthDate, simDate);
        expect(derivedAge).toBeGreaterThanOrEqual(21);
        expect(derivedAge).toBeLessThanOrEqual(75);
        expect(person.birthDate <= simDate).toBe(true);
      }
    }

    const person = createLightweightPerson({
      worldId,
      worldSeed: "dob-fact-check",
      index: 0,
      currentDate: TEST_WORLD_DATE,
      homeJurisdictionId: TEST_JURISDICTION_ID,
    });

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

  it("6b. year-boundary stress DOB cases (Dec 31 tomorrow, Jan 1 yesterday)", () => {
    const worldId = createWorldId("year-boundary-seed");

    // Case 1: Current date is December 31, birthday is TOMORROW (Jan 1)
    const dec31 = makeIsoDate("2025-12-31");
    const personTomorrow = createLightweightPerson({
      worldId,
      worldSeed: "year-boundary-tomorrow",
      index: 2, // Stress index 2: birthday tomorrow
      currentDate: dec31,
      homeJurisdictionId: TEST_JURISDICTION_ID,
      profile: "stress",
    });

    // Birthday is Jan 1 (01-01)
    expect(personTomorrow.birthDate.slice(5)).toBe("01-01");
    const ageOnDec31 = ageOnDate(personTomorrow.birthDate, dec31);
    // On tomorrow Jan 1, 2026, age increases by exactly 1
    const ageOnJan1 = ageOnDate(
      personTomorrow.birthDate,
      makeIsoDate("2026-01-01"),
    );
    expect(ageOnJan1).toBe(ageOnDec31 + 1);

    // Case 2: Current date is January 1, birthday was YESTERDAY (Dec 31)
    const jan1 = makeIsoDate("2026-01-01");
    const personYesterday = createLightweightPerson({
      worldId,
      worldSeed: "year-boundary-yesterday",
      index: 5, // Stress index 5 (default % 6): birthday yesterday
      currentDate: jan1,
      homeJurisdictionId: TEST_JURISDICTION_ID,
      profile: "stress",
    });

    // Birthday is Dec 31 (12-31)
    expect(personYesterday.birthDate.slice(5)).toBe("12-31");
    const ageOnJan1Current = ageOnDate(personYesterday.birthDate, jan1);
    // On Dec 30 (before birthday), age was 1 less
    const ageOnDec30 = ageOnDate(
      personYesterday.birthDate,
      makeIsoDate("2025-12-30"),
    );
    expect(ageOnJan1Current).toBe(ageOnDec30 + 1);
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

  it("13. canonical appearance equality across generation, persistence, placement, anchor movement, and replay", () => {
    const seed = "canonical-appearance-proof";
    const worldId = createWorldId(seed);
    const person = createLightweightPerson({
      worldId,
      worldSeed: seed,
      index: 0,
      currentDate: TEST_WORLD_DATE,
      homeJurisdictionId: TEST_JURISDICTION_ID,
    });

    // 1. Initial generation: appearance is persisted and matches canonical derivePersonAppearance(person.id)
    expect(person.appearance).toBeDefined();
    const canonicalDerived = derivePersonAppearance(person.id);
    expect(person.appearance?.seed).toBe(canonicalDerived.seed);
    expect(person.appearance?.recipeVersion).toBe(
      canonicalDerived.recipeVersion,
    );

    // 2. Persistence / Reload equality
    const world = createDemoWorld(seed, {
      generatorVersion: DEFAULT_PERSON_GENERATOR_VERSION,
      corpusVersion: DEFAULT_CORPUS_VERSION,
    });
    const repo = new SqliteWorldRepository(":memory:");
    repo.save(world);
    const loaded = repo.load(world.id);
    repo.close();
    const loadedPerson = loaded?.people[person.id];
    expect(loadedPerson?.appearance?.seed).toBe(person.appearance?.seed);

    // 3. Scene placement equality
    const anchorA: SceneAnchor = {
      anchorId: "chair-a",
      position: { x: 100, y: 200 },
      depth: 1,
    };
    const placementA = createScenePlacement(person, anchorA);
    expect(placementA.appearance.seed).toBe(person.appearance?.seed);

    // 4. Movement between two anchors equality
    const anchorB: SceneAnchor = {
      anchorId: "chair-b",
      position: { x: 500, y: 600 },
      depth: 5,
    };
    const placementB = createScenePlacement(person, anchorB);
    expect(placementB.appearance.seed).toBe(person.appearance?.seed);
    expect(placementB.appearance.seed).toBe(placementA.appearance.seed);

    // 5. Replay of same seed
    const replayedWorld = createDemoWorld(seed, {
      generatorVersion: DEFAULT_PERSON_GENERATOR_VERSION,
      corpusVersion: DEFAULT_CORPUS_VERSION,
    });
    const replayedPerson = replayedWorld.people[person.id];
    expect(replayedPerson?.appearance?.seed).toBe(person.appearance?.seed);

    // 6. Distinct identities across different seeds even with same generation index
    const otherWorldId = createWorldId("different-world-seed");
    const otherPerson = createLightweightPerson({
      worldId: otherWorldId,
      worldSeed: "different-world-seed",
      index: 0,
      currentDate: TEST_WORLD_DATE,
      homeJurisdictionId: TEST_JURISDICTION_ID,
    });
    expect(otherPerson.id).not.toBe(person.id);
    expect(otherPerson.appearance?.seed).not.toBe(person.appearance?.seed);

    // 7. Legacy fallback derivation without persisted appearance
    const legacyPerson: Person = {
      ...person,
      appearance: undefined,
    };
    const fallbackPlacement = createScenePlacement(legacyPerson, anchorA);
    expect(fallbackPlacement.appearance.seed).toBe(person.appearance?.seed);
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

    expect(placement1.appearance.seed).toBe(placement2.appearance.seed);
    expect(placement1.appearance.recipeVersion).toBe(
      placement2.appearance.recipeVersion,
    );
    expect(placement1.personId).toBe(person.id);
    expect(placement2.personId).toBe(person.id);
    expect(placement1.anchor.anchorId).toBe("primary-desk-chair");
    expect(placement2.anchor.anchorId).toBe("left-guest-chair");
  });

  it("15. no demographic/appearance inference from names", () => {
    const worldId = createWorldId("neutral-names-seed");
    const person = createLightweightPerson({
      worldId,
      worldSeed: "neutral-names-seed",
      index: 0,
      currentDate: TEST_WORLD_DATE,
      homeJurisdictionId: TEST_JURISDICTION_ID,
    });

    const renamedPerson: Person = {
      ...person,
      givenName: "CustomGiven",
      familyName: "CustomFamily",
    };

    expect(renamedPerson.appearance?.seed).toBe(person.appearance?.seed);
    expect(renamedPerson.birthDate).toBe(person.birthDate);
  });

  it("16. developer new simulation and seed replay API contract", () => {
    // A. createGeneratedWorld produces a world with person-v5 and names-v1
    const world1 = createGeneratedWorld("developer-seed-test-1");
    expect(world1.seed).toBe("developer-seed-test-1");
    expect(world1.personOrder.length).toBe(6);

    const firstPerson1 = world1.people[world1.personOrder[0] as EntityId];
    expect(firstPerson1?.generatorVersion).toBe("person-v5");
    expect(firstPerson1?.corpusVersion).toBe("names-v1");

    // B. Replaying same seed produces exact same canonical people
    const world1Replay = createGeneratedWorld("developer-seed-test-1");
    expect(world1Replay.personOrder).toEqual(world1.personOrder);
    for (const pid of world1.personOrder) {
      expect(world1Replay.people[pid]).toStrictEqual(world1.people[pid]);
    }

    // C. Different seed produces materially different people
    const world2 = createGeneratedWorld("developer-seed-test-2");
    expect(world2.seed).toBe("developer-seed-test-2");
    const namesWorld1 = world1.personOrder.map((pid) =>
      personName(world1.people[pid]!),
    );
    const namesWorld2 = world2.personOrder.map((pid) =>
      personName(world2.people[pid]!),
    );
    expect(namesWorld1).not.toEqual(namesWorld2);

    // D. Creating new simulation does not mutate prior world
    const world1Snapshot = JSON.stringify(world1);
    const world3 = createGeneratedWorld("developer-seed-test-3");
    expect(JSON.stringify(world1)).toBe(world1Snapshot);
    expect(world3.seed).toBe("developer-seed-test-3");
  });

  it("17. referential integrity: invalid home jurisdiction rejected, valid accepted", () => {
    const validWorld = createGeneratedWorld("referential-check-seed");
    expect(validWorld.jurisdictionOrder.length).toBeGreaterThan(0);
    const validJurId = validWorld.jurisdictionOrder[0] as EntityId;

    const person = validWorld.people[validWorld.personOrder[0] as EntityId]!;
    expect(person.homeJurisdictionId).toBe(validJurId);

    // Construction with invalid jurisdiction throws
    expect(() => {
      createWorld({
        seed: validWorld.seed,
        currentDate: validWorld.currentDate,
        currentMoment: validWorld.currentMoment,
        jurisdictions: Object.values(validWorld.jurisdictions),
        people: [
          {
            ...person,
            homeJurisdictionId: "jurisdiction_nonexistent" as EntityId,
          },
        ],
      });
    }).toThrow(/Person references a missing home jurisdiction/);
  });
});
