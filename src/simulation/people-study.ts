import { evaluateDecision } from "./decisions";
import {
  activeEducationEnrollmentsAt,
  currentLifeCutoff,
  organizationProfileAt,
} from "./life-queries";
import { personName } from "./people";
import { ensurePeopleTraits, traitConsiderations } from "./people-traits";
import { recordEventKnowledge } from "./records";
import { recordRelationshipInteraction } from "./records";
import { isPersonAliveAt } from "./vitality-integrity";
import { recordWorldEvent } from "./world";
import type { DecisionConsideration, EntityId, World } from "./types";

/**
 * Working with somebody you met studying (CRUNCH47 F47.1).
 *
 * Education here is a place where people meet, not a second school simulator.
 * What this owns is the decision and the record: whether the other person
 * takes the collaboration on, and what passed between the two of them if they
 * did. The program, the enrollment and the timetable stay with the education
 * owner; nothing here creates a class, a place in a group or a qualification.
 *
 * The order matters, and the authoring brief is explicit about it: the other
 * person decides what they mean before any wording is chosen. Agreeing,
 * offering a smaller part and turning it down are three different answers, and
 * the lines that express them are never interchangeable.
 *
 * Sharing a class is not friendship. Somebody already committed elsewhere says
 * so, and being turned down costs the player nothing academically.
 */

export const STUDY_COLLABORATION_EVENT = "life.study-collaboration-agreed";
export const STUDY_DECLINED_EVENT = "life.study-collaboration-declined";
export const STUDY_TAG = "study.v1";

/** What the other person actually means, decided before anything is said. */
export type StudyPeerOutcome = "agrees" | "counterproposes" | "declines";

export interface StudyPeer {
  readonly personId: EntityId;
  readonly name: string;
  readonly givenName: string;
  readonly organizationId: EntityId;
  /** The program they share, in the record's own words. */
  readonly programName: string;
  /** True when this person already took on shared work with somebody else. */
  readonly committedElsewhere: boolean;
}

function alive(world: World, personId: EntityId): boolean {
  return (
    !!world.people[personId] &&
    isPersonAliveAt(world, personId, currentLifeCutoff(world))
  );
}

/**
 * People studying the same program as this person, right now.
 *
 * Read from enrollments, so a classmate is somebody the world actually
 * enrolled, never somebody invented to fill a scene.
 */
export function studyPeers(
  world: World,
  personId: EntityId,
): readonly StudyPeer[] {
  const cutoff = currentLifeCutoff(world);
  const mine = activeEducationEnrollmentsAt(world, personId, cutoff);
  if (mine.length === 0) return [];
  const organizations = new Set(
    mine.map((entry) => entry.enrollment.organizationId),
  );
  const peers: StudyPeer[] = [];
  for (const other of world.personOrder) {
    if (other === personId || !alive(world, other)) continue;
    const theirs = activeEducationEnrollmentsAt(world, other, cutoff).find(
      (entry) => organizations.has(entry.enrollment.organizationId),
    );
    if (!theirs) continue;
    const organizationId = theirs.enrollment.organizationId;
    peers.push({
      personId: other,
      name: personName(world.people[other]!),
      givenName: world.people[other]!.givenName,
      organizationId,
      programName:
        organizationProfileAt(world, organizationId)?.name ?? "the program",
      committedElsewhere: hasCollaboration(world, other, personId),
    });
  }
  return peers;
}

/** Whether this person already agreed to shared work with somebody else. */
function hasCollaboration(
  world: World,
  personId: EntityId,
  exceptWith: EntityId,
): boolean {
  return world.history.events.some(
    (event) =>
      event.type === STUDY_COLLABORATION_EVENT &&
      event.involvedEntityIds.includes(personId) &&
      !event.involvedEntityIds.includes(exceptWith),
  );
}

/**
 * What the other person decides, from who they are and what they have already
 * taken on. Pure: it writes nothing and chooses no words.
 */
