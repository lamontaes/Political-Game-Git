import { lawExposureFeltSize, rightsOrEligibilityLoss } from "../law-exposure";
import { evaluateDecision, recordDurableDecisionTrace } from "../decisions";
import { createOrganization, createOrganizationParticipation } from "../life";
import { activeGoalFor } from "../people-goal-pursuit";
import { lifePlaceByJurisdictionId } from "../life-places";
import {
  activeWorkRelationshipsAt,
  kinshipRelationshipsAt,
  organizationParticipationStateAt,
} from "../life-queries";
import { createMindProvenance, recordGoalState } from "../mind";
import { latestPrivateBelief } from "../queries";
import {
  lawInterestGroup,
  lawInterestGroupKey,
  lawInterestMembers,
} from "../official-view-reads";
import type {
  DecisionConsideration,
  EntityId,
  LawExposureRecord,
  MindSourceReference,
  PrivateBeliefRecord,
  World,
} from "../types";
import { reactionLens } from "./official-views";

/** The bounded civic actions a shared-cause group can consider. */
export const SHARED_CAUSE_GROUP_ACTIONS = [
  "petition",
  "protest",
  "letter-drive",
  "endorsement",
  "testimony",
  "lawsuit",
] as const;

export type SharedCauseGroupAction =
  (typeof SHARED_CAUSE_GROUP_ACTIONS)[number];

/**
 * Local consumer contract for an already recorded cause. The cause event,
 * supporting proposition, and own law exposure (when present) remain canonical
 * records; this module does not author the cause or a second scene.
 */
export interface SharedCauseGroupCause {
  readonly key: string;
  readonly title: string;
  readonly goal: string;
  readonly jurisdictionId: EntityId;
  readonly sourceEventId: EntityId;
  readonly propositionId: EntityId | null;
  readonly desiredPosition: "support" | "oppose" | null;
  readonly lawExposureId?: EntityId;
}

export interface SharedCauseGroupDecision {
  readonly world: World;
  readonly outcome: "formed" | "joined" | "waited" | "unchanged";
  readonly organizationId: EntityId | null;
  readonly decisionTraceId: EntityId | null;
}

export const sharedCauseGroupKey = (
  jurisdictionId: EntityId,
  causeKey: string,
) => `shared-cause:${jurisdictionId}:${causeKey}`;

export const sharedCauseGroupGoalKey = (causeKey: string) =>
  `civic:shared-cause:${causeKey}`;

export const sharedCauseGroupActionGoalKey = (
  causeKey: string,
  action: SharedCauseGroupAction,
) => `civic:shared-cause-action:${causeKey}:${action}`;

const groupMembershipKey = (organizationId: EntityId, personId: EntityId) =>
  `shared-cause:member:${organizationId}:${personId}`;

function importanceForBelief(
  belief: PrivateBeliefRecord,
): DecisionConsideration["importance"] {
  if (belief.conviction === "settled" || belief.salience === "central")
    return "decisive";
  if (belief.conviction === "strong" || belief.salience === "high")
    return "strong";
  if (belief.conviction === "moderate" || belief.salience === "moderate")
    return "moderate";
  return "slight";
}

function confidenceForBelief(
  belief: PrivateBeliefRecord,
): DecisionConsideration["confidence"] {
  if (belief.conviction === "settled" || belief.conviction === "strong")
    return "high";
  if (belief.conviction === "moderate") return "medium";
  return "low";
}

function currentCauseBelief(
  world: World,
  personId: EntityId,
  cause: SharedCauseGroupCause,
): PrivateBeliefRecord | null {
  if (!cause.propositionId) return null;
  return latestPrivateBelief(world, personId, cause.propositionId) ?? null;
}

function ownCauseExposure(
  world: World,
  personId: EntityId,
  cause: SharedCauseGroupCause,
): LawExposureRecord | null {
  if (!cause.lawExposureId) return null;
  const row = world.history.lawExposures?.find(
    (exposure) => exposure.id === cause.lawExposureId,
  );
  return row?.personId === personId && row.relation === "own" ? row : null;
}

function causeGoal(world: World, personId: EntityId, causeKey: string) {
  return activeGoalFor(world, personId, sharedCauseGroupGoalKey(causeKey));
}

