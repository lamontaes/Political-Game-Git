/**
 * A promise to pay on time played on a real borrower, and the talk that says
 * it, shared by promises.test.ts and the script that writes the played file
 * (scripts/words/pay-on-time-played.ts). Nothing here is staged: the loan,
 * the missed payments, the quarrel, the apology, the promise, the job and the
 * talk are the engines' own, on the player's own clock. Each check is passed
 * in (`Check`), so a test asserts and a script stops on the first failure.
 */
import { closenessBetween } from "../../src/core2/closeness";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { restoreWorld, snapshotWorld } from "../../src/core2/snapshot";
import { applyCoreEvent, coreAPI } from "../../src/core2/state";
import type { CoreEventInput, CoreState, PersonId } from "../../src/core2/types";
import { openConversation, say } from "../../src/director/conversation";
import { paymentSaid } from "../../src/english/payment-words";
import type { Director } from "../../src/director/ledger";
import {
  paymentNamed,
  promiseAnswers,
  promiseSubject,
} from "../../src/director/promise-talk";
import { kindOf, promisesBetween } from "../../src/core2/modules/promises";
import type { TreeNode } from "../../src/director/scene-talk";
import { wordConversationMove } from "../../src/english/conversation-words";
import { chooseVariant } from "../../src/director/arc-variant";
import { play, type TownBorrower } from "./real-borrower";

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
    const renewed = promisesBetween(coreAPI(core), playerId, speakerId).find(
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



/** A promise the engines took, and the one who made it. */
interface Staged {
  readonly quarrel: CoreEventInput;
  readonly borrowerId: PersonId;
  readonly owedId: PersonId;
  readonly replyId: string;
}

/**
 * A promise to pay on time, played in a drawn place on whoever the credit
 * engine's own missed payment and the partnerships engine's own quarrel name
 * (`findTownBorrower`): the promise engine is one rule for every person (CTO,
 * Nov 17). Only each borrower's choice is staged, and labeled where it
 * stands: the apology answered with the promise to make it right, written as
 * the reply record the apology scene writes for it (`scene.reply` with the
 * promise's kind on it). Every money quarrel in the window gets one, so the
 * town's next missed payments are what break them. The window, the break or
 * keep, the tie's move and the talk are the engines' own, and each promise
 * must end as the rule says (broken by the holder's next missed payment in
 * its window, kept when none). Returns the played record, or what the place
 * lacked when no promise in it was broken (the place is passed over).
 */
export function playPayOnTime(
  found: TownBorrower,
  check: Check,
): { played?: string; passed: string } {
  const { core, director, playerId, where } = found;
  const staged: Staged[] = [];
  const quarrels: CoreEventInput[] = [found.quarrel];
  coreAPI(core).subscribeEvents(
    "promises-quarrel",
    ["family.quarrel"],
    (_, event) => {
      if (event.facts?.missedId && event.facts.owes && event !== found.quarrel)
        quarrels.push(event);
    },
  );
  const missedBy = new Map<string, CoreEventInput[]>();
  const hold = (event: CoreEventInput) => {
    const holder = event.personIds[0]!;
    missedBy.set(holder, [...(missedBy.get(holder) ?? []), event]);
  };
  hold(found.missed);
  coreAPI(core).subscribeEvents(
    "promises-test",
    ["credit.payment-missed"],
    (_, event) => hold(event),
  );
  const moves = new Map<string, string[]>();
  coreAPI(core).subscribeRelationshipChanges(
    "promises-tie",
    ["*"],
    (_, notice) => {
      const source = notice.reason?.sourceId;
      if (!source?.startsWith("promise:")) return;
      for (const change of notice.changes)
        if (change.measure === "level")
          moves.set(source, [
            ...(moves.get(source) ?? []),
            `${notice.date} ${notice.reason.cause}: tie level ${change.before.toFixed(8)} to ${change.after.toFixed(8)}`,
          ]);
    },
  );
  // HAND-STAGED: a borrower's choice to promise, as the scene's reply records
  // it (director/purpose-scene.ts, replyInScene). Nothing it settles is
  // written here.
  const stage = (quarrel: CoreEventInput) => {
    const borrowerId = String(quarrel.facts!.owes) as PersonId;
    const owedId = quarrel.personIds.find((id) => id !== borrowerId) as PersonId;
    const variant = chooseVariant(core, {
      family: "owed-apology",
      askerId: owedId,
      askedId: borrowerId,
      cause: {
        id: quarrel.id,
        date: quarrel.date,
        facts: Object.fromEntries(
          Object.entries(quarrel.facts ?? {}).map(([k, v]) => [k, String(v)]),
        ),
      },
    });
    check(
      /^owed-apology\.(money|close|pressed|repeat)$/.test(
        variant?.purpose ?? "",
      ),
      `${where}: variant ${variant?.purpose}`,
    );
    const replyId = `scene-reply:staged:${quarrel.id}:promised-to-make-it-right`;
    applyCoreEvent(core, {
      id: replyId,
      date: core.date,
      kind: "scene.reply",
      personIds: [borrowerId, owedId],
      placeId: core.people.get(borrowerId)!.placeId,
      facts: {
        typeKey: "apology",
        causeId: quarrel.id,
        variant: variant!.variant,
        move: "promise",
        promise: "pay-on-time",
      },
      source: {
        tag: "SOURCED",
        citation:
          "Staged reply: the borrower's choice to promise to pay on time.",
        asOf: core.date,
      },
    });
    staged.push({ quarrel, borrowerId, owedId, replyId });
  };
  const rowOf = (one: Staged) =>
    promisesBetween(coreAPI(core), one.borrowerId, one.owedId).find(
      (row) => row.id === `promise:${one.replyId}`,
    );
  // The engines' own days: stage a promise for each new money quarrel (a week
  // at a time) until every promise made has had its whole window.
  const first = core.date;
  let staged_ = 0;
  // The lender's talk is read the day a promise breaks: the engine keeps the
  // "why" of a person outside the player's circle a week (log-retention.json,
  // circleDecisionDetailDays), so the missed payment is read while it is kept.
  const said = new Map<string, string>();
  const unnamed = new Set<string>();
  const readTalk = (one: Staged) => {
    const row = rowOf(one)!;
    const ender = (missedBy.get(one.borrowerId) ?? []).find(
      (event) => event.id === row.endedBy,
    );
    const subject = promiseSubject(core, director, one.owedId, one.borrowerId);
    // A payment is said only for a loan kind the words name
    // (data/english/payment-words.json, paymentNamed): for any other kind the
    // lender says nothing, and that is the rule read here, not a failure.
    if (paymentSaid(ender?.facts?.loanKind as string | undefined) === null) {
      check(
        subject === null,
        `${where}: ${row.id} is said over a ${ender?.facts?.loanKind} loan the words do not name`,
      );
      unnamed.add(String(ender?.facts?.loanKind));
      said.set(row.id, "");
      return;
    }
    check(
      Boolean(subject),
      `${where}: ${row.id} gives the lender nothing to say the day it breaks (ended by ${row.endedBy}, in the log ${Boolean(core.durableLog.get(row.endedBy ?? ""))}, its loan ${ender?.facts?.loanKind})`,
    );
    const offered = promiseAnswers(core, subject!, one.borrowerId);
    check(
      offered.slice(0, 3).join() === "own-it,explain,deny",
      `${where}: offered ${offered.join(",")}`,
    );
    check(
      offered.includes("make-it-right") ===
        kindOf(subject!.promiseKind).renewable,
      `${where}: make-it-right offered ${offered.includes("make-it-right")}`,
    );
    check(paymentNamed(core, row), `${where}: ${row.id} names no payment`);
    said.set(
      row.id,
      `${one.owedId} brings it up with ${offered.join(", ")} offered, the payment named from the ${ender?.facts?.loanKind} loan ${ender?.facts?.loanId}`,
    );
  };
  for (;;) {
    while (staged_ < quarrels.length) stage(quarrels[staged_++]!);
    for (const one of staged)
      if (rowOf(one)!.outcome === "broken" && !said.has(rowOf(one)!.id))
        readTalk(one);
    const last = staged.reduce(
      (day, one) => (rowOf(one)!.dueOn > day ? rowOf(one)!.dueOn : day),
      first,
    );
    if (core.date > last) break;
    play(core, playerId, 3);
  }
  // Each promise ends as the rule says: broken by the holder's first missed
  // payment inside its window, kept when none fell in it.
  const broken: Staged[] = [];
  const lines: string[] = [];
  for (const one of staged) {
    const row = rowOf(one);
    check(Boolean(row), `${where}: ${one.replyId} was not kept as a record`);
    const misses = (missedBy.get(one.borrowerId) ?? []).filter(
      (event) => event.date > row!.since && event.date <= row!.dueOn,
    );
    if (misses.length) {
      check(
        row!.outcome === "broken",
        `${where}: ${row!.id} ${row!.outcome} with the holder's missed payment ${misses[0]!.id} in its window`,
      );
      check(
        row!.endedBy === misses[0]!.id,
        `${where}: ${row!.id} ended by ${row!.endedBy}, the first missed payment was ${misses[0]!.id}`,
      );
      // The break took trust's share of the tie, kept on the row
      // (people-broken-promise-costs-share-of-tie).
      check(
        (row!.tieCost ?? 0) > 0,
        `${where}: ${row!.id} cost the tie ${row!.tieCost}`,
      );
      check(
        (moves.get(row!.id) ?? []).length > 0,
        `${where}: ${row!.id} broke and moved no tie`,
      );
      broken.push(one);
    } else
      check(
        row!.outcome === "kept",
        `${where}: ${row!.id} ${row!.outcome} with no missed payment in its window`,
      );
    lines.push(`${row!.id} ${row!.outcome}`);
  }
  const passed = `${where}: ${staged.length} promise(s) to pay on time, ${broken.length} broken (${lines.join("; ")})`;
  const spoken = broken.filter((one) => said.get(rowOf(one)!.id));
  const noWords = [...unnamed].join(", ");
  if (!spoken.length)
    return {
      passed: `${passed}${noWords ? `; no words for the ${noWords} payment the broken promise was over (Story's payment words), so no lender says it` : ""}`,
    };
  const one = spoken[0]!;
  const row = rowOf(one)!;
  return {
    passed,
    played: `${where}: ${said.get(row.id)}\n    the promise's own move: ${(moves.get(row.id) ?? []).join("; ") || "(none)"}\n    quarrel ${one.quarrel.id} over the earlier missed payment ${String(one.quarrel.facts?.missedId)}\n    ${row.id} owed to ${one.owedId}, ${row.outcome} by ${row.endedBy} on ${row.endedAt} at a cost of ${row.tieCost?.toFixed(4)} hours`,
  };
}
