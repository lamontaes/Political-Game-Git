import { describe, expect, it } from "vitest";

import {
  COMPLEXION_COHERENT_RECIPE_VERSION,
  resolveCharacterRecipe,
} from "./character-components";
import { PEOPLE_VISUAL4_CHARACTER_LIBRARY as LIBRARY } from "./people-visual4-review";
import { buildProductionWorld } from "./production-world";
import { PRODUCTION_CHARACTER_LIBRARY } from "./visual-integration";
import {
  createDemoWorld,
  createGeneratedWorld,
  requireLifePlace,
} from "../simulation";
import toneData from "../../art/manifest/character_candidate_visual4_tone.json";
import {
  COHERENT_APPEARANCE_RECIPE_VERSION,
  DEFAULT_APPEARANCE_RECIPE_VERSION,
  LEGACY_APPEARANCE_RECIPE_VERSION,
  derivePersonAppearance,
} from "../simulation/person-appearance";

const TONE = new Map(
  (
    toneData as { tones: { family: string; rgb: Record<string, number> }[] }
  ).tones.map((entry) => [entry.family, entry.rgb]),
);

function gap(bodyFamily: string, headFamily: string): number | null {
  const body = TONE.get(bodyFamily);
  const head = TONE.get(headFamily);
  if (!body || !head) return null;
  return Math.round(
    Math.hypot(head.r! - body.r!, head.g! - body.g!, head.b! - body.b!),
  );
}

function resolve(personId: string, version: string) {
  return resolveCharacterRecipe(
    {
      appearance: derivePersonAppearance(personId, version),
      poseFamily: "standing-neutral",
      unresolvableRequiredSlots: "diagnose",
    },
    LIBRARY,
  );
}

const SEEDS = Array.from({ length: 60 }, (_, index) => `coherence-${index}`);

/**
 * A face painted in the same skin as the body carrying it — for NEW people only.
 *
 * Every banked head declares every banked body as compatible, so the filter the
 * resolver already applies passes all of them and the seeded draw could put any
 * face on any body. Measured, it did: a median of 59 RGB between the chosen
 * head and the chosen body, 43 of 60 more than 40 apart, worst case 85.
 *
 * These tests are about the two halves of the repair. That v2 fixes it, and
 * that v1 is left exactly where it was — because an appearance is written onto
 * a person at creation and travels with them, so anyone already saved keeps
 * resolving through the version they were made under.
 */
describe("appearance recipe v2: complexion coherence", () => {
  it("narrows the measured head/body gap it was written for", () => {
    const before: number[] = [];
    const after: number[] = [];
    for (const seed of SEEDS) {
      const v1 = resolve(seed, LEGACY_APPEARANCE_RECIPE_VERSION);
      const v2 = resolve(seed, COMPLEXION_COHERENT_RECIPE_VERSION);
      const oldGap = gap(v1.identity.bodyFamily, v1.identity.headFamily);
      const newGap = gap(v2.identity.bodyFamily, v2.identity.headFamily);
      if (oldGap !== null) before.push(oldGap);
      if (newGap !== null) after.push(newGap);
    }
    const median = (values: number[]) =>
      [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]!;
    expect(before.length).toBeGreaterThan(40);
    expect(after.length).toBe(before.length);
    /* The defect, still measurable on v1, and gone on v2. */
    expect(median(before)).toBeGreaterThan(40);
    expect(median(after)).toBeLessThan(25);
    expect(Math.max(...after)).toBeLessThan(Math.max(...before));
  });

  /*
   * Face variety under v2, and the bank limit behind it.
   *
   * Coherence and variety are in direct tension here, and the tension is the
   * art's rather than the policy's: the nine banked heads cluster darker than
   * the five dressable bodies. Swept over 120 people, admitting a wider band
   * buys faces at a price that undoes the whole repair —
   *
   *   tolerance  0-25  ->  2 faces, median gap 21-22, worst 27
   *   tolerance  35    ->  3 faces, median gap 26,    worst 54
   *   tolerance  45    ->  5 faces, median gap 43,    worst 63
   *   tolerance  60    ->  9 faces, median gap 59,    worst 81   (this is v1)
   *
   * So this asserts what is true rather than what would be nice: at least two
   * faces stay in play, and the mismatch stays gone. Getting more faces back
   * needs heads measured into the bodies' tone range, which is a specific,
   * named art limit and not something a tolerance can conjure.
   */
  it("keeps more than one face in play", () => {
    const heads = new Set(
      SEEDS.map(
        (seed) =>
          resolve(seed, COMPLEXION_COHERENT_RECIPE_VERSION).identity.headFamily,
      ),
    );
    expect(heads.size).toBeGreaterThanOrEqual(2);
  });

  it("never leaves a person without a body or a face", () => {
    for (const seed of SEEDS) {
      const recipe = resolve(seed, COMPLEXION_COHERENT_RECIPE_VERSION);
      expect(recipe.identity.bodyFamily).toBeTruthy();
      expect(recipe.identity.headFamily).toBeTruthy();
      expect(recipe.context.diagnostics ?? []).toEqual([]);
    }
  });
});

