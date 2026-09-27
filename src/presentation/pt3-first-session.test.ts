import { describe, expect, it } from "vitest";

import {
  advanceWorldMinutes,
  describePersonContext,
  introducePerson,
  type EntityId,
  type World,
} from "../simulation";
import {
  OPENING_LIFE_FOLLOWUPS,
  OPENING_LIFE_SCENES,
  OPENING_SCENE_TIME_WINDOWS,
} from "../simulation/opening-life-content";
import {
  availableOpeningLifeScenes,
  availableOptionalLifeActivities,
  chooseOpeningLifeScene,
  currentOpeningLifeScene,
  openNextLifeScene,
} from "./life-scene-flow";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";

/**
 * PT3-PROSE acceptance: the first session as three different lives see it.
 *
 * These are three separate starts — one person alone at 22, one person at 22
 * sharing a home, one seven-year-old with the adults who look after them —
 * not one save seen three ways.
 */

function start(
  seed: string,
  startAge: number,
  household: "lives-alone" | "shares-a-home",
) {
  // Custom, because a normal start draws its household from the world seed
  // and these three proofs each need a known one.
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    startKind: "custom",
    seed,
    startAge,
    household,
  });
  return { world: game.world, personId: game.playerPersonId };
}

/** Open scenes, answering with the first choice, until `key` is the current one. */
function openUntil(world: World, personId: EntityId, key: string): World {
  let next = openNextLifeScene(world, personId);
  for (let step = 0; step < 12; step++) {
    const scene = currentOpeningLifeScene(next, personId);
    if (!scene) return next;
    if (scene.definition.key === key && scene.stageKey === "moment")
      return next;
    const choice =
      scene.choices.find((entry) => entry.key === "rest") ?? scene.choices[0]!;
    next = openNextLifeScene(
      chooseOpeningLifeScene(next, personId, scene.eventId, choice.key),
      personId,
    );
  }
  return next;
}

describe("the first session reads differently in three different lives", () => {
  it("does not offer the retired plan-week leisure prompt to a new adult", () => {
    const life = start("pt3-alone", 22, "lives-alone");
    const offered = availableOpeningLifeScenes(life.world, life.personId).map(
      (entry) => entry.definition.key,
    );
    expect(offered).not.toContain("adult.home.plan-week");
    expect(
      availableOptionalLifeActivities(life.world, life.personId).map(
        (entry) => entry.definition.key,
      ),
    ).not.toContain("adult.home.free-time");
    const opened = openNextLifeScene(life.world, life.personId);
    expect(
      currentOpeningLifeScene(opened, life.personId)?.definition.key,
    ).not.toBe("adult.home.plan-week");
  });

  it("introduces the person an adult lives with by name and relation", () => {
    const life = start("pt3-shared", 22, "shares-a-home");
    const world = openUntil(
      life.world,
      life.personId,
      "adult.home.shared-time",
    );
    const scene = currentOpeningLifeScene(world, life.personId)!;
    expect(scene.definition.key).toBe("adult.home.shared-time");
    const context = describePersonContext(
      world,
      life.personId,
      scene.counterpartPersonId!,
    )!;
    expect(scene.prose).toBe(
      `You're home, and so is ${introducePerson(context)}.`,
    );
    expect(scene.choices.map((choice) => choice.label)).toEqual([
      "Ask about their day",
      "Let them pick the topic",
      "Ask for some quiet",
    ]);
  });

  it("keeps a child's evening scenes in the evening", () => {
    const life = start("pt3-child", 7, "shares-a-home");
    const morning = availableOpeningLifeScenes(life.world, life.personId).map(
      (entry) => entry.definition.key,
    );
    expect(morning).not.toContain("early.home.closet-fear");
    expect(morning).not.toContain("early.home.food-refusal");
    expect(morning).not.toContain("adult.home.free-time");
    expect(morning).not.toContain("young.home.choose-activity");
    expect(
      availableOptionalLifeActivities(life.world, life.personId).map(
        (entry) => entry.definition.key,
      ),
    ).not.toContain("young.home.choose-activity");
    const evening = advanceWorldMinutes(
      life.world,
      OPENING_SCENE_TIME_WINDOWS["early.home.closet-fear"]![0] -
        life.world.currentMoment.minuteOfDay,
    );
    expect(
      availableOpeningLifeScenes(evening, life.personId).map(
        (entry) => entry.definition.key,
      ),
    ).toContain("early.home.closet-fear");
  });
});

describe("scene labels", () => {
  it("never puts an unsubstituted slot in a label the scene panel shows", () => {
    for (const definition of OPENING_LIFE_SCENES) {
      for (const choice of [
        ...definition.choices,
        ...(OPENING_LIFE_FOLLOWUPS[definition.key]?.choices ?? []),
      ]) {
        expect(choice.label, `${definition.key}/${choice.key}`).not.toMatch(
          /[{}]/,
        );
      }
    }
  });
});