function goalPriorityFor(
  belief: PrivateBeliefRecord | null,
  exposure: LawExposureRecord | null,
): "low" | "moderate" | "high" | "critical" {
  if (belief?.conviction === "settled" || belief?.salience === "central")
    return "critical";
  if (belief?.conviction === "strong" || belief?.salience === "high")
    return "high";
  if (exposure) return "moderate";
  return "low";
}

function founderConsiderations(
  world: World,
  personId: EntityId,
  cause: SharedCauseGroupCause,
  belief: PrivateBeliefRecord | null,
  exposure: LawExposureRecord | null,
): DecisionConsideration[] {
  const rows: DecisionConsideration[] = [];
  if (belief && cause.desiredPosition) {
    const agrees = belief.position === cause.desiredPosition;
    rows.push({
      stableKey: `shared-cause:${cause.key}:founder-belief:${belief.id}`,
      optionKey: agrees ? "organize" : "wait",
      sourceType: "belief:private-position",
      direction: "supports",
      importance: importanceForBelief(belief),
      confidence: confidenceForBelief(belief),
      explanation: agrees
        ? `Their recorded view supports the goal: ${cause.goal}`
        : "Their recorded view points away from this group's goal.",
      sourceRefs: [{ kind: "private-belief", beliefId: belief.id }],
    });
  }
  if (exposure) {
    rows.push({
      stableKey: `shared-cause:${cause.key}:founder-stake:${exposure.id}`,
      optionKey: "organize",
      sourceType: "social:personal-stake",
      direction: "supports",
      importance: "moderate",
      confidence: "high",
      explanation: rightsOrEligibilityLoss(exposure)
        ? "The recorded law exposure cost them a right or eligibility."
        : `The recorded law exposure affected their ${exposure.channel}.`,
      sourceRefs: [{ kind: "historical-event", eventId: cause.sourceEventId }],
    });
  }
  const load = world.history.lifeLoadResolutions
    .filter(
      (row) =>
        row.personId === personId && row.periodEndsAt <= world.currentDate,
    )
    .at(-1);
  if (load) {
    const direction =
      load.loadBand === "sustainable"
        ? "organize"
        : load.loadBand === "overloaded" || load.loadBand === "severe"
          ? "wait"
          : null;
    if (direction) {
      rows.push({
        stableKey: `shared-cause:${cause.key}:founder-time:${load.id}`,
        optionKey: direction,
        sourceType: "context:available-time",
        direction: "supports",
        importance: load.loadBand === "severe" ? "strong" : "moderate",
        confidence: "high",
        explanation:
          direction === "organize"
            ? "Their recorded life load leaves room for another commitment."
            : "Their recorded life load makes another commitment harder.",
        sourceRefs: [
          {
            kind: "life-history",
            reference: { family: "life-load-resolution", recordId: load.id },
          },
        ],
      });
    }
  }
  return rows;
}

function activeSharedCauseMembers(
  world: World,
  organizationId: EntityId,
): readonly EntityId[] {
  return world.history.organizationParticipations
    .filter(
      (row) =>
        row.organizationId === organizationId &&
        row.kind === "membership:shared-cause" &&
        organizationParticipationStateAt(world, row.id)?.status === "active",
    )
    .map((row) => row.personId);
}

function tieReferences(
  world: World,
  personId: EntityId,
  members: readonly EntityId[],
): readonly MindSourceReference[] {
  const others = new Set(members.filter((memberId) => memberId !== personId));
  const refs: MindSourceReference[] = [];
  for (const relationship of kinshipRelationshipsAt(world, personId)) {
    if (relationship.personIds.some((id) => others.has(id)))
      refs.push({
        kind: "life-history",
        reference: { family: "kinship", recordId: relationship.id },
      });
  }
  const workplaces = new Set(
    activeWorkRelationshipsAt(world, personId)
      .map((row) => row.relationship.organizationId)
      .filter((id): id is EntityId => id !== null),
  );
  if (workplaces.size) {
    for (const memberId of others) {
      for (const row of activeWorkRelationshipsAt(world, memberId)) {
        if (
          row.relationship.organizationId !== null &&
          workplaces.has(row.relationship.organizationId)
        )
          refs.push({
            kind: "life-history",
            reference: {
              family: "work-relationship",
              recordId: row.relationship.id,
            },
          });
      }
    }
  }
  return refs;
}

