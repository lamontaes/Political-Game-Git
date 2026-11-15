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
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { applyCoreEvent, coreAPI } from "../core2/state";
import { BRIBE_OFFERED, considerBribe } from "../core2/modules/corruption";
import { purposeScene, replyInScene } from "./purpose-scene";
import type { TreeNode } from "./scene-talk";
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

  it("reads what an earlier scene between two people left: who asked, and how they answered", () => {
    const { core, playerId } = buildBenchWorld("7", gameStartDate(), {
      twoLevel: true,
      placeKey: "5669845",
    });
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

describe("a scene reads what an earlier scene's reply left (played)", () => {
  it("carries refused-before and helped-before from real replies, Sheridan WY, seed 7", () => {
    const world = buildBenchWorld("7", gameStartDate(), {
      twoLevel: true,
      placeKey: "5669845",
    });
    const { core, director: dir } = world;
    const api = coreAPI(core);
    const me = world.playerId as PersonId;
    if (!dir.ledger.people.has(me)) dir.watch(core, me);
    const day = (days: number) =>
      advanceCore(core, addDays(makeIsoDate(core.date), days));
    const entryOf = (eventId: string) =>
      dir.ledger.people
        .get(me)
        ?.schedule.find((row) => row.momentId.includes(eventId));
    // The first path through a scene's tree whose last reply has a move.
    const pathWhere = (
      node: TreeNode,
      want: (move: string) => boolean,
    ): number[] | null => {
      for (const [index, reply] of node.replies.entries()) {
        if (reply.next?.end && want(reply.line.move)) return [index];
        const deeper = reply.next ? pathWhere(reply.next, want) : null;
        if (deeper) return [index, ...deeper];
      }
      return null;
    };
    day(100);
    const residents = [...core.people.values()]
      .filter(
        (row) =>
          row.alive &&
          row.tier !== "husk" &&
          row.id !== me &&
          row.placeId === core.people.get(me)?.placeId &&
          row.birthDate <= "2000-01-01" &&
          row.livingCostDailyMinor > 0 &&
          row.liquidMinor > 0,
      )
      .sort(
        (a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id),
      );
    const proof: string[] = [];
    for (const [kind, moves, fact] of [
      ["refused", rules.passedBetween.refused, "refused-before"],
      ["helped", rules.passedBetween.helped, "helped-before"],
    ] as const) {
      let reached = false;
      for (const offerer of residents.slice(0, 40)) {
        const first = considerBribe(api, {
          offererId: offerer.id,
          officialId: me,
          stakeMinor: 3_000_000,
          subjectId: `contract:${kind}-first-${offerer.id}`,
          pick: { offer: true },
        });
        if (!first?.pending) continue;
        day(1);
        const entry = entryOf(`${BRIBE_OFFERED}:${first.id}`);
        const scene = entry
          ? purposeScene(core, dir, me, entry, { typeKey: "bribe-offer" })
          : null;
        if (scene?.kind !== "composed" || !entry) continue;
        const path = pathWhere(scene.scene.talk.tree, (move) =>
          moves.includes(move),
        );
        if (!path) continue;
        const recordId = replyInScene(core, dir, me, entry, path, {
          typeKey: "bribe-offer",
        });
        expect(recordId).toBeTruthy();
        day(3);
        const second = considerBribe(api, {
          offererId: offerer.id,
          officialId: me,
          stakeMinor: 3_000_000,
          subjectId: `contract:${kind}-second-${offerer.id}`,
          pick: { offer: true },
        });
        if (!second?.pending) continue;
        day(1);
        const again = entryOf(`${BRIBE_OFFERED}:${second.id}`);
        const next = again
          ? purposeScene(core, dir, me, again, { typeKey: "bribe-offer" })
          : null;
        if (next?.kind !== "composed") continue;
        const held = next.scene.facts.filter((row) =>
          ["asked-before", fact].includes(row.key),
        );
        expect(held.map((row) => row.key)).toEqual(
          expect.arrayContaining(["asked-before", fact]),
        );
        for (const row of held) expect(row.recordIds).toContain(recordId);
        proof.push(
          `${kind}: ${offerer.id} first ${first.id} replied ${recordId}; second ${second.id} carries ${held.map((row) => row.key).join(", ")}`,
        );
        reached = true;
        break;
      }
      expect(reached, `${kind}: a played offer, reply and second offer`).toBe(
        true,
      );
    }
    process.stdout.write(`CLASS H PLAYED\n${proof.join("\n")}\n`);
  }, 600_000);
});
