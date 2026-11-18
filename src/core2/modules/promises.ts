/**
 * Promises kept, broken and remembered: the engine (owner, Nov 15, 2026:
 * "Okay, so promises. Yes, with your recommend": the promise record, its
 * settlement and the tie it moves are the simulation's; the director only
 * words it).
 *
 * A scene reply (or an answer that makes a broken promise right) that keeps
 * a promise names its kind and tie on its record (the director's
 * promiseReplyFacts). This module keeps one row for it, held by the one who
 * gave their word and owed to the other, filed under the records that would
 * settle it and the day its window closes, and ends it on the day that
 * record lands (a member's vote at the roll, a signature or veto, a missed
 * payment, a meeting held, a talk between the two) or its window closes. It
 * never scans: a settling record costs one set test and one index lookup,
 * and the end of each day one index lookup for the windows whose last day
 * it was (onAfterDay, after every record of the day, so a promise kept on
 * its last day is kept).
 *
 * Kept warms the tie once and broken cools it, through the core's writer,
 * citing the row; settled while the two were apart, the move waits for the
 * next time the one owed says it (`promiseSaid`). An answer to a broken
 * promise raised moves the tie by the answer's row (owning it, explaining,
 * denying). The kinds, windows and sizes are src/core2/data/promises/.
 */
import { trustLostHours } from "../closeness";
import { addDays, makeIsoDate } from "../kernel/dates";
import {
  billOf,
  billStances,
  votesOn,
  LEGISLATURE_MODULE_ID,
} from "./legislature";
import { officeActsOf } from "./office-day";
import { P } from "../parameters";
import { declareSnapshotCovered } from "../snapshot";
import type {
  CoreAPI,
  CoreEventInput,
  CoreModule,
  IsoDate,
  PersonId,
  RelationshipChangeNotice,
} from "../types";
import type { ModuleRow } from "../module-data";
import kindsJson from "../data/promises/promise-kinds.json" with { type: "json" };

export const PROMISES_MODULE_ID = "core2-promises-v1";

interface SettleRow {
  operation: string;
  eventKind?: string;
  relationshipCause?: string;
}

export interface PromiseKindRow {
  id: string;
  about: string;
  /** Cause record facts that tie the promise: its key on the promise, the cause's fact name. */
  tie: Readonly<Record<string, string>>;
  settle: readonly SettleRow[];
  /** The parameter (`parameters`) that holds the window in days. */
  windowDays: string;
  /** What the window's close means: kept, broken or lapsed. */
  windowEnds: "kept" | "broken" | "lapsed";
  /** The one owed counted on it: explaining a break goes worse than owning it. */
  countedOn: boolean;
  /** A record can settle a new promise of this kind ("I'll make it right"). */
  renewable: boolean;
  /**
   * Who gave their word: the first person on the reply (the one who
   * answered, by default) or the second (the player who asked, where the
   * promise was the price of a yes: `hold-question`).
   */
  heldBy?: "first" | "second";
  /**
   * Kept answers this kind never offers: a courtesy that fits a favor, not
   * a word kept by a vote ("I'm glad it helped.", Words lead, Nov 15 20:17Z).
   */
  keptWithout?: readonly string[];
}

export interface PromiseAnswerRow {
  id: string;
  trait?: string;
  sign?: number;
  recovers?: boolean;
  countedOnFactor?: boolean;
  cools?: boolean;
  renews?: boolean;
}

export interface PromiseKinds {
  schema: string;
  kinds: readonly PromiseKindRow[];
  parameters: Readonly<Record<string, { value: number; tag: string }>>;
  answers: {
    kept: readonly PromiseAnswerRow[];
    keptOffered: number;
    broken: readonly PromiseAnswerRow[];
    /** The one owed's trait whose low end smooths a broken promise over. */
    smoothsOverTrait: string;
    /** The one owed's trait that counts on a word: explaining goes worse by it. */
    countsOnTrait: string;
  };
}