describe("what v2 must not touch", () => {
  /*
   * The control that matters most. A person saved under v1 carries v1, and the
   * components they resolve to have to be the same ones, part for part, after
   * this change as before it. The v1 branch is not merely "expected" to be
   * unchanged — it is asserted against the families v1 produces today.
   */
  it("resolves a v1 appearance through the v1 path, unchanged", () => {
    for (const seed of SEEDS.slice(0, 20)) {
      const legacy = resolve(seed, LEGACY_APPEARANCE_RECIPE_VERSION);
      /* Same call, twice: v1 is deterministic and depends on nothing new. */
      const again = resolve(seed, LEGACY_APPEARANCE_RECIPE_VERSION);
      expect(again.identity.bodyFamily).toBe(legacy.identity.bodyFamily);
      expect(again.identity.headFamily).toBe(legacy.identity.headFamily);
      expect(again.context.components.map((entry) => entry.assetId)).toEqual(
        legacy.context.components.map((entry) => entry.assetId),
      );
    }
  });

  /*
   * v1 and v2 are genuinely different resolutions, so a legacy person is not
   * quietly getting the new behaviour through a shared code path.
   */
  it("actually resolves v1 and v2 differently for some people", () => {
    const changed = SEEDS.filter(
      (seed) =>
        resolve(seed, LEGACY_APPEARANCE_RECIPE_VERSION).identity.headFamily !==
        resolve(seed, COMPLEXION_COHERENT_RECIPE_VERSION).identity.headFamily,
    );
    expect(changed.length).toBeGreaterThan(0);
  });

  /*
   * The default does not move, and that is the whole safety argument.
   *
   * Two populations ride on it. A person with NO stored appearance — saved
   * before appearances were written down — is resolved through the fallback at
   * every render site, so a moving default repaints them. And every fixture
   * constructor with accepted serialized bytes builds its people through the
   * same writer, so a moving default rewrites accepted content and forces the
   * byte fixtures in `world.test.ts` to be re-blessed to absorb it.
   *
   * So v2 is DECLARED by the caller that wants it, never defaulted into.
   */
  it("leaves the default where every existing person already is", () => {
    expect(DEFAULT_APPEARANCE_RECIPE_VERSION).toBe("appearance-recipe-v1");
    expect(LEGACY_APPEARANCE_RECIPE_VERSION).toBe(
      DEFAULT_APPEARANCE_RECIPE_VERSION,
    );
    expect(COMPLEXION_COHERENT_RECIPE_VERSION).not.toBe(
      DEFAULT_APPEARANCE_RECIPE_VERSION,
    );
    expect(derivePersonAppearance("someone-undeclared").recipeVersion).toBe(
      DEFAULT_APPEARANCE_RECIPE_VERSION,
    );
  });

  /* The resolver and the writer name one version, so they cannot drift apart. */
  it("resolves under the same version string the writer stamps", () => {
    expect(COMPLEXION_COHERENT_RECIPE_VERSION).toBe(
      COHERENT_APPEARANCE_RECIPE_VERSION,
    );
  });

  it("writes the declared version onto a newly derived appearance", () => {
    expect(
      derivePersonAppearance("someone-new", COHERENT_APPEARANCE_RECIPE_VERSION)
        .recipeVersion,
    ).toBe(COMPLEXION_COHERENT_RECIPE_VERSION);
    expect(
      derivePersonAppearance("someone-old", LEGACY_APPEARANCE_RECIPE_VERSION)
        .recipeVersion,
    ).toBe(LEGACY_APPEARANCE_RECIPE_VERSION);
  });

  /* Two distinct people stay distinct, and each replays to itself. */
  it("replays deterministically and keeps distinct people distinct", () => {
    const a1 = resolve("replay-a", COMPLEXION_COHERENT_RECIPE_VERSION);
    const a2 = resolve("replay-a", COMPLEXION_COHERENT_RECIPE_VERSION);
    const b1 = resolve("replay-b", COMPLEXION_COHERENT_RECIPE_VERSION);
    expect(a2.context.components.map((entry) => entry.assetId)).toEqual(
      a1.context.components.map((entry) => entry.assetId),
    );
    expect(b1.context.components.map((entry) => entry.assetId)).not.toEqual(
      a1.context.components.map((entry) => entry.assetId),
    );
  });

  /*
   * An explicit choice is the player's and outranks any policy. v2 must not
   * reach past it, even when the chosen head is nothing like the body's skin.
   */
  it("never overrides an explicit appearance selection", () => {
    const base = derivePersonAppearance(
      "explicit-person",
      COMPLEXION_COHERENT_RECIPE_VERSION,
    );
    const v1 = resolve("explicit-person", LEGACY_APPEARANCE_RECIPE_VERSION);
    const bodyFamily = v1.identity.bodyFamily;
    /* The head measurably FURTHEST from this body, chosen on purpose. */
    const heads = [...LIBRARY.components.values()]
      .filter(
        (component) =>
          component.definition.kind === "head" &&
          (component.definition.compatible_body_families ?? []).includes(
            bodyFamily,
          ),
      )
      .map((component) => component.definition.family);
    const furthest = [...new Set(heads)].sort(
      (left, right) =>
        (gap(bodyFamily, right) ?? 0) - (gap(bodyFamily, left) ?? 0),
    )[0]!;
    const recipe = resolveCharacterRecipe(
      {
        appearance: {
          ...base,
          selection: { bodyFamily, headFamily: furthest, hairFamily: null },
        },
        poseFamily: "standing-neutral",
        unresolvableRequiredSlots: "diagnose",
      },
      LIBRARY,
    );
    expect(recipe.identity.headFamily).toBe(furthest);
  });

  /*
   * A library with no measurement must not have a complexion invented for it
   * from a family name. v2 falls back to the v1 choice and says why.
   */
  it("falls back and says so when the catalog carries no measurement", () => {
    const unmeasured = { ...LIBRARY, skinTone: null };
    const resolveUnmeasured = () =>
      resolveCharacterRecipe(
        {
          appearance: derivePersonAppearance(
            "unmeasured-person",
            COMPLEXION_COHERENT_RECIPE_VERSION,
          ),
          poseFamily: "standing-neutral",
          unresolvableRequiredSlots: "diagnose",
        },
        unmeasured,
      );
    const recipe = resolveUnmeasured();
    /* It says the coherence claim could not be made, by name. */
    expect(
      (recipe.context.diagnostics ?? []).map((entry) => entry.code),
    ).toContain("complexion-unmeasured");
    /*
     * And it still builds a whole person deterministically, rather than
     * refusing them or inventing a complexion for a family from its name. The
     * head it picks is the v1 draw, which is the only defensible answer when
     * nothing has been measured.
     */
    expect(recipe.identity.bodyFamily).toBeTruthy();
    expect(recipe.identity.headFamily).toBeTruthy();
    expect(resolveUnmeasured().identity.headFamily).toBe(
      recipe.identity.headFamily,
    );
    /* With measurement present the same person resolves without that gap. */
    expect(
      (
        resolve("unmeasured-person", COMPLEXION_COHERENT_RECIPE_VERSION).context
          .diagnostics ?? []
      ).map((entry) => entry.code),
    ).not.toContain("complexion-unmeasured");
  });
});

