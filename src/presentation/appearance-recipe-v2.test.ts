import { describe, expect, it } from "vitest";

import {
  COMPLEXION_COHERENT_RECIPE_VERSION,
  resolveCharacterRecipe,
} from "./character-components";
import { buildProductionWorld } from "./production-world";
import { PRODUCTION_CHARACTER_LIBRARY } from "./visual-integration";
import {
  createDemoWorld,
  createGeneratedWorld,
  requireLifePlace,
} from "../simulation";
import { deserializeWorld } from "../simulation/serialization";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import {
  decodeReplayDescriptor,
  encodeReplayDescriptor,
} from "./new-game-identity";
import oldSave from "./fixtures/leg-american-english1-old-save.json";
import {
  COHERENT_APPEARANCE_RECIPE_VERSION,
  DEFAULT_APPEARANCE_RECIPE_VERSION,
  LEGACY_APPEARANCE_RECIPE_VERSION,
  derivePersonAppearance,
} from "../simulation/person-appearance";

/*
 * The measured half of this suite — that v2 narrows the head/body skin gap on
 * a bank of real people — was retired with the only measured library there
 * ever was: the candidate cast that was permanently removed. What survives is
 * what the shipped product actually does, and it is exactly the point of the
 * recipe now: the production catalog carries no tone measurement, so a v2
 * person cannot be given a coherent face and must not have one invented, while
 * the version a person is created and replayed under stays fixed.
 */

describe("what v2 must not touch", () => {
  /*
   * The default does not move, and that is the whole safety argument.
   *
   * A person with NO stored appearance is resolved through the fallback at
   * every render site, so a moving default repaints them, and every fixture
   * constructor with accepted serialized bytes builds its people through the
   * same writer. So v2 is DECLARED by the caller that wants it, never
   * defaulted into.
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
});

/**
 * Where the declaration actually lands.
 *
 * A life a player starts is created under v2, a developer fixture is not, and
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

  it("keeps an old serialized save on v1 after reload", () => {
    const restored = deserializeWorld(JSON.stringify(oldSave));
    const people = Object.values(restored.people);
    expect(people.length).toBeGreaterThan(0);
    const stamped = people.filter((person) => person.appearance);
    expect(stamped.length).toBeGreaterThan(0);
    for (const person of stamped) {
      expect(person.appearance?.recipeVersion).toBe(
        DEFAULT_APPEARANCE_RECIPE_VERSION,
      );
    }
    expect(
      people.some(
        (person) =>
          person.appearance?.recipeVersion ===
          COMPLEXION_COHERENT_RECIPE_VERSION,
      ),
    ).toBe(false);
    const again = deserializeWorld(JSON.stringify(oldSave));
    expect(
      Object.values(again.people).map((person) => person.appearance),
    ).toEqual(
      Object.values(restored.people).map((person) => person.appearance),
    );
  });

  it("replays an old descriptor under v1, and a new setup under v2", () => {
    const oldDescriptor = encodeReplayDescriptor({
      placeKey: "kentucky",
      startAge: 10,
      depth: "play-formative-years",
      startingLife: "ordinary-life",
      household: "shares-a-home",
      seed: "weekend19-old-replay",
      givenName: null,
      familyName: null,
    });
    const decodedOld = decodeReplayDescriptor(oldDescriptor);
    expect(decodedOld?.appearanceRecipeVersion).toBeUndefined();
    const replayed = createNewGameWorld(decodedOld!);
    for (const person of Object.values(replayed.world.people))
      expect(person.appearance?.recipeVersion).toBe(
        DEFAULT_APPEARANCE_RECIPE_VERSION,
      );

    const fresh = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "weekend19-new-replay",
    });
    for (const person of Object.values(fresh.world.people))
      expect(person.appearance?.recipeVersion).toBe(
        COMPLEXION_COHERENT_RECIPE_VERSION,
      );
    const roundTrip = decodeReplayDescriptor(
      encodeReplayDescriptor({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "weekend19-new-replay",
      }),
    );
    expect(roundTrip?.appearanceRecipeVersion).toBe(
      COMPLEXION_COHERENT_RECIPE_VERSION,
    );
  });
});
