import { describe, expect, it } from "vitest";

import {
  deserializeWorld,
  eligibleEpisodeBeats,
  EPISODE_FAMILIES,
  householdMembershipsAt,
  kinshipRelationshipsAt,
  peopleInHouseholdAt,
  serializeWorld,
  type EntityId,
  type EpisodeBeat,
  type World,
} from "../simulation";
import { createNewGameWorld, type NewGameSetup } from "./new-game";
import { projectStoryMoment, type StoryScene } from "./life-story";
import { DOMESTIC_SCENE_IDS } from "./scene-registry";
import {
  householdResidentIds,
  resolvePlaySceneContext,
} from "./play-scene-context";
import { resolveLifeScene } from "./life-scene";
import { sceneVenueForLocationKey } from "./scene-venues";

function childSetup(overrides: Partial<NewGameSetup> = {}): NewGameSetup {
  return {
    startKind: "custom",
    placeKey: "kentucky",
    startAge: 10,
    depth: "play-formative-years",
    startingLife: "ordinary-life",
    household: "shares-a-home",
    seed: "pt3-school-child",
    givenName: null,
    familyName: null,
    questionnaire: "skipped",
    priors: [],
    ...overrides,
  } as NewGameSetup;
}

function blamedBeat(world: World, personId: EntityId): EpisodeBeat {
  const beat = eligibleEpisodeBeats({
    world,
    personId,
    families: EPISODE_FAMILIES,
  }).beats.find(
    (entry) =>
      entry.episodeKey === "school.the-thing-you-got-blamed-for" &&
      entry.stageKey === "blamed",
  );
  if (!beat) throw new Error("The corridor beat was not offered.");
  return beat;
}

function episodeScene(beat: EpisodeBeat): StoryScene {
  return {
    kind: "episode",
    prose: beat.prose,
    options: beat.options,
    withPeople: beat.bindings.map((binding) => binding.personName),
    presentPeople: beat.bindings.map((binding) => ({
      personId: binding.personId,
      name: binding.personName,
      relationship:
        binding.role === "school-peer" ? "who is in your class" : null,
      introduction:
        binding.role === "school-peer"
          ? `${binding.personName}, who is in your class`
          : binding.personName,
    })),
    beat,
  };
}

function nonresidentParentLife(): {
  readonly world: World;
  readonly personId: EntityId;
  readonly parentId: EntityId;
} {
  for (let index = 0; index < 120; index += 1) {
    const game = createNewGameWorld(
      childSetup({
        household: "lives-alone",
        seed: `weekend19-c-nonresident-${index}`,
      }),
    );
    const residents = householdResidentIds(game.world, game.playerPersonId);
    for (const kinship of kinshipRelationshipsAt(
      game.world,
      game.playerPersonId,
    )) {
      if (kinship.kind !== "lineal:parent-child") continue;
      const parentId = kinship.personIds.find(
        (id) => id !== game.playerPersonId,
      );
      if (!parentId) continue;
      if (residents.has(parentId)) continue;
      if (
        game.world.history.personDeaths.some(
          (death) => death.personId === parentId,
        )
      ) {
        continue;
      }
      return {
        world: game.world,
        personId: game.playerPersonId,
        parentId,
      };
    }
  }
  throw new Error("No generated life produced a nonresident parent token.");
}

