import { describe, expect, it } from "vitest";

import { createStableId } from "./ids";
import {
  GIVEN_NAME_GENERATION_POOLS_V1,
  givenNamePoolForStatedGender,
  NAMES_STARTER_V1,
} from "./names-data";
import {
  createStartingPerson,
  DISTINCT_GIVEN_NAME_GENERATION_VERSION,
  drawCanonicalNameForGender,
  LEGACY_GIVEN_NAME_GENERATION_VERSION,
} from "./people";
import { SeededRng } from "./rng";
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
  it("draws a name a man can be given when the player said male", () => {
    const person = start("male", null);
    expect(givenNamePoolForStatedGender("male")).toContain(person.givenName);
  });

  it("draws a name a woman can be given when the player said female", () => {
    const person = start("female", null);
    expect(givenNamePoolForStatedGender("female")).toContain(person.givenName);
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

describe("two people drawn off one stream are two people", () => {
  /*
   * `SeededRng.fork` derives from the seed and the key, never from how far the
   * stream has run. The gendered draw forked on a constant key, so every
   * gendered person drawn from one stream came back with the SAME given name:
   * a household, which then overwrites the family name with the player's,
   * produced a guardian and a sibling called exactly the same thing, and the
   * third playtest's home scene offered "Tell Charles Rush" about Charles Rush.
   */
  function drawSeveral(gender: GenderIdentityKey, count: number): string[] {
    const rng = new SeededRng("one-household").fork("household");
    return Array.from(
      { length: count },
      () =>
        drawCanonicalNameForGender(
          rng,
          gender,
          undefined,
          DISTINCT_GIVEN_NAME_GENERATION_VERSION,
        ).givenName,
    );
  }

  it("gives each of them their own name", () => {
    const names = drawSeveral("male", 4);
    expect(new Set(names).size).toBe(names.length);
  });

  it("still draws from the pool the stated gender names", () => {
    for (const name of drawSeveral("female", 4)) {
      expect(givenNamePoolForStatedGender("female")).toContain(name);
    }
  });

  it("steps past a name the caller says is already taken", () => {
    const rng = new SeededRng("taken").fork("household");
    const first = drawCanonicalNameForGender(
      rng,
      "male",
      undefined,
      DISTINCT_GIVEN_NAME_GENERATION_VERSION,
    ).givenName;
    const again = new SeededRng("taken").fork("household");
    const avoided = drawCanonicalNameForGender(
      again,
      "male",
      undefined,
      DISTINCT_GIVEN_NAME_GENERATION_VERSION,
      [first],
    ).givenName;
    expect(avoided).not.toBe(first);
    expect(givenNamePoolForStatedGender("male")).toContain(avoided);
  });

  it("keeps the drawn name rather than inventing one outside the pool", () => {
    // Every name spoken for: the honest answer is a repeat, not a new name.
    const rng = new SeededRng("exhausted").fork("household");
    const name = drawCanonicalNameForGender(
      rng,
      "male",
      undefined,
      DISTINCT_GIVEN_NAME_GENERATION_VERSION,
      [...givenNamePoolForStatedGender("male")],
    ).givenName;
    expect(givenNamePoolForStatedGender("male")).toContain(name);
  });

  it("leaves a person the world says nothing about on the unrestricted draw", () => {
    // "unstated" is now said rather than omitted — the loose draw is no longer
    // on the module's surface — and it still means the whole corpus, not a
    // pool. The name it returns is a corpus name and is not the one a male
    // draw off the same stream would have produced.
    const unstated = drawCanonicalNameForGender(
      new SeededRng("unstated").fork("household"),
      "unstated",
    );
    expect(NAMES_STARTER_V1.givenNames).toContain(unstated.givenName);
    expect(NAMES_STARTER_V1.familyNames).toContain(unstated.familyName);
    expect(
      drawCanonicalNameForGender(
        new SeededRng("unstated").fork("household"),
        "male",
      ).givenName,
    ).not.toBe(unstated.givenName);
  });

  it("keeps the original fork when a replay does not declare version 2", () => {
    const rng = new SeededRng("one-household").fork("household");
    const names = Array.from(
      { length: 3 },
      () =>
        drawCanonicalNameForGender(
          rng,
          "male",
          undefined,
          LEGACY_GIVEN_NAME_GENERATION_VERSION,
        ).givenName,
    );
    expect(new Set(names).size).toBe(1);
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

describe("a name both sexes carried is not reserved for non-binary people", () => {
  /*
   * Until this rule the neutral pool was reachable only by a stated non-binary
   * identity, so a woman drawn by the game could never be called Jordan by any
   * path. Draw enough people of each stated gender that the shared pool must
   * turn up, and prove it does, so this cannot pass by drawing nothing shared.
   */
  const shared = new Set(GIVEN_NAME_GENERATION_POOLS_V1.neutral);
  const male = new Set(GIVEN_NAME_GENERATION_POOLS_V1.male);
  const female = new Set(GIVEN_NAME_GENERATION_POOLS_V1.female);

  function drawMany(gender: "male" | "female", count: number): string[] {
    return Array.from(
      { length: count },
      (_, index) =>
        drawCanonicalNameForGender(
          new SeededRng(`shared-${gender}-${index}`),
          gender,
          undefined,
          DISTINCT_GIVEN_NAME_GENERATION_VERSION,
        ).givenName,
    );
  }

  it("can give a stated woman or a stated man a shared name", () => {
    expect(drawMany("female", 200).some((name) => shared.has(name))).toBe(true);
    expect(drawMany("male", 200).some((name) => shared.has(name))).toBe(true);
  });

  it("still never gives anyone a name from the other sex's own pool", () => {
    const women = drawMany("female", 200);
    const men = drawMany("male", 200);
    expect(women.filter((name) => male.has(name))).toEqual([]);
    expect(men.filter((name) => female.has(name))).toEqual([]);
    // Positive halves, so an empty draw cannot pass the two lines above.
    expect(women.some((name) => female.has(name))).toBe(true);
    expect(men.some((name) => male.has(name))).toBe(true);
  });

  it("lets the creator offer a shared name to a woman", () => {
    const reach = givenNamePoolForStatedGender("female");
    expect(reach).toContain("Jordan");
    expect(reach).toContain("Taylor");
    expect(givenNamePoolForStatedGender("male")).toContain("Jordan");
    expect(givenNamePoolForStatedGender("nonbinary")).toEqual(
      GIVEN_NAME_GENERATION_POOLS_V1.neutral,
    );
  });
});