export const PROMISE_KINDS = kindsJson as unknown as PromiseKinds;

/** The fact on a reply record that names a promise's kind. */
export const PROMISE_FACT = "promise";

const zero = P.zero;
const one = P.one;
const two = P.two;
const minusOne = P.negativeOne;

/** A size promises run on, from the parameter table in promise-kinds.json. */
export function promiseParam(key: string): number {
  const value = PROMISE_KINDS.parameters[key]?.value;
  if (value === undefined || !Number.isFinite(value))
    throw new Error(`Untagged promise parameter: ${key}`);
  return value;
}

export const kindOf = (id: string): PromiseKindRow => {
  const row = PROMISE_KINDS.kinds.find((entry) => entry.id === id);
  if (!row) throw new Error(`Unknown promise kind: ${id}`);
  return row;
};

/** One promise: who gave their word, to whom, on what, and how it ended. */
export interface PromiseRow {
  /** `promise:` and the record that made it. */
  id: string;
  kind: string;
  holderId: PersonId;
  otherId: PersonId;
  /** The scene reply (or answer) that made it. */
  sourceId: string;
  since: IsoDate;
  /** The day its window closes. */
  dueOn: IsoDate;
  billId?: string;
  /** The policy question promised on (a `hold-question` promise). */
  question?: string;
  /** The side promised on a bill or a question: 1 for, -1 against. */
  side?: number;
  /** The meeting promised to come to (office-day's meetings), for an "attend" promise. */
  meetingId?: string;
  outcome: "open" | "kept" | "broken" | "lapsed";
  endedBy?: string;
  endedAt?: IsoDate;
  /**
   * Hours of the tie's move held for the two's next time together: a promise
   * settled while the one owed was not with the one who promised (a meeting
   * they did not come to) moves the tie when it is said, not when settled.
   */
  tieOwed?: number;
  /**
   * Hours a broken promise took off the tie when it ended: the trust-lost
   * share of the hours the tie stood on that day (closeness.ts
   * trustLostHours). What each answer wins back or takes a share of, and what
   * dev mode's trace shows.
   */
  tieCost?: number;
  /** Hours the answer moved the tie: won back (more than 0) or taken (less). */
  answerHours?: number;
  /** Once the one owed has said it to the one who promised. */
  saidAt?: IsoDate;
  /** The answer the one who promised gave when it was said. */
  answer?: string;
  /** The two, sorted: the pair index. */
  pair: string;
  /** Every key a record that would settle it is filed under; empty once ended. */
  settleKeys: readonly string[];
}

const pairKey = (a: string, b: string) => [a, b].sort().join(":");

const table = (api: CoreAPI) =>
  api.moduleState(PROMISES_MODULE_ID).table("promises");
const settleTable = (api: CoreAPI) =>
  api.moduleState(PROMISES_MODULE_ID).table("settle");

/** The settle key an open promise is filed under, by the operation that settles it. */
const SETTLE_KEYS: Record<string, (row: PromiseRow) => string | null> = {
  "bill-roll": (row) => (row.billId ? `bill-roll|${row.billId}` : null),
  "holder-missed-payment": (row) => `holder-missed-payment|${row.holderId}`,
  "pair-talk": (row) => `pair-talk|${row.pair}`,
  // A word on a question is tested by the holder's own act on it, whether a
  // vote at a roll call or a signature or veto at the desk: one key for both.
  "question-vote": (row) => questionKey(row),
  "question-signature": (row) => questionKey(row),
  "meeting-held": (row) =>
    row.meetingId ? `meeting-held|${row.meetingId}` : null,
};

const questionKey = (row: PromiseRow): string | null =>
  row.question ? `question|${row.holderId}|${row.question}` : null;