describe("School scenes are not household apartments", () => {
  it("binds the corridor location without a home plate", () => {
    const venue = sceneVenueForLocationKey("formative:school-corridor");
    expect(venue).not.toBeNull();
    expect(venue!.sceneId).toBeNull();
    expect(venue!.reason).toMatch(/not a school/i);
  });

  it("does not paint the apartment behind the named corridor beat", () => {
    const game = createNewGameWorld(childSetup());
    const beat = blamedBeat(game.world, game.playerPersonId);
    expect(beat.sceneSetting).toBe("school");
    expect(beat.physicallyPresentPersonIds.length).toBeGreaterThan(0);

    const resolved = resolvePlaySceneContext(
      game.world,
      game.playerPersonId,
      episodeScene(beat),
    );
    expect(resolved.purpose).toBe("school");
    expect(resolved.sceneId).toBeNull();
    expect(DOMESTIC_SCENE_IDS).not.toContain(resolved.sceneId);
    expect(
      resolveLifeScene(game.world, game.playerPersonId).sceneId,
    ).not.toBeNull();
    expect(resolved.reason).toMatch(/not a school corridor/i);
    expect(resolved.placeLabel).toMatch(/school/i);

    const peer = beat.bindings.find(
      (binding) => binding.role === "school-peer",
    )!;
    expect(resolved.presentPeople.map((person) => person.personId)).toContain(
      peer.personId,
    );
    const household = householdResidentIds(game.world, game.playerPersonId);
    expect(
      resolved.presentPeople.some((person) => household.has(person.personId)),
    ).toBe(false);
  });

  it("keeps the same school context after save and reload", () => {
    const game = createNewGameWorld(childSetup());
    const beat = blamedBeat(game.world, game.playerPersonId);
    const once = resolvePlaySceneContext(
      game.world,
      game.playerPersonId,
      episodeScene(beat),
    );
    const reloaded = deserializeWorld(serializeWorld(game.world));
    const again = resolvePlaySceneContext(
      reloaded,
      game.playerPersonId,
      episodeScene(blamedBeat(reloaded, game.playerPersonId)),
    );
    expect(again).toEqual(once);
  });

  it("omits a stale supporting-person reference instead of breaking play", () => {
    const game = createNewGameWorld(childSetup());
    const beat = blamedBeat(game.world, game.playerPersonId);
    const missingId = "person_missing_after_generation_repair" as EntityId;
    const scene = episodeScene({
      ...beat,
      physicallyPresentPersonIds: [
        ...beat.physicallyPresentPersonIds,
        missingId,
      ],
    });
    const staleScene: StoryScene = {
      ...scene,
      presentPeople: [
        ...scene.presentPeople,
        {
          personId: missingId,
          name: "Former classmate",
          relationship: "who was once in your class",
          introduction: "a classmate from an older generated record",
        },
      ],
    };

    expect(() =>
      resolvePlaySceneContext(game.world, game.playerPersonId, staleScene),
    ).not.toThrow();
    expect(
      resolvePlaySceneContext(
        game.world,
        game.playerPersonId,
        staleScene,
      ).presentPeople.map((person) => person.personId),
    ).not.toContain(missingId);
  });
});

describe("Who is actually in the house", () => {
  it("lets a shared home keep the people who live there", () => {
    const game = createNewGameWorld(childSetup());
    const residents = [
      ...householdResidentIds(game.world, game.playerPersonId),
    ];
    expect(residents.length).toBeGreaterThan(0);
    const moment = projectStoryMoment(game.world, game.playerPersonId);
    const resolved = resolvePlaySceneContext(
      game.world,
      game.playerPersonId,
      moment.scene,
    );
    if (resolved.purpose === "home" || resolved.purpose === "unspecified") {
      expect(DOMESTIC_SCENE_IDS).toContain(resolved.sceneId);
      for (const person of resolved.presentPeople) {
        expect(residents).toContain(person.personId);
      }
    }
  });

  it("does not put a nonresident parent in a solo house", () => {
    const life = nonresidentParentLife();
    expect(
      householdResidentIds(life.world, life.personId).has(life.parentId),
    ).toBe(false);
    expect(life.world.people[life.parentId]).toBeDefined();

    const memberships = householdMembershipsAt(life.world, life.parentId);
    expect(memberships).toHaveLength(0);

    const fakeHomeScene: StoryScene = {
      kind: "ordinary-stretch",
      prose: "",
      options: [],
      withPeople: [life.world.people[life.parentId]!.givenName],
      presentPeople: [
        {
          personId: life.parentId,
          name: `${life.world.people[life.parentId]!.givenName} ${life.world.people[life.parentId]!.familyName}`,
          relationship: "your parent",
          introduction: "a parent who does not live here",
        },
      ],
    };
    const resolved = resolvePlaySceneContext(
      life.world,
      life.personId,
      fakeHomeScene,
    );
    expect(resolved.purpose).toBe("unspecified");
    expect(
      resolved.presentPeople.map((person) => person.personId),
    ).not.toContain(life.parentId);
    expect(
      peopleInHouseholdAt(
        life.world,
        householdMembershipsAt(life.world, life.personId)[0]!.membership
          .householdId,
      ),
    ).not.toContain(life.parentId);
  });

  it("leaves an adult living alone without household companions in the room", () => {
    const game = createNewGameWorld({
      startKind: "custom",
      placeKey: "kentucky",
      startAge: 34,
      depth: "summarize-earlier-life",
      startingLife: "ordinary-life",
      household: "lives-alone",
      seed: "weekend19-c-solo-adult",
      givenName: null,
      familyName: null,
      questionnaire: "skipped",
      priors: [],
    } as NewGameSetup);
    expect([...householdResidentIds(game.world, game.playerPersonId)]).toEqual(
      [],
    );
    const moment = projectStoryMoment(game.world, game.playerPersonId);
    const resolved = resolvePlaySceneContext(
      game.world,
      game.playerPersonId,
      moment.scene,
    );
    expect(resolved.presentPeople).toEqual([]);
  });
});
