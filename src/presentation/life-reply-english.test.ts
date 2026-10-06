import { describe, expect, it } from "vitest";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { drawRandomPlace } from "../../tests/support/random-place";
import { LIFE_MIND_IDS } from "../simulation/life-mind-content";
import {
  createMindProvenance,
  recordPersonalityTendency,
} from "../simulation/mind";
import { serializeWorld, deserializeWorld } from "../simulation";
import { lifeReplyLine } from "./life-reply-english";

describe("ordinary replies through the existing English composer", () => {
  it("uses recorded contrasting voices, saves parts, and refuses missing proposal facts", () => {
    const seed = "session4-reply-parts";
    const place = drawRandomPlace(seed, (p) => p.scope === "locality");
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
      startAge: 34,
    });
    let world = game.world;
    const playerPersonId = game.playerPersonId;
    const speakers = world.personOrder
      .filter((id) => id !== playerPersonId)
      .slice(0, 2);
    expect(speakers).toHaveLength(2);
    for (const [at, speakerId] of speakers.entries()) {
      const prior = world.history.personalityTendencies
        .filter(
          (r) =>
            r.personId === speakerId &&
            r.tendencyId === LIFE_MIND_IDS.conversation,
        )
        .at(-1);
      world = recordPersonalityTendency(world, {
        stableKey: `reply-voice:${speakerId}`,
        personId: speakerId,
        tendencyId: LIFE_MIND_IDS.conversation,
        recordedAt: world.currentDate,
        expressionKey: at === 0 ? "ask" : "listen",
        strength: "subtle",
        confidence: "high",
        scopeTags: ["life:ordinary"],
        provenance: createMindProvenance("authored", {
          note: "Contrasting recorded voice fixture; no action is inferred.",
        }),
        supersedesTendencyId: prior?.id ?? null,
      });
    }
    const facts = {
      listener: {
        text: world.people[playerPersonId]!.givenName,
        sourceRecordIds: [playerPersonId],
      },
    };
    const lines = speakers.map((id) =>
      lifeReplyLine(world, id, playerPersonId, [], "first-greeting", facts),
    );
    expect(lines[0]!.text).toContain("How are you?");
    expect(lines[1]!.text).toContain("I'm listening.");
    expect(lines[0]!.text).not.toEqual(lines[1]!.text);
    expect(
      lines.every((line) => line.parts.some((part) => part.part === "closer")),
    ).toBe(true);
    const reloaded = deserializeWorld(serializeWorld(world));
    expect(
      lifeReplyLine(
        reloaded,
        speakers[0]!,
        playerPersonId,
        [],
        "first-greeting",
        facts,
      ),
    ).toEqual(lines[0]);
    expect(() =>
      lifeReplyLine(
        world,
        speakers[0]!,
        playerPersonId,
        [],
        "proposal-accepted",
      ),
    ).toThrow("Cannot word life reply");
  });
});
