import { evaluateDecision } from "./decisions";
import { personName } from "./people";
import { STUDY_COLLABORATION_EVENT, STUDY_TAG } from "./people-study";
import { ensurePeopleTraits, traitConsiderations } from "./people-traits";
import { recordEventKnowledge, recordRelationshipInteraction } from "./records";
import { daysBetween } from "./dates";
import { recordWorldEvent } from "./world";
import type { DecisionConsideration, EntityId, World } from "./types";

/**
 * Deciding how to do the work you agreed to do (CRUNCH47 F47.1).
 *
 * Agreeing to work with somebody is not agreeing on how. This owns the second
 * question: each of them has an approach, the approaches are named things
 * rather than invented sentences, and the two people may simply want different
 * ones.
 *
 * Every approach here is an entry in the authored registry below and is
 * referred to by its id. Nothing composes a plan out of prose, and the
 * compromise a player can offer is one that was written down in advance and
 * shown to them before they offer it — never one assembled to fit the moment.
 *
 * Disagreeing is ordinary. Holding your position does not make anybody cruel,
 * offering a revision does not oblige the other person to take it, and a
 * question left open is left open rather than turned into a grievance.
 */

export const STUDY_PLAN_TAG = "study.plan.v1";
export const PLAN_PROPOSED_EVENT = "life.study-plan-proposed";
export const PLAN_SETTLED_EVENT = "life.study-plan-settled";
export const PLAN_OPEN_EVENT = "life.study-plan-left-open";

/** How long a question stays put after it was left open. */
export const PLAN_REST_DAYS = 14;

export interface StudyApproach {
  readonly id: string;
  /** What it is called, in the words the two of them would use. */
  readonly label: string;
  /** What choosing it would actually require of them. */
  readonly requires: string;
  /**
   * What somebody who did not want it would say is wrong with it. Authored
   * with the approach, so a worry is a stated property of the approach and
   * never an accusation composed about the other person.
   */
  readonly concern?: string;
  /**
   * Set only on the revisions: the part of the argument this settles and the
   * part it does not. Authored with the approach, never derived from it.
   */
  readonly agreedPart?: string;
  readonly disputedPart?: string;
}

/** The authored approaches. A plan is one of these ids, never a sentence. */
export const STUDY_APPROACHES: readonly StudyApproach[] = [
  {
    id: "split-by-section",
    label: "split it into sections",
    requires: "Each of you takes whole sections and nobody reads the rest.",
    concern: "neither of us would ever read the other's half",
  },
  {
    id: "one-draft-together",
    label: "work through one draft together",
    requires: "You both sit with the same draft and neither part is separable.",
    concern: "nothing gets done unless we are both free at the same time",
  },
  {
    id: "evidence-first",
    label: "gather the sources first",
    requires: "Neither of you writes anything until the reading is done.",
    concern: "we would have nothing written down until very late",
  },
  {
    id: "outline-first",
    label: "settle the outline first",
    requires: "You agree the shape of the whole thing before a word of it.",
    concern: "we would be arguing about the shape before we know anything",
  },
  {
    id: "split-then-review",
    label: "split it, then read each other's part",
    requires:
      "You each take sections, and nothing goes in unread by the other.",
    agreedPart: "taking the sections separately",
    disputedPart: "how much of each other's work you read",
  },
  {
    id: "outline-then-split",
    label: "settle the outline, then split the writing",
    requires: "The shape is agreed together; the writing is divided after.",
    agreedPart: "agreeing the outline together",
    disputedPart: "dividing up the writing",
  },
  {
    id: "sources-then-outline",
    label: "gather the sources, then settle the outline from them",
    requires: "The reading decides the shape rather than the other way round.",
    agreedPart: "doing the reading first",
    disputedPart: "how much the sources decide the shape",
  },
  {
    id: "outline-then-draft",
    label: "agree the outline, then write the draft together",
    requires: "The shape is agreed first and the writing is never divided.",
    agreedPart: "agreeing the outline first",
    disputedPart: "writing every part of it together",
  },
  {
    id: "sources-then-split",
    label: "gather the sources together, then split the writing",
    requires: "The reading is shared; the writing is not.",
    agreedPart: "doing the reading together",
    disputedPart: "splitting the writing afterwards",
  },
];

