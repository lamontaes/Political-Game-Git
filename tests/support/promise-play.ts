/**
 * A promise to pay on time played on a real borrower, and the talk that says
 * it, shared by promises.test.ts and the script that writes the played file
 * (scripts/words/pay-on-time-played.ts). Nothing here is staged: the loan,
 * the missed payments, the quarrel, the apology, the promise, the job and the
 * talk are the engines' own, on the player's own clock. Each check is passed
 * in (`Check`), so a test asserts and a script stops on the first failure.
 */
import paymentWords from "../../data/english/payment-words.json" with { type: "json" };
import { closenessBetween } from "../../src/core2/closeness";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { restoreWorld, snapshotWorld } from "../../src/core2/snapshot";
import { coreAPI } from "../../src/core2/state";
import type { CoreState, PersonId } from "../../src/core2/types";
import { openConversation, say } from "../../src/director/conversation";
import type { Director } from "../../src/director/ledger";
import {
  promiseAnswers,
  promiseSubject,
} from "../../src/director/promise-talk";
import { kindOf, promisesBetween } from "../../src/director/promises";
import { purposeScene, replyInScene } from "../../src/director/purpose-scene";
import type { ScheduleEntry } from "../../src/director/scheduling";
import type { TreeNode } from "../../src/director/scene-talk";
import { wordConversationMove } from "../../src/english/conversation-words";
import { borrowerWorld, play, playToQuarrel } from "./real-borrower";

/** A check that holds or stops the run with its message. */
export type Check = (holds: boolean, message: string) => void;

/** How many talks, two days apart, a settled promise may wait behind bigger news. */
export const WAIT_DAYS = 7;

/** The ledger put back as it was, in place (the director keeps its own reference). */
export function restoreInPlace(target: object, saved: object): void {
  for (const [key, value] of Object.entries(structuredClone(saved))) {
    const now = (target as Record<string, unknown>)[key];
    if (now instanceof Map && value instanceof Map) {
      now.clear();
      for (const [k, v] of value) now.set(k, v);
    } else if (Array.isArray(now) && Array.isArray(value))
      now.splice(0, now.length, ...value);
    else (target as Record<string, unknown>)[key] = value;
  }
}

/**
 * The next talk between the one owed and the player, played: the greeting,
 * the promise brought up, the answers offered, and each answer in its own
 * branch (the world and the ledger put back between branches) with what the
 * other says after it and what the answer did. The talk engine says it
 * (subjectsBetween, promiseSaid, answerPromise); nothing is worded here.
 */
