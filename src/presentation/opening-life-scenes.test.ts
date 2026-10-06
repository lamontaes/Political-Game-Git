import {
  activeOrdinaryGoal,
  completeOrdinaryGoal,
  chooseOrdinaryLifeGoal,
} from "../simulation/life-personality";
import type { LifeTalkIntent } from "./life-conversation";
import { describe, expect, it } from "vitest";
import {
  assertWorldIntegrity,
  serializeWorld,
  deserializeWorld,
  recordWorldEvent,
  type EntityId,
  type World,
} from "../simulation";
import {
  isArchivedRoutineOpeningSceneKey,
  openingLifeSceneAtStage,
  OPENING_LIFE_SCENES,
} from "../simulation/opening-life-content";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { schoolStageToday } from "../simulation/school-stages";
import {
  openNextLifeScene,
  currentOpeningLifeScene,
  chooseOpeningLifeScene,
  availableOpeningLifeScenes,
  availableOptionalLifeActivities,
  openOptionalLifeActivity,
} from "./life-scene-flow";
import {
  commitLifeConversation,
  projectLifeConversation,
} from "./life-conversation";

function start(seed: string, startAge = 6) {
  return createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    startKind: "custom",
    household: "shares-a-home",
    seed,
    startAge,
  });
}

function previouslyOpenedRoutineScene(
  world: World,
  personId: EntityId,
  key: string,
  stageKey: "moment" | "follow-through",
): World {
  const archived = OPENING_LIFE_SCENES.find((scene) => scene.key === key)!;
  const definition = openingLifeSceneAtStage(archived, stageKey)!;
  const jurisdictionId = world.people[personId]!.homeJurisdictionId;
  return recordWorldEvent(world, {
    stableKey: `test:previously-opened:${key}:${stageKey}`,
    type: "life.scene.opened",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId,
    involvedEntityIds: [personId],
    participants: [
      {
        personId,
        role: "focus:subject",
        detail: "Present in the authored scene",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      "opening-life-v1",
      `family:${key}`,
      `opening-stage:${stageKey}`,
      `moment:${JSON.stringify(world.currentMoment)}`,
    ],
    summary: definition.premise,
    context: {
      location: { jurisdictionId, label: "Home", setting: "home" },
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

describe("OPENING-LIFE1 canonical scenes", () => {
  it.each([6, 24])(
    "does not offer retired quiet-time activities at age %i",
    (age) => {
      const game = start(`retired-quiet-time-${age}`, age);
      const activity =
        age < 18 ? "young.home.choose-activity" : "adult.home.free-time";
      expect(isArchivedRoutineOpeningSceneKey(activity)).toBe(true);
      expect(
        availableOpeningLifeScenes(game.world, game.playerPersonId).some(
          (entry) => entry.definition.key === activity,
        ),
      ).toBe(false);
      expect(
        availableOptionalLifeActivities(game.world, game.playerPersonId),
      ).toEqual([]);
      expect(
        openOptionalLifeActivity(game.world, game.playerPersonId, activity),
      ).toBe(game.world);
    },
  );
  it("sustains distinct home moments, with zero-write reads and saved choices", () => {
    const game = start("home-breadth");
    let world = game.world;
    const eligible = availableOpeningLifeScenes(
      world,
      game.playerPersonId,
    ).filter(
      (entry) =>
        entry.definition.setting === "home" &&
        entry.definition.recurrence !== "daily",
    );
    const seen = new Set<string>();
    let resolved = 0;
    for (let i = 0; i < eligible.length * 2; i++) {
      world = openNextLifeScene(world, game.playerPersonId);
      const before = serializeWorld(world);
      const scene = currentOpeningLifeScene(world, game.playerPersonId)!;
      if (!scene) break;
      if (scene.stageKey === "moment") seen.add(scene.definition.key);
      resolved++;
      expect(openNextLifeScene(world, game.playerPersonId)).toBe(world);
      expect(serializeWorld(world)).toBe(before);
      world = chooseOpeningLifeScene(
        world,
        game.playerPersonId,
        scene.eventId,
        scene.choices[0]!.key,
      );
      assertWorldIntegrity(world);
      expect(serializeWorld(deserializeWorld(serializeWorld(world)))).toBe(
        serializeWorld(world),
      );
    }
    expect(seen.size).toBe(eligible.length);
    expect(
      world.history.memories.length - game.world.history.memories.length,
    ).toBe(resolved);
    expect(openNextLifeScene(world, game.playerPersonId)).toBe(world);
  });
});

describe("ordinary conversation follow-through", () => {
});
