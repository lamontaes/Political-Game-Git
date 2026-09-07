import { describe, expect, it } from "vitest";

import { createStableId } from "./ids";
import { GIVEN_NAME_GENERATION_POOLS_V1, NAMES_STARTER_V1 } from "./names-data";
import { createStartingPerson } from "./people";
import type { GenderIdentityKey, IsoDate, PronounSetKey } from "./types";

/**
 * A stated gender constrains a generated name. Nothing runs the other way.
 *
 * The owner play selected Male, left both names blank, and was given "Camila".
 * The generator was drawing from the whole corpus on purpose, because the
 * corpus carries no gender attribute and reading one off a name would be an
 * inference nobody asked for. But the player had already SAID which they
 * wanted, and ignoring an answer the player typed in is a different failure
 * from refusing to guess one they did not.
 */

const PRONOUNS: Record<string, PronounSetKey> = {
  male: "he-him",
  female: "she-her",
  nonbinary: "they-them",
  unstated: "they-them",
};

function start(gender: GenderIdentityKey | null, givenName: string | null) {
  return createStartingPerson({
    worldId: createStableId("world", "stated-gender"),
    worldSeed: "stated-gender-seed",
    currentDate: "2026-01-26" as IsoDate,
    homeJurisdictionId: createStableId("jurisdiction", "anywhere"),
    age: 34,
    givenName,
    familyName: null,
    ...(gender === null
      ? {}
      : { identity: { gender, pronouns: PRONOUNS[gender]! } }),
  });
}

describe("a blank name respects the gender the player stated", () => {
  it("draws a male-pool name when the player said male", () => {
    const person = start("male", null);
    expect(GIVEN_NAME_GENERATION_POOLS_V1.male).toContain(person.givenName);
  });

  it("draws a female-pool name when the player said female", () => {
    const person = start("female", null);
    expect(GIVEN_NAME_GENERATION_POOLS_V1.female).toContain(person.givenName);
  });

  it("draws a neutral-pool name when the player said non-binary", () => {
    const person = start("nonbinary", null);
    expect(GIVEN_NAME_GENERATION_POOLS_V1.neutral).toContain(person.givenName);
  });

  it("draws from the whole corpus when the player said nothing", () => {
    const unstated = start("unstated", null);
    const absent = start(null, null);
    expect(NAMES_STARTER_V1.givenNames).toContain(absent.givenName);
    // Saying "unstated" and saying nothing are the same answer, as before.
    expect(unstated.givenName).toBe(absent.givenName);
  });

  it("never alters a name the player typed, whatever they stated", () => {
    expect(start("male", "Camila").givenName).toBe("Camila");
    expect(start("female", "Marcus").givenName).toBe("Marcus");
    expect(start("nonbinary", "Elizabeth").givenName).toBe("Elizabeth");
    expect(start("unstated", "Rowan").givenName).toBe("Rowan");
  });

  it("moves nothing else about the person", () => {
    // The gendered draw runs on its own forked stream, so the birthday, the id
    // and the family name are the same whatever was stated. If honouring the
    // answer shifted the main stream it would quietly rewrite every other
    // generated fact about this life.
    const people = (["male", "female", "nonbinary", "unstated"] as const).map(
      (gender) => start(gender, null),
    );
    const [first] = people;
    for (const person of people) {
      expect(person.birthDate).toBe(first!.birthDate);
      expect(person.familyName).toBe(first!.familyName);
      expect(person.id).toBe(first!.id);
    }
  });

  it("is deterministic for the same seed and the same answer", () => {
    expect(start("male", null).givenName).toBe(start("male", null).givenName);
  });
});

describe("the generation pools are an honest partition of the corpus", () => {
  const pools = GIVEN_NAME_GENERATION_POOLS_V1;
  const all = [...pools.male, ...pools.female, ...pools.neutral];

  it("covers every corpus name exactly once", () => {
    expect([...all].sort()).toStrictEqual(
      [...NAMES_STARTER_V1.givenNames].sort(),
    );
    expect(new Set(all).size).toBe(all.length);
  });

  it("leaves no pool empty, so every stated answer can be honoured", () => {
    expect(pools.male.length).toBeGreaterThan(0);
    expect(pools.female.length).toBeGreaterThan(0);
    expect(pools.neutral.length).toBeGreaterThan(0);
  });
});