/**
 * Where the declaration actually lands.
 *
 * Everything above is about the recipe in isolation. This is the wiring: a
 * life a player starts is created under v2, a developer fixture is not, and
 * the constructors whose serialized bytes are accepted keep building the
 * people they always built.
 */
describe("which people are created under which recipe", () => {
  it("creates a life a player starts — and their household — under v2", () => {
    const built = buildProductionWorld({
      seed: "appearance-recipe-v2-production-proof",
      place: requireLifePlace("lexington-fayette"),
      age: 34,
      givenName: null,
      familyName: null,
      // The exact route the banked playable proof walks: an ordinary life,
      // earlier years summarized, sharing a home — so the household this
      // measures is the household somebody actually meets in the room.
      startingLife: "ordinary-life",
      depth: "summarize-earlier-life",
      household: "shares-a-home",
    });
    expect(built.player.appearance?.recipeVersion).toBe(
      COMPLEXION_COHERENT_RECIPE_VERSION,
    );
    const people = Object.values(built.world.people);
    /* A 34-year-old start writes a household, so there is more than one. */
    expect(people.length).toBeGreaterThan(1);
    for (const person of people)
      expect(person.appearance?.recipeVersion).toBe(
        COMPLEXION_COHERENT_RECIPE_VERSION,
      );
  });

  /*
   * What v2 does in a SHIPPED build today, stated rather than assumed.
   *
   * The production catalog carries no measured tone — its components are the
   * `dev-*` fixtures — so a v2 person resolved against it cannot be given a
   * coherent face and must not have one invented from a family name. It says
   * `complexion-unmeasured` and draws as v1 drew. That is the whole of the
   * player-visible effect, and it is what the release declaration claims.
   */
  it("cannot claim coherence against the unmeasured production catalog", () => {
    expect(PRODUCTION_CHARACTER_LIBRARY.skinTone).toBeNull();
    const recipe = resolveCharacterRecipe(
      {
        appearance: derivePersonAppearance(
          "production-person",
          COHERENT_APPEARANCE_RECIPE_VERSION,
        ),
        poseFamily: "standing-neutral",
        unresolvableRequiredSlots: "diagnose",
      },
      PRODUCTION_CHARACTER_LIBRARY,
    );
    expect(
      (recipe.context.diagnostics ?? []).map((entry) => entry.code),
    ).toContain("complexion-unmeasured");
    expect(recipe.identity.bodyFamily).toBeTruthy();
    expect(recipe.identity.headFamily).toBeTruthy();
  });

  it("leaves the fixture constructors building v1 people", () => {
    for (const world of [createDemoWorld(), createGeneratedWorld()]) {
      const people = Object.values(world.people);
      expect(people.length).toBeGreaterThan(0);
      for (const person of people)
        expect(person.appearance?.recipeVersion).toBe(
          DEFAULT_APPEARANCE_RECIPE_VERSION,
        );
    }
  });
});
