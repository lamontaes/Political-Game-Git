/**
 * Promises kept, broken and remembered (Words lead brief T, Nov 14 2026).
 * A scene ending that keeps a promise is kept by the director as a fact held
 * by the one who promised and owed to the other, and it ends kept or broken
 * on the day the record that settles it lands (a missed payment, a talk
 * between the two) or when its window closes; the tie moves once, citing it.
 *
 * Drawn places: each test draws places from all 56 (named in each line it
 * prints) and plays the first that has the case, printing what it passed
 * over. The pay-on-time test advances a drawn place until any borrower the
 * credit engine bills misses a payment and the partnerships engine writes the
 * quarrel over it (`findTownBorrower`, tests/support/real-borrower.ts): the
 * promise engine is one rule for every person (CTO, Nov 17), so the case is
 * whoever the engines name, and the loan and missed payments are the credit
 * engine's own. HAND-STAGED, labeled where they stand: the borrower's choice
 * to promise to pay on time (the reply record, as the apology scene writes
 * it), the hire that brings the new coworker (as meeting-scene.test.ts) and the townsperson met for
 * the meeting ask. From there the scene, the reply, the record that settles
 * the promise and the tie are the engines' own.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { seatAct, seatView } from "../bench/legislature";
import {
  billOf,
  castMemberVote,
  memberKey,
  members,
  votesOn,
} from "../core2/modules/legislature";
import { townSeats } from "../core2/modules/offices";
import { promisesBetween } from "../core2/modules/promises";
import { purposeScene, replyInScene } from "./purpose-scene";
import { LOAN_SEED, findTownBorrower } from "../../tests/support/real-borrower";
import {
  type Check,
  pathTo,
  playPayOnTime,
  talkOf,
} from "../../tests/support/promise-play";

/** Days played in a place at most, one at a time, so the evening before a roll is caught. */
const VOTE_DAYS = 120;

/** A check that holds, as a test assertion. */
const ok: Check = (holds, message) => expect(holds, message).toBe(true);

/** The fixed seed the places are drawn on. */
const SEED = "promises-kept-and-broken-1";
const ATTEMPTS = 4;
/** The vote case: 187.0 s alone and 181.0 s beside the other promise and scene tests (Nov 16, fe04fc42), so about twice the slower. */
const VOTE_TIMEOUT = 375_000;

function world(attempt: number, label: string) {
  const place = drawPlace(SEED, `${label}:${attempt}`);
  const where = `${place.name} (${place.key}), seed ${SEED} draw ${label}:${attempt}, world seed ${place.seed}`;
  const built = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  return { ...built, where };
}

/**
 * The pay test plays the pinned borrower's days about nine months (the loan,
 * the missed payment, the promise's window): 135 seconds alone and 130 beside
 * the file's other cases on Nov 16, so twice the slower.
 *
 * Old premise, re-pinned Nov 16 (Account lead): a borrower who takes work
 * pays the next bill on time, so a second run took the next employer's call
 * and expected the promise kept. It stopped being true with #9532, which
 * more than doubled the living costs a personal loan is sized from (two
 * months of them, creditPersonalMonthsOfCosts): the bill falls on the
 * 1st and the first paycheck after taking work is smaller or later (Ragland:
 * $161 due Sep 1 at $0, first pay $614 on Sep 5). A one-hour hunt on the
 * Train found no played borrower who keeps it, so the kept case is a fault in
 * the world, pool item world-loan-bill-before-first-payday-no-borrower-keeps,
 * and comes back when that item lands.
 */
const PAY_TIMEOUT = 270_000;

it(
  `a promise to pay on time after a money quarrel over a real missed payment is broken by the next one, felt by the one owed (seed ${LOAN_SEED})`,
  () => {
    setBookkeeping(false);
    try {
      // Advance drawn places until a promise to pay on time is broken by the
      // town's own missed payments; a place where every borrower paid on time
      // is named and passed over.
      const passedOver: string[] = [];
      let from = 0;
      let played: string | undefined;
      while (!played) {
        const found = findTownBorrower(from, passedOver);
        const result = playPayOnTime(found, ok);
        if (result.played) {
          played = result.played;
          process.stdout.write(
            `PAY ON TIME (places passed over: ${passedOver.join("; ") || "none"})\n  ${result.passed}\n  ${played}\n`,
          );
        } else {
          passedOver.push(result.passed);
          from = found.nextDraw;
        }
      }
    } finally {
      setBookkeeping(true);
    }
  },
  PAY_TIMEOUT,
);

