/**
 * Promises kept, broken and remembered (Words lead brief T, Nov 14 2026;
 * owner, Oct 13: an effect is a read, not a record).
 *
 * A scene ending that keeps a promise names its kind on its `scene.reply`
 * record (`promiseReplyFacts`, from `data/promise-kinds.json`), and the
 * director keeps it as a kept fact held by the one who answered and owed to
 * the other (ledger.ts `produceKeptFacts`). This file indexes each open
 * promise by the record that would settle it and by the day its window
 * closes, and ends it on the day that record lands (a member's vote at the
 * roll, a missed payment, a talk between the two) or its window closes. It
 * never scans: a settling record costs one set test and one map lookup, and
 * a day costs one map lookup.
 *
 * Kept warms the tie once and broken cools it, through the core's own
 * writer, citing the fact; the closeness engine and everything that reads
 * closeness read it. The one owed says it once at the next talk
 * (promise-talk.ts). Other engines read outcomes through `promisesBetween`.
 */
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { votesOn, LEGISLATURE_MODULE_ID } from "../core2/modules/legislature";
import type {
  CoreAPI,
  CoreEventInput,
  IsoDate,
  PersonId,
  RelationshipChangeNotice,
} from "../core2/types";
import kindsJson from "./data/promise-kinds.json" with { type: "json" };
import type { KeptFact, KeptPromise, Ledger } from "./types";

interface SettleRow {
  operation: string;
  eventKind?: string;
  relationshipCause?: string;
}

