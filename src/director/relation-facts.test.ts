/**
 * One reader says how two people stand (relation-facts.ts), and the talk
 * box, scenes and Journal read it alike. Pinned to Sheridan WY, seed 7, the
 * bench world as play opens it (skill pinned-tests).
 */
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "../core2/game-start";
import { closenessBetween } from "../core2/closeness";
import type { PersonId } from "../core2/types";
import rules from "./data/scene-talk-rules.json" with { type: "json" };
import { addDays } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { applyCoreEvent } from "../core2/state";
import { relationFacts, tieSide } from "./relation-facts";

// One world for both checks: building the bench world is most of the time.
const world = buildBenchWorld("7", gameStartDate(), {
  twoLevel: true,
  placeKey: "5669845",
});

describe("relationFacts", () => {
  it("reads kin, acquaintance, closeness and side from the records, one threshold", () => {
    const { core, playerId } = world;
    const level = rules.tieSides.friendCloseness.value;
    let kin = 0;
    let close = 0;
    let rival = 0;
    for (const id of core.people.keys()) {
      if (id === playerId) continue;
      const facts = relationFacts(core, playerId, id as PersonId);
      const asked = core.people.get(id as PersonId)!;
      expect(facts.acquainted).toBe(
        asked.knownIds.has(playerId) || facts.partners,
      );
      if (facts.kin) {
        kin++;
        expect(facts.acquainted).toBe(true);
        expect(facts.partners).toBe(false);
      }
      if (facts.metBefore) expect(asked.knownIds.has(playerId)).toBe(true);
      if (facts.close) {
        close++;
        expect(
          closenessBetween(core, playerId, id as PersonId),
        ).toBeGreaterThanOrEqual(level);
        expect(facts.tieId).not.toBeNull();
      }
      if (facts.side === "rival") rival++;
      if (facts.side === "friend") expect(facts.close).toBe(true);
      expect(tieSide(core, playerId, id as PersonId)?.side ?? null).toBe(
        facts.side,
      );
      expect(tieSide(core, playerId, id as PersonId)?.tieId ?? null).toBe(
        facts.side ? facts.tieId : null,
      );
    }
    console.log(`kin ${kin}, close ${close}, rival ${rival}`);
    expect(kin).toBeGreaterThan(0);
  }, 120_000);

  it("reads what an earlier scene between two people left: who asked, and how they answered", () => {
    const { core, playerId } = world;
    const otherId = [...core.people.keys()].find(
      (id) => id !== playerId && core.people.get(id)!.alive,
    )! as PersonId;
    const placeId = core.people.get(playerId)!.placeId;
    const reply = (id: string, facts: Record<string, string>) =>
      applyCoreEvent(core, {
        id,
        date: core.date,
        kind: "scene.reply",
        personIds: [playerId, otherId],
        placeId,
        facts: { typeKey: "fixture", causeId: "fixture", ...facts },
        source: { tag: "SOURCED", citation: "Fixture reply.", asOf: core.date },
      });
    expect(relationFacts(core, otherId, playerId).passed.askedBefore).toEqual(
      [],
    );
    // The other person came to the player and the player agreed (the reply
    // record names the player first; its `asked` fact is there only where the
    // player asked). Then, as the player, the player asked and was refused.
    reply("scene-reply:fixture-came:0", { move: "agree" });
    reply("scene-reply:fixture-went:0", { asked: "request", move: "refuse" });
    // A promise is help only once an engine's record says it was done: one
    // that keeps a promise and settled nothing is asked-before, not helped.
    reply("scene-reply:fixture-promised:0", {
      move: "promise",
      keeps: "promise",
    });
    reply("scene-reply:fixture-kept:0", {
      move: "promise",
      keeps: "promise",
      settled: "help",
    });
    // The same day is not "before".
    expect(relationFacts(core, otherId, playerId).passed.askedBefore).toEqual(
      [],
    );
    advanceCore(core, addDays(core.date, 1));
    const came = relationFacts(core, otherId, playerId).passed;
    expect(came.askedBefore.sort()).toEqual([
      "scene-reply:fixture-came:0",
      "scene-reply:fixture-kept:0",
      "scene-reply:fixture-promised:0",
    ]);
    expect(came.helpedBefore.sort()).toEqual([
      "scene-reply:fixture-came:0",
      "scene-reply:fixture-kept:0",
    ]);
    expect(came.refusedBefore).toEqual([]);
    const went = relationFacts(core, playerId, otherId).passed;
    expect(went.askedBefore).toEqual(["scene-reply:fixture-went:0"]);
    expect(went.refusedBefore).toEqual(went.askedBefore);
    expect(went.helpedBefore).toEqual([]);
  }, 180_000);
});