export function talkOf(
  core: CoreState,
  director: Director,
  speakerId: PersonId,
  playerId: PersonId,
  where: string,
  check: Check,
): string {
  const subject = promiseSubject(core, director, speakerId, playerId);
  check(Boolean(subject), `${where}: nothing to say`);
  const offered = promiseAnswers(core, subject!, playerId);
  if (subject!.kind === "promise-kept") {
    check(offered.length === 2, `${where}: offered ${offered.join(",")}`);
    for (const id of offered)
      check(
        ["plain", "modest", "warm"].includes(id),
        `${where}: offered ${id}`,
      );
  } else {
    check(
      offered.slice(0, 3).join() === "own-it,explain,deny",
      `${where}: offered ${offered.join(",")}`,
    );
    // Making it right promises again, only where the kind can be renewed
    // (not a vote, not a meeting that is over).
    check(
      offered.includes("make-it-right") ===
        kindOf(subject!.promiseKind).renewable,
      `${where}: make-it-right offered ${offered.includes("make-it-right")}`,
    );
  }
  const name = (id: PersonId) => core.people.get(id)?.givenName ?? id;
  const open = () => openConversation(core, playerId, speakerId, { director });
  const said = (talk: {
    lines: readonly { speakerId: PersonId; text: string }[];
  }) =>
    talk.lines
      .map((line) => `${name(line.speakerId)}: ${line.text}`)
      .join(" / ");
  // The talks before it is brought up: a bigger subject of the day leads
  // (each ranked by its own record), and the promise waits for a later talk.
  const waited: string[] = [];
  let savedWorld = JSON.parse(JSON.stringify(snapshotWorld(core)));
  let savedLedger = structuredClone(director.ledger);
  let first = open();
  for (
    let day = 0;
    day < WAIT_DAYS &&
    !first.lines.some(
      (line) => line.kind === subject!.kind && line.speakerId === speakerId,
    );
    day += 1
  ) {
    waited.push(`${core.date}: ${said(first) || "(nothing to say)"}`);
    play(core, core.playerId as PersonId, 2);
    savedWorld = JSON.parse(JSON.stringify(snapshotWorld(core)));
    savedLedger = structuredClone(director.ledger);
    first = open();
  }
  const raised = first.lines.findIndex(
    (line) => line.kind === subject!.kind && line.speakerId === speakerId,
  );
  const shown = said(first);
  check(
    raised > -1,
    `${where}: not brought up (weight ${subject!.weight}): ${waited.join("; ")}; ${shown}`,
  );
  check(first.lines.at(-1)?.kind === subject!.kind, `${where}: ${shown}`);
  const keys = first.choices.map((choice) => choice.move);
  check(
    [...keys].sort().join() === [...offered].sort().join(),
    `${where}: choices ${keys.join(",")}, offered ${offered.join(",")}`,
  );
  // Said once: the next talk does not bring it up again.
  check(
    promiseSubject(core, director, speakerId, playerId) === null,
    `${where}: brought up twice`,
  );
  // The other wordings of the raise the engine draws for this speaker and
  // these facts on other days (one moment key a day for a year).
  const also = new Set<string>();
  for (let day = 0; day < 365; day += 1) {
    const line = wordConversationMove({
      seed: core.seed,
      subject: subject!.kind,
      part: "raise",
      speakerId,
      traits: core.people.get(speakerId)?.traits ?? {},
      facts: subject!.facts,
      momentKey: `${playerId}:${speakerId}:${addDays(makeIsoDate(core.date), day)}:${subject!.id}`,
    });
    if (line) also.add(line.text);
  }
  // The wordings this speaker never draws, said by others in the town with
  // the same facts (the bank picks by the speaker's traits and bearing).
  const others = new Map<string, string>();
  for (const person of [...core.people.values()]
    .filter((row) => row.alive && row.tier !== "husk")
    .sort((a, b) => a.id.localeCompare(b.id))
    .slice(0, 400)) {
    const line = wordConversationMove({
      seed: core.seed,
      subject: subject!.kind,
      part: "raise",
      speakerId: person.id as PersonId,
      traits: person.traits ?? {},
      facts: subject!.facts,
      momentKey: `${playerId}:${person.id}:${core.date}:${subject!.id}`,
    });
    if (line && !also.has(line.text) && !others.has(line.text))
      others.set(line.text, person.givenName);
  }
  const out = [
    ...waited.map((row) => `    an earlier talk, not about it: ${row}`),
    `talk on ${core.date} (weight ${subject!.weight ?? 0}, the impact of the moment it was promised over): ${shown}`,
    `    also drawn on other days: ${[...also].map((text) => `"${text}"`).join("; ")}`,
    `    drawn for others in town with the same facts: ${[...others].map(([text, by]) => `"${text}" (${by})`).join("; ") || "none"}`,
    `    offered: ${first.choices.map((choice) => `${choice.move} "${choice.text}"`).join("; ")}`,
  ];
  // Each branch's closeness after its answer: the talk's own time together
  // warms every branch alike, so the answers are compared with each other.
  const closeness = new Map<string, number>();
  let floor = false;
  for (const id of offered) {
    restoreWorld(core, JSON.parse(JSON.stringify(savedWorld)));
    restoreInPlace(director.ledger, savedLedger);
    const talk = open();
    const before = closenessBetween(core, playerId, speakerId);
    const from = talk.lines.length;
    const pick = talk.choices.find((choice) => choice.move === id);
    check(Boolean(pick), `${where}: ${id} not offered`);
    say(core, talk, pick!.key);
    const after = closenessBetween(core, playerId, speakerId);
    const answer = [...core.durableLog.values()].find(
      (event) =>
        event.kind === "promise.answer" &&
        event.date === core.date &&
        event.personIds.includes(playerId) &&
        event.facts?.answer === id,
    );
    check(Boolean(answer), `${where}: ${id} wrote no answer record`);
    const renewed = promisesBetween(director.ledger, playerId, speakerId).find(
      (row) => row.sourceId === answer!.id,
    );
    if (id === "make-it-right") {
      check(
        renewed?.kind === subject!.promiseKind && renewed?.outcome === "open",
        `${where}: renewed ${renewed?.kind} ${renewed?.outcome}`,
      );
    }
    closeness.set(id, after);
    floor ||= before <= 0;
    out.push(
      `    ${id}: ${talk.lines
        .slice(from)
        .map((line) => `${name(line.speakerId)}: ${line.text}`)
        .join(
          " / ",
        )} [${answer!.id}; closeness ${before.toFixed(8)} to ${after.toFixed(8)}${renewed ? `; new promise ${renewed.id}` : ""}]`,
    );
  }
  // Denying ends below owning it, except where the tie is already at its
  // floor of zero: nothing is left to cool (Kagman II MP, an unforgiving
  // newcomer after two weeks of no talk), and they are only held equal.
  if (closeness.has("deny"))
    check(
      floor
        ? closeness.get("deny")! <= closeness.get("own-it")!
        : closeness.get("deny")! < closeness.get("own-it")!,
      `${where}: deny ${closeness.get("deny")} against own-it ${closeness.get("own-it")}`,
    );
  return out.join("\n");
}