function joinConsiderations(
  world: World,
  personId: EntityId,
  cause: SharedCauseGroupCause,
  belief: PrivateBeliefRecord | null,
  goalKey: string,
  members: readonly EntityId[],
): DecisionConsideration[] {
  const rows: DecisionConsideration[] = [];
  if (belief && cause.desiredPosition) {
    const agrees = belief.position === cause.desiredPosition;
    rows.push({
      stableKey: `shared-cause:${cause.key}:member-belief:${belief.id}`,
      optionKey: agrees ? "join" : "wait",
      sourceType: "belief:private-position",
      direction: "supports",
      importance: importanceForBelief(belief),
      confidence: confidenceForBelief(belief),
      explanation: agrees
        ? "Their recorded view supports the group's goal."
        : "Their recorded view points away from the group's goal.",
      sourceRefs: [{ kind: "private-belief", beliefId: belief.id }],
    });
  }
  const ties = tieReferences(world, personId, members);
  if (ties.length) {
    rows.push({
      stableKey: `shared-cause:${cause.key}:member-ties:${personId}`,
      optionKey: "join",
      sourceType: "social:known-group-member",
      direction: "supports",
      importance: "moderate",
      confidence: "high",
      explanation: "Someone they know is already working toward this cause.",
      sourceRefs: ties,
    });
  }
  const load = world.history.lifeLoadResolutions
    .filter(
      (row) =>
        row.personId === personId && row.periodEndsAt <= world.currentDate,
    )
    .at(-1);
  if (load) {
    const direction =
      load.loadBand === "sustainable"
        ? "join"
        : load.loadBand === "overloaded" || load.loadBand === "severe"
          ? "wait"
          : null;
    if (direction) {
      rows.push({
        stableKey: `shared-cause:${cause.key}:member-time:${load.id}`,
        optionKey: direction,
        sourceType: "context:available-time",
        direction: "supports",
        importance: load.loadBand === "severe" ? "strong" : "moderate",
        confidence: "high",
        explanation:
          direction === "join"
            ? "Their recorded life load leaves room to take part."
            : "Their recorded life load makes a new commitment harder.",
        sourceRefs: [
          {
            kind: "life-history",
            reference: { family: "life-load-resolution", recordId: load.id },
          },
        ],
      });
    }
  }
  const goal = activeGoalFor(world, personId, goalKey);
  if (goal) {
    rows.push({
      stableKey: `shared-cause:${cause.key}:member-goal:${goal.id}`,
      optionKey: "join",
      sourceType: "mind:goal",
      direction: "supports",
      importance:
        goal.priority === "critical"
          ? "decisive"
          : goal.priority === "high"
            ? "strong"
            : goal.priority === "moderate"
              ? "moderate"
              : "slight",
      confidence: "high",
      explanation: `Their active goal is to ${goal.objective}.`,
      sourceRefs: [{ kind: "goal-state", goalStateId: goal.id }],
    });
  }
  return rows;
}

function recordSharedCauseGoal(
  world: World,
  personId: EntityId,
  cause: SharedCauseGroupCause,
  belief: PrivateBeliefRecord | null,
  exposure: LawExposureRecord | null,
): World {
  const goalKey = sharedCauseGroupGoalKey(cause.key);
  const existing = activeGoalFor(world, personId, goalKey);
  if (existing) return world;
  const sourceRefs: MindSourceReference[] = [];
  if (belief) sourceRefs.push({ kind: "private-belief", beliefId: belief.id });
  if (exposure)
    sourceRefs.push({
      kind: "historical-event",
      eventId: cause.sourceEventId,
    });
  return recordGoalState(world, {
    stableKey: `${goalKey}:${personId}`,
    personId,
    goalKey,
    createdAt: world.currentDate,
    recordedAt: world.currentDate,
    objective: cause.goal,
    domain: "civic:shared-cause",
    scope: cause.key,
    priority: goalPriorityFor(belief, exposure),
    status: "active",
    targetEntityId: cause.propositionId ?? exposure?.measureId ?? null,
    deadline: null,
    outcome: null,
    provenance: createMindProvenance("reflection", {
      note: "The person's recorded view or stake led them to take up this cause.",
      sourceRefs,
    }),
    replacesGoalId: null,
    supersedesGoalStateId: null,
  });
}

