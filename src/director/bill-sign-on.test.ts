/**
 * The player asks colleagues to sign on to a bill they drafted (brief V,
 * stage 2). Drafting writes one ask per colleague the player knows
 * (legislature.ts askToSignOn); the director stages each as the player's own
 * ask; the colleague answers from where they stand on the bill and what a
 * favor to the player is worth to them, a no says the reason the record
 * holds (never a deal, a lobby or a bribe), and a yes puts their name on the
 * bill, which the committee chair weighs in deciding to hear it (chairHears).
 * Asked again on the same question, a colleague who said no knows it; one who
 * voted no on the question before says so, from that vote.
 *
 * Pinned to three drawn places and their world seeds (drawPlace from
 * "bill-stages-state" draws 2, 6 and 10): Manteca, California, Wilmont,
 * Minnesota and Wiggins, Colorado. Together they give a no for every reason
 * the bank can say. The earlier no votes are staged through the game's own
 * path: the player's first bills, one on every question, go to the floor at
 * the chamber's next sitting before the second round is drafted.
 */
import { stateFloorHolds, voteOnStateFloor } from "../core2/office-day-state";
import { afterAll, describe, expect, it } from "vitest";
import { seatAct, seatView } from "../bench/legislature";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  billOf,
  chairHears,
  committeeRecords,
  declinedAsks,
  favorWorth,
  floorDateOf,
  memberKey,
  memberPosition,
  members,
  obligationsOf,
  scheduleVote,
  votesOn,
} from "../core2/modules/legislature";
import { townSeats } from "../core2/modules/offices";
import { advancePlayerV1, resumePlayerV1 } from "../core2/player-v1";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import sceneBank from "../../data/english/parts/scene-talk.json" with { type: "json" };
import { purposeScene, replyInScene } from "./purpose-scene";

const PLACES = [
  {
    name: "Manteca, California",
    key: "0645484",
    seed: "1d3c1565675eb7fdaa5cce928aac0adfa8c285360d51afaa62df423d33dbbfae",
  },
  {
    name: "Wilmont, Minnesota",
    key: "2770582",
    seed: "2cb5aaf15d55f6b06548834319221a87402931e3d1570c6e674f546d2ff2025f",
  },
  {
    name: "Wiggins, Colorado",
    key: "0884770",
    seed: "ae49513e298f622a71fda8adda6349ac0c00be6118d727dfce1779fc3546f57a",
  },
] as const;
const TYPE = "bill-sign-on";
/** What the three places played, together: the reasons said for a no, and the lines that need a record. */
/** Colleagues who said no that each place asks again, so every second-ask line plays. */
const AGAIN = 3;

/** Whether a bank piece is placed by the record of an earlier ask. */
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

/** A talk as the player plays it: what each says, the player's choices under "You say:". */
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
    ...talk.narration.map((line) => `  ${line.text}`),
    `  ${talk.state.speaker}: ${talk.state.text}`,
    ...talk.tree.lines.map((line) => `  ${line.speaker}: ${line.text}`),
    "  You say:",
    ...talk.tree.replies.flatMap((reply, index) => [
      `    ${index + 1}. ${reply.line.text}${index === taken ? "  (taken)" : ""}`,
      ...(reply.next?.lines.map(
        (line) => `       ${line.speaker}: ${line.text}`,
      ) ?? []),
    ]),
  ].join("\n");
}

const seen = {
  reasons: new Set<string>(),
  lines: new Set<string>(),
  votedBefore: 0,
  askedAgain: 0,
  deferred: 0,
};

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

