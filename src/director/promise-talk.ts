/**
 * A settled promise said at the next talk (Words lead brief T and rulings 1,
 * Nov 14 2026): the one who was promised brings it up once to the one who
 * promised, kept or broken, in their own bearing. What is said is the
 * conversation bank's `promise-kept` or `promise-broken` lines for the
 * promise's kind (requiresFacts `promise-<kind>`), with the bill by its name
 * where the promise was a vote. Order (fixed by the conversation engine):
 * the speaker's own hard news leads, then brought-up news, then this.
 *
 * The conversation engine asks `promiseSubject` for the subject between the
 * two, calls `promiseSaid` once it is said and `answerPromise` with the
 * player's answer; nothing else here writes a line.
 */
import { billNameOf, billTitleSaid } from "../english/bill-names";
import { questionSaid } from "../english/question-names";
import type { Fact } from "../english/conversation-words";
import {
  LEGISLATURE_MODULE_ID,
  billOf,
  bodyOf,
} from "../core2/modules/legislature";
import { meetingOf, OFFICE_DAY_MODULE_ID } from "../core2/modules/office-day";
import { daySince } from "../english/day-words";
import { paymentSaid } from "../english/payment-words";
import { applyCoreEvent, coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import { P as CORE } from "../core2/parameters";
import type { Director } from "./ledger";
import {
  PROMISE_FACT,
  PROMISE_KINDS,
  kindOf,
  markPromise,
  markPromiseSaid,
  payTieOwed,
  promiseParam,
  promisesBetween,
  type PromiseAnswerRow,
} from "./promises";

const PAY_ON_TIME = "pay-on-time";
const PAYMENT_MISSED = "credit.payment-missed";

/** A settled promise one person may say to another: the conversation subject's shape. */
export interface PromiseSubject {
  /** The kept fact's id: the listener's topic memory keeps it from coming back. */
  id: string;
  /** The promise's kind (src/director/data/promise-kinds.json). */
  promiseKind: string;
  kind: "promise-kept" | "promise-broken";
  facts: Record<string, Fact>;
  /** The scene reply that made it and the record that settled it. */
  aboutId: string;
  /**
   * How much it weighs as the talk's topic: the impact of the moment it was
   * promised over (what was staked), on the scale every talk topic is ranked
   * on (conversation.ts topicWeight); absent when no book holds that moment.
   */
  weight?: number;
}

/**
 * The newest settled promise the listener made to the speaker that the
 * speaker has not said yet; null when there is none. A lapsed promise (its
 * bill never came to a roll) is not said.
 */
export function promiseSubject(
  core: Readonly<CoreState>,
  director: Director,
  speakerId: PersonId,
  listenerId: PersonId,
): PromiseSubject | null {
  const row = promisesBetween(director.ledger, speakerId, listenerId).find(
    (entry) =>
      entry.holderId === listenerId &&
      entry.otherId === speakerId &&
      (entry.outcome === "kept" || entry.outcome === "broken") &&
      !entry.saidAt &&
      paymentNamed(core, entry),
  );
  if (!row) return null;
  const cites = [row.id, row.sourceId, ...(row.endedBy ? [row.endedBy] : [])];
  const fact = (text: string): Fact => ({ text, sourceRecordIds: cites });
  const facts: Record<string, Fact> = { [`promise-${row.kind}`]: fact("yes") };
  if (row.billId && core.modules.has(LEGISLATURE_MODULE_ID)) {
    const name = billNameOf(billOf(coreAPI(core as CoreState), row.billId));
    if (name)
      facts.bill = {
        text: billTitleSaid(name.title),
        sourceRecordIds: [row.billId],
      };
  }
  // A word on a question (hold-question) is brought up by the question's
  // short name, as the scene where it was given said it.
  const issue = row.question ? questionSaid(row.question) : null;
  if (issue) facts.issue = fact(issue);
  // A meeting promised: the body, and the day it was held as a past day
  // ("yesterday", "the other day", "on March 4th"), from the meeting's record.
  const meeting =
    row.meetingId && core.modules.has(OFFICE_DAY_MODULE_ID)
      ? meetingOf(coreAPI(core as CoreState), row.meetingId)
      : undefined;
  const body = meeting
    ? bodyOf(coreAPI(core as CoreState), meeting.officeId)
    : undefined;
  if (meeting && body) {
    facts["meeting-body"] = {
      text: body.bodyName ?? body.kind,
      sourceRecordIds: [body.id, meeting.id],
    };
    const held = daySince(meeting.date, core.date);
    if (held)
      facts["meeting-held"] = { text: held, sourceRecordIds: [meeting.id] };
  }
  // A payment promised: the loan behind the missed payment, named as people
  // say it ("the payday loan"). Broken, the new missed payment that broke it;
  // kept, the one the quarrel was over (the cause of the reply).
  const missed = paymentMissedOf(core, row);
  const payment = paymentSaid(missed?.facts?.loanKind);
  if (missed && payment)
    facts.payment = {
      text: payment,
      sourceRecordIds: [
        missed.id,
        ...(missed.facts?.loanId ? [missed.facts.loanId] : []),
      ],
    };
  return {
    id: row.id,
    promiseKind: row.kind,
    ...stakeOf(core, director, row),
    kind: row.outcome === "kept" ? "promise-kept" : "promise-broken",
    facts,
    aboutId: row.sourceId,
  };
}

/**
 * A payment the game has no name for is never talked about: no fallback name,
 * no empty slot (Account lead, Nov 15). Only kinds a played borrower was seen
 * to miss are named (data/english/payment-words.json); a pay-on-time promise
 * on any other kind is never said. Other promises always pass.
 */
export function paymentNamed(
  core: Readonly<CoreState>,
  row: { kind: string; sourceId: string; outcome: string; endedBy?: string },
): boolean {
  if (row.kind !== PAY_ON_TIME) return true;
  return paymentSaid(paymentMissedOf(core, row)?.facts?.loanKind) !== null;
}

/**
 * The missed-payment record a pay-on-time promise is about: the one that
 * broke it, else the one the quarrel behind the promise was over (the reply's
 * cause, `family.quarrel`, names it as `missedId`).
 */
function paymentMissedOf(
  core: Readonly<CoreState>,
  row: { kind: string; sourceId: string; outcome: string; endedBy?: string },
) {
  if (row.kind !== PAY_ON_TIME) return undefined;
  const log = core.durableLog;
  const broke =
    row.outcome === "broken" ? log.get(row.endedBy ?? "") : undefined;
  if (broke?.kind === PAYMENT_MISSED) return broke;
  const causeId = log.get(row.sourceId)?.facts?.causeId;
  const missedId = causeId ? log.get(causeId)?.facts?.missedId : undefined;
  const missed = missedId ? log.get(missedId) : undefined;
  return missed?.kind === PAYMENT_MISSED ? missed : undefined;
}

/**
 * What was staked: the moment the promise was made over, read from the book
 * of the one it was staged for (the scene reply's id begins with the
 * moment's id). A promise made in answer to a broken one ("I'll make it
 * right") stands on the moment of the promise it renews.
 */
function stakeOf(
  core: Readonly<CoreState>,
  director: Director,
  row: { sourceId: string; holderId: PersonId; otherId: PersonId },
): { weight: number } | Record<string, never> {
  let sourceId = row.sourceId;
  const seen = new Set<string>();
  while (sourceId.startsWith(ANSWER_PREFIX) && !seen.has(sourceId)) {
    seen.add(sourceId);
    const renews = core.durableLog.get(sourceId)?.facts?.promiseId;
    const earlier =
      typeof renews === "string"
        ? promisesBetween(director.ledger, row.holderId, row.otherId).find(
            (entry) => entry.id === renews,
          )
        : undefined;
    if (!earlier) return {};
    sourceId = earlier.sourceId;
  }
  if (!sourceId.startsWith(REPLY_PREFIX)) return {};
  const rest = sourceId.slice(REPLY_PREFIX.length);
  for (const personId of [row.holderId, row.otherId]) {
    const book = director.ledger.people.get(personId);
    if (!book) continue;
    for (
      let at = rest.indexOf(":");
      at >= zero;
      at = rest.indexOf(":", at + one)
    ) {
      const moment = book.momentsById.get(rest.slice(zero, at));
      if (moment) return { weight: moment.impact };
    }
  }
  return {};
}

const REPLY_PREFIX = "scene-reply:";
const ANSWER_PREFIX = "promise.answer:";

/**
 * The promise a subject of a talk says, from the conversation's own subject
 * (a raised subject's id is the speaker's id, ">", then the kept fact's id);
 * null for any other subject.
 */
export function promiseOfRaised(subject: {
  id: string;
  kind: string;
  facts: Record<string, Fact>;
  aboutId?: string;
}): PromiseSubject | null {
  if (subject.kind !== "promise-kept" && subject.kind !== "promise-broken")
    return null;
  const key = Object.keys(subject.facts).find((name) =>
    name.startsWith(PROMISE_PREFIX),
  );
  if (!key) return null;
  return {
    id: subject.id.slice(subject.id.indexOf(">") + CORE.one),
    promiseKind: key.slice(PROMISE_PREFIX.length),
    kind: subject.kind,
    facts: subject.facts,
    aboutId: subject.aboutId ?? "",
  };
}

const PROMISE_PREFIX = "promise-";

/** Once said: the promise is not brought up again by anyone. */
export function promiseSaid(
  core: Readonly<CoreState>,
  director: Director,
  subject: PromiseSubject,
): void {
  markPromiseSaid(director.ledger, subject.id, core.date);
  // Said in a talk, the two are together: a tie's move held for it is paid.
  payTieOwed(coreAPI(core as CoreState), director.ledger, subject.id);
}

const param = promiseParam;

/** A trait's value from -2 to 2 as a share from 0 to 1 (0.5 when unknown). */
const zero = CORE.zero;
const one = CORE.one;
const two = CORE.two;
const share = (traits: Readonly<Record<string, number>>, key: string) =>
  Math.min(one, Math.max(zero, ((traits[key] ?? zero) + two) / (two * two)));

const CONFLICT = "people-mind-v1:conflict";
const RELIABILITY = "people-mind-v1:reliability";

/**
 * The answers the one who promised may give when the one owed raises it
 * (Words lead rulings 2): to a kept promise, the two courtesy answers their
 * traits lean to most; to a broken one, owning it, explaining, denying and,
 * where a record could settle a new one, making it right. Each is a choice
 * in the conversation bank's `promise-kept` or `promise-broken` answers.
 */
export function promiseAnswers(
  core: Readonly<CoreState>,
  subject: PromiseSubject,
  answererId: PersonId,
): string[] {
  const answers = PROMISE_KINDS.answers;
  if (subject.kind === "promise-kept") {
    const traits = core.people.get(answererId)?.traits ?? {};
    const lean = (row: PromiseAnswerRow) =>
      row.trait ? (row.sign ?? one) * (traits[row.trait] ?? zero) : zero;
    return [...answers.kept]
      .sort((a, b) => lean(b) - lean(a) || a.id.localeCompare(b.id))
      .slice(zero, answers.keptOffered)
      .map((row) => row.id);
  }
  const renewable = kindOf(subject.promiseKind).renewable;
  return answers.broken
    .filter((row) => !row.renews || renewable)
    .map((row) => row.id);
}

/**
 * The answer given: written as a `promise.answer` record (held by the one who
 * promised, owed to the one who raised it) and read at once. Owning a broken
 * promise or explaining it wins back a share of what it cost, by how readily
 * the one owed smooths things over and how often this person let them down
 * before; explaining goes worse with one who counted on it and keeps their
 * own word. Denying it cools the tie further. Making it right writes a new
 * promise of the same kind, which the director keeps and its record settles.
 * Returns the record's id.
 */
export function answerPromise(
  core: CoreState,
  director: Director,
  subject: PromiseSubject,
  answererId: PersonId,
  answerId: string,
): string | null {
  const owed = promiseOtherOf(director, subject.id);
  const row = owed
    ? promisesBetween(director.ledger, answererId, owed).find(
        (entry) => entry.id === subject.id,
      )
    : undefined;
  if (!row || row.holderId !== answererId) return null;
  if (!promiseAnswers(core, subject, answererId).includes(answerId))
    return null;
  const otherId = row.otherId;
  const broken = subject.kind === "promise-broken";
  const rule = broken
    ? PROMISE_KINDS.answers.broken.find((entry) => entry.id === answerId)
    : PROMISE_KINDS.answers.kept.find((entry) => entry.id === answerId);
  const kind = kindOf(row.kind);
  const id = `promise.answer:${subject.id}:${core.date}`;
  applyCoreEvent(core, {
    id,
    date: core.date,
    kind: "promise.answer",
    personIds: [answererId, otherId],
    placeId: core.people.get(answererId)!.placeId,
    facts: {
      answer: answerId,
      promiseId: subject.id,
      outcome: broken ? "broken" : "kept",
      // A new promise of the same kind: the director keeps it as it keeps a
      // scene's (director.json keptFactKinds, producedByFact).
      ...(rule?.renews && kind.renewable ? { [PROMISE_FACT]: kind.id } : {}),
    },
    source: {
      tag: "SOURCED",
      citation:
        "Recorded talk: the answer the player chose to a promise raised.",
      asOf: core.date,
    },
  });
  markPromise(director.ledger, subject.id, { answer: answerId });
  if (!broken || !rule) return id;
  const traits = core.people.get(otherId)?.traits ?? {};
  let hours = zero;
  if (rule.recovers) {
    const before = promisesBetween(director.ledger, answererId, otherId).filter(
      (entry) =>
        entry.holderId === answererId &&
        entry.outcome === "broken" &&
        entry.id !== subject.id &&
        entry.endedAt !== undefined &&
        entry.endedAt <= (row.endedAt ?? core.date),
    ).length;
    hours =
      (param("promiseBrokenHours") *
        param("promiseOwnShare") *
        (one - share(traits, CONFLICT))) /
      (one + before);
    if (rule.countedOnFactor && kind.countedOn)
      hours *= one - share(traits, RELIABILITY);
  }
  if (rule.cools) hours = -param("promiseDeniedHours");
  if (hours)
    coreAPI(core).relationship(
      answererId,
      otherId,
      "contact",
      hours,
      undefined,
      {
        cause: `promise-answer:${answerId}`,
        sourceId: id,
      },
    );
  return id;
}

/** The one owed a kept promise fact, from any watched book that keeps it. */
function promiseOtherOf(director: Director, factId: string): PersonId | null {
  for (const book of director.ledger.people.values()) {
    const fact = book.keptFacts.get(factId);
    if (fact) return fact.otherId;
  }
  return null;
}

/**
 * A broken promise the one owed may hold against the one who promised when
 * they next ask for something, once (Words lead rulings 2: "Not after
 * {bill}."): the newest broken promise said at a talk and not yet held.
 * The asking engine calls `promiseHeld` once it is said.
 */
export function promiseToHold(
  director: Director,
  ownedId: PersonId,
  askerId: PersonId,
): { id: string; kind: string; billId?: string } | null {
  const row = promisesBetween(director.ledger, ownedId, askerId).find(
    (entry) =>
      entry.holderId === askerId &&
      entry.otherId === ownedId &&
      entry.outcome === "broken" &&
      !!entry.saidAt &&
      !entry.heldAt,
  );
  return row
    ? {
        id: row.id,
        kind: row.kind,
        ...(row.billId ? { billId: row.billId } : {}),
      }
    : null;
}

/** Once held against them: never a third time. */
export function promiseHeld(
  core: Readonly<CoreState>,
  director: Director,
  factId: string,
): void {
  markPromise(director.ledger, factId, { heldAt: core.date });
}
