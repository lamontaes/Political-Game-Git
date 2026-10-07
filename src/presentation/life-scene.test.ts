import { describe, expect, it } from "vitest";

import { recordWorldEvent, type EntityId, type World } from "../simulation";
import { stableHash } from "../simulation/ids";
import {
  lifePlaceStateIdentities,
  searchLifePlaces,
} from "../simulation/life-places";
import { buildLifeIntroduction } from "./life-introduction";
import { resolveLifeScene } from "./life-scene";
import {
  availableOpeningLifeScenes,
  openNextLifeScene,
} from "./life-scene-flow";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
  type NewGameSetup,
} from "./new-game";
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
    // Missing co-resident records establish no other recorded person, not proof
    // that the player lives alone. Preserve the explicit unknown.
    expect(introduction.sentences).toContain(
      "No one else is recorded in your current household.",
    );
  });

  it("introduces nobody at all when there is no household", () => {
    const game = createNewGameWorld(setup());
    const emptied = {
      ...game.world,
      history: { ...game.world.history, householdMemberships: [] },
    };
    const introduction = buildLifeIntroduction(emptied, game.playerPersonId)!;
    expect(introduction.household).toEqual([]);
    expect(introduction.sentences).toContain(
      "Your current household is not recorded.",
    );
    expect(introduction.personName).toBe(
      buildLifeIntroduction(game.world, game.playerPersonId)!.personName,
    );
  });
});

/** The place of all 56 that this seed draws, with a locality to start in. */
function drawPlace(): { seed: string; usps: string; placeKey: string } {
  const places = lifePlaceStateIdentities();
  expect(places).toHaveLength(56);
  for (let n = 1; n < 200; n++) {
    const seed = `a146-${n}`;
    const place =
      places[parseInt(stableHash(seed).slice(0, 8), 16) % places.length]!;
    const locality = searchLifePlaces("", 1, {
      stateJurisdictionKey: place.jurisdictionKey,
      scope: "locality",
    })[0];
    if (locality) return { seed, usps: place.usps, placeKey: locality.key };
  }
  throw new Error("No place with a locality was drawn.");
}

/** The scene a life opened last, and the event its opening says it follows. */
function lastOpened(world: World, personId: EntityId) {
  const event = world.history.events
    .filter(
      (row) =>
        row.type === "life.scene.opened" &&
        row.involvedEntityIds.includes(personId),
    )
    .at(-1)!;
  expect(event).toBeDefined();
  const tag = (prefix: string) =>
    event.tags.find((row) => row.startsWith(prefix))?.slice(prefix.length) ??
    null;
  return {
    family: tag("family:"),
    follows: tag("follows-event:"),
    counterpart:
      event.participants.find((row) => row.role === "coordination:counterpart")
        ?.personId ?? null,
  };
}

describe("A146: the next life scene follows recent events, not a hash", () => {
  const { seed, usps, placeKey } = drawPlace();
  it(`opens the scene tied to the latest event, whatever the world seed (US-${usps}, seed ${seed})`, () => {
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      startKind: "custom",
      household: "shares-a-home",
      seed,
      placeKey,
      startAge: 6,
    });
    const player = game.playerPersonId;
    const world = game.world;
    // The setting with the most scenes waiting, so there is a choice to make.
    const waiting = availableOpeningLifeScenes(world, player).filter(
      ({ definition, beat }) =>
        definition.recurrence !== "daily" || beat.stageKey === "follow-through",
    );
    const settings = [
      ...new Set(waiting.map(({ definition }) => definition.setting)),
    ];
    const setting = settings
      .map((key) => ({
        key,
        count: waiting.filter(({ definition }) => definition.setting === key)
          .length,
      }))
      .sort((a, b) => b.count - a.count)[0]!.key;
    const candidates = waiting.filter(
      ({ definition }) => definition.setting === setting,
    );
    expect(candidates.length).toBeGreaterThan(1);

    // The same history under another world seed opens the same scene.
    const first = lastOpened(openNextLifeScene(world, player, setting), player);
    const reseeded = lastOpened(
      openNextLifeScene({ ...world, seed: `${seed}:other` }, player, setting),
      player,
    );
    expect(reseeded).toEqual(first);
    // What it follows is a recorded event in this life that ties to it;
    // with nothing tied, it is the first scene in order.
    if (first.follows !== null) {
      const followed = world.history.events.find(
        (row) => row.id === first.follows,
      )!;
      expect(followed.involvedEntityIds).toContain(player);
      expect(
        followed.tags.includes(`family:${first.family}`) ||
          (first.counterpart !== null &&
            followed.involvedEntityIds.includes(first.counterpart)),
      ).toBe(true);
    } else {
      expect(first.family).toBe(candidates[0]!.definition.key);
    }

    // Something new is recorded about another of those scenes: that scene
    // comes next, and its opening names the event it follows.
    const later = candidates.find(
      ({ definition }) => definition.key !== first.family,
    )!;
    const jurisdictionId = world.people[player]!.homeJurisdictionId;
    const noticed = recordWorldEvent(world, {
      stableKey: `test:a146:noticed:${player}`,
      type: "test.a146-noticed",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId,
      involvedEntityIds: [player],
      participants: [],
      personFactConstraints: [],
      visibility: "private",
      tags: [`family:${later.definition.key}`],
      summary: "Something happened that one of those moments is about.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const recent = noticed.history.events.at(-1)!;
    const steered = lastOpened(
      openNextLifeScene(noticed, player, setting),
      player,
    );
    expect(steered.family).toBe(later.definition.key);
    expect(steered.follows).toBe(recent.id);
  }, 60_000);
});