/** The four an approach can be proposed as. The rest are revisions. */
export const PROPOSABLE_APPROACHES: readonly string[] = [
  "split-by-section",
  "one-draft-together",
  "evidence-first",
  "outline-first",
];

export function studyApproach(id: string): StudyApproach | undefined {
  return STUDY_APPROACHES.find((approach) => approach.id === id);
}

function pairKey(a: string, b: string): string {
  return [a, b].sort().join("|");
}

/**
 * The revision authored for this exact disagreement, if one was authored.
 *
 * Some pairs have no half-way version, and then no revision is offered at all.
 * That is the honest answer rather than a sentence invented to fill the slot.
 */
const REVISIONS: Readonly<Record<string, string>> = {
  [pairKey("split-by-section", "one-draft-together")]: "split-then-review",
  [pairKey("split-by-section", "outline-first")]: "outline-then-split",
  [pairKey("evidence-first", "outline-first")]: "sources-then-outline",
  [pairKey("one-draft-together", "outline-first")]: "outline-then-draft",
  [pairKey("evidence-first", "split-by-section")]: "sources-then-split",
};

export function revisionFor(a: string, b: string): StudyApproach | undefined {
  const id = REVISIONS[pairKey(a, b)];
  return id ? studyApproach(id) : undefined;
}

/** The agreed collaboration these two already have, if they have one. */
export function studyCollaborationEventId(
  world: World,
  personId: EntityId,
  peerPersonId: EntityId,
): EntityId | null {
  return (
    world.history.events.find(
      (event) =>
        event.type === STUDY_COLLABORATION_EVENT &&
        event.involvedEntityIds.includes(personId) &&
        event.involvedEntityIds.includes(peerPersonId),
    )?.id ?? null
  );
}

/**
 * The approach this person favours, from who they are.
 *
 * Decided from the other person's own temperament and the collaboration they
 * already agreed to — never from what the player picked. Somebody who wants to
 * settle the outline first wanted that before they heard anybody else.
 */
export function peerStudyApproach(
  world: World,
  input: { readonly personId: EntityId; readonly peerPersonId: EntityId },
): { readonly approachId: string; readonly world: World } {
  const collaborationId = studyCollaborationEventId(
    world,
    input.personId,
    input.peerPersonId,
  );
  if (!collaborationId) {
    throw new Error("There is no agreed collaboration between these two.");
  }
  const withTraits = ensurePeopleTraits(world, [input.peerPersonId]);
  const considerations: DecisionConsideration[] = traitConsiderations(
    withTraits,
    input.peerPersonId,
    `study-plan:${collaborationId}`,
    [
      {
        optionKey: "outline-first",
        trait: "deliberation",
        pole: "high",
        explanation: "They would rather know the shape before starting.",
      },
      {
        optionKey: "evidence-first",
        trait: "deliberation",
        pole: "high",
        explanation: "They would rather read everything before deciding.",
      },
      {
        optionKey: "one-draft-together",
        trait: "sociability",
        pole: "high",
        explanation: "They would rather do the work in the same room.",
      },
      {
        optionKey: "split-by-section",
        trait: "sociability",
        pole: "low",
        explanation: "They would rather take a part and get on with it.",
      },
      {
        optionKey: "split-by-section",
        trait: "reliability",
        pole: "high",
        explanation: "They would rather each part had one owner.",
      },
    ],
  );
  const evaluation = evaluateDecision(withTraits, {
    stableKey: `study-plan:${collaborationId}:${input.peerPersonId}`,
    decisionType: "people.study-plan",
    actorPersonId: input.peerPersonId,
    cutoff: {
      asOfDate: withTraits.currentDate,
      historySequenceExclusive: withTraits.history.nextSequence,
    },
    subject: { kind: "context:life", key: "study-plan", entityId: null },
    options: PROPOSABLE_APPROACHES.map((id) => {
      const approach = studyApproach(id)!;
      return { key: id, label: approach.label, description: approach.requires };
    }),
    constraints: [],
    considerations,
    perceptionIds: [],
    randomness: "close-choices",
    retention: "ephemeral",
  });
  return {
    approachId: evaluation.selectedOptionKey ?? "split-by-section",
    world: withTraits,
  };
}

