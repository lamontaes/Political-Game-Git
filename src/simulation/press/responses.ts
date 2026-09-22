import { evaluateDecision, recordDurableDecisionTrace } from "../decisions";
import {
  activeWorkRelationshipsAt,
  householdMembershipsAt,
  kinshipRelationshipsAt,
} from "../life-queries";
import {
  CHAPTER_MEMBERSHIP_KIND,
  homePartyChapters,
} from "../living-world/party-chapters";
import { organizationParticipationStateAt } from "../life-queries";
import { personName } from "../people";
import { currentHistoricalCutoff } from "../queries";
import {
  recordEventKnowledge,
  recordRelationshipInteraction,
} from "../records";
import type {
  DecisionConstraint,
  DecisionOption,
  EntityId,
  HistoricalEvent,
  World,
} from "../types";
import { recordWorldEvent } from "../world";
import { PRESS_MATTER_TAG, sortedUnique } from "./shared";
import {
  PRESS_CONTRACT_VERSION,
  type MatterResponse,
  type ResponderRole,
} from "./records";
import {
  appendPressRecord,
  pressRecordsOfKind,
  requirePressRecord,
} from "./store";

/**
 * Party, staff and colleague reactions to a matter. Each actor reacts only
 * after a record says they learned about it, and chooses from options their
 * role actually has. There is no reputation multiplier and no automatic
 * penalty; a call for resignation needs a public institutional finding.
 */

type RespondingRole = "party" | "staff" | "contact";

const OPTIONS: Readonly<Record<RespondingRole, readonly MatterResponse[]>> = {
  party: [
    "request-explanation",
    "defend",
    "distance",
    "call-for-resignation",
    "no-action",
  ],
  staff: ["maintain-support", "distance", "no-action"],
  // The people who actually live with this. They ask, they stand by them, or
  // they pull back; none of them calls for anybody to resign.
  contact: ["request-explanation", "defend", "distance", "no-action"],
};

const LABELS: Readonly<Record<MatterResponse, string>> = {
  deny: "Deny it",
  acknowledge: "Acknowledge it",
  "correct-record": "Correct the record",
  "decline-comment": "Decline to comment",
  cooperate: "Cooperate",
  contest: "Contest it",
  resign: "Resign",
  "request-explanation": "Ask for an explanation",
  defend: "Defend them publicly",
  distance: "Keep a distance",
  "maintain-support": "Keep working as before",
  "call-for-resignation": "Call for resignation",
  "no-action": "Do nothing",
};

/** Organizers of party chapters the subject actively belongs to. */
export function partyContactsForSubject(
  world: World,
  subjectPersonId: EntityId,
): readonly EntityId[] {
  const chapters = homePartyChapters(world);
  const memberOf = new Set(
    world.history.organizationParticipations
      .filter(
        (participation) =>
          participation.personId === subjectPersonId &&
          participation.kind === CHAPTER_MEMBERSHIP_KIND &&
          organizationParticipationStateAt(world, participation.id)?.status ===
            "active",
      )
      .map((participation) => participation.organizationId),
  );
  return sortedUnique(
    chapters
      .filter((chapter) => memberOf.has(chapter.organizationId))
      .map((chapter) => chapter.organizerPersonId)
      .filter((id): id is EntityId => id !== null && id !== subjectPersonId),
  );
}

/**
 * The people close enough to the subject that a matter about them is also
 * about the household: kin and the people they live with. They react to what
 * they actually learned, like everybody else, and they are not the press.
 */
export function closeContactsOf(
  world: World,
  subjectPersonId: EntityId,
): readonly EntityId[] {
  const people = new Set<EntityId>();
  for (const kin of kinshipRelationshipsAt(world, subjectPersonId)) {
    const other = kin.personIds.find((id) => id !== subjectPersonId);
    if (other) people.add(other);
  }
  const homes = new Set(
    householdMembershipsAt(world, subjectPersonId).map(
      (entry) => entry.household.id,
    ),
  );
  for (const record of world.history.householdMemberships) {
    if (record.personId !== subjectPersonId && homes.has(record.householdId)) {
      people.add(record.personId);
    }
  }
  return sortedUnique(
    [...people].filter(
      (personId) => !!world.people[personId] && personId !== subjectPersonId,
    ),
  ).slice(0, 6);
}

