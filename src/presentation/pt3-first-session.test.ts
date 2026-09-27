import { describe, expect, it } from "vitest";

import {
  advanceWorldMinutes,
  deserializeWorld,
  describePersonContext,
  introducePerson,
  recordEventKnowledge,
  recordWorldEvent,
  serializeWorld,
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
  openingSceneChoiceEffects,
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

function goalStatus(world: World, personId: EntityId, goal: string) {
  return (
    world.history.goalStates
      .filter(
        (record) =>
          record.personId === personId &&
          record.goalKey === `opening-life:${goal}`,
      )
      .at(-1)?.status ?? null
  );
}

/** A saved scene opened by the earlier build remains answerable after its
 * routine prompt is retired from new play. */
function legacyPlanScene(world: World, personId: EntityId): World {
  const key = `opening-life:scene:${personId}:adult.home.plan-week`;
  const opened = recordWorldEvent(world, {
    stableKey: key,
    type: "life.scene.opened",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: world.people[personId]!.homeJurisdictionId,
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
      "family:adult.home.plan-week",
      "opening-stage:moment",
      "provenance:authored-premise",
      `moment:${JSON.stringify(world.currentMoment)}`,
    ],
    summary:
      "You're at home, thinking about what to make time for in the days ahead.",
    context: {
      location: {
        jurisdictionId: world.people[personId]!.homeJurisdictionId,
        label: "Home",
        setting: "home",
      },
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const event = opened.history.events.at(-1)!;
  return recordEventKnowledge(opened, {
    stableKey: `${key}:witness:${personId}`,
    personId,
    eventId: event.id,
    learnedAt: world.currentDate,
    believedSummary: event.summary,
    accuracy: "accurate",
    confidence: "high",
    source: { kind: "direct" },
  });
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

describe("a decision is recorded, and kept only by what the player then does", () => {
  it("records the plan, keeps it by reading, and survives reload", () => {
    const life = start("pt3-plan", 22, "lives-alone");
    let world = legacyPlanScene(life.world, life.personId);
    let scene = currentOpeningLifeScene(world, life.personId)!;
    expect(scene.definition.key).toBe("adult.home.plan-week");
    // The life starts with one plan of its own; clear the slate for "learning".
    const learningBefore = goalStatus(world, life.personId, "learning");
    const before = world.currentMoment;
    world = chooseOpeningLifeScene(
      world,
      life.personId,
      scene.eventId,
      "learning",
    );
    expect(world.currentMoment).toEqual(before);
    expect(goalStatus(world, life.personId, "learning")).toBe("active");
    if (learningBefore !== "active")
      expect(
        world.history.goalStates.filter(
          (record) =>
            record.personId === life.personId &&
            record.goalKey === "opening-life:learning",
        ).length,
      ).toBeGreaterThan(0);

    world = openNextLifeScene(world, life.personId);
    scene = currentOpeningLifeScene(world, life.personId)!;
    expect(scene.stageKey).toBe("follow-through");
    expect(scene.prose).toBe(
      "You've just made a plan to learn something, and there are five minutes open right now.",
    );
    expect(openingSceneChoiceEffects(world, life.personId)).toEqual([
      {
        choiceKey: "read",
        minutes: 5,
        keeps: "Make time to learn something",
        records: null,
      },
      { choiceKey: "later", minutes: 0, keeps: null, records: null },
    ]);
    const beforeReading = world.currentMoment.minuteOfDay;
    world = chooseOpeningLifeScene(world, life.personId, scene.eventId, "read");
    expect(world.currentMoment.minuteOfDay - beforeReading).toBe(5);
    expect(goalStatus(world, life.personId, "learning")).toBe("completed");
    const saved = serializeWorld(world);
    const loaded = deserializeWorld(saved);
    expect(serializeWorld(loaded)).toBe(saved);
    expect(goalStatus(loaded, life.personId, "learning")).toBe("completed");
  });

  it("leaves the plan standing when the player puts it off", () => {
    const life = start("pt3-plan-later", 22, "lives-alone");
    let world = legacyPlanScene(life.world, life.personId);
    let scene = currentOpeningLifeScene(world, life.personId)!;
    world = chooseOpeningLifeScene(
      world,
      life.personId,
      scene.eventId,
      "learning",
    );
    world = openNextLifeScene(world, life.personId);
    scene = currentOpeningLifeScene(world, life.personId)!;
    const beforePuttingItOff = world.currentMoment;
    world = chooseOpeningLifeScene(
      world,
      life.personId,
      scene.eventId,
      "later",
    );
    expect(goalStatus(world, life.personId, "learning")).toBe("active");
    expect(world.currentMoment).toEqual(beforePuttingItOff);
  });

  it("gives the three plan choices three different recorded outcomes", () => {
    const outcomes = (["learning", "connection", "privacy"] as const).map(
      (goal) => {
        const life = start("pt3-plan-each", 22, "lives-alone");
        const world = legacyPlanScene(life.world, life.personId);
        const scene = currentOpeningLifeScene(world, life.personId)!;
        const after = chooseOpeningLifeScene(
          world,
          life.personId,
          scene.eventId,
          goal,
        );
        return goalStatus(after, life.personId, goal);
      },
    );
    expect(outcomes).toEqual(["active", "active", "active"]);
  });
});

describe("reading is free, and saved words stay as they were saved", () => {
  it("projects the scene and its choice effects without changing the world", () => {
    const life = start("pt3-read-only", 22, "lives-alone");
    const opened = legacyPlanScene(life.world, life.personId);
    const saved = serializeWorld(opened);
    currentOpeningLifeScene(opened, life.personId);
    openingSceneChoiceEffects(opened, life.personId);
    availableOpeningLifeScenes(opened, life.personId);
    expect(serializeWorld(opened)).toBe(saved);
  });

  it("shows an already-opened scene with the words it was opened with", () => {
    const life = start("pt3-saved-text", 22, "lives-alone");
    const opened = legacyPlanScene(life.world, life.personId);
    const scene = currentOpeningLifeScene(opened, life.personId)!;
    // An older build wrote this event with its own copy; the save keeps it.
    const older: World = {
      ...opened,
      history: {
        ...opened.history,
        events: opened.history.events.map((event) =>
          event.id === scene.eventId
            ? {
                ...event,
                summary:
                  "You have a little free time at home. What would you like to do?",
              }
            : event,
        ),
      },
    };
    expect(currentOpeningLifeScene(older, life.personId)!.prose).toBe(
      "You have a little free time at home. What would you like to do?",
    );
  });

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