export interface StudyPlanProposals {
  readonly mine: string;
  readonly theirs: string;
  readonly revision: StudyApproach | undefined;
}

/** What each of them actually put forward, read back from the records. */
export function studyPlanProposals(
  world: World,
  personId: EntityId,
  peerPersonId: EntityId,
): StudyPlanProposals | null {
  const proposals = world.history.events.filter(
    (event) =>
      event.type === PLAN_PROPOSED_EVENT &&
      event.involvedEntityIds.includes(personId) &&
      event.involvedEntityIds.includes(peerPersonId),
  );
  const approachOf = (speakerId: EntityId): string | null => {
    const event = proposals.find((entry) =>
      entry.participants.some(
        (participant) =>
          participant.personId === speakerId &&
          participant.role === "agency:actor",
      ),
    );
    const tag = event?.tags.find((entry) =>
      entry.startsWith("study.plan.approach:"),
    );
    return tag ? tag.slice("study.plan.approach:".length) : null;
  };
  const mine = approachOf(personId);
  const theirs = approachOf(peerPersonId);
  if (!mine || !theirs) return null;
  return { mine, theirs, revision: revisionFor(mine, theirs) };
}

export interface ProposeStudyPlanInput {
  readonly personId: EntityId;
  readonly peerPersonId: EntityId;
  /** One of the proposable approach ids, as the player chose it. */
  readonly approachId: string;
}

/**
 * Puts both approaches on the record.
 *
 * The other person's approach is theirs: it is decided from their temperament
 * and written in the same breath, so it is never a reaction to what the player
 * said. When the two happen to be the same approach there is nothing to argue
 * about, and that is settled here rather than staged as a disagreement.
 */
export function recordStudyProposals(
  world: World,
  input: ProposeStudyPlanInput,
): { world: World; theirs: string; agreed: boolean } {
  const person = world.people[input.personId];
  const peer = world.people[input.peerPersonId];
  if (!person || !peer) throw new Error("A plan needs two people.");
  const mine = studyApproach(input.approachId);
  if (!mine || !PROPOSABLE_APPROACHES.includes(input.approachId)) {
    throw new Error(`Not an approach anybody can propose: ${input.approachId}`);
  }
  if (studyPlanProposals(world, input.personId, input.peerPersonId)) {
    throw new Error("These two have already said how they want to work.");
  }
  const collaborationId = studyCollaborationEventId(
    world,
    input.personId,
    input.peerPersonId,
  );
  if (!collaborationId) {
    throw new Error("There is no agreed collaboration between these two.");
  }
  const decided = peerStudyApproach(world, {
    personId: input.personId,
    peerPersonId: input.peerPersonId,
  });
  const theirs = studyApproach(decided.approachId)!;
  const propose = (
    current: World,
    speakerId: EntityId,
    listenerId: EntityId,
    approach: StudyApproach,
  ): World => {
    const stableKey = `study-plan:${collaborationId}:${speakerId}:proposed`;
    let next = recordWorldEvent(current, {
      stableKey,
      type: PLAN_PROPOSED_EVENT,
      occurredAt: current.currentDate,
      recordedAt: current.currentDate,
      jurisdictionId: person.homeJurisdictionId,
      involvedEntityIds: [input.personId, input.peerPersonId],
      participants: [
        {
          personId: speakerId,
          role: "agency:actor",
          detail: `Would ${approach.label}`,
        },
        {
          personId: listenerId,
          role: "focus:respondent",
          detail: "Heard the proposal",
        },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: [
        STUDY_TAG,
        STUDY_PLAN_TAG,
        `study.plan.approach:${approach.id}`,
        `study.plan.collaboration:${collaborationId}`,
      ],
      summary: `${personName(current.people[speakerId]!)} would ${approach.label}.`,
      context: {
        location: null,
        socialContext: "Two people deciding how to do the work.",
        pressure: null,
        choice: approach.label,
        motivation: approach.requires,
        immediateReaction: null,
      },
    });
    const event = next.history.events.at(-1)!;
    // Each of them hears the other's proposal; that is how they know it.
    next = recordEventKnowledge(next, {
      stableKey: `${stableKey}:heard`,
      personId: listenerId,
      eventId: event.id,
      learnedAt: next.currentDate,
      believedSummary: event.summary,
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "told-by", sourcePersonId: speakerId, claimId: null },
    });
    return next;
  };
  let next = propose(decided.world, input.personId, input.peerPersonId, mine);
  next = propose(next, input.peerPersonId, input.personId, theirs);
  const agreed = theirs.id === mine.id;
  if (agreed) {
    next = settlePlan(next, {
      personId: input.personId,
      peerPersonId: input.peerPersonId,
      approachId: mine.id,
      statement: `We both want to ${mine.label}.`,
    });
  }
  return { world: next, theirs: theirs.id, agreed };
}