/** The event kinds and tie causes some promise could be settled by (data, read once). */
const SETTLE_EVENT_KINDS = new Set(
  PROMISE_KINDS.kinds.flatMap((kind) =>
    kind.settle.flatMap((row) => (row.eventKind ? [row.eventKind] : [])),
  ),
);
const SETTLE_CAUSES = new Set(
  PROMISE_KINDS.kinds.flatMap((kind) =>
    kind.settle.flatMap((row) =>
      row.relationshipCause ? [row.relationshipCause] : [],
    ),
  ),
);

/** Open promises filed under one settle key. */
function filedUnder(api: CoreAPI, key: string): PromiseRow[] {
  return settleTable(api)
    .query("byKey", [key])
    .map((entry) => table(api).get(String(entry.promiseId)))
    .filter((row): row is ModuleRow => !!row) as unknown as PromiseRow[];
}

/** The promise a reply or an answer names: one row, filed. */
function keepPromise(api: CoreAPI, event: CoreEventInput): void {
  const kindId = event.facts?.[PROMISE_FACT];
  if (typeof kindId !== "string" || !kindId) return;
  const kind = kindOf(kindId);
  const [first, second] = event.personIds;
  const [holderId, otherId] =
    kind.heldBy === "second" ? [second, first] : [first, second];
  if (!holderId || !otherId) return;
  const id = `promise:${event.id}`;
  if (table(api).get(id)) return;
  const fact = (key: string) => {
    const value = event.facts?.[`promise-${key}`];
    return typeof value === "string" && value ? value : undefined;
  };
  const billId = fact("billId");
  const question = fact("question");
  const side = fact("side");
  const meetingId = fact("meetingId");
  const row: PromiseRow = {
    id,
    kind: kind.id,
    holderId: holderId as PersonId,
    otherId: otherId as PersonId,
    sourceId: event.id,
    since: makeIsoDate(event.date),
    dueOn: addDays(makeIsoDate(event.date), promiseParam(kind.windowDays)),
    ...(billId ? { billId } : {}),
    ...(question ? { question } : {}),
    ...(side ? { side: side === "no" || side === "-1" ? minusOne : one } : {}),
    ...(meetingId ? { meetingId } : {}),
    outcome: "open",
    pair: pairKey(holderId, otherId),
    settleKeys: [],
  };
  const keys = [
    ...new Set(
      kind.settle.flatMap((settle) => {
        const key = SETTLE_KEYS[settle.operation]?.(row);
        return key ? [key] : [];
      }),
    ),
  ];
  table(api).put({ ...row, settleKeys: keys } as unknown as ModuleRow);
  for (const key of keys)
    settleTable(api).put({
      id: `${key}|${id}`,
      key,
      promiseId: id,
    } as unknown as ModuleRow);
}

/**
 * End an open promise with how it ended and the record that ended it;
 * unfile it; and move the tie once: kept warms it, broken takes trust's
 * share of it (kept on the row as `tieCost`), through the core's writer
 * citing the row. Apart, the move waits for the two's
 * next time together (`tieOwed`, paid when it is said).
 */
function endPromise(
  api: CoreAPI,
  row: PromiseRow,
  outcome: "kept" | "broken" | "lapsed",
  endedBy: string,
  together = true,
): void {
  if (row.outcome !== "open") return;
  for (const key of row.settleKeys) settleTable(api).remove(`${key}|${row.id}`);
  const ended: PromiseRow = {
    ...row,
    outcome,
    endedAt: makeIsoDate(api.state.date),
    endedBy,
    settleKeys: [],
  };
  if (outcome === "lapsed") {
    table(api).put(ended as unknown as ModuleRow);
    return;
  }
  // Kept warms the tie by one talk's time; broken takes trust's share of
  // the tie it stands on today, so a close tie loses more than a slight one.
  const cost =
    outcome === "broken"
      ? trustLostHours(api.state, row.holderId, row.otherId)
      : undefined;
  const hours =
    outcome === "kept" ? promiseParam("promiseKeptHours") : -(cost ?? zero);
  const priced: PromiseRow =
    cost === undefined ? ended : { ...ended, tieCost: cost };
  if (!together) {
    table(api).put({ ...priced, tieOwed: hours } as unknown as ModuleRow);
    return;
  }
  table(api).put(priced as unknown as ModuleRow);
  moveTie(api, row, `promise-${outcome}`, hours, row.id, true);
}

