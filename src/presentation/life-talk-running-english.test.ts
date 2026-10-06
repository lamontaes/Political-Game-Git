import { describe, expect, it } from "vitest";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { drawRandomPlace } from "../../tests/support/random-place";
import { answerRunning } from "./life-talk-running";

describe("English parts for running-for-office replies", () => {
  it("keeps the actual decision and composes each reply without inventing a memory", () => {
    const seed = "session4-running-english";
    const place = drawRandomPlace(seed, (entry) => entry.scope === "locality");
    const { world, playerPersonId } = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
      startAge: 34,
    });
    const listenerId = world.personOrder.find((id) => id !== playerPersonId)!;
    for (const step of [
      "open",
      "help",
      "when",
      "news",
      "remember",
      "worry",
    ] as const) {
      const result = answerRunning(
        world,
        playerPersonId,
        listenerId,
        `running:${step}`,
        `session4-running:${step}`,
      );
      expect(result.parts.length).toBeGreaterThan(0);
      expect(
        result.parts.every((part) =>
          part.partKey.startsWith("life-reply.running-"),
        ),
      ).toBe(true);
      expect(result).toEqual(
        answerRunning(
          world,
          playerPersonId,
          listenerId,
          `running:${step}`,
          `session4-running:${step}`,
        ),
      );
      if (step === "open" || step === "help")
        expect(result.world.history.decisionTraces.length).toBeGreaterThan(
          world.history.decisionTraces.length,
        );
      if (step === "remember") expect(result.reply).toBe("What do you mean?");
      if (step === "news")
        expect(result.reply).not.toContain("I was part of that");
    }
  });
});