function evaluateSharedCauseDecision(
  world: World,
  input: {
    readonly actorPersonId: EntityId;
    readonly stableKey: string;
    readonly decisionType: string;
    readonly subjectKey: string;
    readonly options: readonly [
      {
        readonly key: string;
        readonly label: string;
        readonly description: string;
      },
      {
        readonly key: string;
        readonly label: string;
        readonly description: string;
      },
    ];
    readonly considerations: readonly DecisionConsideration[];
    readonly entityId: EntityId | null;
  },
) {
  if (input.considerations.length === 0) return null;
  const evaluation = evaluateDecision(world, {
    stableKey: input.stableKey,
    decisionType: input.decisionType,
    actorPersonId: input.actorPersonId,
    cutoff: {
      asOfDate: world.currentDate,
      historySequenceExclusive: world.history.nextSequence,
    },
    subject: {
      kind: "context:life",
      key: input.subjectKey,
      entityId: input.entityId,
    },
    options: input.options,
    constraints: [],
    considerations: input.considerations,
    perceptionIds: [],
    randomness: "none",
    retention: "durable",
  });
  return { evaluation, world: recordDurableDecisionTrace(world, evaluation) };
}

/**
 * A resident founds a group for a saved cause when their own recorded view or
 * stake, weighed by their recorded goal and time, selects organizing. The
 * event, goal and optional exposure are input records from existing writers.
 */
export function foundSharedCauseGroup(
  world: World,
  input: {
    readonly cause: SharedCauseGroupCause;
    readonly founderPersonId: EntityId;
  },
): SharedCauseGroupDecision {
  const { cause, founderPersonId } = input;
  const key = sharedCauseGroupKey(cause.jurisdictionId, cause.key);
  const person = world.people[founderPersonId];
  const source = world.history.events.find(
    (event) => event.id === cause.sourceEventId,
  );
  if (
    !person ||
    person.homeJurisdictionId !== cause.jurisdictionId ||
    !cause.key.trim() ||
    !cause.title.trim() ||
    !cause.goal.trim() ||
    !source ||
    source.occurredAt > world.currentDate
  )
    return {
      world,
      outcome: "unchanged",
      organizationId: null,
      decisionTraceId: null,
    };
  const existing = world.history.organizations.find(
    (organization) => organization.stableKey === key,
  );
  if (existing) {
    const result = joinSharedCauseGroup(world, {
      cause,
      organizationId: existing.id,
      personId: founderPersonId,
    });
    return result;
  }
  const belief = currentCauseBelief(world, founderPersonId, cause);
  const exposure = ownCauseExposure(world, founderPersonId, cause);
  const strongView =
    belief !== null &&
    (belief.conviction === "strong" ||
      belief.conviction === "settled" ||
      belief.salience === "high" ||
      belief.salience === "central");
  if (!strongView && !exposure)
    return {
      world,
      outcome: "unchanged",
      organizationId: null,
      decisionTraceId: null,
    };
  const decision = evaluateSharedCauseDecision(world, {
    actorPersonId: founderPersonId,
    stableKey: `${key}:found:${founderPersonId}:${world.currentDate}`,
    decisionType: "civic.shared-cause.found-group",
    subjectKey: key,
    entityId: null,
    options: [
      {
        key: "organize",
        label: "Found the group",
        description: `Work with neighbors toward ${cause.goal}.`,
      },
      {
        key: "wait",
        label: "Wait",
        description: "Keep the concern private for now.",
      },
    ],
    considerations: founderConsiderations(
      world,
      founderPersonId,
      cause,
      belief,
      exposure,
    ),
  });
  if (!decision)
    return {
      world,
      outcome: "unchanged",
      organizationId: null,
      decisionTraceId: null,
    };
  if (decision.evaluation.selectedOptionKey !== "organize")
    return {
      world: decision.world,
      outcome: "waited",
      organizationId: null,
      decisionTraceId: decision.evaluation.decisionId,
    };

  let next = recordSharedCauseGoal(
    decision.world,
    founderPersonId,
    cause,
    belief,
    exposure,
  );
  const place = lifePlaceByJurisdictionId(cause.jurisdictionId);
  if (!place)
    return {
      world: next,
      outcome: "waited",
      organizationId: null,
      decisionTraceId: decision.evaluation.decisionId,
    };
  next = createOrganization(next, {
    stableKey: key,
    formedAt: next.currentDate,
    provenance: { kind: "simulated-event", eventId: cause.sourceEventId },
    initialProfile: {
      name: `${place.displayName} ${cause.title}`,
      classification: "membership:shared-cause",
      locationJurisdictionId: cause.jurisdictionId,
    },
  });
  const organizationId = next.history.organizations.at(-1)!.id;
  next = createOrganizationParticipation(next, {
    stableKey: groupMembershipKey(organizationId, founderPersonId),
    personId: founderPersonId,
    organizationId,
    startedAt: next.currentDate,
    kind: "membership:shared-cause",
    roleKind: "leader:shared-cause",
    context: cause.key,
    provenance: { kind: "simulated-event", eventId: cause.sourceEventId },
  });
  return {
    world: next,
    outcome: "formed",
    organizationId,
    decisionTraceId: decision.evaluation.decisionId,
  };
}