export function colleaguesOf(
  world: World,
  subjectPersonId: EntityId,
): readonly EntityId[] {
  const organizations = new Set(
    activeWorkRelationshipsAt(world, subjectPersonId)
      .map((entry) => entry.relationship.organizationId)
      .filter((id): id is EntityId => id !== null),
  );
  if (organizations.size === 0) return [];
  return world.personOrder
    .filter((personId) => personId !== subjectPersonId)
    .filter((personId) =>
      activeWorkRelationshipsAt(world, personId).some(
        (entry) =>
          entry.relationship.organizationId !== null &&
          organizations.has(entry.relationship.organizationId) &&
          entry.role.occupationClassification !== "profession:journalism",
      ),
    )
    .slice(0, 6);
}

/**
 * Reactions to one known matter event (a published story or a public
 * procedural step). Called after the readers' knowledge is recorded.
 */
export function produceMatterResponses(
  world: World,
  matterId: EntityId,
  knownEvent: HistoricalEvent,
): World {
  const matter = requirePressRecord(world, "matter", matterId);
  const controlled =
    world.control.kind === "person" ? world.control.personId : null;
  const publicFinding = pressRecordsOfKind(world, "proceeding-step").some(
    (step) =>
      step.publicStep &&
      (step.outcome === "finding" || step.outcome === "conciliation") &&
      pressRecordsOfKind(world, "matter-proceeding").some(
        (proceeding) =>
          proceeding.id === step.proceedingId &&
          proceeding.matterId === matterId,
      ),
  );
  let next = world;
  for (const subjectId of matter.subjectPersonIds) {
    const roles: [EntityId, RespondingRole][] = [
      ...partyContactsForSubject(next, subjectId).map(
        (id) => [id, "party"] as [EntityId, RespondingRole],
      ),
      ...colleaguesOf(next, subjectId).map(
        (id) => [id, "staff"] as [EntityId, RespondingRole],
      ),
      ...closeContactsOf(next, subjectId).map(
        (id) => [id, "contact"] as [EntityId, RespondingRole],
      ),
    ];
    for (const [actorId, role] of roles) {
      if (actorId === controlled) continue;
      const knowledge = next.history.knowledge.find(
        (record) =>
          record.personId === actorId &&
          record.eventId === knownEvent.id &&
          record.learnedAt <= next.currentDate,
      );
      if (!knowledge) continue;
      const already = pressRecordsOfKind(next, "matter-response").some(
        (response) =>
          response.matterId === matterId &&
          response.actorPersonId === actorId &&
          response.knowledgeIds.includes(knowledge.id),
      );
      if (already) continue;
      next = respond(next, {
        matterId,
        subjectId,
        actorId,
        role,
        knowledgeId: knowledge.id,
        knownEvent,
        publicFinding,
      });
    }
  }
  return next;
}

