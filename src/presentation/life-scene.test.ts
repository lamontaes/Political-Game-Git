import { describe, expect, it } from "vitest";

import { buildLifeIntroduction } from "./life-introduction";
import { resolveLifeScene } from "./life-scene";
import { createNewGameWorld, type NewGameSetup } from "./new-game";
import { DOMESTIC_SCENE_IDS, SCENE_REGISTRY } from "./scene-registry";
import { PRODUCTION_VISUAL_LIBRARY } from "./visual-integration";

/**
 * The room a life is in, and the family the game says it has.
 *
 * Both are answers to the second playtest: a life that fell from an
 * illustrated title into a blank page, and a household of people nobody had
 * been introduced to. What is checked here is the half that does not need a
 * browser — that the room comes from a record and the introduction says only
 * what a record supports. The browser proof checks that the room reaches the
 * screen.
 */

function setup(overrides: Partial<NewGameSetup> = {}): NewGameSetup {
  return {
    placeKey: "kentucky",
    startAge: 34,
    depth: "summarize-earlier-life",
    startingLife: "ordinary-life",
    household: "shares-a-home",
    seed: "life-scene",
    givenName: null,
    familyName: null,
    questionnaire: "skipped",
    priors: [],
    ...overrides,
  };
}

describe("Which room a life is in", () => {
  it("puts a life with a household in a released domestic room", () => {
    const game = createNewGameWorld(setup());
    const resolved = resolveLifeScene(game.world, game.playerPersonId);
    expect(resolved.sceneId).not.toBeNull();
    expect(DOMESTIC_SCENE_IDS).toContain(resolved.sceneId!);
    // And the room it names is one the bank has actually released, so nothing
    // here can ask the runtime to paint art that does not exist.
    const scene = SCENE_REGISTRY.scenes.get(resolved.sceneId!)!;
    expect(scene.raster).not.toBeNull();
    expect(PRODUCTION_VISUAL_LIBRARY.has(scene.raster!.assetId)).toBe(true);
  });

  it("says why, from the record rather than from the picture", () => {
    const game = createNewGameWorld(setup());
    const resolved = resolveLifeScene(game.world, game.playerPersonId);
    expect(resolved.reason).toMatch(/household .* is on record/i);
  });

  it("gives one household the same room every time it is asked", () => {
    // A home that changes room between two renders is not a home. This is the
    // whole reason the choice is keyed on the household's own id.
    const game = createNewGameWorld(setup());
    const once = resolveLifeScene(game.world, game.playerPersonId).sceneId;
    const twice = resolveLifeScene(game.world, game.playerPersonId).sceneId;
    expect(twice).toBe(once);
  });

  it("paints nothing for somebody with no household on record", () => {
    const game = createNewGameWorld(setup());
    const stranger = Object.keys(game.world.people).find(
      (id) => id !== game.playerPersonId,
    );
    expect(stranger).toBeDefined();
    // A person the world holds but who has no membership resolves to no room
    // rather than to somebody else's.
    const emptied = {
      ...game.world,
      history: { ...game.world.history, householdMemberships: [] },
    };
    const resolved = resolveLifeScene(emptied, game.playerPersonId);
    expect(resolved.sceneId).toBeNull();
    expect(resolved.reason).toMatch(/no household membership/i);
  });

  it("paints nothing when no domestic plate is released", () => {
    // The fallback that matters: art can be withdrawn, and the surface must go
    // back to being a page rather than reaching for a room that is not there.
    const game = createNewGameWorld(setup());
    const resolved = resolveLifeScene(
      game.world,
      game.playerPersonId,
      SCENE_REGISTRY,
      new Map(),
    );
    expect(resolved.sceneId).toBeNull();
    expect(resolved.reason).toMatch(/no released domestic plate/i);
  });
});

/* -------------------------------------------------------------------------- */

describe("What the game says about the family it wrote", () => {
  it("names everybody on the household record, with what the record says", () => {
    const game = createNewGameWorld(
      setup({ startAge: 10, depth: "play-formative-years" }),
    );
    const introduction = buildLifeIntroduction(
      game.world,
      game.playerPersonId,
    )!;
    expect(introduction).not.toBeNull();
    expect(introduction.household.length).toBeGreaterThan(0);
    for (const person of introduction.household) {
      // Every line traces to a record. `basis` is what the resolver read, and
      // an introduction with no basis is a sentence somebody made up.
      expect(person.basis.length).toBeGreaterThan(0);
      expect(person.introduction).toContain(
        game.world.people[person.personId]!.givenName,
      );
    }
    const guardian = introduction.household.find((person) =>
      /your (mom|dad|parent)/.test(person.relationship ?? ""),
    );
    expect(
      guardian,
      "a dependent household has somebody raising them",
    ).toBeDefined();
  });

  it("says the age and the place from the records, and no more", () => {
    const game = createNewGameWorld(setup());
    const introduction = buildLifeIntroduction(
      game.world,
      game.playerPersonId,
    )!;
    expect(introduction.age).toBe(34);
    const said = introduction.sentences.join(" ");
    // Second person, addressed to the player (Task §5). The name is shown as a
    // deliberate identity chip on the play screen rather than narrated back at
    // the player, so the introduction states the age and the place and speaks
    // to "you" — the record still carries the name for whoever needs it.
    expect(introduction.personName.length).toBeGreaterThan(0);
    expect(said).toMatch(/\byou\b/i);
    expect(said).toContain("34");
    // No machinery, and nothing about how any of it was decided.
    expect(said).not.toMatch(
      /seed|record|household id|generated|tableau|raster|lean/i,
    );
  });

  it("is short rather than invented when the records are thin", () => {
    const game = createNewGameWorld(setup());
    const emptied = {
      ...game.world,
      history: {
        ...game.world.history,
        householdMemberships: game.world.history.householdMemberships.filter(
          (membership) => membership.personId === game.playerPersonId,
        ),
      },
    };
    const introduction = buildLifeIntroduction(emptied, game.playerPersonId)!;
    expect(introduction.household).toEqual([]);
    // A household on record with nobody else in it: the honest thing to say is
    // that you live alone, not to invent a family to fill the screen (Task §6).
    expect(introduction.sentences.join(" ")).toMatch(/on your own/i);
  });

  it("introduces nobody at all when there is no household", () => {
    const game = createNewGameWorld(setup());
    const emptied = {
      ...game.world,
      history: { ...game.world.history, householdMemberships: [] },
    };
    expect(buildLifeIntroduction(emptied, game.playerPersonId)).toBeNull();
  });
});
