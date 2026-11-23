import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { BenchPlayer } from "../bench/player";
import { DevMode } from "../bench/dev-mode";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { billCatalog, provisionFor } from "../core2/bill-catalog";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  BRIBE_OFFERED,
  BRIBE_PRESSED,
  BRIBE_REFUSED,
} from "../core2/modules/corruption";
import { crimeRecord } from "../core2/modules/justice";
import {
  draftBill,
  memberKey,
  members,
  provisionStance,
} from "../core2/modules/legislature";
import { lawChain } from "../core2/modules/laws";
import { townSeats } from "../core2/modules/offices";
import { viewOf, viewOn } from "../core2/modules/views";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import bank from "../../data/english/parts/scene-talk.json" with { type: "json" };
import { purposeScene, replyInScene } from "./purpose-scene";
import { playedNode, type TreeNode } from "./scene-talk";

// A bribe offer made to a seated member for a vote reads the records the offer names
// (bribe-facts.ts, `bribeReads`): the envelope against what the player's household spends to live,
// said in words, and the player's own side of the bill's question against the offerer's, from the
// views engine. The offer is made through dev mode's bribe (the corruption engine's own
// `considerBribe`), the director schedules the engine's `corruption.bribe-offered` record and the
// scene is composed from it. Places are drawn (no pin) until one holds a body with a bill the
// player and an offerer both hold a view on; the ones passed over are named. The player's refusal
// plays with the stand set and ends the scene `handed-back`, which the engine reads to press the
// offerer again; the player's accept ends it `took-it` and the engine writes its taken row, by
// record id, moving the offerer's money to the player.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const ATTEMPTS = 14;

type BankRow = {
  key: string;
  uses: {
    purpose?: string;
    step?: string;
    move?: string;
    requiresFacts?: string[];
  }[];
};
const rows = (bank as unknown as { parts: BankRow[] }).parts;
const needs = (pieceKey: string, fact: string) =>
  rows
    .find((row) => row.key === pieceKey)
    ?.uses.some((use) => use.requiresFacts?.includes(fact)) ?? false;

/** The path through a scene's tree to its first ending of this kind. */
const pathTo = (
  node: TreeNode,
  ending: string,
  path: number[] = [],
): number[] | null => {
  for (const [at, reply] of node.replies.entries()) {
    const next = reply.next ? playedNode(reply.next) : null;
    if (next?.end?.ending?.id === ending) return [...path, at];
    const deeper = next ? pathTo(next, ending, [...path, at]) : null;
    if (deeper) return deeper;
  }
  return null;
};