/** Writes that the question is answered, and that it was answered together. */
function settlePlan(
  world: World,
  input: {
    readonly personId: EntityId;
    readonly peerPersonId: EntityId;
    readonly approachId: string;
    readonly statement: string;
  },
): World {
  const approach = studyApproach(input.approachId)!;
  const person = world.people[input.personId]!;
  const peer = world.people[input.peerPersonId]!;
  const stableKey = `study-plan:${input.personId}:${input.peerPersonId}:settled`;
  let next = recordWorldEvent(world, {
    stableKey,
    type: PLAN_SETTLED_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: person.homeJurisdictionId,
    involvedEntityIds: [input.personId, input.peerPersonId],
    participants: [
      {
        personId: input.peerPersonId,
        role: "agency:actor",
        detail: input.statement,
      },
      {
        personId: input.personId,
        role: "focus:respondent",
        detail: `Agreed to ${approach.label}`,
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [STUDY_TAG, STUDY_PLAN_TAG, `study.plan:${approach.id}`],
    summary: `${personName(person)} and ${personName(peer)} agreed to ${approach.label}.`,
    context: {
      location: null,
      socialContext: "Two people settling how the work gets done.",
      pressure: null,
      choice: approach.label,
      motivation: approach.requires,
      immediateReaction: input.statement,
    },
  });
  const event = next.history.events.at(-1)!;
  next = recordEventKnowledge(next, {
    stableKey: `${stableKey}:told`,
    personId: input.personId,
    eventId: event.id,
    learnedAt: next.currentDate,
    believedSummary: event.summary,
    accuracy: "accurate",
    confidence: "high",
    source: {
      kind: "told-by",
      sourcePersonId: input.peerPersonId,
      claimId: null,
    },
  });
  // Settling how to work is something that passed between them. Failing to
  // settle it is not, and writes nothing.
  return recordRelationshipInteraction(next, {
    stableKey: `${stableKey}:interaction`,
    personIds: [input.personId, input.peerPersonId].sort() as [
      EntityId,
      EntityId,
    ],
    eventId: event.id,
    occurredAt: next.currentDate,
    kind: "work:shared-plan",
    change: "strengthened",
    significance: "minor",
    summary: `${personName(person)} and ${personName(peer)} agreed how to do the work.`,
    tags: [STUDY_PLAN_TAG],
  });
}

/** What the other person means by their answer, decided before any wording. */
export type StudyPlanOutcome = "agrees" | "counterproposes" | "unresolved";

export interface DecideStudyPlanInput {
  readonly personId: EntityId;
  readonly peerPersonId: EntityId;
  /** Offering the authored revision, or keeping your own approach. */
  readonly answer: "compromise" | "hold";
}

/**
 * Whether the other person comes round, comes part of the way, or does not.
 *
 * Temperament decides, not tone. Offering the revision does not oblige them to
 * take it, and keeping your own approach is not an insult they must punish.
 */
export function decideStudyPlanOutcome(
  world: World,
  input: DecideStudyPlanInput,
): { readonly outcome: StudyPlanOutcome; readonly world: World } {
  const proposals = studyPlanProposals(
    world,
    input.personId,
    input.peerPersonId,
  );
  if (!proposals || proposals.mine === proposals.theirs) {
    return { outcome: "agrees", world };
  }
  // There is nothing to accept if no revision was ever authored for these two
  // approaches, so offering one is not even on the table.
  if (input.answer === "compromise" && !proposals.revision) {
    return { outcome: "unresolved", world };
  }
  const withTraits = ensurePeopleTraits(world, [input.peerPersonId]);
  const basis = `study-plan-answer:${input.personId}:${input.answer}`;
  const considerations: DecisionConsideration[] = traitConsiderations(
    withTraits,
    input.peerPersonId,
    basis,
    input.answer === "compromise"
      ? [
          {
            optionKey: "agrees",
            trait: "deliberation",
            pole: "high",
            explanation:
              "A worked-out revision is the kind of thing they take.",
          },
          {
            optionKey: "counterproposes",
            trait: "conflict",
            pole: "high",
            explanation: "They would rather say what still bothers them.",
          },
          {
            optionKey: "agrees",
            trait: "reliability",
            pole: "high",
            explanation: "They would rather have something settled to keep to.",
          },
          {
            optionKey: "unresolved",
            trait: "deliberation",
            pole: "low",
            explanation: "They have not thought about it enough to say yes.",
          },
        ]
      : [
          {
            optionKey: "agrees",
            trait: "conflict",
            pole: "low",
            explanation: "They are not going to fight over the method.",
          },
          {
            optionKey: "unresolved",
            trait: "conflict",
            pole: "high",
            explanation: "They still think their own way is better.",
          },
          {
            optionKey: "counterproposes",
            trait: "deliberation",
            pole: "high",
            explanation: "They can see a part of it they would keep.",
          },
        ],
  );
  const evaluation = evaluateDecision(withTraits, {
    stableKey: `${basis}:${input.peerPersonId}:${withTraits.currentDate}`,
    decisionType: "people.study-plan-answer",
    actorPersonId: input.peerPersonId,
    cutoff: {
      asOfDate: withTraits.currentDate,
      historySequenceExclusive: withTraits.history.nextSequence,
    },
    subject: { kind: "context:life", key: "study-plan", entityId: null },
    options: [
      {
        key: "agrees",
        label: "Take it",
        description: "Accept what was put to them.",
      },
      // Coming part of the way needs a part to come to. With no authored
      // revision there is no supported half-way version, so it is not an
      // answer they can give.
      ...(proposals.revision
        ? [
            {
              key: "counterproposes",
              label: "Part of it",
              description: "Accept part and keep arguing about the rest.",
            },
          ]
        : []),
      {
        key: "unresolved",
        label: "Not yet",
        description: "Leave the question open.",
      },
    ],
    constraints: [],
    considerations,
    perceptionIds: [],
    randomness: "close-choices",
    retention: "ephemeral",
  });
  return {
    outcome: (evaluation.selectedOptionKey ?? "unresolved") as StudyPlanOutcome,
    world: withTraits,
  };
}

export interface RecordStudyPlanAnswerInput {
  readonly personId: EntityId;
  readonly peerPersonId: EntityId;
  readonly answer: "compromise" | "hold";
  readonly outcome: StudyPlanOutcome;
  /** The exact words the other person said, as the scene showed them. */
  readonly statement: string;
}

/**
 * Writes what the two of them arrived at, including arriving at nothing.
 *
 * Agreeing settles the plan by id. Coming part of the way, or not coming at
 * all, leaves the question open and records that it is open — which is a
 * different thing from a falling-out, and is written as such.
 */
export function recordStudyPlanAnswer(
  world: World,
  input: RecordStudyPlanAnswerInput,
): { world: World; settledApproachId: string | null } {
  const proposals = studyPlanProposals(
    world,
    input.personId,
    input.peerPersonId,
  );
  if (!proposals) throw new Error("Neither of them has proposed anything.");
  if (studyPlanSettled(world, input.personId, input.peerPersonId)) {
    throw new Error("These two have already settled how they work.");
  }
  if (input.outcome === "agrees") {
    // Agreeing to a revision settles the revision; coming round to the
    // player's own approach settles that. Never a third thing.
    const settled =
      input.answer === "compromise" && proposals.revision
        ? proposals.revision.id
        : proposals.mine;
    return {
      world: settlePlan(world, {
        personId: input.personId,
        peerPersonId: input.peerPersonId,
        approachId: settled,
        statement: input.statement,
      }),
      settledApproachId: settled,
    };
  }
  const person = world.people[input.personId]!;
  const peer = world.people[input.peerPersonId]!;
  const partial =
    input.outcome === "counterproposes" && proposals.revision
      ? proposals.revision
      : undefined;
  const stableKey = `study-plan:${input.personId}:${input.peerPersonId}:open:${world.currentDate}`;
  let next = recordWorldEvent(world, {
    stableKey,
    type: PLAN_OPEN_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: person.homeJurisdictionId,
    involvedEntityIds: [input.personId, input.peerPersonId],
    participants: [
      {
        personId: input.peerPersonId,
        role: "agency:actor",
        detail: input.statement,
      },
      {
        personId: input.personId,
        role: "focus:respondent",
        detail: "Had put something to them",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      STUDY_TAG,
      STUDY_PLAN_TAG,
      `study.plan.outcome:${input.outcome}`,
      ...(partial ? [`study.plan.partial:${partial.id}`] : []),
    ],
    summary: partial
      ? `${personName(peer)} would accept ${partial.agreedPart} but not ${partial.disputedPart}.`
      : `${personName(person)} and ${personName(peer)} have not settled how to do the work.`,
    context: {
      location: null,
      socialContext: "Two people who want to do the same work differently.",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: input.statement,
    },
  });
  const event = next.history.events.at(-1)!;
  next = recordEventKnowledge(next, {
    stableKey: `${stableKey}:told`,
    personId: input.personId,
    eventId: event.id,
    learnedAt: next.currentDate,
    believedSummary: event.summary,
    accuracy: "accurate",
    confidence: "high",
    source: {
      kind: "told-by",
      sourcePersonId: input.peerPersonId,
      claimId: null,
    },
  });
  return { world: next, settledApproachId: null };
}

/** The approach these two settled on, if they settled on one. */
export function settledStudyPlan(
  world: World,
  personId: EntityId,
  peerPersonId: EntityId,
): StudyApproach | undefined {
  const event = world.history.events.find(
    (entry) =>
      entry.type === PLAN_SETTLED_EVENT &&
      entry.involvedEntityIds.includes(personId) &&
      entry.involvedEntityIds.includes(peerPersonId),
  );
  const tag = event?.tags.find(
    (entry) =>
      entry.startsWith("study.plan:") &&
      !entry.startsWith("study.plan.") &&
      entry !== STUDY_PLAN_TAG,
  );
  return tag ? studyApproach(tag.slice("study.plan:".length)) : undefined;
}

export function studyPlanSettled(
  world: World,
  personId: EntityId,
  peerPersonId: EntityId,
): boolean {
  return !!settledStudyPlan(world, personId, peerPersonId);
}

/** The last day they left it open, which is when they stopped asking. */
export function studyPlanLeftOpenOn(
  world: World,
  personId: EntityId,
  peerPersonId: EntityId,
): string | null {
  return (
    [...world.history.events]
      .reverse()
      .find(
        (entry) =>
          entry.type === PLAN_OPEN_EVENT &&
          entry.involvedEntityIds.includes(personId) &&
          entry.involvedEntityIds.includes(peerPersonId),
      )?.occurredAt ?? null
  );
}

/**
 * Whether the question is resting.
 *
 * "We may need to leave this open" means leaving it open. It comes back on its
 * own after a while, which is what makes it a later follow-up rather than the
 * same argument on a loop.
 */
export function studyPlanResting(
  world: World,
  personId: EntityId,
  peerPersonId: EntityId,
): boolean {
  const on = studyPlanLeftOpenOn(world, personId, peerPersonId);
  return !!on && daysBetween(on, world.currentDate) < PLAN_REST_DAYS;
}

/** The record of the last time they left it open, when there is one. */
export function lastStudyPlanOpenEventId(
  world: World,
  personId: EntityId,
  peerPersonId: EntityId,
): EntityId | null {
  return (
    [...world.history.events]
      .reverse()
      .find(
        (entry) =>
          entry.type === PLAN_OPEN_EVENT &&
          entry.involvedEntityIds.includes(personId) &&
          entry.involvedEntityIds.includes(peerPersonId),
      )?.id ?? null
  );
}
