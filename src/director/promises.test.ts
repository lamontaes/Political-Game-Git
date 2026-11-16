/**
 * Promises kept, broken and remembered (Words lead brief T, Nov 14 2026).
 * A scene ending that keeps a promise is kept by the director as a fact held
 * by the one who promised and owed to the other, and it ends kept or broken
 * on the day the record that settles it lands (a missed payment, a talk
 * between the two) or when its window closes; the tie moves once, citing it.
 *
 * Pinned places: each test draws places from all 56 on a fixed seed (named
 * here and in each line it prints) and plays the first that has the case,
 * printing what it passed over. The pay-on-time test plays a pinned
 * borrower (`BANK_BORROWER`) whose loan and missed payments are the credit
 * engine's own. HAND-STAGED, labeled where they stand: the hire that brings
 * the new coworker (as meeting-scene.test.ts) and the townsperson met for
 * the meeting ask. From there the scene, the reply, the record that settles
 * the promise and the tie are the engines' own.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { closenessBetween } from "../core2/closeness";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { coreAPI } from "../core2/state";
import type { CoreState, JobInput, PersonId } from "../core2/types";
import { seatAct, seatView } from "../bench/legislature";
import {
  billOf,
  castMemberVote,
  memberKey,
  members,
  votesOn,
} from "../core2/modules/legislature";
import { townSeats } from "../core2/modules/offices";
import { partyTie } from "../core2/modules/elections";
import { attendMeeting, meetingOf } from "../core2/modules/office-day";
import { sharedHistory } from "../core2/past";
import { nextMeetingFacts } from "./meeting-facts";
import { openConversation, say } from "./conversation";
import { promisesBetween } from "../core2/modules/promises";
import { purposeScene, replyInScene } from "./purpose-scene";
import {
  LOAN_SEED,
  BANK_BORROWER,
  play,
} from "../../tests/support/real-borrower";
import {
  type Check,
  pathTo,
  playPayOnTime,
  talkOf,
  WAIT_DAYS,
} from "../../tests/support/promise-play";

/** A check that holds, as a test assertion. */
const ok: Check = (holds, message) => expect(holds, message).toBe(true);

/** The fixed seed the places are drawn on. */
const SEED = "promises-kept-and-broken-1";
const ATTEMPTS = 4;
/** Nine in the morning: the minute of the window's last day the player talks. */
const LAST_DAY_MINUTE = 9 * 60;
const TIMEOUT = 600_000;

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
  `a promise to pay on time after a money quarrel over a real missed payment is broken by the next one (seed ${LOAN_SEED})`,
  () => {
    setBookkeeping(false);
    try {
      const done = [playPayOnTime(BANK_BORROWER, ok)];
      process.stdout.write(`PAY ON TIME\n  ${done.join("\n  ")}\n`);
    } finally {
      setBookkeeping(true);
    }
  },
  PAY_TIMEOUT,
);

/** HAND-STAGED: a person hired into a role as the jobs engine's `hire` does (meeting-scene.test.ts). */
function hireLike(
  core: CoreState,
  personId: PersonId,
  template: JobInput,
  tag: string,
): string {
  const api = coreAPI(core);
  const commitment = [
    ...(core.work.commitmentsByPerson.get(template.personId) ?? []),
  ]
    .map((cid) => core.work.commitments.get(cid)!)
    .find((row) => row.jobId === template.id)!;
  const calendar = core.work.payrollCalendars.get(
    core.work.payrollCalendarByCommitment.get(commitment.id)!,
  )!;
  const jobId = `job:${tag}:${personId}`;
  const startsAt = addDays(makeIsoDate(core.date), 1);
  const commitmentId = `work-commitment:${jobId}`;
  const own = {
    ...calendar,
    id: `payroll-calendar:${jobId}`,
    workCommitmentIds: [commitmentId],
    basisRecordIds: [template.organizationId, template.id],
    effectiveFrom: [startsAt, calendar.effectiveFrom].sort().at(-1)!,
  };
  api.startJob(
    { ...template, id: jobId, personId, endsAt: undefined } as JobInput,
    {
      ...commitment,
      id: commitmentId,
      jobId,
      personId,
      payrollCalendarId: own.id,
      startsAt,
      heldSince: undefined,
      endsAt: undefined,
    } as never,
    own as never,
  );
  return jobId;
}