it(`a bribe offer says the envelope in words and reads the player's side of the bill; the refuse is handed back and the accept writes the taken row (seed ${seed})`, () => {
  setBookkeeping(false);
  const passed: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "bribe-reads");
    const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const { core, director } = world;
    const api = coreAPI(core);
    const dev = new DevMode(
      core,
      director,
      new BenchPlayer(core, director),
      world.placeId,
    );
    const day = () => advanceCore(core, addDays(makeIsoDate(core.date), 1));
    // The town's own body of three or more with people seated; the player sits on it.
    const officeId = townSeats(api)
      .map((seat) => seat.office.id)
      .find(
        (id, at, all) =>
          all.indexOf(id) === at &&
          members(api, id).filter((t) =>
            core.people.has(memberKey(t) as PersonId),
          ).length > 2,
      );
    if (!officeId) {
      passed.push(`${place.name} (no body with people seated)`);
      continue;
    }
    const level = townSeats(api).find((seat) => seat.office.id === officeId)!
      .office as {
      level?: string;
    };
    const sitting = members(api, officeId)
      .map((t) => memberKey(t) as PersonId)
      .filter((id) => core.people.get(id)?.alive);
    const me = sitting[1]!;
    core.playerId = me;
    director.watch(core, me);
    const town = lawChain(api).townPlaceId;
    const yours = viewOf(api, me);
    const policies = billCatalog(
      api,
      level.level as "city" | "county" | "state",
    )
      .flatMap((subject) => subject.topics.flatMap((t) => t.policies))
      .filter((row) => row.kind === "policy-question" && row.authority.allowed)
      .slice(0, 12);
    const offerers = [...core.people.values()]
      .filter(
        (p) =>
          p.alive &&
          p.tier !== "husk" &&
          p.placeId === town &&
          p.id !== me &&
          p.liquidMinor > 0 &&
          p.livingCostDailyMinor > 0 &&
          !sitting.includes(p.id as PersonId),
      )
      .sort((a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id))
      .slice(0, 8);
    let found = false;
    for (const policy of policies) {
      if (found) break;
      const provision = provisionFor({
        policyId: policy.id,
        operation: "enact",
      });
      const stance = provisionStance(api, provision);
      if (!stance || !yours) continue;
      const own =
        viewOn(api, me, stance.question, yours.lean) * stance.position;
      if (own === 0) continue;
      for (const offerer of offerers) {
        // A fresh bill each time, still pending when the offer is made.
        const bill = draftBill(api, {
          bodyOfficeId: officeId,
          sponsorId: memberKey(members(api, officeId)[0]!),
          provisions: [provision],
        });
        let record;
        try {
          record = dev.forceBribe({
            offererId: offerer.id,
            officialId: me,
            subjectId: bill.id,
            stakeMinor: 500_000_000,
            answer: "refuses",
          }).record;
        } catch {
          continue;
        }
        if (!record.pending) continue;
        day();
        const causeId = `${BRIBE_OFFERED}:${record.id}`;
        const book = director.ledger.people.get(me)!;
        const entry = book.schedule.find(
          (row) => book.momentsById.get(row.momentId)?.causeId === causeId,
        );
        if (!entry) continue;
        const result = purposeScene(core, director, me, entry, {
          typeKey: "bribe-offer",
        });
        if (result?.kind !== "composed") continue;
        const { scene } = result;
        const fact = (key: string) =>
          scene.facts.find((row) => row.key === key);
        // The record behind the offer, by id: the engine's own crime row.
        const crime = crimeRecord(api, record.id)!;
        expect(crime.pending, `${where}: ${record.id}`).toBe(true);
        expect(fact("favor-vote")?.recordIds, where).toContain(causeId);
        expect(fact("bill")?.text, where).toBeTruthy();
        // The envelope is said in words, never a figure, and cites the crime record.
        const weight = fact("bribe-weight");
        expect(weight, `${where}: the envelope's weight`).toBeTruthy();
        expect(weight!.text, where).not.toMatch(/\d|\$/);
        expect(weight!.recordIds, where).toContain(crime.id);
        // The player's side is the views engine's answer on the bill's question.
        const yourSide = fact("your-side");
        if (!yourSide) continue;
        expect(yourSide.text, where).toBe(own > 0 ? "for" : "against");
        expect(yourSide.recordIds, where).toContain(stance.question);
        expect(
          Boolean(fact("stand-with")) !== Boolean(fact("stand-apart")),
          `${where}: exactly one of stand-with and stand-apart`,
        ).toBe(true);
        // The refuse plays with the stand set: its piece is placed by `your-side`, and the line
        // says the side the views engine gave. Where a variant's own refuse outranks it, the draw
        // moves on and names it.
        const refuse = scene.talk.tree.replies.find(
          (reply) => reply.line.move === "refuse",
        );
        const refusePiece = refuse?.line.parts[0] ?? "";
        if (!needs(refusePiece, "your-side")) {
          passed.push(
            `${where}: the ${scene.purpose} refuse is another line (${refusePiece})`,
          );
          continue;
        }
        expect(refuse!.line.text, where).toContain(yourSide.text);
        // The offerer's own money may have gone in the days since the offer (the engine then takes
        // nothing): an offerer with none left is passed over, named.
        if (core.people.get(offerer.id)!.liquidMinor <= 0) {
          passed.push(`${where}: ${offerer.id} had no cash left to give`);
          continue;
        }
        found = true;
        // The refusal, said through the game's own reply writer, hands the offer back.
        const handed = pathTo(scene.talk.tree, "handed-back");
        expect(handed, `${where}: a path that hands it back`).toBeTruthy();
        // The accept writes the engine's taken row, by record id, and the money moves.
        const took = pathTo(scene.talk.tree, "took-it");
        expect(took, `${where}: a path that takes it`).toBeTruthy();
        const before = core.people.get(offerer.id)!.liquidMinor;
        const mine = core.people.get(me)!.liquidMinor;
        const replyId = replyInScene(core, director, me, entry, took!, {
          typeKey: "bribe-offer",
        });
        expect(replyId, where).toBeTruthy();
        const reply = core.durableLog.get(replyId!)!;
        expect(reply.facts?.ending, where).toBe("took-it");
        // The engine reads the reply record when the day's events are taken up.
        day();
        const taken = crimeRecord(api, record.id)!;
        expect(taken.taken, `${where}: ${record.id} is taken`).toBe(true);
        expect(taken.pending, where).toBeUndefined();
        expect(taken.amountMinor, where).toBeGreaterThan(0);
        expect(core.people.get(offerer.id)!.liquidMinor, where).toBeLessThan(
          before,
        );
        expect(core.people.get(me)!.liquidMinor, where).toBeGreaterThan(mine);
        process.stdout.write(
          `BRIBE READS ${where}: ${record.id}; scene ${scene.purpose}; weight "${weight!.text}"; side ${yourSide.text}; refuse "${refuse!.line.text}"; taken row ${taken.id}; reply ${replyId}\n`,
        );
        // Nothing is pressed after a taken bribe: the engine records no refusal.
        expect(
          core.durableLog.has(`${BRIBE_PRESSED}:${record.id}`),
          where,
        ).toBe(false);
        // Another offer, handed back: the engine writes its refusal and no taken row.
        const second = offerers.find(
          (row) => row.id !== offerer.id && row.liquidMinor > 0,
        );
        const bill2 = draftBill(api, {
          bodyOfficeId: officeId,
          sponsorId: memberKey(members(api, officeId)[0]!),
          provisions: [provision],
        });
        const second2 = dev.forceBribe({
          offererId: second!.id,
          officialId: me,
          subjectId: bill2.id,
          stakeMinor: 500_000_000,
          answer: "refuses",
        }).record;
        day();
        const cause2 = `${BRIBE_OFFERED}:${second2.id}`;
        const entry2 = book.schedule.find(
          (row) => book.momentsById.get(row.momentId)?.causeId === cause2,
        )!;
        const scene2 = purposeScene(core, director, me, entry2, {
          typeKey: "bribe-offer",
        });
        expect(scene2?.kind, where).toBe("composed");
        if (scene2?.kind === "composed") {
          const back = pathTo(scene2.scene.talk.tree, "handed-back");
          expect(back, where).toBeTruthy();
          replyInScene(core, director, me, entry2, back!, {
            typeKey: "bribe-offer",
          });
          day();
          const refused = crimeRecord(api, second2.id)!;
          expect(refused.taken, `${where}: ${second2.id} is not taken`).toBe(
            false,
          );
          expect(refused.pending, where).toBeUndefined();
          expect(
            core.durableLog.has(`${BRIBE_REFUSED}:${second2.id}`),
            where,
          ).toBe(true);
        }
        return;
      }
    }
    if (found) return;
    passed.push(
      `${where}: no offer read a bill the player and the offerer both hold a view on`,
    );
  }
  throw new Error(
    `no drawn place gave the case: ${passed.join("; ")} (seed ${seed})`,
  );
}, 1_800_000);
