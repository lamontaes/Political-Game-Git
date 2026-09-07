import type { EntityId, IsoDate } from "../simulation";

/**
 * The vocabulary a development inspector uses to talk about records it did
 * not write.
 *
 * Everything in this module is a *projection*. The simulation already records
 * parentage, provenance, sources and supersession on the record families
 * themselves; nothing here adds an edge, and nothing here is persisted. A
 * projected node is a read of one canonical record at one moment, and the only
 * claims it makes about causality are claims the record itself already makes.
 *
 * That constraint is the whole point. A tracing tool that guesses is worse
 * than no tracing tool, because a guessed parent looks exactly like a recorded
 * one in a bug report. Where the repository recorded nothing, this model has a
 * place to say so — `unrecordedLinks` — rather than a place to put a plausible
 * answer.
 */

export const TRACE_MODEL_VERSION = "causal-trace-model-v1";

/**
 * What kind of thing a record is, epistemically.
 *
 * This is not a topic taxonomy and not a table name. It answers the question a
 * developer actually asks when a trace surprises them: is this the world's own
 * account of what happened, something a person said, something a person came
 * to know, something a person concluded, or a decision that followed?
 *
 * `presentation-metadata` exists for sources that carry development or display
 * bookkeeping rather than world truth. No built-in source uses it today; it is
 * declared so a later source can classify honestly instead of borrowing a
 * class that would make debug data look canonical.
 */
export type TraceRecordClass =
  | "canonical-event"
  | "person-fact"
  | "causal-process"
  | "effect-activation"
  | "spoken-claim"
  | "knowledge-received"
  | "evidence-artifact"
  | "evidence-discovery"
  | "memory"
  | "perception"
  | "mind-state"
  | "private-belief"
  | "public-position"
  | "commitment"
  | "relationship-change"
  | "decision-trace"
  | "incident"
  | "incident-state"
  | "scheduled-transition"
  | "scheduled-transition-state"
  | "presentation-metadata"
  | "unknown";

export const TRACE_RECORD_CLASSES: readonly TraceRecordClass[] = [
  "canonical-event",
  "person-fact",
  "causal-process",
  "effect-activation",
  "spoken-claim",
  "knowledge-received",
  "evidence-artifact",
  "evidence-discovery",
  "memory",
  "perception",
  "mind-state",
  "private-belief",
  "public-position",
  "commitment",
  "relationship-change",
  "decision-trace",
  "incident",
  "incident-state",
  "scheduled-transition",
  "scheduled-transition-state",
  "presentation-metadata",
  "unknown",
];

/**
 * Where a record's content came from, separately from what kind of record it
 * is.
 *
 * Authored truth and simulated truth are both canonical, and telling them
 * apart is the difference between "the simulation produced this" and
 * "somebody wrote this into the fixture". The repository already draws the
 * line on every family that carries a provenance field; this axis reads that
 * field rather than adding one.
 *
 * `unrecorded` is the honest answer for a family that carries no provenance at
 * all. It is not a synonym for authored.
 */
export type TraceTruthOrigin =
  | "authored"
  | "initialization"
  | "generated"
  | "simulated"
  | "source-record"
  | "unrecorded";

export const TRACE_TRUTH_ORIGINS: readonly TraceTruthOrigin[] = [
  "authored",
  "initialization",
  "generated",
  "simulated",
  "source-record",
  "unrecorded",
];

/**
 * The four things one record can say about another.
 *
 * Deliberately small. The precise field is carried in `role` —
 * `source.claimId`, `parentCausalIds[1]`, `context.perceptionIds[0]` — so
 * filtering stays coarse and readable while the trace itself stays exact about
 * which field produced the edge.
 */
export type TraceLinkKind =
  "causal-parent" | "source-record" | "supersedes" | "outcome";

export const TRACE_LINK_KINDS: readonly TraceLinkKind[] = [
  "causal-parent",
  "source-record",
  "supersedes",
  "outcome",
];

/** One recorded pointer from this record to another. */
export interface TraceLink {
  readonly kind: TraceLinkKind;
  /** The field that produced the edge, written the way the record spells it. */
  readonly role: string;
  readonly targetId: EntityId;
}

/**
 * A place the record has a slot for a link and left it empty.
 *
 * A nullable `eventId`, an unset supersession pointer, a provenance variant
 * that names an outlet instead of a record. These are boundaries a trace has
 * to be able to show, because "the chain stops here" and "the tool did not
 * look" are different findings.
 */
export interface TraceUnrecordedLink {
  readonly kind: TraceLinkKind;
  readonly role: string;
  readonly note: string;
}

/** A non-record entity the record names: a person, a jurisdiction, a catalog id. */
export interface TraceEntityRef {
  readonly role: string;
  readonly entityId: EntityId;
}

/**
 * One canonical record, projected.
 *
 * `developmentSummary` is written in field vocabulary on purpose. It is not
 * player prose and must never read like it: a developer looking at a trace is
 * reading the record, and dressing it up as narration hides which field the
 * claim came from. Where the record carries its own recorded text — an event
 * summary, a claim statement, a perception assertion — that text is carried
 * verbatim in `recordText`, labelled as the record's rather than the tool's.
 */