/** The tie between the two moved once, through the core's writer, citing its record. */
function moveTie(
  api: CoreAPI,
  row: Pick<PromiseRow, "holderId" | "otherId">,
  cause: string,
  hours: number,
  sourceId: string,
  apart = false,
): void {
  if (
    !api.state.people.get(row.holderId)?.alive ||
    !api.state.people.get(row.otherId)?.alive
  )
    return;
  api.relationship(row.holderId, row.otherId, "contact", hours, undefined, {
    cause,
    sourceId,
    // Settled by the record (a roll call, a payment), not a meeting.
    ...(apart ? { apart: true } : {}),
  });
}

/** A core event that may settle open promises: one set test, then one lookup. */
function settleOnEvent(api: CoreAPI, event: CoreEventInput): void {
  if (!SETTLE_EVENT_KINDS.has(event.kind) || !settleTable(api).size) return;
  if (event.kind === "legislative-vote" || event.kind === "executive-action") {
    const billId = event.facts?.billId;
    if (typeof billId !== "string") return;
    if (!api.state.modules.has(LEGISLATURE_MODULE_ID)) return;
    settleQuestionPromises(api, event, billId);
    if (event.kind === "executive-action") return;
    const open = filedUnder(api, `bill-roll|${billId}`);
    if (!open.length) return;
    const rows = votesOn(api, billId);
    for (const promise of open) {
      // The roll of this chamber: a member of another chamber is not on it.
      const row = rows.find((vote) => vote.memberId === promise.holderId);
      if (!row) continue;
      const voted =
        row.vote === "yes" ? one : row.vote === "no" ? minusOne : zero;
      endPromise(
        api,
        promise,
        voted !== zero && voted === (promise.side ?? one) ? "kept" : "broken",
        event.id,
      );
    }
    return;
  }
  if (event.kind === "public-meeting") {
    // The meeting promised: kept if the one who promised was there (the
    // player's own presence, the meeting's record), broken if not.
    const meetingId = event.facts?.meetingId;
    if (typeof meetingId !== "string") return;
    for (const promise of filedUnder(api, `meeting-held|${meetingId}`)) {
      // There: still in the room at its close, or came and left (office-day's
      // own "attend" act on the meeting).
      const there =
        promise.holderId === api.state.playerId &&
        (event.facts?.playerPresent === "true" ||
          officeActsOf(api, promise.holderId).some(
            (act) => act.kind === "attend" && act.recordId === meetingId,
          ));
      // Not there, the friend learns it apart from them: the tie moves when
      // the two next talk and it is said.
      endPromise(api, promise, there ? "kept" : "broken", event.id, there);
    }
    return;
  }
  if (event.kind === "credit.payment-missed") {
    const holderId = event.personIds[zero];
    if (!holderId) return;
    for (const promise of filedUnder(api, `holder-missed-payment|${holderId}`))
      endPromise(api, promise, "broken", event.id);
  }
}

/**
 * A roll call, or a signature or veto, on a bill that moves a question some
 * open `hold-question` promise is about: each person who voted, or the
 * executive who acted, and holds such a word is held to it. The direction
 * they moved the question is their vote (yes 1, no -1; a signature 1, a veto
 * -1) times the way the bill points on it; kept if that is the side promised,
 * broken if against. A member who did not vote moves nothing.
 */