it(
  `a member's vote promised the evening before the roll is kept or broken by their vote at it (seed ${SEED})`,
  () => {
    setBookkeeping(false);
    const tried: string[] = [];
    const done: string[] = [];
    const bothSeen = () =>
      ["kept", "broken"].every((outcome) =>
        done.some((row) => row.endsWith(`: ${outcome}`)),
      );
    try {
      for (let draw = 0; draw < ATTEMPTS && !bothSeen(); draw += 1) {
        const { core, director, where } = world(draw, "vote");
        const api = coreAPI(core);
        const full = (officeId: string) =>
          members(api, officeId)
            .map(memberKey)
            .filter((mid) => core.people.get(mid)?.alive)
            .sort();
        // The town's largest body with three full-person members or more.
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
        for (const mid of seated) {
          core.focusPersonIds.add(mid as PersonId);
          director.watch(core, mid as PersonId);
        }
        const asks: { id: string; facts: Record<string, unknown> }[] = [];
        api.subscribeEvents("promises-vote-test", ["vote-ahead"], (_, e) => {
          asks.push({ id: e.id, facts: { ...e.facts } });
        });
        const drafted = seatView(core, player)
          .questions.slice(0, 6)
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
        const start = makeIsoDate(core.date);
        for (let day = 1; day <= VOTE_DAYS && !bothSeen(); day += 1) {
          if (core.date < addDays(start, day))
            advanceCore(core, addDays(start, day));
          const ask = asks.find(
            (e) =>
              !checked.has(e.id) &&
              String(e.facts.floorDate) > core.date &&
              billOf(api, String(e.facts.billId)).status === "drafted",
          );
          if (!ask) continue;
          checked.add(ask.id);
          const billId = String(ask.facts.billId);
          // The scene is the asker's or the asked member's, whichever the
          // director staged it for (the player's when they are one of them).
          const staged = [String(ask.facts.askerId), String(ask.facts.askedId)]
            .sort((a, b) => (a === player ? -1 : b === player ? 1 : 0))
            .flatMap((who) => {
              const entry = director.ledger.people
                .get(who as PersonId)
                ?.schedule.find((row) => row.momentId.includes(ask.id));
              const typeKey = entry?.bindings.find((row) =>
                ["vote-sought", "vote-asked"].includes(row.typeKey),
              )?.typeKey;
              return entry && typeKey
                ? [{ who: who as PersonId, entry, typeKey }]
                : [];
            })[0];
          if (!staged) {
            tried.push(`${where}: ${ask.id}: no scene staged`);
            continue;
          }
          const { entry } = staged;
          const composed = purposeScene(core, director, staged.who, entry, {
            typeKey: staged.typeKey,
          });
          if (composed?.kind !== "composed") continue;
          const tree = composed.scene.talk.tree;
          const colleagueId = String(ask.facts.askedId) as PersonId;
          const askerId = String(ask.facts.askerId) as PersonId;
          const path = ["vote-given", "traded", "false-yes"]
            .map((ending) => ({ ending, path: pathTo(tree, ending) }))
            .find((row) => row.path);
          if (!path) {
            tried.push(`${where}: ${ask.id}: ${colleagueId} gives no yes`);
            continue;
          }
          const replyId = replyInScene(
            core,
            director,
            staged.who,
            entry,
            path.path!,
            { typeKey: staged.typeKey },
          )!;
          const reply = core.durableLog.get(replyId)!;
          expect(reply.facts?.promise, where).toBe("vote");
          expect(reply.facts?.["promise-billId"], where).toBe(billId);
          const factId = `promise:${replyId}`;
          const find = () =>
            promisesBetween(coreAPI(core), askerId, colleagueId).find(
              (row) => row.id === factId,
            )!;
          expect(find().holderId, where).toBe(colleagueId);
          expect(find().outcome, where).toBe("open");
          // Once a kept promise is seen, a promise the player made is broken
          // by the player's own vote against the bill (the vote button's
          // castMemberVote): nothing is cast for the player without a press.
          if (
            done.some((row) => row.endsWith(": kept")) &&
            colleagueId === player
          )
            castMemberVote(api, billId, player, "no");
          advanceCore(core, String(ask.facts.floorDate));
          const vote = votesOn(api, billId).find(
            (v) =>
              v.memberId === colleagueId &&
              !(v as { override?: boolean }).override,
          );
          if (!vote) {
            tried.push(`${where}: ${ask.id}: no roll call by the floor date`);
            continue;
          }
          const ended = find();
          expect(ended.outcome, where).toBe(
            vote.vote === "yes" ? "kept" : "broken",
          );
          expect(ended.endedBy, where).toMatch(
            new RegExp(`^bill-vote:${billId}`),
          );
          const said = talkOf(core, director, askerId, colleagueId, where, ok);
          done.push(
            `${where}: ${said}\n    ${factId} (${path.ending}) held by ${colleagueId}, owed to ${askerId} (player ${player}), on ${billId}; voted ${vote.vote} on ${ended.endedAt} by ${ended.endedBy}: ${ended.outcome}`,
          );
        }
        if (!bothSeen())
          tried.push(
            `${where}: drafted ${drafted.length}; ${asks.length} asks, none promised and rolled`,
          );
      }
      expect(
        bothSeen(),
        `Vote promises kept and broken not both seen: ${done.join("; ")}; ${tried.join("; ")}`,
      ).toBe(true);
      process.stdout.write(
        `VOTE\n  ${done.join("\n  ")}\n  Passed over: ${tried.join("; ") || "none"}\n`,
      );
    } finally {
      setBookkeeping(true);
    }
  },
  VOTE_TIMEOUT,
);