export function decideStudyPeerOutcome(
  world: World,
  input: { readonly personId: EntityId; readonly peerPersonId: EntityId },
): { readonly outcome: StudyPeerOutcome; readonly world: World } {
  const peer = studyPeers(world, input.personId).find(
    (entry) => entry.personId === input.peerPersonId,
  );
  if (!peer) return { outcome: "declines", world };
  // Somebody who already took work on with somebody else has no place to
  // offer, and says so. That is a fact about the world, not a temperament.
  if (peer.committedElsewhere) return { outcome: "declines", world };
  const withTraits = ensurePeopleTraits(world, [input.peerPersonId]);
  const considerations: DecisionConsideration[] = [
    ...traitConsiderations(
      withTraits,
      input.peerPersonId,
      `study-peer:${input.personId}`,
      [
        {
          optionKey: "agrees",
          trait: "sociability",
          pole: "high",
          explanation: "They would rather work with somebody than alone.",
        },
        {
          optionKey: "declines",
          trait: "sociability",
          pole: "low",
          explanation: "They would rather work on their own.",
        },
        {
          optionKey: "counterproposes",
          trait: "deliberation",
          pole: "high",
          explanation: "They would rather settle the smaller part first.",
        },
        {
          optionKey: "agrees",
          trait: "reliability",
          pole: "high",
          explanation: "They take shared work seriously.",
        },
      ],
    ),
  ];
  const evaluation = evaluateDecision(withTraits, {
    stableKey: `study-peer:${input.personId}:${input.peerPersonId}:${withTraits.currentDate}`,
    decisionType: "people.study-collaboration",
    actorPersonId: input.peerPersonId,
    cutoff: {
      asOfDate: withTraits.currentDate,
      historySequenceExclusive: withTraits.history.nextSequence,
    },
    subject: { kind: "context:life", key: "shared-coursework", entityId: null },
    options: [
      {
        key: "agrees",
        label: "Work together",
        description: "Take the work on together.",
      },
      {
        key: "counterproposes",
        label: "Offer a smaller part",
        description: "Offer a narrower share of the work.",
      },
      {
        key: "declines",
        label: "Not this time",
        description: "Turn the collaboration down.",
      },
    ],
    constraints: [],
    considerations,
    perceptionIds: [],
    randomness: "close-choices",
    retention: "ephemeral",
  });
  return {
    outcome: (evaluation.selectedOptionKey ?? "declines") as StudyPeerOutcome,
    world: withTraits,
  };
}

export interface RecordStudyAnswerInput {
  readonly personId: EntityId;
  readonly peerPersonId: EntityId;
  readonly outcome: StudyPeerOutcome;
  /** The exact words the other person said, as the scene showed them. */
  readonly statement: string;
}

/**
 * Writes what was agreed, or that it was not.
 *
 * An agreement is an agreement to work together, and nothing else: it is not a
 * friendship, not a grade, and not time spent. The work itself happens in its
 * own hours, through the ordinary activity route, if it happens at all.
 */
export function recordStudyAnswer(
  world: World,
  input: RecordStudyAnswerInput,
): { world: World; eventId: EntityId } {
  const person = world.people[input.personId];
  const peer = world.people[input.peerPersonId];
  if (!person || !peer) throw new Error("A collaboration needs two people.");
  const agreed = input.outcome !== "declines";
  // A refusal mended the same day is a second answer, not the same record:
  // the sequence keeps same-day re-answers distinct without changing what
  // readers match on (participants and outcome, never the key).
  const stableKey = `study:${input.personId}:${input.peerPersonId}:${world.currentDate}:${world.history.nextSequence}`;
  let next = recordWorldEvent(world, {
    stableKey,
    type: agreed ? STUDY_COLLABORATION_EVENT : STUDY_DECLINED_EVENT,
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
        detail: "Had asked about working together",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [STUDY_TAG, `study.outcome:${input.outcome}`],
    summary: agreed
      ? `${personName(peer)} agreed to work with ${personName(person)} on their coursework.`
      : `${personName(peer)} did not take up working with ${personName(person)}.`,
    context: {
      location: null,
      socialContext: "Two people deciding whether to work together.",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
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
  // Agreeing to work together is a real thing that passed between them.
  // Being turned down is not a grievance, and nothing is recorded for it.
  if (agreed) {
    next = recordRelationshipInteraction(next, {
      stableKey: `${stableKey}:interaction`,
      personIds: [input.personId, input.peerPersonId].sort() as [
        EntityId,
        EntityId,
      ],
      eventId: event.id,
      occurredAt: next.currentDate,
      kind: "work:shared-coursework",
      change: "formed",
      significance: "minor",
      summary: `${personName(person)} and ${personName(peer)} agreed to work together on coursework.`,
      tags: [STUDY_TAG],
    });
  }
  return { world: next, eventId: event.id };
}

/** Whether these two already settled it, so the scene is not asked twice. */
export function studyAnswered(
  world: World,
  personId: EntityId,
  peerPersonId: EntityId,
): boolean {
  return world.history.events.some(
    (event) =>
      (event.type === STUDY_COLLABORATION_EVENT ||
        event.type === STUDY_DECLINED_EVENT) &&
      event.involvedEntityIds.includes(personId) &&
      event.involvedEntityIds.includes(peerPersonId),
  );
}

/** The people this person actually agreed to work with, in record order. */
export function studyCollaborators(
  world: World,
  personId: EntityId,
): readonly EntityId[] {
  const peers: EntityId[] = [];
  for (const event of world.history.events) {
    if (
      event.type !== STUDY_COLLABORATION_EVENT ||
      !event.involvedEntityIds.includes(personId)
    ) {
      continue;
    }
    for (const other of event.involvedEntityIds) {
      if (other !== personId && world.people[other] && !peers.includes(other)) {
        peers.push(other);
      }
    }
  }
  return peers;
}