it(
  `a promise to show a new coworker around is kept by a talk between the two on a later day or on its last day, and broken when two weeks pass with none (seed ${SEED})`,
  () => {
    setBookkeeping(false);
    const tried: string[] = [];
    try {
      const done: string[] = [];
      for (
        let attempt = 0;
        attempt < ATTEMPTS && done.length < 3;
        attempt += 1
      ) {
        const { core, director, playerId, where } = world(attempt, "coworker");
        const id = playerId as PersonId;
        const player = core.people.get(id)!;
        const open = (org: string) =>
          [...(core.finance.jobsByOrganization.get(org) ?? [])]
            .map((jobId) => core.jobs.get(jobId)!)
            .filter((job) => job && !job.endsAt && job.personId !== id)
            .filter((job) =>
              [...(core.work.commitmentsByPerson.get(job.personId) ?? [])]
                .map((cid) => core.work.commitments.get(cid))
                .some(
                  (row) =>
                    row?.jobId === job.id &&
                    core.work.payrollCalendarByCommitment.has(row.id),
                ),
            );
        const employer = [...core.finance.jobsByOrganization.keys()]
          .filter((org) => open(org).length >= 3)
          .sort(
            (a, b) => open(a).length - open(b).length || a.localeCompare(b),
          )[0];
        const jobless = [...core.people.values()]
          .filter(
            (row) =>
              row.alive &&
              row.tier !== "husk" &&
              row.id.startsWith("person_") &&
              !row.jobId &&
              row.id !== id &&
              row.householdId !== player.householdId,
          )
          .sort((a, b) => a.id.localeCompare(b.id))
          .slice(0, 12);
        if (!employer || jobless.length < 2) {
          tried.push(`${where}: no employer to hire into`);
          continue;
        }
        const template = open(employer)[0]!;
        hireLike(core, id, template, "player");
        director.watch(core, id);
        core.focusPersonIds.add(id);
        play(core, id, 2);
        const book = director.ledger.people.get(id)!;
        // Newcomers hired a few days apart until a hire is the day's scene;
        // promised a show-around. The first place's newcomer is talked with,
        // the next place's is not.
        let made: { factId: string; newcomer: PersonId; since: string } | null =
          null;
        for (const candidate of jobless) {
          const hiredId = hireLike(core, candidate.id, template, "newcomer");
          play(core, id, 2);
          const entry = book.schedule.find(
            (row) =>
              row.momentId.includes(hiredId) &&
              row.bindings.some((b) => b.typeKey === "first-meeting"),
          );
          if (!entry) continue;
          const result = purposeScene(core, director, id, entry);
          if (result?.kind !== "composed") continue;
          const path = pathTo(result.scene.talk.tree, "took-them-in-hand");
          if (!path) continue;
          const replyId = replyInScene(core, director, id, entry, path)!;
          expect(core.durableLog.get(replyId)?.facts?.promise, where).toBe(
            "show-around",
          );
          made = {
            factId: `promise:${replyId}`,
            newcomer: candidate.id as PersonId,
            since: core.date,
          };
          break;
        }
        if (!made) {
          tried.push(`${where}: no first meeting staged`);
          continue;
        }
        const { factId, newcomer, since } = made;
        const find = () =>
          promisesBetween(coreAPI(core), id, newcomer).find(
            (row) => row.id === factId,
          )!;
        expect(find().outcome, where).toBe("open");
        const before = closenessBetween(core, id, newcomer);
        if (!done.length) {
          // Kept: the player talks with the newcomer on a later day (the
          // conversation engine's own time together, cause "conversation");
          // the day it was promised does not keep it.
          // Two who have met are no longer introduced (train, Nov 14), so
          // the player waits, two days at a time, for a day with something
          // to say, inside the two weeks the promise allows. A newcomer with
          // nothing to say for two weeks is passed over by name (pool item
          // words-new-coworker-has-nothing-to-say).
          let talk!: ReturnType<typeof openConversation>;
          for (let day = 0; day < WAIT_DAYS; day += 1) {
            play(core, id, 2);
            talk = openConversation(core, id, newcomer, { director });
            if (talk.choices.length) break;
          }
          const choice = talk.choices[0];
          if (!choice) {
            tried.push(
              `${where}: nothing to say with the newcomer for ${WAIT_DAYS * 2} days`,
            );
            continue;
          }
          say(core, talk, choice!.key);
          expect(find().outcome, where).toBe("kept");
          expect(find().endedBy, where).toMatch(/^conversation:/);
          expect(closenessBetween(core, id, newcomer), where).toBeGreaterThan(
            before,
          );
        } else if (done.length === 1) {
          // Broken: two weeks of the player's days with no talk between them.
          play(core, id, 15);
          expect(find().outcome, where).toBe("broken");
          expect(find().endedAt, where).toBe(addDays(makeIsoDate(since), 14));
        } else {
          // Kept on the last day: the player goes the whole two weeks and
          // talks with the newcomer on the window's last day, which keeps it;
          // the next morning, when the window closes, leaves it kept. This is
          // the one played proof that the player's own presses on a last day
          // still count. It is green on a close at the start of the day's
          // world step too (the player's day comes before that step), so it
          // does not prove the world records of a last day count; that case
          // waits on a pay-on-time promise made on a missed payment's day.
          const lastDay = find().dueOn;
          // To the morning of the last day, the player still inside it.
          // play() stops at a midnight with the day before finished, so
          // fourteen days end the day before the last; then into the last.
          play(core, id, 14);
          play(core, id, 1, LAST_DAY_MINUTE);
          expect(core.date.slice(0, 10), where).toBe(lastDay);
          const talk = openConversation(core, id, newcomer, { director });
          const choice = talk.choices[0];
          if (!choice) {
            tried.push(
              `${where}: nothing to say with the newcomer on ${lastDay}`,
            );
            continue;
          }
          say(core, talk, choice.key);
          play(core, id, 1);
          expect(find().outcome, where).toBe("kept");
          expect(find().endedBy, where).toMatch(/^conversation:/);
          expect(find().endedAt, where).toBe(lastDay);
        }
        const ended = find();
        const said = talkOf(core, director, newcomer, id, where, ok);
        done.push(
          `${where}: ${said}\n    ${factId} owed to ${newcomer}, ${ended.outcome} by ${ended.endedBy} on ${ended.endedAt}, closeness ${before.toFixed(5)} to ${closenessBetween(core, id, newcomer).toFixed(5)}`,
        );
      }
      if (done.length === 3) {
        process.stdout.write(
          `SHOW AROUND\n  ${done.join("\n  ")}\n  Passed over: ${tried.join("; ") || "none"}\n`,
        );
        return;
      }
      throw new Error(`No place played the promise: ${tried.join("; ")}`);
    } finally {
      setBookkeeping(true);
    }
  },
  TIMEOUT,
);

