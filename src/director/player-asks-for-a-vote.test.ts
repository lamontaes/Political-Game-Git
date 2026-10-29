/**
 * The player asks a colleague for their vote (pool item
 * scene-ask-colleague-for-vote; owner, Oct 14: convince one member to
 * switch). The evening before the floor vote on a bill the player sponsors
 * that would fail, the legislature names the colleagues it needs (a
 * `vote-ahead` record with the player as the one asking); the director stages
 * the ask with the player asking; the colleague answers from where they stand
 * and what a favor to the player is worth to them; the answer is kept as the
 * colleague's reply to the player, and their recorded vote at the roll cites
 * it. Played in the bench world in places drawn from all 56 on a seed nobody
 * chose (GOLDEN_PATH_SEED pins one), the player sitting on their town's
 * largest body and drafting a bill on each question it can pass.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { seatAct, seatView } from "../bench/legislature";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  billOf,
  favorWorth,
  memberKey,
  memberPosition,
  members,
  votesOn,
} from "../core2/modules/legislature";
import { townSeats } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import type { CoreEventInput, PersonId } from "../core2/types";
import replyMoves from "../core2/data/legislature/vote-replies.json" with { type: "json" };
import sceneBank from "../../data/english/parts/scene-talk.json" with { type: "json" };
import { purposeScene, replyInScene } from "./purpose-scene";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
/** Places tried before giving up on an ask by the player. */
const DRAWS = 6;
/** Days played in each place at most, one at a time so the evening before a vote is caught. */
const MOST_DAYS = 120;
/** Bills the player drafts in each place, one on each question the body can pass. */
const MOST_BILLS = 6;