/** A neighbor weighs their recorded views, social ties and available time. */
export function joinSharedCauseGroup(
  world: World,
  input: {
    readonly cause: SharedCauseGroupCause;
    readonly organizationId: EntityId;
    readonly personId: EntityId;
  },
): SharedCauseGroupDecision {
  const { cause, organizationId, personId } = input;
  const organization = world.history.organizations.find(
    (row) => row.id === organizationId,
  );
  const person = world.people[personId];
  const source = world.history.events.find(
    (event) => event.id === cause.sourceEventId,
  );
  const members = activeSharedCauseMembers(world, organizationId);
  if (
    !organization ||
    organization.stableKey !==
      sharedCauseGroupKey(cause.jurisdictionId, cause.key) ||
    !person ||
    person.homeJurisdictionId !== cause.jurisdictionId ||
    !source ||
    !members.length
  )
    return {
      world,
      outcome: "unchanged",
      organizationId: null,
      decisionTraceId: null,
    };
  if (members.includes(personId))
    return {
      world,
      outcome: "unchanged",
      organizationId,
      decisionTraceId: null,
    };
  const belief = currentCauseBelief(world, personId, cause);
  const goalKey = sharedCauseGroupGoalKey(cause.key);
  const considerations = joinConsiderations(
    world,
    personId,
    cause,
    belief,
    goalKey,
    members,
  );
  const decision = evaluateSharedCauseDecision(world, {
    actorPersonId: personId,
    stableKey: `${organization.stableKey}:join:${personId}:${world.currentDate}`,
    decisionType: "civic.shared-cause.join-group",
    subjectKey: organization.stableKey,
    entityId: organizationId,
    options: [
      {
        key: "join",
        label: "Join the group",
        description: "Take part in the work toward this cause.",
      },
      {
        key: "wait",
        label: "Wait",
        description: "Leave the group to its members for now.",
      },
    ],
    considerations,
  });
  if (!decision)
    return {
      world,
      outcome: "unchanged",
      organizationId: null,
      decisionTraceId: null,
    };
  if (decision.evaluation.selectedOptionKey !== "join")
    return {
      world: decision.world,
      outcome: "waited",
      organizationId: null,
      decisionTraceId: decision.evaluation.decisionId,
    };
  let next = recordSharedCauseGoal(
    decision.world,
    personId,
    cause,
    belief,
    ownCauseExposure(world, personId, cause),
  );
  next = createOrganizationParticipation(next, {
    stableKey: groupMembershipKey(organizationId, personId),
    personId,
    organizationId,
    startedAt: next.currentDate,
    kind: "membership:shared-cause",
    roleKind: "member:shared-cause",
    context: cause.key,
    provenance: { kind: "simulated-event", eventId: cause.sourceEventId },
  });
  return {
    world: next,
    outcome: "joined",
    organizationId,
    decisionTraceId: decision.evaluation.decisionId,
  };
}

/** A scene consumer can use this one-function seam after saving an argument. */
export function recordSharedCauseActionArgument(
  world: World,
  input: {
    readonly causeKey: string;
    readonly organizationId: EntityId;
    readonly personId: EntityId;
    readonly action: SharedCauseGroupAction;
    readonly eventId: EntityId;
  },
): World {
  const organization = world.history.organizations.find(
    (row) => row.id === input.organizationId,
  );
  const event = world.history.events.find((row) => row.id === input.eventId);
  if (
    !organization ||
    !organization.stableKey.endsWith(`:${input.causeKey}`) ||
    !activeSharedCauseMembers(world, input.organizationId).includes(
      input.personId,
    ) ||
    !event ||
    event.occurredAt > world.currentDate ||
    !event.involvedEntityIds.includes(input.personId)
  )
    return world;
  return recordGoalState(world, {
    stableKey: `${sharedCauseGroupActionGoalKey(input.causeKey, input.action)}:${input.personId}:${event.id}`,
    personId: input.personId,
    goalKey: sharedCauseGroupActionGoalKey(input.causeKey, input.action),
    createdAt: world.currentDate,
    recordedAt: world.currentDate,
    objective: `Ask the group to ${input.action} for this cause.`,
    domain: "civic:shared-cause-action",
    scope: input.causeKey,
    priority: "moderate",
    status: "active",
    targetEntityId: input.organizationId,
    deadline: null,
    outcome: event.summary,
    provenance: createMindProvenance("reflection", {
      note: "This group member raised the action during a recorded scene.",
      sourceRefs: [{ kind: "historical-event", eventId: event.id }],
    }),
    replacesGoalId: null,
    supersedesGoalStateId: null,
  });
}