function settleQuestionPromises(
  api: CoreAPI,
  event: CoreEventInput,
  billId: string,
): void {
  const bill = billOf(api, billId);
  const stances = billStances(api, bill);
  if (!stances.length) return;
  const acts: { personId: string; vote: number }[] =
    event.kind === "executive-action"
      ? event.facts?.action === "signed" || event.facts?.action === "vetoed"
        ? event.personIds[zero]
          ? [
              {
                personId: event.personIds[zero],
                vote: event.facts.action === "signed" ? one : minusOne,
              },
            ]
          : []
        : []
      : votesOn(api, billId).flatMap((row) =>
          row.vote === "yes"
            ? [{ personId: row.memberId, vote: one }]
            : row.vote === "no"
              ? [{ personId: row.memberId, vote: minusOne }]
              : [],
        );
  for (const act of acts)
    for (const stance of stances)
      for (const promise of filedUnder(
        api,
        `question|${act.personId}|${stance.question}`,
      )) {
        const moved = act.vote * Math.sign(stance.position);
        endPromise(
          api,
          promise,
          moved === (promise.side ?? one) ? "kept" : "broken",
          event.id,
        );
      }
}

/** Time together that may settle open promises between the two (a talk). */
function settleOnTie(api: CoreAPI, notice: RelationshipChangeNotice): void {
  const cause = notice.reason?.cause;
  if (!cause || !SETTLE_CAUSES.has(cause) || !settleTable(api).size) return;
  for (const promise of filedUnder(
    api,
    `pair-talk|${pairKey(notice.actorId, notice.otherId)}`,
  )) {
    // The talk it was promised in (or answered in) is not the one that
    // keeps it: a later day's talk is.
    if (promise.since === api.state.date) continue;
    endPromise(
      api,
      promise,
      "kept",
      notice.reason?.sourceId ?? notice.relationshipId,
    );
  }
}

/**
 * Promises whose last day is today end as their kind says, after every
 * record of the day: one index lookup a day.
 */
function closeDue(api: CoreAPI): void {
  const due = table(api).query("byDue", [
    api.state.date,
  ]) as unknown as PromiseRow[];
  for (const promise of [...due])
    if (promise.outcome === "open")
      endPromise(
        api,
        promise,
        kindOf(promise.kind).windowEnds,
        `promise-due:${promise.id}:${api.state.date}`,
      );
}

/** A trait's value from -2 to 2 as a share from 0 to 1 (0.5 when unknown). */
const share = (traits: Readonly<Record<string, number>>, key: string) =>
  Math.min(one, Math.max(zero, ((traits[key] ?? zero) + two) / (two * two)));

/**
 * The answer to a promise raised (a `promise.answer` record): kept on the
 * row, and to a broken promise, the tie moved by the answer's row. Owning it
 * or explaining wins back a share of what it cost, by how readily the one
 * owed smooths things over and how often this person let them down before;
 * explaining goes worse with one who counted on it and keeps their own
 * word. Denying it takes a further share of what it cost. Making it right
 * is a new promise of the same kind (the record's own promise fact). The
 * hours moved are kept on the row (`answerHours`) beside the cost.
 */
function answerOnEvent(api: CoreAPI, event: CoreEventInput): void {
  const promiseId = event.facts?.promiseId;
  const answerId = event.facts?.answer;
  if (typeof promiseId !== "string" || typeof answerId !== "string") return;
  const row = table(api).get(promiseId) as unknown as PromiseRow | undefined;
  if (!row) return;
  const answered: PromiseRow = { ...row, answer: answerId };
  table(api).put(answered as unknown as ModuleRow);
  if (row.outcome !== "broken") return;
  const answers = PROMISE_KINDS.answers;
  const rule = answers.broken.find((entry) => entry.id === answerId);
  if (!rule) return;
  const kind = kindOf(row.kind);
  const traits = api.state.people.get(row.otherId)?.traits ?? {};
  // What the break cost the tie: each answer wins back or takes a share of it.
  const cost = row.tieCost ?? zero;
  let hours = zero;
  if (rule.recovers) {
    const before = promisesBetween(api, row.holderId, row.otherId).filter(
      (entry) =>
        entry.holderId === row.holderId &&
        entry.outcome === "broken" &&
        entry.id !== row.id &&
        entry.endedAt !== undefined &&
        entry.endedAt <= (row.endedAt ?? api.state.date),
    ).length;
    hours =
      (cost *
        promiseParam("promiseOwnShare") *
        (one - share(traits, answers.smoothsOverTrait))) /
      (one + before);
    if (rule.countedOnFactor && kind.countedOn)
      hours *= one - share(traits, answers.countsOnTrait);
  }
  if (rule.cools) hours = -cost * promiseParam("promiseDeniedShare");
  if (!hours) return;
  table(api).put({ ...answered, answerHours: hours } as unknown as ModuleRow);
  moveTie(api, row, `promise-answer:${answerId}`, hours, event.id);
}

