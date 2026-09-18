import { evaluateDecision } from "./decisions";
import { personName } from "./people";
import { ensurePeopleTraits, traitConsiderations } from "./people-traits";
import { recordEventKnowledge } from "./records";
import { recordWorldEvent } from "./world";
import type { DecisionConsideration, EntityId, World } from "./types";

/**
 * Asking to change something you already agreed to (CRUNCH47 F47.1,
 * cargo family life-promise).
 *
 * The point of this is that an agreement can be renegotiated rather than only
 * kept or quietly dropped. Asking is not breaking: the obligation stays
 * exactly where it was unless the other person actually agrees to move it, and
 * if they will not, what stands is what was already agreed.
 *
 * The other person's answer is decided before a word of it is chosen, and the
 * revision on offer is one of two authored ones — a later day, or a smaller
 * part of it — never a new arrangement composed for the moment.
 */

export const PROMISE_TAG = "promise.v1";
export const REVISION_ASKED_EVENT = "life.agreement-revision-asked";
export const REVISION_AGREED_EVENT = "life.agreement-revised";

export interface PromiseRevision {
  readonly id: string;
  /** What the player would be asking for, in their own words. */
  readonly label: string;
  /** What it would actually change about the arrangement. */
  readonly meaning: string;
}

/** The two things anybody can actually ask for. Authored, not composed. */
export const PROMISE_REVISIONS: readonly PromiseRevision[] = [
  {
    id: "more-time",
    label: "a later day for it",
    meaning: "The thing still gets done; it gets done later.",
  },
  {
    id: "smaller-part",
    label: "a smaller part of it",
    meaning: "Less is taken on, and what is taken on is still owed.",
  },
];

export function promiseRevision(id: string): PromiseRevision | undefined {
  return PROMISE_REVISIONS.find((revision) => revision.id === id);
}

/** What the other person means, decided before any wording is chosen. */
export type PromiseOutcome =
  "accepts-change" | "needs-answer" | "holds-boundary";

export interface DecidePromiseInput {
  readonly personId: EntityId;
  readonly counterpartPersonId: EntityId;
  readonly requestEventId: EntityId;
  readonly revisionId: string;
}

/**
 * Whether they will move, want an answer first, or are relying on what was
 * agreed.
 *
 * Somebody dependable holds the arrangement — they follow through and expect
 * the same, which is the high end of that trait and not the low one. That
 * reading is the whole of Q47-004 and it is load-bearing here.
 */
export function decidePromiseRenegotiation(
  world: World,
  input: DecidePromiseInput,
): { readonly outcome: PromiseOutcome; readonly world: World } {
  if (!promiseRevision(input.revisionId)) {
    throw new Error(
      `Not an arrangement anybody can ask for: ${input.revisionId}`,
    );
  }
  const withTraits = ensurePeopleTraits(world, [input.counterpartPersonId]);
  const considerations: readonly DecisionConsideration[] = traitConsiderations(
    withTraits,
    input.counterpartPersonId,
    `promise:${input.requestEventId}`,
    [
      {
        optionKey: "holds-boundary",
        trait: "reliability",
        pole: "high",
        explanation: "They follow through on things and expect the same.",
      },
      {
        optionKey: "accepts-change",
        trait: "conflict",
        pole: "low",
        explanation: "They would rather accommodate it than argue about it.",
      },
      {
        optionKey: "needs-answer",
        trait: "deliberation",
        pole: "high",
        explanation:
          "They want to know where it stands before agreeing to anything.",
      },
      {
        optionKey: "accepts-change",
        trait: "sociability",
        pole: "high",
        explanation: "They would rather keep the person than the arrangement.",
      },
    ],
  );
  const evaluation = evaluateDecision(withTraits, {
    stableKey: `promise:${input.requestEventId}:${input.revisionId}:${withTraits.currentDate}`,
    decisionType: "people.promise-renegotiation",
    actorPersonId: input.counterpartPersonId,
    cutoff: {
      asOfDate: withTraits.currentDate,
      historySequenceExclusive: withTraits.history.nextSequence,
    },
    subject: { kind: "context:life", key: "agreement", entityId: null },
    options: [
      {
        key: "accepts-change",
        label: "Agree to it",
        description: "Take the revised arrangement.",
      },
      {
        key: "needs-answer",
        label: "Wants an answer",
        description: "Leave it open and ask again.",
      },
      {
        key: "holds-boundary",
        label: "Keeps the arrangement",
        description: "Rely on what was agreed.",
      },
    ],
    constraints: [],
    considerations,
    perceptionIds: [],
    randomness: "close-choices",
    retention: "ephemeral",
  });
  return {
    outcome: (evaluation.selectedOptionKey ?? "needs-answer") as PromiseOutcome,
    world: withTraits,
  };
}

