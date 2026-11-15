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
import { seatAct, seatView } from "../bench/legislature";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  billOf,
  castMemberVote,
  memberKey,
  members,
  votesOn,
} from "../core2/modules/legislature";
import { townSeats } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import type { CoreEventInput, PersonId } from "../core2/types";
import sceneBank from "../../data/english/parts/scene-talk.json" with { type: "json" };
import { questionSaid } from "../english/question-names";
import { purposeScene } from "./purpose-scene";

/** Banks, Idaho: the second ask comes on 2025-03-03, before the roll on the redrafted bill. */
const PIN = { drawSeed: "probe-va-0", name: "Banks, Idaho" } as const;
/** Days played at most; the second ask falls in the first quarter. */
const MOST_DAYS = 120;

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

/** A talk as the player plays it, the player's choices under "You say:". */
function playedTalk(talk: {
  narration: readonly { text: string }[];
  state: { speaker: string; text: string };
  tree: {
    lines: readonly { speaker: string; text: string }[];
    replies: readonly {
      line: { text: string };
      next?: { lines: readonly { speaker: string; text: string }[] };
    }[];
  };
}): string {
  return [
    ...talk.narration.map((l) => `  ${l.text}`),
    `  ${talk.state.speaker}: ${talk.state.text}`,
    ...talk.tree.lines.map((l) => `  ${l.speaker}: ${l.text}`),
    "  You say:",
    ...talk.tree.replies.flatMap((reply, index) => [
      `    ${index + 1}. ${reply.line.text}`,
      ...(reply.next?.lines.map((l) => `       ${l.speaker}: ${l.text}`) ?? []),
    ]),
  ].join("\n");
}

/**
 * Which colleagues the player backed before (a yes on a bill of their own):
 * every other one from the first or from the second, so each colleague asked
 * again is played once backed and once not (Words lead, Nov 15).
 */
const BACKED = [
  { name: "the first of each pair backed", parity: 0 },
  { name: "the second of each pair backed", parity: 1 },
] as const;

for (const backed of BACKED)
  it(
    `a colleague asked again for their vote says they were asked before (${PIN.name}, ${PIN.drawSeed}, ${backed.name})`,
    { timeout: 300_000 },
    () => {
      const place = drawPlace(PIN.drawSeed, "player-asks-for-a-vote");
      expect(place.name).toBe(PIN.name);
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
                ["city", "county", "township"].includes(row.office.level) &&
                full(row.office.id).length > 2,
            )
            .map((row) => [row.office.id, row.office] as const),
        ).values(),
      ].sort((a, b) => full(b.id).length - full(a.id).length)[0]!;
      const seated = full(body.id);
      core.playerId = seated[0]! as PersonId;
      const player = core.playerId;
      for (const id of seated) {
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
      for (const question of questions.slice(0, 6)) draft(question);
      // Every other colleague has a bill of their own at the first sitting, and
      // the player votes yes on it: a time the player backed them, which a plea
      // on a second ask may say (Words lead, Nov 15). The rest have none.
      for (const [at, colleague] of seated.slice(1).entries()) {
        if (at % 2 !== backed.parity) continue;
        try {
          const theirs = seatAct(core, colleague, {
            kind: "draft",
            officeId: body.id,
            question: questions.at(-1 - at)!,
            value: 1,
          }) as { id: string };
          castMemberVote(api, theirs.id, player, "yes");
        } catch {
          // A bill the body cannot pass is not drafted.
        }
      }
      // After a roll where a colleague the player asked voted no, the player
      // drafts again on that question.
      const firstTalks = new Map<string, string>();
      const redrafted = new Set<string>();
      const checked = new Set<string>();
      let played = 0;
      for (let day = 1; day <= MOST_DAYS && !played; day += 1) {
        advanceCore(core, addDays(makeIsoDate(gameStartDate()), day));
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
          played += 1;
          const talk = result.scene.talk;
          process.stdout.write(
            `VOTE FIRST ASK ${where} ${colleague} (their vote at the roll: ${cast ?? "none"} on ${beforeBill?.number ?? "?"}, a bill on ${subject ? questionSaid(subject) : "?"})\n${firstTalks.get(colleague) ?? ""}\nVOTE ASKED AGAIN ${where} ${core.date} (the player's yes on a bill of theirs on the record: ${backing ? "yes" : "no"})\n${playedTalk(talk)}\n`,
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
    },
  );