/** Days played in a place at most, one at a time, so the evening before a roll is caught. */
const VOTE_DAYS = 120;

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
  TIMEOUT,
);

/** Days a friend's ask may wait, one at a time, for a town body to post its next meeting. */
const POSTED_DAYS = 45;

it(
  `a friend's ask to come to a town body's meeting is kept by being there and broken by staying away (seed ${SEED})`,
  () => {
    setBookkeeping(false);
    const tried: string[] = [];
    const done: string[] = [];
    try {
      for (let draw = 0; draw < ATTEMPTS * 2 && done.length < 2; draw += 1) {
        const { core, director, where } = world(draw, "attend");
        const id = core.playerId as PersonId;
        const player = core.people.get(id)!;
        director.watch(core, id);
        core.focusPersonIds.add(id);
        const api = coreAPI(core);
        // HAND-STAGED, as meeting-scene.test.ts: a townsperson the player has
        // no tie to and shares no party with, met once, then time together
        // until the tie turns (the relationship engine's own cause).
        const partyOf = (pid: string) =>
          partyTie(api, pid)?.tie === "party"
            ? partyTie(api, pid)!.partyId
            : null;
        const stranger = [...core.people.values()]
          .filter(
            (row) =>
              row.alive &&
              row.tier !== "husk" &&
              row.id.startsWith("person_") &&
              row.id !== id &&
              row.householdId !== player.householdId &&
              !player.familyIds.has(row.id) &&
              !sharedHistory(core, id, row.id as PersonId).length &&
              (!partyOf(row.id) || partyOf(row.id) !== partyOf(id)),
          )
          .sort((a, b) => a.id.localeCompare(b.id))[0];
        if (!stranger) {
          tried.push(`${where}: no townsperson without a tie`);
          continue;
        }
        const friendId = stranger.id as PersonId;
        api.meet(id, friendId, {
          placeId: player.placeId,
          sourceId: "fixture-meeting",
          cause: "met-in-group",
          hours: 1,
        });
        const book = director.ledger.people.get(id)!;
        const grew = () =>
          book.threads
            .get(friendId)
            ?.turns.find((turn) => turn.turn === "grew");
        for (let days = 0; days < 30 && !grew(); days += 1) {
          api.relationship(id, friendId, "contact", 6);
          advanceCore(core, addDays(makeIsoDate(core.date), 1));
        }
        const turn = grew();
        if (!turn) {
          tried.push(`${where}: the tie never turned`);
          continue;
        }
        const entry = book.schedule.find(
          (item) => item.momentId === turn.momentId,
        );
        if (!entry?.bindings.some((b) => b.typeKey === "becoming-friends")) {
          tried.push(`${where}: no becoming-friends scene staged`);
          continue;
        }
        // The friend asks once a town body has a meeting ahead (meetingAhead).
        for (
          let days = 0;
          days < POSTED_DAYS && !nextMeetingFacts(core).meeting;
          days += 2
        )
          play(core, id, 2);
        const ahead = nextMeetingFacts(core);
        if (!ahead.meeting) {
          tried.push(`${where}: no town meeting ahead in ${POSTED_DAYS} days`);
          continue;
        }
        const result = purposeScene(core, director, id, entry, {
          typeKey: "becoming-friends",
        });
        if (result?.kind !== "composed") {
          tried.push(`${where}: ${JSON.stringify(result)}`);
          continue;
        }
        const { scene } = result;
        expect(scene.purpose, where).toBe("friend-ask");
        expect(
          partyOf(friendId) && partyOf(friendId) === partyOf(id),
          where,
        ).toBeFalsy();
        const request = scene.talk.lines.find((row) => row.move === "request");
        expect(request?.text, where).toContain(ahead.body!.text);
        const path = pathTo(scene.talk.tree, "said-yes-to-friend");
        expect(path, `${where}: no yes`).toBeTruthy();
        const replyId = replyInScene(core, director, id, entry, path!, {
          typeKey: "becoming-friends",
        })!;
        const meetingId = ahead.meeting.sourceRecordIds[0]!;
        expect(
          core.durableLog.get(replyId)?.facts?.["promise-meetingId"],
          where,
        ).toBe(meetingId);
        const date = meetingId.slice(-10);
        const factId = `promise:${replyId}`;
        const find = () =>
          promisesBetween(coreAPI(core), id, friendId).find(
            (entry) => entry.id === factId,
          )!;
        expect(find().outcome, where).toBe("open");
        expect(find().meetingId, where).toBe(meetingId);
        // A meeting not yet posted holds the word until it is (pledgeToCome):
        // the days are played to its posting.
        for (let step = 0; step < 30 && !meetingOf(api, meetingId); step += 1)
          play(core, id, 2);
        const row = meetingOf(api, meetingId);
        expect(row, `${where}: ${meetingId} never posted`).toBeTruthy();
        expect(row!.audience, where).toBe(id);
        expect(row!.with, where).toContain(friendId);
        const kept = !done.length;
        // Broken: the player takes the mark back (the calendar's own act).
        if (!kept) attendMeeting(api, row!.officeId, row!.date, false);
        const days =
          Math.round((Date.parse(date) - Date.parse(core.date)) / 86_400_000) +
          2;
        play(core, id, days);
        const held = core.durableLog.get(`meeting-held:${meetingId}`);
        expect(held, `${where}: the meeting was not held`).toBeTruthy();
        expect(held!.personIds, where).toContain(friendId);
        expect(find().outcome, where).toBe(kept ? "kept" : "broken");
        expect(find().endedBy, where).toBe(held!.id);
        // Not there, the two were apart: the broken promise waits to move the
        // tie until it is said, so nobody "just saw" the other at the meeting.
        const tie = [...(core.relationshipsByPerson.get(id) ?? [])]
          .map((rid) => core.relationships.get(rid)!)
          .find((r) => r.actorId === friendId || r.otherId === friendId)!;
        if (!kept) {
          expect(tie.lastContactDate < date, where).toBe(true);
          expect(find().outcome, where).toBe("broken");
        }
        const said = talkOf(core, director, friendId, id, where, ok);
        done.push(
          `${where}: asked "${request!.text}"\n    ${factId}, ${find().outcome} by ${held!.id} on ${find().endedAt}\n  ${said}`,
        );
      }
      if (done.length === 2) {
        process.stdout.write(
          `ATTEND\n  ${done.join("\n  ")}\n  Passed over: ${tried.join("; ") || "none"}\n`,
        );
        return;
      }
      throw new Error(`No place played the promise: ${tried.join("; ")}`);
    } finally {
      setBookkeeping(true);
    }
  },
  TIMEOUT,
);