/**
 * The elected group leader weighs their saved goal and the members' recorded
 * scene arguments at a group decision event. This records an intent trace; the
 * petition, protest, inbox, election or court writer owns doing the action.
 */
export function decideSharedCauseGroupAction(
  world: World,
  input: {
    readonly cause: SharedCauseGroupCause;
    readonly organizationId: EntityId;
    readonly decisionEventId: EntityId;
    readonly heardArguments?: readonly {
      readonly action: SharedCauseGroupAction;
      readonly knowledgeId: EntityId;
    }[];
  },
): { readonly world: World; readonly action: SharedCauseGroupAction | null } {
  const organization = world.history.organizations.find(
    (row) => row.id === input.organizationId,
  );
  const meeting = world.history.events.find(
    (row) => row.id === input.decisionEventId,
  );
  const members = activeSharedCauseMembers(world, input.organizationId);
  const leaderRow = world.history.organizationParticipations.find(
    (row) =>
      row.organizationId === input.organizationId &&
      organizationParticipationStateAt(world, row.id)?.roleKind ===
        "leader:shared-cause",
  );
  const leaderId = leaderRow?.personId;
  if (
    !organization ||
    organization.stableKey !==
      sharedCauseGroupKey(input.cause.jurisdictionId, input.cause.key) ||
    !meeting ||
    meeting.occurredAt !== world.currentDate ||
    !leaderId ||
    !members.includes(leaderId) ||
    !meeting.involvedEntityIds.includes(leaderId)
  )
    return { world, action: null };
  const considerations: DecisionConsideration[] = [];
  for (const action of SHARED_CAUSE_GROUP_ACTIONS) {
    const goal = activeGoalFor(
      world,
      leaderId,
      sharedCauseGroupActionGoalKey(input.cause.key, action),
    );
    if (goal) {
      considerations.push({
        stableKey: `shared-cause:${input.cause.key}:leader-goal:${goal.id}`,
        optionKey: action,
        sourceType: "mind:goal",
        direction: "supports",
        importance:
          goal.priority === "critical"
            ? "decisive"
            : goal.priority === "high"
              ? "strong"
              : goal.priority === "moderate"
                ? "moderate"
                : "slight",
        confidence: "high",
        explanation: `Their goal is to ${goal.objective}.`,
        sourceRefs: [{ kind: "goal-state", goalStateId: goal.id }],
      });
    }
    for (const heard of input.heardArguments ?? []) {
      if (heard.action !== action) continue;
      const knowledge = world.history.knowledge.find(
        (row) => row.id === heard.knowledgeId && row.personId === leaderId,
      );
      const argumentEvent = knowledge
        ? world.history.events.find((row) => row.id === knowledge.eventId)
        : undefined;
      if (
        !knowledge ||
        !argumentEvent ||
        !members.some((memberId) =>
          argumentEvent.involvedEntityIds.includes(memberId),
        ) ||
        !argumentEvent.tags.includes(`shared-cause-action:${action}`)
      )
        continue;
      considerations.push({
        stableKey: `shared-cause:${input.cause.key}:heard-argument:${knowledge.id}`,
        optionKey: action,
        sourceType: "information:member-argument",
        direction: "supports",
        importance: "moderate",
        confidence: "high",
        explanation:
          "A group member argued for this action, and the leader heard it.",
        sourceRefs: [{ kind: "event-knowledge", knowledgeId: knowledge.id }],
      });
    }
  }
  const leaderGoal = causeGoal(world, leaderId, input.cause.key);
  if (leaderGoal) {
    considerations.push({
      stableKey: `shared-cause:${input.cause.key}:leader-shared-goal:${leaderGoal.id}`,
      optionKey: "petition",
      sourceType: "mind:goal",
      direction: "supports",
      importance: "slight",
      confidence: "high",
      explanation: `Their recorded goal is to ${leaderGoal.objective}.`,
      sourceRefs: [{ kind: "goal-state", goalStateId: leaderGoal.id }],
    });
  }
  if (!considerations.length) return { world, action: null };
  const evaluation = evaluateDecision(world, {
    stableKey: `${organization.stableKey}:action:${input.decisionEventId}`,
    decisionType: "civic.shared-cause.leader-action",
    actorPersonId: leaderId,
    cutoff: {
      asOfDate: world.currentDate,
      historySequenceExclusive: world.history.nextSequence,
    },
    subject: {
      kind: "context:life",
      key: organization.stableKey,
      entityId: input.organizationId,
    },
    options: SHARED_CAUSE_GROUP_ACTIONS.map((action) => ({
      key: action,
      label: action.replaceAll("-", " "),
      description: `Work with group members to ${action} for ${input.cause.title}.`,
    })),
    constraints: [],
    considerations,
    perceptionIds: [],
    randomness: "none",
    retention: "durable",
  });
  const next = recordDurableDecisionTrace(world, evaluation);
  return {
    world: next,
    action: SHARED_CAUSE_GROUP_ACTIONS.includes(
      evaluation.selectedOptionKey as SharedCauseGroupAction,
    )
      ? (evaluation.selectedOptionKey as SharedCauseGroupAction)
      : null,
  };
}