export interface TraceNode {
  readonly id: EntityId;
  /** The registered source that produced this node. */
  readonly sourceKey: string;
  /** Where the record lives, e.g. `history.claims`. */
  readonly family: string;
  readonly recordClass: TraceRecordClass;
  readonly truthOrigin: TraceTruthOrigin;
  readonly stableKey: string;
  /**
   * The global append sequence, which is also the deterministic order.
   *
   * Null for families the history store does not sequence — person facts live
   * on the person rather than in the append log. Inventing a sequence for them
   * would be inventing an ordering identity the repository never asserted, so
   * they order by family and id instead and say so.
   */
  readonly sequence: number | null;
  readonly occurredAt: IsoDate | null;
  readonly recordedAt: IsoDate | null;
  readonly entityRefs: readonly TraceEntityRef[];
  readonly links: readonly TraceLink[];
  readonly unrecordedLinks: readonly TraceUnrecordedLink[];
  readonly developmentSummary: string;
  readonly recordText: string | null;
}

export interface TraceNodeInput {
  readonly id: EntityId;
  readonly family: string;
  readonly recordClass: TraceRecordClass;
  readonly truthOrigin: TraceTruthOrigin;
  readonly stableKey: string;
  readonly sequence: number | null;
  readonly occurredAt?: IsoDate | null;
  readonly recordedAt?: IsoDate | null;
  readonly entityRefs?: readonly TraceEntityRef[];
  readonly links?: readonly TraceLink[];
  readonly unrecordedLinks?: readonly TraceUnrecordedLink[];
  readonly developmentSummary: string;
  readonly recordText?: string | null;
}

/**
 * Normalizes one projected record.
 *
 * Duplicate edges are collapsed because a record naming the same parent twice
 * through the same field is one causal statement, not two, and a walk that
 * visited it twice would report a fan-out the world never had. Order is
 * otherwise left exactly as the adapter produced it, which is field order on
 * the record — the only ordering the repository actually asserts.
 */
export function createTraceNode(input: TraceNodeInput): TraceNode {
  if (input.id.length === 0) {
    throw new Error("A trace node needs the record's stable id.");
  }
  if (
    input.sequence !== null &&
    (!Number.isSafeInteger(input.sequence) || input.sequence < 0)
  ) {
    throw new Error(`Trace node ${input.id} has an unusable append sequence.`);
  }
  return {
    id: input.id,
    sourceKey: "",
    family: input.family,
    recordClass: input.recordClass,
    truthOrigin: input.truthOrigin,
    stableKey: input.stableKey,
    sequence: input.sequence,
    occurredAt: input.occurredAt ?? null,
    recordedAt: input.recordedAt ?? null,
    entityRefs: dedupeEntityRefs(input.entityRefs ?? []),
    links: dedupeLinks(input.links ?? []),
    unrecordedLinks: [...(input.unrecordedLinks ?? [])],
    developmentSummary: input.developmentSummary,
    recordText: input.recordText ?? null,
  };
}

function dedupeLinks(links: readonly TraceLink[]): readonly TraceLink[] {
  const seen = new Set<string>();
  const kept: TraceLink[] = [];
  for (const link of links) {
    const key = `${link.kind} ${link.role} ${link.targetId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(link);
  }
  return kept;
}

function dedupeEntityRefs(
  refs: readonly TraceEntityRef[],
): readonly TraceEntityRef[] {
  const seen = new Set<string>();
  const kept: TraceEntityRef[] = [];
  for (const ref of refs) {
    const key = `${ref.role} ${ref.entityId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(ref);
  }
  return kept;
}

/**
 * Deterministic node order.
 *
 * Sequenced records come first in append order, because that is the order the
 * world itself asserts. Unsequenced families follow, ordered by family and id,
 * which is stable without claiming they happened after anything.
 */
export function compareTraceNodes(left: TraceNode, right: TraceNode): number {
  if (left.sequence !== null && right.sequence !== null) {
    if (left.sequence !== right.sequence) return left.sequence - right.sequence;
  } else if (left.sequence !== right.sequence) {
    return left.sequence === null ? 1 : -1;
  } else if (left.family !== right.family) {
    return left.family < right.family ? -1 : 1;
  }
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}

/** Builds link lists from an id array without pretending an empty array is a gap. */
export function linksFromIds(
  kind: TraceLinkKind,
  role: string,
  ids: readonly EntityId[],
): readonly TraceLink[] {
  return ids.map((targetId, index) => ({
    kind,
    role: `${role}[${index}]`,
    targetId,
  }));
}

/** Builds entity references from an id array, keeping the recorded position. */
export function entityRefsFromIds(
  role: string,
  ids: readonly EntityId[],
): readonly TraceEntityRef[] {
  return ids.map((entityId, index) => ({
    role: `${role}[${index}]`,
    entityId,
  }));
}

export interface OptionalLinkProjection {
  readonly links: readonly TraceLink[];
  readonly unrecordedLinks: readonly TraceUnrecordedLink[];
}

/** One optional pointer: either an edge or a recorded absence, never a guess. */
export function optionalLink(
  kind: TraceLinkKind,
  role: string,
  targetId: EntityId | null,
  absenceNote: string,
): OptionalLinkProjection {
  if (targetId === null) {
    return { links: [], unrecordedLinks: [{ kind, role, note: absenceNote }] };
  }
  return { links: [{ kind, role, targetId }], unrecordedLinks: [] };
}
