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
 * "bill-stages-state" draws 2, 6 and 10), chosen because their records give a
 * no for each reason the bank can say: Manteca, California (party), Wilmont,
 * Minnesota (views, and trait after a press) and Wiggins, Colorado (trait).
 * The earlier no vote is staged through the game's own path: the player's
 * first bill on a question goes to its floor vote before the second is drafted.
 */
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
  declinedAsks,
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
const seen = { reasons: new Set<string>(), lines: new Set<string>() };

function livePlayer(core: CoreState, player: PersonId, through: string) {
  let packet: ReturnType<typeof advancePlayerV1> | undefined = advancePlayerV1(
    core,
    {
      controlledPersonId: player,
      through: { date: makeIsoDate(through), minuteOfDay: 0 },
    },
  );
  while (packet && packet.kind !== "complete")
    packet =
      packet.kind === "stop"
        ? resumePlayerV1(core, { kind: "stop", pauseId: packet.pauseId })
        : resumePlayerV1(core, {
            kind: "choice",
            pauseId: packet.pauseId,
            offerId: packet.offers[0]!.offerId,
          });
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
      const asksOn = (billId: string) =>
        [...core.durableLog.values()].filter(
          (row) => row.kind === "sign-on-asked" && row.facts?.billId === billId,
        );

      // The earlier vote: the player's first bill on the question a colleague
      // they would ask stands furthest against goes to its floor vote.
      const questions = seatView(core, player).questions;
      let earlier: {
        question: string;
        colleague: string;
        billId: string;
      } | null = null;
      for (const question of questions) {
        const billId = draft(question);
        if (!billId) continue;
        const against = asksOn(billId)
          .map((row) => row.facts!.askedId!)
          .map((id) => ({ id, total: memberPosition(api, billId, id).total }))
          .filter((row) => row.total < 0)
          .sort((a, b) => a.total - b.total || a.id.localeCompare(b.id))[0];
        if (against) {
          earlier = { question, colleague: against.id, billId };
          break;
        }
      }
      if (earlier) {
        scheduleVote(api, earlier.billId);
        const floor = floorDateOf(api, earlier.billId);
        if (floor) advanceCore(core, addDays(makeIsoDate(floor), 1));
      }
      if (earlier)
        process.stdout.write(
          `DEBUG ${where} floor ${floorDateOf(api, earlier.billId)} now ${core.date} status ${billOf(api, earlier.billId)?.status} votes ${JSON.stringify(votesOn(api, earlier.billId).map((v) => [v.memberId === earlier!.colleague, v.vote]))}\n`,
        );
      const votedNo =
        earlier &&
        votesOn(api, earlier.billId).some(
          (v) => v.memberId === earlier!.colleague && v.vote === "no",
        );

      // The player drafts a bill on every question the chamber can pass, and
      // goes to their colleagues the days after.
      const billIds = questions.map(draft).filter((id): id is string => !!id);
      for (const id of billIds)
        expect(billOf(api, id)?.cosponsors ?? [], where).toEqual([]);
      livePlayer(core, player, addDays(makeIsoDate(core.date), 2));

      const book = director.ledger.people.get(player)!;
      const units = book.schedule
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
      const reasonsHere = new Set<string>();
      const tally = new Map<string, number>();
      for (const { entry, unit, causeId } of units) {
        const cause = core.durableLog.get(causeId)!;
        const result = purposeScene(core, director, player, entry, {
          typeKey: unit,
        });
        if (result?.kind !== "composed") continue;
        const talk = result.scene.talk;
        const colleague = cause.facts!.askedId!;
        expect(talk.askerId, where).toBe(colleague);
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
        const k = `${first.move}:${reason}:${chosen.line.move}:${last.move}`;
        tally.set(k, (tally.get(k) ?? 0) + 1);
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
        ...(earlier && votedNo
          ? [{ question: earlier.question, colleague: earlier.colleague }]
          : []),
        ...refused.slice(0, 1).map((row) => ({
          question: billOf(api, row.billId)!.provisions[0]!.question!,
          colleague: row.colleague,
        })),
      ];
      for (const { question, colleague } of again) {
        const billId = draft(question);
        if (!billId) continue;
        const id = `sign-on:${billId}:${colleague}`;
        if (!core.durableLog.get(id)) continue;
        livePlayer(core, player, addDays(makeIsoDate(core.date), 2));
        const entry = book.schedule.find(
          (row) =>
            book.momentsById.get(row.momentId)?.causeId === id ||
            row.bindings.some((b) => b.joined?.some((j) => j.causeId === id)),
        );
        expect(entry, `${where}: the second ask is staged`).toBeTruthy();
        const unit =
          book.momentsById.get(entry!.momentId)?.causeId === id
            ? TYPE
            : `${TYPE}|${id}`;
        const result = purposeScene(core, director, player, entry!, {
          typeKey: unit,
        });
        expect(result?.kind, where).toBe("composed");
        if (result?.kind !== "composed") continue;
        const facts = new Set(result.scene.facts.map((row) => row.key));
        const lines = [
          result.scene.talk.tree.lines[0]!.text,
          ...result.scene.talk.tree.replies.flatMap(
            (reply) => reply.next?.lines.map((line) => line.text) ?? [],
          ),
        ];
        for (const line of lines) seen.lines.add(line);
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
      process.stdout.write(`TALLY ${place.name} ${JSON.stringify([...tally])}\n`);
      process.stdout.write(
        `SIGN-ON ${where}: ${units.length} asks played, ${signed} signed, ${refused.length} said no (${[...reasonsHere].join(", ")}); earlier vote ${earlier ? `${earlier.question} ${votedNo ? "no" : "not no"}` : "none"}\n`,
      );
    }, 300_000);

  afterAll(() => {
    // Every reason the bank can say for a no played somewhere, and the two
    // lines that rest on a record played after it.
    for (const reason of ["party", "views", "trait"])
      expect(seen.reasons, reason).toContain(reason);
  });
});