const paths = (node: TreeNode, prefix: number[] = []): number[][] =>
  node.replies.flatMap((reply, index) =>
    reply.next
      ? [[...prefix, index], ...paths(reply.next, [...prefix, index])]
      : [[...prefix, index]],
  );

/** The first path whose end is the named ending. */
export function pathTo(tree: TreeNode, ending: string): number[] | undefined {
  return paths(tree).find((full) => {
    let node: TreeNode | null = tree;
    for (const index of full) node = node?.replies[index]?.next ?? null;
    return node?.end?.ending?.id === ending;
  });
}

/** The loan a missed payment was on (its record's facts), for the played file. */
function missedLoan(
  core: CoreState,
  endedBy: string | undefined,
  replyId: string,
): string {
  const log = core.durableLog;
  const broke = log.get(endedBy ?? "");
  const cause = log.get(log.get(replyId)?.facts?.causeId ?? "");
  const missed =
    broke?.kind === "credit.payment-missed"
      ? broke
      : log.get(cause?.facts?.missedId ?? "");
  return missed
    ? `${missed.facts?.loanKind} ${missed.facts?.loanId} (${missed.id})`
    : "(none)";
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
  check: Check,
): { replyId: string; owedId: PersonId } | null {
  const result = purposeScene(core, director, id, entry, {
    typeKey: "apology",
  });
  if (result?.kind !== "composed") return null;
  // Every quarrel on record is over a missed payment: each variant but the plain one.
  check(
    /^owed-apology\.(money|close|pressed|repeat)$/.test(
      result.scene.variant?.purpose ?? "",
    ),
    `${where}: variant ${result.scene.variant?.purpose}`,
  );
  const path = pathTo(result.scene.talk.tree, "promised-to-make-it-right");
  check(Boolean(path), `${where}: no path keeps the promise`);
  const replyId = replyInScene(core, director, id, entry, path!)!;
  const reply = core.durableLog.get(replyId)!;
  check(
    reply.facts?.promise === "pay-on-time",
    `${where}: ${JSON.stringify(reply.facts)} cause ${result.scene.cause.kind}`,
  );
  return { replyId, owedId: result.scene.askerId };
}
/** A borrower played to a pay-on-time promise: the place's draw and the creator's birthday. */
export interface PayBorrower {
  readonly draw: number;
  readonly birth: string;
  /** Days the player's clock may run to the first quarrel over a missed payment. */
  readonly quarrelDays?: number;
}

