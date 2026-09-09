import {
  activeOrdinaryGoal,
  completeOrdinaryGoal,
  chooseOrdinaryLifeGoal,
} from "../simulation/life-personality";
import type { LifeTalkIntent } from "./life-conversation";
import { describe, expect, it } from "vitest";
import {
  assertWorldIntegrity,
  advanceWorldMinutes,
  serializeWorld,
  deserializeWorld,
} from "../simulation";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import {
  openNextLifeScene,
  currentOpeningLifeScene,
  chooseOpeningLifeScene,
  availableOpeningLifeScenes,
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
describe("OPENING-LIFE1 canonical scenes", () => {
  it.each([6, 24])(
    "offers an everyday activity again on a later day at age %i",
    (age) => {
      const game = start(`daily-${age}`, age);
      let world = game.world;
      const activity =
        age < 18 ? "young.home.choose-activity" : "adult.home.free-time";
      for (let attempt = 0; attempt < 20; attempt++) {
        const opened = openNextLifeScene(world, game.playerPersonId);
        const scene = currentOpeningLifeScene(opened, game.playerPersonId);
        if (!scene) break;
        world = chooseOpeningLifeScene(
          opened,
          game.playerPersonId,
          scene.eventId,
          scene.definition.choices[0]!.key,
        );
      }
      const first = world.history.events.find(
        (event) =>
          event.type === "life.scene.opened" &&
          event.tags.includes(`family:${activity}`),
      )!;
      expect(first).toBeDefined();
      expect(
        availableOpeningLifeScenes(world, game.playerPersonId).some(
          (entry) => entry.definition.key === activity,
        ),
      ).toBe(false);
      world = advanceWorldMinutes(
        world,
        1440 - world.currentMoment.minuteOfDay + 600,
      );
      world = deserializeWorld(serializeWorld(world));
      expect(
        availableOpeningLifeScenes(world, game.playerPersonId).some(
          (entry) => entry.definition.key === activity,
        ),
      ).toBe(true);
      for (let attempt = 0; attempt < 20; attempt++) {
        world = openNextLifeScene(world, game.playerPersonId);
        const scene = currentOpeningLifeScene(world, game.playerPersonId)!;
        expect(scene).not.toBeNull();
        world = chooseOpeningLifeScene(
          world,
          game.playerPersonId,
          scene.eventId,
          scene.definition.choices[0]!.key,
        );
        if (scene.definition.key === activity) {
          expect(scene.eventId).not.toBe(first.id);
          expect(
            world.history.events.filter(
              (event) =>
                event.type === "life.scene.opened" &&
                event.tags.includes(`family:${activity}`),
            ),
          ).toHaveLength(2);
          assertWorldIntegrity(world);
          return;
        }
      }
      throw new Error("The later-day activity was never offered.");
    },
  );
  it("sustains distinct home moments, with zero-write reads and saved choices", () => {
    const game = start("home-breadth");
    let world = game.world;
    const eligible = availableOpeningLifeScenes(
      world,
      game.playerPersonId,
    ).filter((entry) => entry.definition.setting === "home");
    const seen = new Set<string>();
    for (let i = 0; i < eligible.length; i++) {
      world = openNextLifeScene(world, game.playerPersonId);
      const before = serializeWorld(world);
      const scene = currentOpeningLifeScene(world, game.playerPersonId)!;
      expect(scene).not.toBeNull();
      seen.add(scene.definition.key);
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
    ).toBe(eligible.length);
    expect(openNextLifeScene(world, game.playerPersonId)).toBe(world);
  });

  it("keeps selected A/B/A replies separate and answers the preceding question", () => {
    const game = start("talk-pair");
    let world = openNextLifeScene(game.world, game.playerPersonId);
    const scene = currentOpeningLifeScene(world, game.playerPersonId)!;
    const [a, b] = scene.presentPersonIds.filter(
      (id) => id !== game.playerPersonId,
    );
    expect(a).toBeTruthy();
    expect(b).toBeTruthy();
    function speak(personId: string, intent: "activity" | "share" | "explain") {
      const view = projectLifeConversation(
        world,
        game.playerPersonId,
        personId,
      )!;
      const before = serializeWorld(world);
      expect(view).not.toBeNull();
      expect(serializeWorld(world)).toBe(before);
      world = commitLifeConversation(world, {
        playerPersonId: game.playerPersonId,
        personId,
        intent,
        revision: view.revision,
      });
    }
    speak(a!, "activity");
    speak(b!, "share");
    expect(
      projectLifeConversation(world, game.playerPersonId, a!)!.transcript,
    ).toHaveLength(1);
    expect(
      projectLifeConversation(world, game.playerPersonId, b!)!.transcript,
    ).toHaveLength(1);
    speak(a!, "explain");
    const av = projectLifeConversation(world, game.playerPersonId, a!)!;
    const bv = projectLifeConversation(world, game.playerPersonId, b!)!;
    expect(av.transcript).toHaveLength(2);
    expect(av.transcript[1]!.reply).toMatch(
      /try something|spend time|already enjoy/,
    );
    expect(bv.transcript).toHaveLength(1);
    const restored = deserializeWorld(serializeWorld(world));
    expect(projectLifeConversation(restored, game.playerPersonId, a!)).toEqual(
      av,
    );
    expect(projectLifeConversation(restored, game.playerPersonId, b!)).toEqual(
      bv,
    );
    assertWorldIntegrity(world);
  });

  it("does not confuse enrollment or co-residence with presence", () => {
    const game = start("presence");
    for (const personId of game.world.personOrder)
      expect(
        projectLifeConversation(game.world, game.playerPersonId, personId),
      ).toBeNull();
  });
});

describe("ordinary conversation follow-through", () => {
  it("answers an activity suggestion and preserves consent across a follow-up question", () => {
    let accepted = false;
    let declined = false;
    for (let n = 0; n < 12 && (!accepted || !declined); n++) {
      const game = start(`follow-through-${n}`, 10);
      let world = openNextLifeScene(
        chooseOrdinaryLifeGoal(game.world, game.playerPersonId, "connection"),
        game.playerPersonId,
      );
      const personId = currentOpeningLifeScene(
        world,
        game.playerPersonId,
      )!.presentPersonIds.find((id) => id !== game.playerPersonId)!;
      function speak(intent: LifeTalkIntent) {
        const view = projectLifeConversation(
          world,
          game.playerPersonId,
          personId,
        )!;
        world = commitLifeConversation(world, {
          playerPersonId: game.playerPersonId,
          personId,
          intent,
          revision: view.revision,
        });
        return projectLifeConversation(world, game.playerPersonId, personId)!;
      }
      const asked = speak("activity");
      expect(asked.intents.some((intent) => intent.key === "suggestGame")).toBe(
        true,
      );
      const proposed = speak("suggestGame");
      expect(activeOrdinaryGoal(world, game.playerPersonId, "connection")).toBe(
        true,
      );
      expect(() =>
        completeOrdinaryGoal(
          world,
          game.playerPersonId,
          "connection",
          proposed.transcript.at(-1)!.eventId,
        ),
      ).toThrow("performed personal action");
      const agreed = proposed.intents.some(
        (intent) => intent.key === "spendTime",
      );
      const explained = speak("explain");
      expect(
        explained.intents.some((intent) => intent.key === "spendTime"),
      ).toBe(agreed);
      if (agreed) {
        accepted = true;
        expect(explained.transcript.at(-1)!.reply).toContain(
          "enjoy spending time",
        );
        const before = world.currentMoment.minuteOfDay;
        const after = speak("spendTime");
        expect(world.currentMoment.minuteOfDay - before).toBe(30);
        expect(
          activeOrdinaryGoal(world, game.playerPersonId, "connection"),
        ).toBe(false);
        expect(after.intents.some((intent) => intent.key === "spendTime")).toBe(
          false,
        );
        expect(
          projectLifeConversation(
            deserializeWorld(serializeWorld(world)),
            game.playerPersonId,
            personId,
          ),
        ).toEqual(after);
      } else {
        declined = true;
        expect(explained.transcript.at(-1)!.reply).toContain(
          "isn't what I feel like",
        );
      }
      assertWorldIntegrity(world);
    }
    expect(accepted).toBe(true);
    expect(declined).toBe(true);
  });
});

describe("supported school situation breadth", () => {
  it.each([5, 6, 7])(
    "plays the available authored school moments at age %i",
    (age) => {
      const game = start(`school-breadth-${age}`, age);
      let world = game.world;
      const expected = availableOpeningLifeScenes(world, game.playerPersonId)
        .filter((entry) => entry.definition.setting === "school")
        .map((entry) => entry.definition.key);
      expect(expected.length).toBeGreaterThan(4);
      const played: string[] = [];
      for (let i = 0; i < expected.length; i++) {
        world = openNextLifeScene(world, game.playerPersonId, "school");
        const scene = currentOpeningLifeScene(world, game.playerPersonId)!;
        expect(scene.definition.setting).toBe("school");
        expect(world.people[scene.counterpartPersonId!]).toBeDefined();
        played.push(scene.definition.key);
        world = chooseOpeningLifeScene(
          world,
          game.playerPersonId,
          scene.eventId,
          scene.choices[i % scene.choices.length]!.key,
        );
        world = deserializeWorld(serializeWorld(world));
      }
      expect([...played].sort()).toEqual([...expected].sort());
      expect(new Set(played).size).toBe(played.length);
      assertWorldIntegrity(world);
    },
  );
});