interface PromiseKindRow {
  id: string;
  about: string;
  /** Cause record facts that tie the promise: its key on the promise, the cause's fact name. */
  tie: Readonly<Record<string, string>>;
  settle: readonly SettleRow[];
  /** The director parameter that holds the window in days. */
  windowDays: string;
  /** What the window's close means: kept, broken or lapsed. */
  windowEnds: "kept" | "broken" | "lapsed";
  /** The one owed counted on it: explaining a break goes worse than owning it. */
  countedOn: boolean;
  /** A record can settle a new promise of this kind ("I'll make it right"). */
  renewable: boolean;
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

interface PromiseEndingRow {
  /** The purpose (or a variant's purpose) the scene plays. */
  purpose: string;
  ending: string;
  kind: string;
  /** The cause record kinds the tie can be read from; any cause when absent. */
  causeKinds?: readonly string[];
}

export interface PromiseKinds {
  schema: string;
  endings: readonly PromiseEndingRow[];
  kinds: readonly PromiseKindRow[];
  answers: {
    kept: readonly PromiseAnswerRow[];
    keptOffered: number;
    broken: readonly PromiseAnswerRow[];
  };
}

export const PROMISE_KINDS = kindsJson as unknown as PromiseKinds;

/** The fact on a `scene.reply` record that names a promise's kind. */
export const PROMISE_FACT = "promise";

export const kindOf = (id: string): PromiseKindRow => {
  const row = PROMISE_KINDS.kinds.find((entry) => entry.id === id);
  if (!row) throw new Error(`Unknown promise kind: ${id}`);
  return row;
};

/**
 * What a scene reply that reaches `endingId` writes about the promise it
 * keeps: its kind and its tie (the bill and the side, read from the cause
 * record). Empty when the ending keeps no promise a record can settle.
 */
export function promiseReplyFacts(scene: {
  purpose: string;
  variant?: { readonly purpose: string };
  cause: { kind: string; facts: Readonly<Record<string, string>> };
  endingId: string;
}): Record<string, string> {
  const purpose = scene.variant?.purpose ?? scene.purpose;
  // A cause's kind is the label's, `event:<record kind>` for a record.
  const causeKind = scene.cause.kind.replace(/^event:/, "");
  const row = PROMISE_KINDS.endings.find(
    (entry) =>
      entry.ending === scene.endingId &&
      // A family's row covers its variants (`ask-vote.friend` is `ask-vote`).
      (entry.purpose === purpose || purpose.startsWith(`${entry.purpose}.`)) &&
      (!entry.causeKinds || entry.causeKinds.includes(causeKind)),
  );
  if (!row) return {};
  const kind = kindOf(row.kind);
  if (!kind.settle.length) return {};
  const out: Record<string, string> = { [PROMISE_FACT]: kind.id };
  for (const [key, causeFact] of Object.entries(kind.tie)) {
    const value = scene.cause.facts[causeFact];
    // A tie the cause does not carry: the promise cannot be settled.
    if (!value) return {};
    out[`promise-${key}`] = value;
  }
  return out;
}

/** The settle key an open promise is filed under, by the operation that settles it. */
const settleKeys: Record<
  string,
  {
    ofFact(fact: KeptFact): string | null;
  }
> = {
  "bill-roll": {
    ofFact: (fact) =>
      fact.promise?.billId ? `bill-roll|${fact.promise.billId}` : null,
  },
  "holder-missed-payment": {
    ofFact: (fact) => `holder-missed-payment|${fact.holderId}`,
  },
  "pair-talk": {
    ofFact: (fact) => `pair-talk|${pairKey(fact.holderId, fact.otherId)}`,
  },
};

const pairKey = (a: string, b: string) => [a, b].sort().join(":");

/**
 * The promise a `scene.reply` names, as the kept fact's promise part, with
 * its due day from the kind's window. Null when the reply keeps none.
 */
export function promiseOfEvent(
  event: CoreEventInput,
  param: (key: string) => number,
): KeptPromise | null {
  const kindId = event.facts?.[PROMISE_FACT];
  if (typeof kindId !== "string" || !kindId) return null;
  const kind = kindOf(kindId);
  const billId = event.facts?.["promise-billId"];
  const side = event.facts?.["promise-side"];
  return {
    kind: kind.id,
    dueOn: addDays(makeIsoDate(event.date), param(kind.windowDays)),
    ...(typeof billId === "string" && billId ? { billId } : {}),
    ...(typeof side === "string" && side
      ? { side: side === "no" || side === "-1" ? -1 : 1 }
      : {}),
  };
}

/** File an open promise under its settling records and its due day. */
export function indexPromise(ledger: Ledger, fact: KeptFact): void {
  const promise = fact.promise;
  if (!promise || promise.outcome) return;
  for (const row of kindOf(promise.kind).settle) {
    const key = settleKeys[row.operation]?.ofFact(fact);
    if (!key) continue;
    let set = ledger.promisesBySettle.get(key);
    if (!set) ledger.promisesBySettle.set(key, (set = new Set()));
    set.add(fact.id);
  }
  let due = ledger.promisesDue.get(promise.dueOn);
  if (!due) ledger.promisesDue.set(promise.dueOn, (due = new Set()));
  due.add(fact.id);
}

/** Every watched person's copy of a kept fact, the holder's first. */
function copiesOf(ledger: Ledger, factId: string): KeptFact[] {
  const out: KeptFact[] = [];
  for (const book of ledger.people.values()) {
    const fact = book.keptFacts.get(factId);
    if (fact) out.push(fact);
  }
  return out;
}

/**
 * End an open promise with how it ended and the record that ended it, on
 * every copy; unfile it; and move the tie once: kept warms it, broken cools
 * it, through the core's writer citing the fact.
 */
function endPromise(
  api: CoreAPI,
  ledger: Ledger,
  factId: string,
  outcome: "kept" | "broken" | "lapsed",
  endedBy: string,
  param: (key: string) => number,
): void {
  const copies = copiesOf(ledger, factId).filter(
    (fact) => fact.promise && !fact.promise.outcome,
  );
  const first = copies[0];
  if (!first?.promise) return;
  for (const fact of copies) {
    fact.endedAt = api.state.date;
    fact.endedBy = endedBy;
    fact.promise = { ...fact.promise!, outcome };
  }
  for (const row of kindOf(first.promise.kind).settle) {
    const key = settleKeys[row.operation]?.ofFact(first);
    if (!key) continue;
    const set = ledger.promisesBySettle.get(key);
    set?.delete(factId);
    if (set && !set.size) ledger.promisesBySettle.delete(key);
  }
  const due = ledger.promisesDue.get(first.promise.dueOn);
  due?.delete(factId);
  if (due && !due.size) ledger.promisesDue.delete(first.promise.dueOn);
  if (outcome === "lapsed") return;
  const hours =
    outcome === "kept"
      ? param("promiseKeptHours")
      : -param("promiseBrokenHours");
  if (
    !api.state.people.get(first.holderId)?.alive ||
    !api.state.people.get(first.otherId)?.alive
  )
    return;
  api.relationship(first.holderId, first.otherId, "contact", hours, undefined, {
    cause: `promise-${outcome}`,
    sourceId: factId,
  });
}

/** The event kinds some open promise could be settled by (data, read once). */
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

/** A core event that may settle open promises: one set test, then one lookup. */
export function settlePromisesOnEvent(
  api: CoreAPI,
  ledger: Ledger,
  event: CoreEventInput,
  param: (key: string) => number,
): void {
  if (!SETTLE_EVENT_KINDS.has(event.kind) || !ledger.promisesBySettle.size)
    return;
  if (event.kind === "legislative-vote") {
    const billId = event.facts?.billId;
    if (typeof billId !== "string") return;
    const ids = ledger.promisesBySettle.get(`bill-roll|${billId}`);
    if (!ids || !api.state.modules.has(LEGISLATURE_MODULE_ID)) return;
    const rows = votesOn(api, billId);
    for (const id of [...ids]) {
      const fact = copiesOf(ledger, id)[0];
      if (!fact?.promise) continue;
      // The roll of this chamber: a member of another chamber is not on it.
      const row = rows.find((vote) => vote.memberId === fact.holderId);
      if (!row) continue;
      const voted = row.vote === "yes" ? 1 : row.vote === "no" ? -1 : 0;
      endPromise(
        api,
        ledger,
        id,
        voted !== 0 && voted === (fact.promise.side ?? 1) ? "kept" : "broken",
        event.id,
        param,
      );
    }
    return;
  }
  if (event.kind === "credit.payment-missed") {
    const holderId = event.personIds[0];
    const ids = holderId
      ? ledger.promisesBySettle.get(`holder-missed-payment|${holderId}`)
      : undefined;
    for (const id of [...(ids ?? [])])
      endPromise(api, ledger, id, "broken", event.id, param);
  }
}

/** Time together that may settle open promises between the two (a talk). */
export function settlePromisesOnTie(
  api: CoreAPI,
  ledger: Ledger,
  notice: RelationshipChangeNotice,
  param: (key: string) => number,
): void {
  const cause = notice.reason?.cause;
  if (!cause || !SETTLE_CAUSES.has(cause) || !ledger.promisesBySettle.size)
    return;
  const ids = ledger.promisesBySettle.get(
    `pair-talk|${pairKey(notice.actorId, notice.otherId)}`,
  );
  if (!ids) return;
  for (const id of [...ids])
    endPromise(
      api,
      ledger,
      id,
      "kept",
      notice.reason?.sourceId ?? notice.relationshipId,
      param,
    );
}

/** Promises whose window closes today end as their kind says. One lookup a day. */
export function closeDuePromises(
  api: CoreAPI,
  ledger: Ledger,
  param: (key: string) => number,
): void {
  const ids = ledger.promisesDue.get(api.state.date);
  if (!ids) return;
  for (const id of [...ids]) {
    const fact = copiesOf(ledger, id)[0];
    if (!fact?.promise) continue;
    endPromise(
      api,
      ledger,
      id,
      kindOf(fact.promise.kind).windowEnds,
      `promise-due:${id}:${api.state.date}`,
      param,
    );
  }
  ledger.promisesDue.delete(api.state.date);
}

export interface PromiseBetween {
  id: string;
  kind: string;
  holderId: PersonId;
  otherId: PersonId;
  /** The scene reply that made it. */
  sourceId: string;
  since: IsoDate;
  billId?: string;
  side?: number;
  outcome: "open" | "kept" | "broken" | "lapsed";
  endedBy?: string;
  endedAt?: IsoDate;
  saidAt?: IsoDate;
  answer?: string;
  heldAt?: IsoDate;
}

/**
 * The promises between two people, either way, newest first, from either
 * person's book (a watched person keeps every promise they made or were
 * made). What a vote ask, a door or a recall scene reads.
 */
export function promisesBetween(
  ledger: Ledger,
  a: PersonId,
  b: PersonId,
): PromiseBetween[] {
  const seen = new Map<string, PromiseBetween>();
  for (const [self, other] of [
    [a, b],
    [b, a],
  ] as const) {
    const book = ledger.people.get(self);
    for (const id of book?.keptFactsByOther.get(other) ?? []) {
      const fact = book!.keptFacts.get(id);
      if (!fact?.promise || seen.has(id)) continue;
      seen.set(id, {
        id,
        kind: fact.promise.kind,
        holderId: fact.holderId,
        otherId: fact.otherId,
        sourceId: fact.sourceId,
        since: fact.since,
        ...(fact.promise.billId ? { billId: fact.promise.billId } : {}),
        ...(fact.promise.side ? { side: fact.promise.side } : {}),
        outcome: fact.promise.outcome ?? "open",
        ...(fact.endedBy ? { endedBy: fact.endedBy } : {}),
        ...(fact.endedAt ? { endedAt: fact.endedAt } : {}),
        ...(fact.promise.saidAt ? { saidAt: fact.promise.saidAt } : {}),
        ...(fact.promise.answer ? { answer: fact.promise.answer } : {}),
        ...(fact.promise.heldAt ? { heldAt: fact.promise.heldAt } : {}),
      });
    }
  }
  return [...seen.values()].sort(
    (x, y) => y.since.localeCompare(x.since) || x.id.localeCompare(y.id),
  );
}

/** Mark a settled promise said by the one owed, on every copy (said once). */
export function markPromiseSaid(
  ledger: Ledger,
  factId: string,
  date: IsoDate,
): void {
  for (const fact of copiesOf(ledger, factId))
    if (fact.promise) fact.promise = { ...fact.promise, saidAt: date };
}

/** Set a field on every copy of a kept fact's promise. */
export function markPromise(
  ledger: Ledger,
  factId: string,
  fields: Partial<Pick<KeptPromise, "answer" | "heldAt">>,
): void {
  for (const fact of copiesOf(ledger, factId))
    if (fact.promise) fact.promise = { ...fact.promise, ...fields };
}
