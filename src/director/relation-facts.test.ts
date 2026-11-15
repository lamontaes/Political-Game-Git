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
import { relationFacts, tieSide } from "./relation-facts";

describe("relationFacts", () => {
  it("reads kin, acquaintance, closeness and side from the records, one threshold", () => {
    const { core, playerId } = buildBenchWorld("7", gameStartDate(), {
      twoLevel: true,
      placeKey: "5669845",
    });
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
  }, 120_000); // building the bench world takes about a minute
});