export const PROMISES_MODULE: CoreModule = {
  id: PROMISES_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      promises: {
        indexes: {
          byPair: { fields: ["pair"] },
          byDue: { fields: ["dueOn"] },
          // Who gave their word and who is owed it: dev mode's list of a
          // person's promises, written only where a promise row is.
          byHolder: { fields: ["holderId"] },
          byOther: { fields: ["otherId"] },
        },
      },
      settle: { indexes: { byKey: { fields: ["key"] } } },
    },
  },
  eventKinds: ["scene.reply", "promise.answer", ...SETTLE_EVENT_KINDS],
  onEvent(api, event) {
    settleOnEvent(api, event);
    keepPromise(api, event);
    if (event.kind === "promise.answer") answerOnEvent(api, event);
  },
  relationshipKinds: ["*"],
  onRelationshipChange(api, notice) {
    settleOnTie(api, notice);
  },
  onAfterDay(api) {
    closeDue(api);
  },
  // A day nobody watches runs no onAfterDay: the windows that end on it
  // close the same way, so a skip leaves no promise open past its last day.
  onResultsDay(api) {
    closeDue(api);
  },
};
declareSnapshotCovered(PROMISES_MODULE_ID);

/** One promise by id. */
export function promiseOf(api: CoreAPI, id: string): PromiseRow | undefined {
  if (!api.state.modules.has(PROMISES_MODULE_ID)) return undefined;
  return table(api).get(id) as unknown as PromiseRow | undefined;
}

/**
 * The promises between two people, either way, newest first. What a talk, a
 * vote ask, a door or a recall reads.
 */
export function promisesBetween(
  api: CoreAPI,
  a: string,
  b: string,
): PromiseRow[] {
  if (!api.state.modules.has(PROMISES_MODULE_ID)) return [];
  return [
    ...(table(api).query("byPair", [pairKey(a, b)]) as unknown as PromiseRow[]),
  ].sort((x, y) => y.since.localeCompare(x.since) || x.id.localeCompare(y.id));
}

/**
 * Every promise a person gave or is owed, newest first: what dev mode lists
 * on their card, each opening in the Trace.
 */
export function promisesOf(api: CoreAPI, personId: string): PromiseRow[] {
  if (!api.state.modules.has(PROMISES_MODULE_ID)) return [];
  return [
    ...(table(api).query("byHolder", [personId]) as unknown as PromiseRow[]),
    ...(table(api).query("byOther", [personId]) as unknown as PromiseRow[]),
  ].sort((x, y) => y.since.localeCompare(x.since) || x.id.localeCompare(y.id));
}

/**
 * The one owed has said a settled promise to the one who promised: it is not
 * brought up again, and a tie's move held while they were apart is paid now.
 */
export function promiseSaid(api: CoreAPI, id: string): void {
  const row = promiseOf(api, id);
  if (!row) return;
  const said: PromiseRow = { ...row, saidAt: makeIsoDate(api.state.date) };
  const owed = row.tieOwed;
  if (owed && (row.outcome === "kept" || row.outcome === "broken")) {
    delete said.tieOwed;
    table(api).put(said as unknown as ModuleRow);
    moveTie(api, row, `promise-${row.outcome}`, owed, row.id, true);
    return;
  }
  table(api).put(said as unknown as ModuleRow);
}