it(`the player asks a colleague for their vote the evening before the roll, and the roll call reads the answer (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "player-asks-for-a-vote");
    const where = `${place.name} (${place.key}), run seed ${seed} draw ${draw}, world seed ${place.seed}`;
    setBookkeeping(false);
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const full = (officeId: string) =>
      members(api, officeId)
        .map(memberKey)
        .filter((id) => core.people.get(id)?.alive)
        .sort();
    // The town's largest body with three full-person members or more: the
    // player's bill goes on its next agenda when drafted.
    const body = [
      ...new Map(
        townSeats(api)
          .filter(
            (row) =>
              ["city", "county", "township"].includes(row.office.level) &&
              full(row.office.id).length > 2,
          )
          .map((row) => [row.office.id, row.office] as const),
      ).values(),
    ].sort((a, b) => full(b.id).length - full(a.id).length)[0];
    if (!body) {
      tried.push(`${where}: no town body with three full-person members`);
      continue;
    }
    const seated = full(body.id);
    core.playerId = seated[0]! as PersonId;
    const player = core.playerId;
    for (const id of seated) {
      core.focusPersonIds.add(id as PersonId);
      director.watch(core, id as PersonId);
    }
    const asks: CoreEventInput[] = [];
    api.subscribeEvents("player-asks-test", ["vote-ahead"], (_, e) => {
      if (e.facts?.askerId === player) asks.push(e);
    });
    const drafted = seatView(core, player)
      .questions.slice(0, MOST_BILLS)
      .flatMap((question) => {
        try {
          return [
            seatAct(core, player, {
              kind: "draft",
              officeId: body.id,
              question,
              value: 1,
            }).number,
          ];
        } catch {
          return [];
        }
      });
    const checked = new Set<string>();
    for (let day = 1; day <= MOST_DAYS; day += 1) {
      if (core.date < addDays(makeIsoDate(gameStartDate()), day))
        advanceCore(core, addDays(makeIsoDate(gameStartDate()), day));
      const ask = asks.find(
        (e) =>
          !checked.has(e.id) &&
          String(e.facts?.floorDate) > core.date &&
          billOf(api, String(e.facts?.billId)).status === "drafted",
      );
      if (!ask) continue;
      checked.add(ask.id);
      const [colleagueId] = ask.personIds as [PersonId, PersonId];
      const billId = String(ask.facts!.billId);
      const bill = billOf(api, billId);
      expect(bill.sponsorId, `${where}: ${ask.id}`).toBe(player);
      // The director stages the ask with the player asking the colleague.
      const book = director.ledger.people.get(player)!;
      const entry = book.schedule.find((row) => row.momentId.includes(ask.id));
      const binding = entry?.bindings.find(
        (row) => row.typeKey === "vote-sought",
      );
      expect(binding, `${where}: ${ask.id}: no ask staged`).toBeTruthy();
      expect(
        binding!.roles.find((row) => row.role === "colleague")!.personIds,
      ).toEqual([colleagueId]);
      const composed = purposeScene(core, director, player, entry!, {
        typeKey: "vote-sought",
      });
      expect(composed?.kind, `${where}: ${ask.id}`).toBe("composed");
      if (composed?.kind !== "composed") return;
      const { scene } = composed;
      expect(scene.playerAsks).toBe(true);
      expect(scene.cause.id).toBe(ask.id);
      // The narrator sets the evening before the roll from the player's
      // side (the bank's setups for the player's ask), naming the colleague.
      const setup = scene.talk.narration[0];
      expect(setup?.role, `${where}: ${ask.id}`).toBe("narrator");
      expect(
        (
          sceneBank as unknown as {
            parts: { key: string; uses?: { step?: string; key?: string }[] }[];
          }
        ).parts.find((part) => part.key === setup!.parts[0])?.uses,
        `${where}: ${setup!.text}`,
      ).toContainEqual(
        expect.objectContaining({ step: "narrate", key: "vote-sought" }),
      );
      expect(setup!.text, where).toContain(
        core.people.get(colleagueId)!.givenName,
      );
      // The player opens with the request; the colleague answers from where
      // they stand before any favor.
      expect(scene.talk.state.speakerId).toBe(player);
      expect(scene.talk.state.role).toBe("asked");
      const before = memberPosition(api, billId, colleagueId);
      const favor = favorWorth(api, colleagueId, player);
      const first = scene.talk.tree.lines[0]!;
      expect(first.speakerId).toBe(colleagueId);
      expect(first.move, `${where}: lean ${before.total}, favor ${favor}`).toBe(
        before.total > 0
          ? "agree"
          : before.total + favor > 0
            ? "stall"
            : "refuse",
      );
      // Every way of asking again is answered from where they stand: a plea
      // or a trade wins the vote where a favor carries them, pressing only
      // where they lean for it already, and letting it go wins nothing.
      const carried = before.total + favor > 0;
      for (const reply of first.move === "agree"
        ? []
        : scene.talk.tree.replies) {
        const last = reply.next?.lines.find(
          (row) => row.speakerId === colleagueId,
        )?.move;
        const yes = ["agree", "relent"].includes(last ?? "");
        if (reply.line.move === "accept") expect(last).toBeUndefined();
        else
          expect(yes, `${where}: ${reply.line.move} answered ${last}`).toBe(
            reply.line.move === "press" ? before.total > 0 : carried,
          );
      }
      // Met in ordinary play: the ask is a scene, not a journal line.
      expect(entry!.outcome, `${where}: ${ask.id}`).not.toBe("journal-line");
      // The player asks again with a plea (or thanks a yes); the colleague's
      // last answer is the reply the legislature keeps.
      const path = scene.talk.tree.replies.findIndex((reply) =>
        ["plea", "bargain", "thank"].includes(reply.line.move),
      );
      expect(
        path,
        `${where}: no plea, trade or thanks offered`,
      ).toBeGreaterThanOrEqual(0);
      const asked = scene.talk.tree.replies[path]!;
      const answer =
        asked.next?.lines.find((row) => row.speakerId === colleagueId)?.move ??
        first.move;
      const replyId = replyInScene(core, director, player, entry!, [path], {
        typeKey: "vote-sought",
      });
      expect(replyId, `${where}: ${ask.id}`).toBeTruthy();
      const reply = core.durableLog.get(replyId!)!;
      expect(reply.personIds).toEqual([colleagueId, player]);
      expect(reply.facts?.move).toBe(answer);
      expect(reply.facts?.causeId).toBe(ask.id);
      const counted = [...replyMoves.favor, ...replyMoves.strain].includes(
        answer,
      );
      const after = memberPosition(api, billId, colleagueId);
      if (counted) expect(after.replyIds).toContain(replyId);
      // The roll call: the colleague's recorded vote reads the answer.
      advanceCore(core, String(ask.facts!.floorDate));
      const vote = votesOn(api, billId).find(
        (v) =>
          v.memberId === colleagueId && !(v as { override?: boolean }).override,
      );
      if (!vote) {
        tried.push(
          `${where}: ${ask.id}: ${bill.number} ${billOf(api, billId).status} with no roll call`,
        );
        continue;
      }
      if (counted) expect(vote.position.replyIds).toContain(replyId);
      process.stdout.write(
        `PLAYER ASKS ${where} (GOLDEN_PATH_SEED=${seed})\n  player ${player} in ${body.id}, drafted ${drafted.join(", ")}\n  ${ask.id} (${ask.date}): the player asks ${colleagueId} about ${bill.number}, vote on ${ask.facts!.floorDate}\n  ${colleagueId} stood at ${before.total.toFixed(3)} with a favor worth ${favor.toFixed(3)}; first answer ${first.move}; the player's ${asked.line.move}; last answer ${answer}; reply ${replyId}\n  at the roll ${vote.vote} with ${vote.position.total.toFixed(3)}; bill ${billOf(api, billId).status}\n  said: ${[setup!, scene.talk.state, first, asked.line, ...(asked.next?.lines ?? [])].map((l) => `${l.speaker}: ${l.text}`).join(" / ")}\n`,
      );
      return;
    }
    tried.push(
      `${where}: drafted ${drafted.length}; ${asks.length} asks by the player in ${MOST_DAYS} days, none reaching a roll call`,
    );
  }
  expect.fail(`seed ${seed}: ${tried.join("; ")}`);
}, 3_600_000);
