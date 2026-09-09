import { describe, expect, it } from "vitest";
import {
  assertWorldIntegrity,
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