function livePlayer(core: CoreState, player: PersonId, through: string) {
  let packet: ReturnType<typeof advancePlayerV1> | undefined = advancePlayerV1(
    core,
    {
      controlledPersonId: player,
      through: { date: makeIsoDate(through), minuteOfDay: 0 },
    },
  );
  while (packet && packet.kind !== "complete") {
    if (packet.kind === "stop")
      // A roll the player sits for holds their clock until they vote: the
      // player answers through the floor's own call, leaving it to their
      // character's own position.
      for (const billId of stateFloorHolds(coreAPI(core)))
        voteOnStateFloor(coreAPI(core), player, billId, "own");
    packet =
      packet.kind === "stop"
        ? resumePlayerV1(core, { kind: "stop", pauseId: packet.pauseId })
        : resumePlayerV1(core, {
            kind: "choice",
            pauseId: packet.pauseId,
            offerId: packet.offers[0]!.offerId,
          });
  }
}

describe("asking colleagues to sign on", () => {
  for (const place of PLACES)
    it(`the player asks, the colleague answers from the record, and a yes is a name the chair weighs (${place.name})`, () => {
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
                row.office.level === "state" &&
                row.office.kind.startsWith("legislature-") &&
                full(row.office.id).length > 2,
            )
            .map((row) => [row.office.id, row.office] as const),
        ).values(),
      ].sort((a, b) => full(b.id).length - full(a.id).length)[0];
      expect(body, `${where}: a state chamber`).toBeTruthy();
      const player = full(body!.id)[0]! as PersonId;
      core.playerId = player;
      director.watch(core, player);
      const draft = (question: string) => {
        const drafted = seatAct(core, player, {
          kind: "draft",
          officeId: body!.id,
          question,
          value: 1,
        }) as { id: string };
        return billOf(api, drafted.id)?.authority.some((row) => !row.allowed)
          ? null
          : drafted.id;
      };
      // The earlier votes: the player's first bills, one on every question
      // the chamber can pass, go to the floor of the session's next sitting
      // (a bill the committee holds dies there, as it does in play).
      const questions = seatView(core, player).questions;
      const earlier = questions.map(draft).filter((id): id is string => !!id);
      for (const id of earlier) scheduleVote(api, id);
      const floor = earlier
        .map((id) => floorDateOf(api, id))
        .filter((date): date is string => !!date)
        .sort()
        .at(-1);
      expect(floor, `${where}: the bills have a sitting`).toBeTruthy();
      advanceCore(core, addDays(makeIsoDate(floor!), 1));
      const votedNo = new Set(
        earlier.flatMap((id) =>
          votesOn(api, id)
            .filter((v) => v.vote === "no")
            .map(
              (v) =>
                `${billOf(api, id)!.provisions[0]!.question}|${v.memberId}`,
            ),
        ),
      );

      // The player drafts a bill on every question the chamber can pass, and
      // goes to their colleagues the days after.
      const billIds = questions.map(draft).filter((id): id is string => !!id);
      for (const id of billIds)
        expect(billOf(api, id)?.cosponsors ?? [], where).toEqual([]);
      livePlayer(core, player, addDays(makeIsoDate(core.date), 2));

      const book = director.ledger.people.get(player)!;
      const staged = () =>
        book.schedule
          .filter((row) => row.bindings.some((b) => b.typeKey === TYPE))
          .flatMap((entry) => {
            const moment = book.momentsById.get(entry.momentId)!;
            const binding = entry.bindings.find((row) => row.typeKey === TYPE)!;
            return [
              { entry, unit: TYPE, causeId: moment.causeId },
              ...(binding.joined ?? []).map((row) => ({
                entry,
                unit: `${TYPE}|${row.causeId}`,
                causeId: row.causeId,
              })),
            ];
          });
      const units = staged();
      // The asks on the bills drafted before the earlier vote were played in
      // the days the test skipped; these are the asks on the new drafts.
      const fresh = new Set(billIds);
      units.splice(
        0,
        units.length,
        ...units.filter((row) =>
          fresh.has(core.durableLog.get(row.causeId)?.facts?.billId ?? ""),
        ),
      );
      expect(units.length, `${where}: the asks are staged`).toBeGreaterThan(0);
      let signed = 0;
      const refused: { billId: string; colleague: string }[] = [];
      const deferred: { billId: string; colleague: string }[] = [];
      const firstTalks = new Map<string, string>();
      const reasonsHere = new Set<string>();
      for (const { entry, unit, causeId } of units) {
        const cause = core.durableLog.get(causeId)!;
        const result = purposeScene(core, director, player, entry, {
          typeKey: unit,
        });
        if (result?.kind !== "composed") continue;
        const talk = result.scene.talk;
        const colleague = cause.facts!.askedId!;
        expect(talk.askerId, where).toBe(colleague);
        // The narration names the colleague the player goes to, never the
        // player. Two people can share a given name (at Wiggins the player
        // and a colleague are both James), and then the name alone cannot
        // tell which one the line means.
        const theirs = core.people.get(colleague as PersonId)!.givenName;
        const mine = core.people.get(player)!.givenName;
        expect(talk.narration[0]!.text, where).toContain(theirs);
        if (mine !== theirs)
          expect(talk.narration[0]!.text, where).not.toContain(mine);
        const said: string[] = [talk.state.text];
        const walk = (node: typeof talk.tree | null) => {
          if (!node) return;
          for (const line of node.lines) said.push(line.text);
          for (const reply of node.replies) {
            said.push(reply.line.text);
            walk(reply.next);
          }
        };
        walk(talk.tree);
        for (const text of said)
          expect(text, `${where}: no figure`).not.toMatch(/\d/);
        const reason = result.scene.facts
          .find((row) => row.key.startsWith("no-"))
          ?.key.slice("no-".length);
        // A no vote on the question before is said only from that vote.
        const question = billOf(api, cause.facts!.billId!)!.provisions[0]!
          .question;
        const keys = new Set(result.scene.facts.map((row) => row.key));
        expect(keys.has("voted-against-before"), where).toBe(
          votedNo.has(`${question}|${colleague}`),
        );
        if (keys.has("voted-against-before")) seen.votedBefore += 1;
        const first = talk.tree.lines[0]!;
        const pick = (move: string) =>
          talk.tree.replies.findIndex((reply) => reply.line.move === move);
        // A yes is thanked; a not-yet whose reason has not yet been heard as a
        // no is pressed (so the no says it), else pleaded; a no is let go.
        const path =
          first.move === "agree"
            ? pick("thank")
            : first.move === "stall"
              ? !reasonsHere.has(reason ?? "") && pick("press") >= 0
                ? pick("press")
                : pick("plea") >= 0
                  ? pick("plea")
                  : 0
              : pick("accept") >= 0
                ? pick("accept")
                : 0;
        const chosen = talk.tree.replies[path]!;
        firstTalks.set(
          cause.facts!.billId! + "|" + colleague,
          playedTalk(talk, path),
        );
        const last = chosen.next?.lines.at(-1) ?? first;
        const heard = [
          talk.state.text,
          first.text,
          chosen.line.text,
          ...(chosen.next?.lines.map((line) => line.text) ?? []),
        ];
        const replyId = replyInScene(core, director, player, entry, [path], {
          typeKey: unit,
        });
        expect(replyId, `${where}: the reply is recorded`).toBeTruthy();
        const bill = billOf(api, cause.facts!.billId!)!;
        if (["agree", "relent", "accept"].includes(last.move)) {
          expect(bill.cosponsors, where).toContain(colleague);
          signed += 1;
          // A yes won by a plea is a favor the colleague can call in.
          if (chosen.line.move === "plea")
            expect(
              obligationsOf(api, player).some(
                (row) => row.owedTo === colleague && row.billId === bill.id,
              ),
              `${where}: the favor is owed`,
            ).toBe(true);
        } else if (last.move === "refuse") {
          expect(bill.cosponsors ?? [], where).not.toContain(colleague);
          refused.push({ billId: bill.id, colleague });
          seen.lines.add(last.text);
          if (reason && !reasonsHere.has(reason))
            process.stdout.write(
              `SIGN-ON ${where} no (${reason}): ${heard.join(" / ")}\n`,
            );
          if (reason) {
            reasonsHere.add(reason);
            seen.reasons.add(reason);
          }
        }
      }
      for (const row of refused)
        expect(
          declinedAsks(api, player, row.colleague, body!.id, "sign-on").length,
          `${where}: the no is kept`,
        ).toBeGreaterThan(0);

      // Asked again on the same question: the colleague who said no knows it,
      // and the one who voted no before says so.
      const again = [
        ...refused.slice(0, AGAIN).map((row) => ({
          question: billOf(api, row.billId)!.provisions[0]!.question!,
          colleague: row.colleague,
        })),
      ];
      for (const { question, colleague } of again) {
        // The earlier ask on this same question, which the second ask reads.
        const firstTalk = refused.find(
          (row) =>
            row.colleague === colleague &&
            billOf(api, row.billId)?.provisions[0]?.question === question,
        );
        if (firstTalk)
          process.stdout.write(
            `SIGN-ON PLAYED ${where} first ask:\n${firstTalks.get(firstTalk.billId + "|" + colleague) ?? ""}\n`,
          );
        const billId = draft(question);
        if (!billId) continue;
        const id = `sign-on:${billId}:${colleague}`;
        if (!core.durableLog.get(id)) continue;
        livePlayer(core, player, addDays(makeIsoDate(core.date), 2));
        const found = staged().find((row) => row.causeId === id);
        // The player's own ask is not held by a season count: the record
        // limits it (scheduling.ts pressedByPlayer), so the second ask plays.
        expect(found, `${where}: the second ask is staged`).toBeTruthy();
        const { entry, unit } = found!;
        const result = purposeScene(core, director, player, entry, {
          typeKey: unit,
        });
        expect(
          result?.kind,
          `${where}: ${result && "reason" in result ? String(result.reason) : ""}`,
        ).toBe("composed");
        if (result?.kind !== "composed") continue;
        const facts = new Set(result.scene.facts.map((row) => row.key));
        const talk = result.scene.talk;
        const lines = [
          talk.tree.lines[0]!.text,
          ...talk.tree.replies.flatMap(
            (reply) => reply.next?.lines.map((line) => line.text) ?? [],
          ),
        ];
        for (const line of lines) seen.lines.add(line);
        // The second ask reads the first from the record: the opening, the
        // player's ask and every no say it was asked before, and a second no
        // is let go, never pressed a third time.
        expect(facts.has("asked-before"), where).toBe(true);
        seen.askedAgain += 1;
        const saysBefore = (line: { parts: readonly string[] }) =>
          readsAskedBefore(line.parts[0]!);
        expect(saysBefore(talk.narration[0]!), talk.narration[0]!.text).toBe(
          true,
        );
        expect(saysBefore(talk.state), talk.state.text).toBe(true);
        const theirs = [
          talk.tree.lines[0]!,
          ...talk.tree.replies.flatMap((reply) => reply.next?.lines ?? []),
        ];
        for (const line of theirs.filter((row) => row.move === "refuse"))
          expect(saysBefore(line), `${where}: ${line.text}`).toBe(true);
        if (talk.tree.lines[0]!.move === "refuse")
          expect(
            talk.tree.replies.map((reply) => reply.line.move),
            where,
          ).toEqual(["accept"]);
        // A plea that claims a past act is offered only where the record
        // holds the player's yes on a bill of theirs.
        const backing = facts.has("read-favor-given");
        if (!backing)
          expect(
            talk.tree.replies.map((reply) => reply.line.move),
            where,
          ).not.toContain("plea");
        // Where they stood on the bill they turned down (kept with the no)
        // and where they stand on this one, term by term: what moved, if
        // anything, between the two answers.
        const no = declinedAsks(api, player, colleague, body!.id, "sign-on")
          .filter((row) =>
            row.provisions.some((other) => other.question === question),
          )
          .at(-1)!;
        const then = { ...no.position, favor: no.standing };
        const now = {
          ...memberPosition(api, billId, colleague),
          favor: favorWorth(api, colleague, player),
        };
        // Their not-yet left open, where it is offered: the player defers to
        // them, and what comes of it is read from the record afterward.
        const defer = talk.tree.replies.findIndex(
          (reply) => reply.line.move === "defer",
        );
        const taken =
          defer >= 0
            ? defer
            : talk.tree.replies.findIndex(
                (reply) => reply.line.move === "accept",
              );
        if (taken >= 0)
          expect(
            replyInScene(core, director, player, entry, [taken], {
              typeKey: unit,
            }),
            `${where}: the reply is recorded`,
          ).toBeTruthy();
        const named = (billOf(api, billId)!.cosponsors ?? []).includes(
          colleague,
        );
        if (defer >= 0) deferred.push({ billId, colleague });
        process.stdout.write(
          `SIGN-ON PLAYED ${where} asked again (the player's yes on a bill of theirs on the record: ${backing ? "yes" : "no"}):\n   terms then (the bill they turned down, and what a favor to the player was worth to them): ${termsOf(then)}\n   terms now (this bill, and the favor now): ${termsOf(now)}\n${playedTalk(talk, taken >= 0 ? taken : undefined)}\n   afterward: their name ${named ? "is" : "is not"} on ${billOf(api, billId)!.number}\n`,
        );
        process.stdout.write(
          `SIGN-ON ${where} asked again (${[...facts].filter((k) => k === "asked-before" || k === "voted-against-before" || k.startsWith("no-")).join(", ")}): ${lines.join(" | ")}\n`,
        );
      }

      // The chair reads the names: what they weigh is on the decision.
      for (const id of billIds) {
        const bill = billOf(api, id)!;
        if (!bill.cosponsors?.length) continue;
        const read = chairHears(api, bill, bill.bodyOfficeId);
        expect(read.cosponsorPull, where).toBeGreaterThanOrEqual(0);
      }
      // What came of a not-yet the player left open: the bill goes to the
      // chamber's next sitting, and the colleague votes there as they stand.
      for (const { billId } of deferred) scheduleVote(api, billId);
      const sitting = deferred
        .map((row) => floorDateOf(api, row.billId))
        .filter((date): date is string => !!date)
        .sort()
        .at(-1);
      if (sitting) livePlayer(core, player, addDays(makeIsoDate(sitting), 1));
      for (const { billId, colleague } of deferred) {
        const bill = billOf(api, billId)!;
        const vote = votesOn(api, billId).find(
          (row) => row.memberId === colleague,
        )?.vote;
        // A bill that never reached the floor stopped in committee: the
        // committee's own record says whether the chair heard it and how
        // the colleague voted there.
        const held = committeeRecords(api, billId).at(-1);
        const there = held
          ? `in committee on ${held.date}: ${held.heard ? `heard, ${held.yes} yes and ${held.no} no, ${held.reported ? "reported" : "not reported"}` : "the chair did not hear it"}${held.votes.some((row) => row.memberId === colleague) ? `, their committee vote ${held.votes.find((row) => row.memberId === colleague)!.vote}` : ""}`
          : "no committee record";
        seen.deferred += 1;
        process.stdout.write(
          `SIGN-ON DEFERRED ${where}: ${core.people.get(colleague as PersonId)!.givenName} on ${bill.number}, at its roll: ${vote ?? "no roll"}; ${there}; ${bill.number} ${bill.status}\n`,
        );
      }
      process.stdout.write(
        `SIGN-ON ${where}: ${units.length} asks played, ${signed} signed, ${refused.length} said no (${[...reasonsHere].join(", ")}); ${earlier.length} earlier bills, ${votedNo.size} no votes on them\n`,
      );
    }, 200_000);

  afterAll(() => {
    // Every reason the bank can say for a no played somewhere, and the two
    // lines that rest on a record played after it.
    for (const reason of ["views", "constituents", "party", "consistency"])
      expect(seen.reasons, reason).toContain(reason);
    expect(seen.votedBefore, "an earlier no vote is said").toBeGreaterThan(0);
    expect(seen.askedAgain, "a second ask knows the first").toBeGreaterThan(0);
  });
});