/**
 * Organized interests (spec 5): people a law costs a real share of their pay,
 * or a right or an eligibility (felt, PLACEHOLDER, like a tenth of a month's
 * pay; `NON_MONEY_FELT_SIZE`), band together against it.
 *
 * APPROVED provisional values (Claude CTO, September 28, 2026, 4:57 a.m.
 * EDT): a group forms in a town once at least 6 residents have each lost a
 * tenth of a month's pay or more to the same law. The group is an ordinary
 * organization, so it shows wherever the game lists a person's groups.
 *
 * Joining is each person's own decision, never a draw (no-dice rule): the
 * size of their loss against their own pay, weighed by their temperament
 * (`reactionLens`), and whether they already know a member through family or
 * work. The same person in the same situation always decides the same way.
 *
 * A rights loss or an eligibility loss (a cost with no money on record) is
 * felt at `NON_MONEY_FELT_SIZE`, so six residents who lost the same right
 * found a group just as six who lost a tenth of a month's pay do. The resident
 * whose reflection founds it joins first, alongside the others the law hit,
 * so a group is never founded with nobody in it (A159).
 *
 * NOT MODELED yet: an owner joining because their business paid (no writer
 * records a business paying a law's cost yet), group money, and donations.
 */

const G = "law-interest";

// APPROVED provisional: the loss that counts, and how many residents it takes.
const LOSS_THAT_COUNTS_PER_MONTH_OF_PAY = 0.1;
const FOUNDING_RESIDENTS = 6;
// PLACEHOLDER: resolve is the loss in multiples of the loss that counts,
// times the person's temperament. At twice the loss that counts, a person of
// even temper joins on their own; someone who already knows a member joins
// once the loss counts at all.
const RESOLVE_TO_JOIN_ALONE = 2;
const RESOLVE_TO_JOIN_WITH_A_TIE = 1;

/**
 * The loss as a share of the person's month's pay, or null when unmeasured.
 * A right or an eligibility lost with no money on record counts at the
 * estimated felt size (`lawExposureFeltSize`).
 */
function shareOfPay(exposure: LawExposureRecord): number | null {
  if (exposure.direction !== "cost") return null;
  const felt = lawExposureFeltSize(
    exposure,
    exposure.monthlyPay?.minorUnits ?? 0,
  );
  return felt !== null && felt !== "unmeasured" ? felt.share : null;
}

/** A person's own exposure that counts toward a group: a big enough loss. */
function qualifies(exposure: LawExposureRecord): boolean {
  if (exposure.relation !== "own") return false;
  const share = shareOfPay(exposure);
  return share !== null && share >= LOSS_THAT_COUNTS_PER_MONTH_OF_PAY;
}

/**
 * Called when a person reflects on their own exposure: forms the town's group
 * once enough residents qualify, and lets this person join it.
 */
