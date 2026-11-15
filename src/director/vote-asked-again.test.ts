/**
 * The player asks a colleague for their vote a second time (#9369; Account
 * lead, Nov 15: a second ask reads the first from the record and never plays
 * it again word for word). The evening before the roll on the player's bill,
 * the colleague the player asked on an earlier bill on the same question, who
 * voted no on it, is asked again: the opening says they voted against the
 * player's last bill on it, every no says it was asked before, and a second
 * no is let go, never pressed a third time. Pinned to a place whose record
 * holds such a second ask.
 */
import { expect, it } from "vitest";
import { billStage, chooseOwnVote } from "../bench/bill-stage";
import { seatAct, seatView } from "../bench/legislature";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  billOf,
  floorAgendaOn,
  memberKey,
  memberPosition,
  members,
  votesOn,
} from "../core2/modules/legislature";
import { townSeats } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import type { CoreEventInput, PersonId } from "../core2/types";
import sceneBank from "../../data/english/parts/scene-talk.json" with { type: "json" };
import { questionSaid } from "../english/question-names";
import { purposeScene, replyInScene } from "./purpose-scene";

/**
 * Banks, Idaho: a town board; the second ask comes on 2025-03-03, before the
 * roll on the redrafted bill, and no colleague there drafts a bill of their
 * own in a played year, so nothing the player did for them is on the record.
 * Wilmont, Minnesota: the state House; seat 47B drafts HF 66 in the world's
 * own running, the player votes yes on it through their seat (2025-02-24),
 * and asks 47B again for a vote on 2025-05-11 (found by a probe outside the
 * test, Nov 15: four places, a colleague's own bill the player voted for and
 * that colleague later asked; Manteca, Wiggins and Parrottsville, Tennessee
 * held none in 300 days).
 */
const PINS = [
  {
    name: "Banks, Idaho",
    place: () => drawPlace("probe-va-0", "player-asks-for-a-vote"),
    state: false,
    drafts: 6,
    mostDays: 120,
    backing: false,
  },
  {
    name: "Wilmont, Minnesota",
    place: () => ({
      name: "Wilmont, Minnesota",
      key: "2770582",
      seed: "2cb5aaf15d55f6b06548834319221a87402931e3d1570c6e674f546d2ff2025f",
    }),
    state: true,
    drafts: Infinity,
    mostDays: 140,
    backing: true,
  },
] as const;

function readsAskedBefore(key: string): boolean {
  return (
    (
      sceneBank as unknown as {
        parts: { key: string; uses?: { requiresFacts?: string[] }[] }[];
      }
    ).parts
      .find((part) => part.key === key)
      ?.uses?.some((use) => use.requiresFacts?.includes("asked-before")) ??
    false
  );
}

/** A member's position on a bill, term by term, as printed beside a talk. */
function termsOf(position: Readonly<Record<string, unknown>>): string {
  return Object.entries(position)
    .filter(
      ([key, value]) =>
        typeof value === "number" && value !== 0 && key !== "openingViews",
    )
    .map(([key, value]) => `${key} ${(value as number).toFixed(2)}`)
    .join(", ");
}

/** A talk as the player plays it, the player's choices under "You say:". */
function playedTalk(
  talk: {
    narration: readonly { text: string }[];
    state: { speaker: string; text: string };
    tree: {
      lines: readonly { speaker: string; text: string }[];
      replies: readonly {
        line: { text: string };
        next?: { lines: readonly { speaker: string; text: string }[] };
      }[];
    };
  },
  taken?: number,
): string {
  return [
    ...talk.narration.map((l) => `  ${l.text}`),
    `  ${talk.state.speaker}: ${talk.state.text}`,
    ...talk.tree.lines.map((l) => `  ${l.speaker}: ${l.text}`),
    "  You say:",
    ...talk.tree.replies.flatMap((reply, index) => [
      `    ${index + 1}. ${reply.line.text}${index === taken ? "  (taken)" : ""}`,
      ...(reply.next?.lines.map((l) => `       ${l.speaker}: ${l.text}`) ?? []),
    ]),
  ].join("\n");
}