/**
 * Plays the borrower from the New game creator's birthday to the quarrel over
 * their own missed payment, the apology answered with a promise to make it
 * right, the promise's window, broken by the next missed payment (no played
 * borrower keeps it on the Train: item
 * world-loan-bill-before-first-payday-no-borrower-keeps), and the talk that
 * brings it up. Returns the played record.
 */
export function playPayOnTime(borrower: PayBorrower, check: Check): string {
  const { draw, birth, quarrelDays } = borrower;
  const { core, director, playerId, where } = borrowerWorld(draw, birth);
  const id = playerId as PersonId;
  director.watch(core, id);
  // The longer run is the game's own: the player's days until the bank
  // or the storefront lender writes the loan and the payment goes unpaid.
  const quarrel = playToQuarrel(core, id, quarrelDays);
  check(Boolean(quarrel), `${where}: no missed payment by ${core.date}`);
  const missed = core.durableLog.get(String(quarrel!.facts?.missedId));
  check(
    missed?.kind === "credit.payment-missed",
    `${where}: quarrel over ${missed?.kind}`,
  );
  const entry = nextApology(core, director, id, new Set());
  check(Boolean(entry), `${where}: no apology staged`);
  const made = promiseToPay(core, director, id, entry!, where, check);
  check(Boolean(made), `${where}: the apology did not compose`);
  const factId = `promise:${made!.replyId}`;
  const find = () =>
    promisesBetween(director.ledger, id, made!.owedId).find(
      (row) => row.id === factId,
    )!;
  check(find().outcome === "open", `${where}: promise ${find().outcome}`);
  const before = closenessBetween(core, id, made!.owedId);
  // The promise's own move on the tie, the day it settles (or the day it is
  // said, when the two were apart), apart from two months at home.
  const moves: string[] = [];
  coreAPI(core).subscribeRelationshipChanges(
    "promises-tie",
    ["*"],
    (_, notice) => {
      if (notice.reason?.sourceId !== factId) return;
      for (const change of notice.changes)
        if (change.measure === "level")
          moves.push(
            `${notice.date} ${notice.reason.cause}: tie level ${change.before.toFixed(8)} to ${change.after.toFixed(8)}`,
          );
    },
  );
  const later: string[] = [];
  coreAPI(core).subscribeEvents(
    "promises-test",
    ["credit.payment-missed"],
    (_, event) => {
      if (event.personIds[0] === id) later.push(event.id);
    },
  );
  // The engine's own payments decide: the next missed payment in the window
  // breaks it.
  const windowEnd = addDays(makeIsoDate(find().since), 63);
  play(
    core,
    id,
    Math.round((Date.parse(windowEnd) - Date.parse(core.date)) / 86_400_000),
  );
  check(
    find().outcome === "broken",
    `${where}: ${find().outcome}, missed ${later.join(",")}`,
  );
  check(find().endedBy === later[0], `${where}: ended by ${find().endedBy}`);
  const ended = find();
  const said = talkOf(core, director, made!.owedId, id, where, check);
  // The talk names the payment it was about, from the missed payment's loan.
  const payment = Object.values(paymentWords.payments).find((name) =>
    said.includes(name),
  );
  check(Boolean(payment), `${where}: payment not named: ${said}`);
  return `${where}: ${said}\n    payment ${payment ?? "(not named)"}, the missed payment's loan ${missedLoan(core, ended.endedBy, made!.replyId)}\n    the promise's own move: ${moves.join("; ") || "(none)"}\n    quarrel ${quarrel!.id} over the earlier missed payment ${String(quarrel!.facts?.missedId)}\n    ${factId} owed to ${made!.owedId}, ${ended.outcome} by ${ended.endedBy} on ${ended.endedAt}, closeness from the promise to the talk ${before.toFixed(5)} to ${closenessBetween(core, id, made!.owedId).toFixed(5)}`;
}
