/**
 * Promises kept, broken and remembered (Words lead brief T, Nov 14 2026).
 * A scene ending that keeps a promise is kept by the director as a fact held
 * by the one who promised and owed to the other, and it ends kept or broken
 * on the day the record that settles it lands (a missed payment, a talk
 * between the two) or when its window closes; the tie moves once, citing it.
 *
 * Pinned places: each test draws places from all 56 on a fixed seed (named
 * here and in each line it prints) and plays the first that has the case,
 * printing what it passed over. HAND-STAGED, labeled where they stand: the
 * missed payment that starts the quarrel (as apology-variants.test.ts) and
 * the hire that brings the new coworker (as meeting-scene.test.ts). From
 * there the quarrel, the scene, the reply, the record that settles the
 * promise and the tie are the engines' own.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { closenessBetween } from "../core2/closeness";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { advancePlayerV1, resumePlayerV1 } from "../core2/player-v1";
import { applyCoreEvent, coreAPI } from "../core2/state";
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
import { openConversation, say } from "./conversation";
import type { Director } from "./ledger";
import { wordConversationMove } from "../english/conversation-words";
import { answerPromise, promiseAnswers, promiseSubject } from "./promise-talk";
import { promisesBetween } from "./promises";
import { purposeScene, replyInScene } from "./purpose-scene";
import type { ScheduleEntry } from "./scheduling";
import type { TreeNode } from "./scene-talk";

/**
 * What the one owed says of a settled promise at the next talk: the
 * conversation bank's raise line for its subject, worded for the speaker
 * (promise-talk.ts gives the subject; the talk engine says it).
 */
function saidOf(
  core: CoreState,
  director: Director,
  speakerId: PersonId,
  listenerId: PersonId,
  where: string,
): string {
  const subject = promiseSubject(core, director, speakerId, listenerId);
  expect(subject, `${where}: nothing to say`).toBeTruthy();
  const line = wordConversationMove({
    seed: core.seed,
    subject: subject!.kind,
    part: "raise",
    speakerId,
    traits: core.people.get(speakerId)?.traits ?? {},
    facts: {
      ...subject!.facts,
      you: {
        text: core.people.get(listenerId)!.givenName,
        sourceRecordIds: [listenerId],
      },
    },
    momentKey: `${speakerId}:${subject!.id}`,
  });
  expect(line?.text, `${where}: ${subject!.kind} has no line`).toBeTruthy();
  expect(line!.text, where).not.toMatch(/\{|\}/);
  // The answers the one who promised is offered, and the one given is read
  // (Words lead rulings 2): a courtesy to a kept one; to a broken one, making
  // it right where a record could settle a new one, else owning it.
  const offered = promiseAnswers(core, subject!, listenerId);
  let answered: string;
  if (subject!.kind === "promise-kept") {
    expect(offered.length, where).toBe(2);
    for (const id of offered)
      expect(["plain", "modest", "warm"], where).toContain(id);
    const recordId = answerPromise(
      core,
      director,
      subject!,
      listenerId,
      offered[0]!,
    );
    expect(core.durableLog.get(recordId!)?.kind, where).toBe("promise.answer");
    answered = offered[0]!;
  } else {
    expect(offered.slice(0, 3), where).toEqual(["own-it", "explain", "deny"]);
    const renewable = subject!.promiseKind !== "vote";
    expect(offered.includes("make-it-right"), where).toBe(renewable);
    const choice = renewable ? "make-it-right" : "own-it";
    const before = closenessBetween(core, listenerId, speakerId);
    const recordId = answerPromise(
      core,
      director,
      subject!,
      listenerId,
      choice,
    );
    if (renewable) {
      // A new promise of the same kind, open, made by the answer's record.
      const renewed = promisesBetween(
        director.ledger,
        listenerId,
        speakerId,
      ).find((row) => row.sourceId === recordId);
      expect(renewed?.kind, where).toBe(subject!.promiseKind);
      expect(renewed?.outcome, where).toBe("open");
      answered = `${choice} (new promise ${renewed!.id})`;
    } else {
      const after = closenessBetween(core, listenerId, speakerId);
      expect(after, where).toBeGreaterThanOrEqual(before);
      answered = `${choice} (closeness ${before.toFixed(5)} to ${after.toFixed(5)})`;
    }
  }
  return `${subject!.kind}: "${line!.text}"; answered ${answered}`;
}