for (const pin of PINS)
  it(
    `a colleague asked again for their vote says they were asked before (${pin.name})`,
    { timeout: 300_000 },
    () => {
      const place = pin.place();
      expect(place.name).toBe(pin.name);
      const where = `${place.name} (${place.key}), world seed ${place.seed}`;
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
      const body = [
        ...new Map(
          townSeats(api)
            .filter(
              (row) =>
                (pin.state
                  ? row.office.level === "state" &&
                    row.office.kind.startsWith("legislature-")
                  : ["city", "county", "township"].includes(
                      row.office.level,
                    )) && full(row.office.id).length > 2,
            )
            .map((row) => [row.office.id, row.office] as const),
        ).values(),
      ].sort((a, b) => full(b.id).length - full(a.id).length)[0]!;
      const seated = full(body.id);
      core.playerId = seated[0]! as PersonId;
      const player = core.playerId;
      for (const id of pin.state ? [player] : seated) {
        core.focusPersonIds.add(id as PersonId);
        director.watch(core, id as PersonId);
      }
      const asks: CoreEventInput[] = [];
      api.subscribeEvents("vote-asked-again", ["vote-ahead"], (_, e) => {
        if (e.facts?.askerId === player) asks.push(e);
      });
      const draft = (question: string) => {
        try {
          seatAct(core, player, {
            kind: "draft",
            officeId: body.id,
            question,
            value: 1,
          });
        } catch {
          // A question the body cannot take now is passed over.
        }
      };
      const questions = seatView(core, player).questions;
      for (const question of questions.slice(0, pin.drafts)) draft(question);
      // After a roll where a colleague the player asked voted no, the player
      // drafts again on that question.
      const firstTalks = new Map<string, string>();
      const redrafted = new Set<string>();
      const checked = new Set<string>();
      let played = 0;
      let backed = 0;
      const deferred: { billId: string; colleague: string }[] = [];
      const told = new Set<string>();
      // The player votes yes, through their own seat, on every colleague's own
      // bill as it comes to the floor: what a plea may later say they did.
      const votedFor = new Set<string>();
      for (
        let day = 1;
        day <= pin.mostDays &&
        (!played || told.size < deferred.length || (pin.backing && !backed));
        day += 1
      ) {
        for (const ahead of [0, 1])
          for (const bill of floorAgendaOn(
            api,
            makeIsoDate(addDays(makeIsoDate(core.date), ahead)),
          )) {
            if (bill.sponsorId === player || votedFor.has(bill.id)) continue;
            if (!billStage(core, bill.id, player).yours.mayChoose) continue;
            chooseOwnVote(core, bill.id, "yes");
            votedFor.add(bill.id);
          }
        advanceCore(core, addDays(makeIsoDate(gameStartDate()), day));
        // What came of a not-yet the player left open: their vote at the roll.
        for (const { billId, colleague } of deferred) {
          const vote = votesOn(api, billId).find(
            (row) => row.memberId === colleague,
          )?.vote;
          if (!vote || told.has(billId + colleague)) continue;
          told.add(billId + colleague);
          process.stdout.write(
            `VOTE AFTER ${where} ${colleague} on ${billOf(api, billId)?.number}: at the roll, ${vote}\n`,
          );
        }
        for (const e of asks) {
          const billId = String(e.facts!.billId);
          const question = billOf(api, billId)?.provisions[0]?.question;
          const vote = votesOn(api, billId).find(
            (v) => v.memberId === e.facts!.askedId,
          );
          if (vote?.vote === "no" && question && !redrafted.has(question)) {
            redrafted.add(question);
            draft(question);
          }
        }
        for (const e of asks) {
          if (checked.has(e.id) || String(e.facts?.floorDate) <= core.date)
            continue;
          checked.add(e.id);
          const book = director.ledger.people.get(player)!;
          const entry = book.schedule.find((row) =>
            row.momentId.includes(e.id),
          );
          if (!entry) continue;
          const result = purposeScene(core, director, player, entry, {
            typeKey: "vote-sought",
          });
          if (result?.kind !== "composed") continue;
          const colleague = String(e.facts!.askedId);
          if (!result.scene.facts.some((row) => row.key === "asked-before")) {
            firstTalks.set(colleague, playedTalk(result.scene.talk));
            continue;
          }
          // The vote they cast on the bill they were asked about before, from
          // the roll call, so the second ask can be checked against it.
          const before = asks.find(
            (row) =>
              row.facts?.askedId === colleague &&
              String(row.facts?.floorDate) < String(e.facts?.floorDate),
          );
          const beforeBill =
            before && billOf(api, String(before.facts!.billId));
          const cast = before
            ? votesOn(api, String(before.facts!.billId)).find(
                (v) => v.memberId === colleague,
              )?.vote
            : undefined;
          const subject = beforeBill?.provisions[0]?.question;
          const backing = result.scene.facts.some(
            (row) => row.key === "read-favor-given",
          );
          if (backing) backed += 1;
          played += 1;
          const talk = result.scene.talk;
          // Where they stand on the bill they voted down and on this one,
          // term by term: what moved, if anything, between the two.
          const billId = String(e.facts!.billId);
          const then = memberPosition(
            api,
            String(before!.facts!.billId),
            colleague,
          );
          const now = memberPosition(api, billId, colleague);
          // Their not-yet left open, where it is offered: the player defers
          // to them (or, with their bill's yes behind the player, pleads),
          // and their vote at the roll is what comes of it.
          const pick = (move: string) =>
            talk.tree.replies.findIndex((reply) => reply.line.move === move);
          const defer =
            backing && pick("plea") >= 0 ? pick("plea") : pick("defer");
          if (defer >= 0) {
            expect(
              replyInScene(core, director, player, entry, [defer], {
                typeKey: "vote-sought",
              }),
              `${where}: the reply is recorded`,
            ).toBeTruthy();
            deferred.push({ billId, colleague });
          }
          process.stdout.write(
            `VOTE FIRST ASK ${where} ${colleague} (their vote at the roll: ${cast ?? "none"} on ${beforeBill?.number ?? "?"}, a bill on ${subject ? questionSaid(subject) : "?"})\n${firstTalks.get(colleague) ?? ""}\nVOTE ASKED AGAIN ${where} ${core.date} (the player's yes on a bill of theirs on the record: ${backing ? "yes" : "no"})\n   terms on the bill they voted down: ${termsOf(then)}\n   terms on this bill: ${termsOf(now)}\n${playedTalk(talk, defer >= 0 ? defer : undefined)}\n`,
          );
          expect(
            readsAskedBefore(talk.narration[0]!.parts[0]!),
            `${where}: ${talk.narration[0]!.text}`,
          ).toBe(true);
          // Every no to the ask itself, or to asking again, says it was asked
          // before (a no to staying out of the room answers that ask instead).
          const noes = [
            talk.tree.lines[0]!,
            ...talk.tree.replies
              .filter((reply) => ["plea", "press"].includes(reply.line.move))
              .flatMap((reply) => reply.next?.lines ?? []),
          ].filter((line) => line.move === "refuse");
          for (const line of noes)
            expect(
              readsAskedBefore(line.parts[0]!),
              `${where}: ${line.text}`,
            ).toBe(true);
          // A plea that claims a past act is offered only where the record
          // holds the player's yes on a bill of theirs.
          if (!backing)
            expect(
              talk.tree.replies.map((reply) => reply.line.move),
              where,
            ).not.toContain("plea");
          if (talk.tree.lines[0]!.move === "refuse")
            expect(
              talk.tree.replies.map((reply) => reply.line.move),
              where,
            ).toEqual(["accept"]);
        }
      }
      expect(played, `${where}: no second ask played`).toBeGreaterThan(0);
      if (pin.backing)
        expect(
          backed,
          `${where}: a second ask with the player's yes behind it`,
        ).toBeGreaterThan(0);
    },
  );