export interface RecordPromiseInput {
  readonly personId: EntityId;
  readonly counterpartPersonId: EntityId;
  readonly requestEventId: EntityId;
  readonly revisionId: string;
  readonly outcome: PromiseOutcome;
  /** The task in the asker's own words, as the record holds it. */
  readonly task: string;
  /** The exact words the other person said, as the scene showed them. */
  readonly statement: string;
}

/**
 * Writes that it was asked, and separately whether it was agreed.
 *
 * Asking is always on the record; the arrangement only changes when the other
 * person actually agreed to change it. Those are two events rather than one,
 * because "I asked and they said no" and "I asked and they said yes" should
 * not be the same record with a different flag on it.
 */
export function recordPromiseRenegotiation(
  world: World,
  input: RecordPromiseInput,
): { world: World; revised: boolean } {
  const person = world.people[input.personId];
  const counterpart = world.people[input.counterpartPersonId];
  if (!person || !counterpart) {
    throw new Error("An arrangement needs both people.");
  }
  const revision = promiseRevision(input.revisionId);
  if (!revision) {
    throw new Error(
      `Not an arrangement anybody can ask for: ${input.revisionId}`,
    );
  }
  const stableKey = `promise:${input.requestEventId}:${input.revisionId}`;
  let next = recordWorldEvent(world, {
    stableKey: `${stableKey}:asked`,
    type: REVISION_ASKED_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: person.homeJurisdictionId,
    involvedEntityIds: [input.personId, input.counterpartPersonId],
    participants: [
      {
        personId: input.personId,
        role: "agency:actor",
        detail: `Asked for ${revision.label}`,
      },
      {
        personId: input.counterpartPersonId,
        role: "focus:respondent",
        detail: input.statement,
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      PROMISE_TAG,
      `promise.revision:${revision.id}`,
      `promise.outcome:${input.outcome}`,
    ],
    summary: `${personName(person)} asked ${personName(counterpart)} for ${revision.label} on ${input.task}.`,
    context: {
      location: null,
      socialContext: "Two people revisiting something already agreed.",
      pressure: null,
      choice: `Asked for ${revision.label}`,
      motivation: revision.meaning,
      immediateReaction: input.statement,
    },
  });
  const asked = next.history.events.at(-1)!;
  next = recordEventKnowledge(next, {
    stableKey: `${stableKey}:asked:told`,
    personId: input.counterpartPersonId,
    eventId: asked.id,
    learnedAt: next.currentDate,
    believedSummary: asked.summary,
    accuracy: "accurate",
    confidence: "high",
    source: { kind: "told-by", sourcePersonId: input.personId, claimId: null },
  });
  if (input.outcome !== "accepts-change") {
    // Nothing moved. What was agreed is still what is agreed, and asking did
    // not weaken it.
    return { world: next, revised: false };
  }
  next = recordWorldEvent(next, {
    stableKey: `${stableKey}:agreed`,
    type: REVISION_AGREED_EVENT,
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: person.homeJurisdictionId,
    involvedEntityIds: [input.personId, input.counterpartPersonId],
    participants: [
      {
        personId: input.counterpartPersonId,
        role: "agency:actor",
        detail: input.statement,
      },
      {
        personId: input.personId,
        role: "focus:respondent",
        detail: `Now owes ${revision.label} on ${input.task}`,
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [PROMISE_TAG, `promise.revised:${revision.id}`],
    summary: `${personName(counterpart)} agreed to ${revision.label} on ${input.task}.`,
    context: {
      location: null,
      socialContext: "An arrangement changed by agreement.",
      pressure: null,
      choice: null,
      motivation: revision.meaning,
      immediateReaction: input.statement,
    },
  });
  const agreedEvent = next.history.events.at(-1)!;
  next = recordEventKnowledge(next, {
    stableKey: `${stableKey}:agreed:told`,
    personId: input.personId,
    eventId: agreedEvent.id,
    learnedAt: next.currentDate,
    believedSummary: agreedEvent.summary,
    accuracy: "accurate",
    confidence: "high",
    source: {
      kind: "told-by",
      sourcePersonId: input.counterpartPersonId,
      claimId: null,
    },
  });
  return { world: next, revised: true };
}

/** The revision these two actually agreed, if they agreed one. */
export function agreedRevision(
  world: World,
  requestEventId: EntityId,
): PromiseRevision | undefined {
  const event = world.history.events.find(
    (entry) =>
      entry.type === REVISION_AGREED_EVENT &&
      entry.tags.some((tag) => tag.startsWith("promise.revised:")) &&
      entry.stableKey.startsWith(`promise:${requestEventId}:`),
  );
  const tag = event?.tags.find((entry) => entry.startsWith("promise.revised:"));
  return tag
    ? promiseRevision(tag.slice("promise.revised:".length))
    : undefined;
}

/** Whether this arrangement has already been asked about, so it is asked once. */
export function renegotiationAsked(
  world: World,
  requestEventId: EntityId,
): boolean {
  return world.history.events.some(
    (entry) =>
      entry.type === REVISION_ASKED_EVENT &&
      entry.stableKey.startsWith(`promise:${requestEventId}:`),
  );
}