function respond(
  world: World,
  input: {
    readonly matterId: EntityId;
    readonly subjectId: EntityId;
    readonly actorId: EntityId;
    readonly role: RespondingRole;
    readonly knowledgeId: EntityId;
    readonly knownEvent: HistoricalEvent;
    readonly publicFinding: boolean;
  },
): World {
  const key = `press46:response:${input.matterId}:${input.actorId}:${input.knowledgeId}`;
  const options: DecisionOption[] = OPTIONS[input.role].map((option) => ({
    key: option,
    label: LABELS[option],
    description: LABELS[option],
  }));
  const constraints: DecisionConstraint[] =
    input.publicFinding || input.role !== "party"
      ? []
      : [
          {
            stableKey: "press:no-public-finding",
            optionKey: "call-for-resignation",
            kind: "knowledge:procedural-status",
            explanation:
              "No official body has made a public finding; an allegation is not one.",
            sourceRefs: [],
          },
        ];
  const evaluation = evaluateDecision(world, {
    stableKey: `${key}:decision`,
    decisionType: `press.${input.role}-matter-response`,
    actorPersonId: input.actorId,
    cutoff: currentHistoricalCutoff(world),
    subject: {
      kind: "context:public-matter",
      key: input.matterId,
      entityId: input.knownEvent.id,
    },
    options,
    constraints,
    considerations: [
      {
        stableKey: "press:what-they-learned",
        // Each role leans toward an option it actually has: staff keep
        // working, the party and the family ask. ("maintain-support" is a
        // staff option only; offering it to a relative threw.)
        optionKey: input.publicFinding
          ? "distance"
          : input.role === "staff"
            ? "maintain-support"
            : "request-explanation",
        sourceType: "context:own-knowledge",
        direction: "supports",
        importance: "moderate",
        confidence: "medium",
        explanation: input.publicFinding
          ? "An official body has made a public finding."
          : "What they know is an account or a pending matter, not a finding.",
        sourceRefs: [],
      },
    ],
    perceptionIds: [],
    randomness: "close-choices",
    retention: "durable",
  });
  let next = recordDurableDecisionTrace(world, evaluation);
  const traceId = next.history.decisionTraces.at(-1)!.id;
  const response = (evaluation.selectedOptionKey ??
    "no-action") as MatterResponse;
  const actor = personName(next.people[input.actorId]!);
  const subject = personName(next.people[input.subjectId]!);
  const publicStatement =
    response === "defend" ||
    response === "distance" ||
    response === "call-for-resignation";
  const summary =
    response === "request-explanation"
      ? `${actor} asked ${subject} for an explanation.`
      : response === "defend"
        ? `${actor} publicly defended ${subject}.`
        : response === "distance"
          ? `${actor} distanced themselves from ${subject}.`
          : response === "call-for-resignation"
            ? `${actor} called on ${subject} to resign.`
            : response === "maintain-support"
              ? `${actor} kept working with ${subject} as before.`
              : `${actor} took no action about the matter.`;
  next = recordWorldEvent(next, {
    stableKey: `${key}:event`,
    type: `matter.${input.role}-response`,
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: input.knownEvent.jurisdictionId,
    involvedEntityIds: sortedUnique([input.actorId, input.subjectId]),
    participants: [
      {
        personId: input.actorId,
        role: `agency:${input.role}-responder`,
        detail: LABELS[response],
      },
      {
        personId: input.subjectId,
        role: "focus:matter-subject",
        detail: "The subject of the response",
      },
    ],
    personFactConstraints: [],
    visibility:
      response === "no-action"
        ? "private"
        : publicStatement && input.role === "party"
          ? "public"
          : "limited",
    tags: [
      PRESS_CONTRACT_VERSION,
      `${PRESS_MATTER_TAG}${input.matterId}`,
      `press.response:${response}`,
      // A reaction is time-neutral background; the desk may still cover it.
      "time-neutral",
    ],
    summary,
    context: {
      location: null,
      socialContext: input.knownEvent.summary,
      pressure: null,
      choice: response,
      motivation: null,
      immediateReaction: null,
    },
  });
  const event = next.history.events.at(-1)!;
  if (response !== "no-action") {
    next = recordEventKnowledge(next, {
      stableKey: `${key}:subject-knows`,
      personId: input.subjectId,
      eventId: event.id,
      learnedAt: next.currentDate,
      believedSummary: summary,
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "direct" },
    });
    const change =
      response === "distance" || response === "call-for-resignation"
        ? "strained"
        : "maintained";
    next = recordRelationshipInteraction(next, {
      stableKey: `${key}:relationship`,
      personIds: [input.actorId, input.subjectId],
      eventId: event.id,
      occurredAt: next.currentDate,
      kind: `exchange:matter-${input.role}-response`,
      change,
      significance: change === "strained" ? "meaningful" : "minor",
      summary,
      tags: ["press.matter-response"],
    });
  }
  const responderRole: ResponderRole = input.role;
  return appendPressRecord(next, "matter-response", {
    stableKey: key,
    matterId: input.matterId,
    actorPersonId: input.actorId,
    actorRole: responderRole,
    response,
    eventId: event.id,
    decisionTraceId: traceId,
    knowledgeIds: [input.knowledgeId],
    respondedAt: next.currentDate,
  }).world;
}