export function joinLawInterestGroup(
  world: World,
  exposure: LawExposureRecord,
): World {
  if (!qualifies(exposure)) return world;
  const person = world.people[exposure.personId];
  const town = person?.homeJurisdictionId;
  if (!person || !town) return world;
  let next = world;
  let groupId = lawInterestGroup(next, town, exposure.measureId);
  if (!groupId) {
    const hit = new Set(
      (world.history.lawExposures ?? [])
        .filter(
          (row) =>
            row.measureId === exposure.measureId &&
            qualifies(row) &&
            world.people[row.personId]?.homeJurisdictionId === town,
        )
        .map((row) => row.personId),
    );
    if (hit.size < FOUNDING_RESIDENTS) return world;
    // The founder joins alongside the other residents the law hit, so they
    // need only the resolve of someone joining with a tie; short of it, the
    // group waits for a resident who has it.
    if (resolveOf(world, exposure) < RESOLVE_TO_JOIN_WITH_A_TIE) return world;
    const measure = world.history.legislativeMeasures?.find(
      (row) => row.id === exposure.measureId,
    );
    const place = lifePlaceByJurisdictionId(town)?.displayName;
    if (!measure || !place) return world;
    next = createOrganization(next, {
      stableKey: lawInterestGroupKey(town, exposure.measureId),
      formedAt: next.currentDate,
      provenance: {
        kind: "authored",
        note: rightsOrEligibilityLoss(exposure)
          ? "Founded by residents a law cost a right or an eligibility."
          : "Founded by residents a law cost a tenth of a month's pay or more.",
      },
      initialProfile: {
        // PLACEHOLDER wording, awaiting editorial review.
        name: `${place} Residents Against ${measure.shortTitle}`,
        classification: "membership:law-interest",
        locationJurisdictionId: town,
      },
    });
    groupId = lawInterestGroup(next, town, exposure.measureId)!;
    return joinGroup(next, exposure, groupId, "founded");
  }
  if (lawInterestMembers(next, groupId).includes(exposure.personId))
    return next;
  const members = lawInterestMembers(next, groupId);
  const tied = knowsAMember(next, exposure.personId, members);
  if (
    resolveOf(next, exposure) <
    (tied ? RESOLVE_TO_JOIN_WITH_A_TIE : RESOLVE_TO_JOIN_ALONE)
  )
    return next;
  return joinGroup(next, exposure, groupId, tied ? "tied" : "alone");
}

/** The loss in multiples of the loss that counts, through their temperament. */
function resolveOf(world: World, exposure: LawExposureRecord): number {
  return (
    (shareOfPay(exposure)! / LOSS_THAT_COUNTS_PER_MONTH_OF_PAY) *
    reactionLens(world, exposure.personId)
  );
}

function joinGroup(
  next: World,
  exposure: LawExposureRecord,
  groupId: EntityId,
  how: "founded" | "tied" | "alone",
): World {
  const lost = rightsOrEligibilityLoss(exposure)
    ? "a right or an eligibility"
    : "a real share of their pay";
  return createOrganizationParticipation(next, {
    stableKey: `${G}:member:${groupId}:${exposure.personId}`,
    personId: exposure.personId,
    organizationId: groupId,
    startedAt: next.currentDate,
    kind: "membership:law-interest",
    roleKind: "member:law-interest",
    context: null,
    provenance: {
      kind: "authored",
      note:
        how === "founded"
          ? `Founded the group after the law cost them ${lost}, with the other residents it hit.`
          : how === "tied"
            ? `Joined after the law cost them ${lost}, alongside someone they know.`
            : `Joined after the law cost them ${lost}.`,
    },
  });
}

/** Whether the person already knows a member, through family or a workplace. */
function knowsAMember(
  world: World,
  personId: EntityId,
  members: readonly EntityId[],
): boolean {
  if (members.length === 0) return false;
  const others = new Set(members.filter((id) => id !== personId));
  if (
    kinshipRelationshipsAt(world, personId).some((row) =>
      row.personIds.some((id) => others.has(id)),
    )
  )
    return true;
  const workplaces = new Set(
    activeWorkRelationshipsAt(world, personId)
      .map((row) => row.relationship.organizationId)
      .filter((id): id is EntityId => id !== null),
  );
  if (workplaces.size === 0) return false;
  return [...others].some((id) =>
    activeWorkRelationshipsAt(world, id).some(
      (row) =>
        row.relationship.organizationId !== null &&
        workplaces.has(row.relationship.organizationId),
    ),
  );
}