/** The fixed seed the places are drawn on. */
const SEED = "promises-kept-and-broken-1";
const ATTEMPTS = 4;
const TIMEOUT = 600_000;

const paths = (node: TreeNode, prefix: number[] = []): number[][] =>
  node.replies.flatMap((reply, index) =>
    reply.next
      ? [[...prefix, index], ...paths(reply.next, [...prefix, index])]
      : [[...prefix, index]],
  );

/** The first path whose end is the named ending. */
function pathTo(tree: TreeNode, ending: string): number[] | undefined {
  return paths(tree).find((full) => {
    let node: TreeNode | null = tree;
    for (const index of full) node = node?.replies[index]?.next ?? null;
    return node?.end?.ending?.id === ending;
  });
}

/** Plays the player's days with the clock, taking the first choice at each pause (meeting-scene.test.ts). */
function play(core: CoreState, playerId: PersonId, days: number) {
  let packet: ReturnType<typeof advancePlayerV1> | undefined = advancePlayerV1(
    core,
    {
      controlledPersonId: playerId,
      through: { date: addDays(makeIsoDate(core.date), days), minuteOfDay: 0 },
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

function world(attempt: number, label: string) {
  const place = drawPlace(SEED, `${label}:${attempt}`);
  const where = `${place.name} (${place.key}), seed ${SEED} draw ${label}:${attempt}, world seed ${place.seed}`;
  const built = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  return { ...built, where };
}

/** HAND-STAGED: the credit engine's missed-payment record for the player. */
function missPayment(core: CoreState, id: PersonId, tag: string): string {
  const missedId = `event:credit.payment-missed:${tag}:${core.date}`;
  applyCoreEvent(core, {
    id: missedId,
    date: core.date,
    kind: "credit.payment-missed",
    personIds: [id],
    placeId: core.people.get(id)!.placeId,
    publicRecord: false,
    source: {
      tag: "ESTIMATED",
      asOf: core.date,
      citation: "Hand-staged missed payment for the promises test.",
    },
  });
  return missedId;
}

/** The next apology scene staged for the player, by day, a fortnight at most. */
function nextApology(
  core: CoreState,
  director: Director,
  id: PersonId,
  after: ReadonlySet<string>,
): ScheduleEntry | undefined {
  const book = director.ledger.people.get(id)!;
  const find = () =>
    book.schedule.find(
      (row) =>
        !after.has(row.momentId) &&
        row.bindings.some((b) => b.typeKey === "apology"),
    );
  if (find()) return find();
  // The scene waits for the two to be together: a fortnight of the player's days.
  play(core, id, 14);
  return find();
}

/** Answers an apology scene with the promise to make it right; the reply's id and the one owed. */
function promiseToPay(
  core: CoreState,
  director: Director,
  id: PersonId,
  entry: ScheduleEntry,
  where: string,
): { replyId: string; owedId: PersonId } | null {
  const result = purposeScene(core, director, id, entry, {
    typeKey: "apology",
  });
  if (result?.kind !== "composed") return null;
  // Every quarrel on record is over a missed payment: each variant but the plain one.
  expect(result.scene.variant?.purpose, where).toMatch(
    /^owed-apology\.(money|close|pressed|repeat)$/,
  );
  const path = pathTo(result.scene.talk.tree, "promised-to-make-it-right");
  expect(path, `${where}: no path keeps the promise`).toBeTruthy();
  const replyId = replyInScene(core, director, id, entry, path!)!;
  const reply = core.durableLog.get(replyId)!;
  expect(
    reply.facts?.promise,
    `${where}: ${JSON.stringify(reply.facts)} cause ${result.scene.cause.kind}`,
  ).toBe("pay-on-time");
  return { replyId, owedId: result.scene.askerId };
}

it(
  `a promise to pay on time after a money quarrel is broken by the next missed payment and kept when the window closes with none (seed ${SEED})`,
  () => {
    setBookkeeping(false);
    const tried: string[] = [];
    try {
      // One promise a place: the first place breaks it, the next keeps it or
      // breaks it as its own payments say.
      const done: string[] = [];
      for (
        let attempt = 0;
        attempt < ATTEMPTS && done.length < 2;
        attempt += 1
      ) {
        const { core, director, playerId, where } = world(attempt, "pay");
        const id = playerId as PersonId;
        director.watch(core, id);
        // The opening's addresses wait for the player: the world runs past them.
        advanceCore(core, addDays(makeIsoDate(core.date), 30));
        missPayment(core, id, `promises-${attempt}-a`);
        const entry = nextApology(core, director, id, new Set());
        if (!entry) {
          tried.push(`${where}: no apology staged`);
          continue;
        }
        const made = promiseToPay(core, director, id, entry, where);
        if (!made) {
          tried.push(`${where}: the apology did not compose`);
          continue;
        }
        const factId = `promise:${made.replyId}`;
        const find = () =>
          promisesBetween(director.ledger, id, made.owedId).find(
            (row) => row.id === factId,
          )!;
        expect(find().outcome, where).toBe("open");
        const before = closenessBetween(core, id, made.owedId);
        if (!done.length) {
          // Broken: the borrower's next missed payment (HAND-STAGED) settles it.
          const missedId = missPayment(core, id, `promises-${attempt}-b`);
          expect(find().outcome, where).toBe("broken");
          expect(find().endedBy, where).toBe(missedId);
          expect(closenessBetween(core, id, made.owedId), where).toBeLessThan(
            before,
          );
        } else {
          // The engine's own payments decide: a real missed payment in the
          // window breaks it, none keeps it on the window's last day.
          const missed: string[] = [];
          coreAPI(core).subscribeEvents(
            "promises-test",
            ["credit.payment-missed"],
            (_, event) => {
              if (event.personIds[0] === id) missed.push(event.id);
            },
          );
          play(core, id, 63);
          expect(find().outcome, `${where}: missed ${missed.join(",")}`).toBe(
            missed.length ? "broken" : "kept",
          );
          if (!missed.length)
            expect(find().endedAt, where).toBe(
              addDays(makeIsoDate(find().since), 62),
            );
        }
        const ended = find();
        const said = saidOf(core, director, made.owedId, id, where);
        done.push(
          `${where}: ${said}\n    ${factId} owed to ${made.owedId}, ${ended.outcome} by ${ended.endedBy} on ${ended.endedAt}, closeness ${before.toFixed(5)} to ${closenessBetween(core, id, made.owedId).toFixed(5)}`,
        );
      }
      if (done.length === 2) {
        process.stdout.write(
          `PAY ON TIME\n  ${done.join("\n  ")}\n  Passed over: ${tried.join("; ") || "none"}\n`,
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
  `a promise to show a new coworker around is kept by a talk between the two and broken when two weeks pass with none (seed ${SEED})`,
  () => {
    setBookkeeping(false);
    const tried: string[] = [];
    try {
      const done: string[] = [];
      for (
        let attempt = 0;
        attempt < ATTEMPTS && done.length < 2;
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
          promisesBetween(director.ledger, id, newcomer).find(
            (row) => row.id === factId,
          )!;
        expect(find().outcome, where).toBe("open");
        const before = closenessBetween(core, id, newcomer);
        if (!done.length) {
          // Kept: the player talks with the newcomer (the conversation
          // engine's own time together, cause "conversation").
          const talk = openConversation(core, id, newcomer, { director });
          const choice = talk.choices[0];
          expect(choice, `${where}: nothing to say`).toBeTruthy();
          say(core, talk, choice!.key);
          expect(find().outcome, where).toBe("kept");
          expect(find().endedBy, where).toMatch(/^conversation:/);
          expect(closenessBetween(core, id, newcomer), where).toBeGreaterThan(
            before,
          );
        } else {
          // Broken: two weeks of the player's days with no talk between them.
          play(core, id, 15);
          expect(find().outcome, where).toBe("broken");
          expect(find().endedAt, where).toBe(addDays(makeIsoDate(since), 14));
        }
        const ended = find();
        const said = saidOf(core, director, newcomer, id, where);
        done.push(
          `${where}: ${said}\n    ${factId} owed to ${newcomer}, ${ended.outcome} by ${ended.endedBy} on ${ended.endedAt}, closeness ${before.toFixed(5)} to ${closenessBetween(core, id, newcomer).toFixed(5)}`,
        );
      }
      if (done.length === 2) {
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
            promisesBetween(director.ledger, askerId, colleagueId).find(
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
          const said = saidOf(core, director, askerId, colleagueId, where);
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
