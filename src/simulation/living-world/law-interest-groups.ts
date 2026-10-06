import { rightsOrEligibilityLoss } from "../law-exposure";
import { createOrganization, createOrganizationParticipation } from "../life";
import { lifePlaceByJurisdictionId } from "../life-places";
import { activeOrganizationParticipationsAt } from "../life-queries";
import { peopleTiedTo } from "../neighbor-news";
import {
  lawInterestGroupKey,
  lawInterestMembers,
} from "../official-view-reads";
import { evaluateDecision, recordDurableDecisionTrace } from "../decisions";
import { onShiftAt, workSchedulesFor } from "./work-schedules";
import groupActionRows from "../../../data/research/elections/shared-cause-group-actions.json";
import { eventById } from "../event-index";
import { municipalGovernmentForLifePlace } from "../municipal-government";
import { petitionRule, startCitizenPetition } from "../recall";
import { isEligibleVoterIn } from "../issue-record";
import type {
  DecisionConsideration,
  EntityId,
  GoalStateRecord,
  LawExposureRecord,
  PrivateBeliefRecord,
  World,
} from "../types";

/** Shared causes are residents' recorded goals, views and stakes, never a membership quota. */
export interface SharedCauseInput {
  readonly personId: EntityId;
  readonly subjectEntityId: EntityId;
  readonly propositionId: EntityId | null;
  readonly stance: "support" | "oppose";
  readonly goalStateId: EntityId | null;
  readonly exposureId?: EntityId;
}

function causeGroupKey(
  world: World,
  town: EntityId,
  subject: EntityId,
  stance: "support" | "oppose",
) {
  const base = lawInterestGroupKey(town, subject);
  return stance === "oppose" &&
    world.history.legislativeMeasures?.some((row) => row.id === subject)
    ? base
    : `${base}:${stance}`;
}

export function sharedCauseGroup(
  world: World,
  town: EntityId,
  subject: EntityId,
  stance: "support" | "oppose",
): EntityId | null {
  const key = causeGroupKey(world, town, subject, stance);
  return (
    world.history.organizations.find((row) => row.stableKey === key)?.id ?? null
  );
}

function activeGoal(
  world: World,
  input: SharedCauseInput,
): GoalStateRecord | null {
  const goal = world.history.goalStates.find(
    (row) => row.id === input.goalStateId,
  );
  if (
    !goal ||
    goal.personId !== input.personId ||
    goal.status !== "active" ||
    goal.recordedAt > world.currentDate ||
    !goal.objective.trim() ||
    goal.targetEntityId === null ||
    ![input.subjectEntityId, input.propositionId].includes(
      goal.targetEntityId,
    ) ||
    world.history.goalStates.some(
      (row) =>
        row.goalId === goal.goalId &&
        row.sequence > goal.sequence &&
        row.recordedAt <= world.currentDate,
    )
  )
    return null;
  return goal;
}

function recordedView(
  world: World,
  input: SharedCauseInput,
): PrivateBeliefRecord | null {
  return (
    world.history.privateBeliefs
      .filter(
        (row) =>
          row.personId === input.personId &&
          row.propositionId === input.propositionId &&
          input.propositionId !== null &&
          row.formedAt <= world.currentDate,
      )
      .at(-1) ?? null
  );
}

function ownExposure(
  world: World,
  input: SharedCauseInput,
): LawExposureRecord | null {
  const row = world.history.lawExposures?.find(
    (row) => row.id === input.exposureId,
  );
  return row &&
    row.personId === input.personId &&
    row.measureId === input.subjectEntityId &&
    row.relation === "own" &&
    row.recordedAt <= world.currentDate
    ? row
    : null;
}

function causeDecision(
  world: World,
  input: SharedCauseInput,
  goal: GoalStateRecord | null,
  members: readonly EntityId[],
  founding: boolean,
) {
  const key = `shared-cause:${input.subjectEntityId}:${input.personId}:${founding ? "found" : "join"}:${world.currentDate}`;
  const view = recordedView(world, input);
  const exposure = ownExposure(world, input);
  const aligned = view?.position === input.stance;
  const strongView =
    aligned && view.conviction === "strong" && view.salience === "central";
  const moneyLost =
    exposure?.direction === "cost" && (exposure.amount?.minorUnits ?? 0) > 0;
  const stake =
    !!exposure &&
    (rightsOrEligibilityLoss(exposure) ||
      (moneyLost && !!goal && ["high", "critical"].includes(goal.priority)));
  const reasons: DecisionConsideration[] = [];
  if (goal)
    reasons.push({
      stableKey: `${key}:goal`,
      optionKey: "organize",
      sourceType: "mind:goal",
      direction: "supports",
      importance: goal.priority === "critical" ? "decisive" : "moderate",
      confidence: "high",
      explanation: goal.objective,
      sourceRefs: [{ kind: "goal-state", goalStateId: goal.id }],
    });
  if (aligned)
    reasons.push({
      stableKey: `${key}:view`,
      optionKey: "organize",
      sourceType: "belief:proposition",
      direction: "supports",
      importance: strongView ? "strong" : "moderate",
      confidence: "high",
      explanation: `They hold a ${view.conviction} recorded view ${input.stance === "support" ? "for" : "against"} this cause.`,
      sourceRefs: [{ kind: "private-belief", beliefId: view.id }],
    });
  if (exposure)
    reasons.push({
      stableKey: `${key}:stake:${exposure.id}`,
      optionKey: "organize",
      sourceType: "domain:law-exposure",
      direction: "supports",
      importance: stake ? "strong" : "moderate",
      confidence: "high",
      explanation: rightsOrEligibilityLoss(exposure)
        ? `Recorded exposure ${exposure.id}: the law cost them a right or eligibility.`
        : moneyLost
          ? `Recorded exposure ${exposure.id}: the law cost them recorded money; this is one reason to act.`
          : `Recorded exposure ${exposure.id}: the law has an effect on them.`,
      sourceRefs: [],
    });
  if (knowsAMember(world, input.personId, members))
    reasons.push({
      stableKey: `${key}:ties`,
      optionKey: "organize",
      sourceType: "social:relationship",
      direction: "supports",
      importance: "moderate",
      confidence: "high",
      explanation: "Someone they know already belongs to the group.",
      sourceRefs: [],
    });
  const onShift = workSchedulesFor(world, input.personId).some((schedule) =>
    onShiftAt(schedule, world.currentMoment),
  );
  reasons.push({
    stableKey: `${key}:time`,
    optionKey: "later",
    sourceType: "context:time",
    direction: "supports",
    importance: onShift ? "strong" : "slight",
    confidence: "high",
    explanation: onShift
      ? "Their current work shift takes this time."
      : "Organizing would take some of their available time.",
    sourceRefs: [],
  });
  return evaluateDecision(world, {
    stableKey: key,
    decisionType: founding
      ? "civic.found-shared-cause-group"
      : "civic.join-shared-cause-group",
    actorPersonId: input.personId,
    cutoff: {
      asOfDate: world.currentDate,
      historySequenceExclusive: world.history.nextSequence,
    },
    subject: {
      kind: "entity:shared-cause",
      key: input.subjectEntityId,
      entityId: input.subjectEntityId,
    },
    options: [
      {
        key: "organize",
        label: founding ? "Found the group" : "Join the group",
        description: "Work with other residents toward the recorded goal.",
      },
      {
        key: "later",
        label: "Leave it for now",
        description: "Keep their time for their other commitments.",
      },
    ],
    constraints: [
      ...(founding && !goal
        ? [
            {
              stableKey: `${key}:no-goal`,
              optionKey: "organize",
              kind: "recorded-goal",
              explanation: "They have no active recorded goal for this cause.",
              sourceRefs: [],
            },
          ]
        : []),
      ...((founding ? !(strongView || stake) : !(aligned || stake))
        ? [
            {
              stableKey: `${key}:no-stake`,
              optionKey: "organize",
              kind: "recorded-stake",
              explanation: founding
                ? "Founding requires a strong recorded view or stake."
                : "They have no aligned view or stake in this cause.",
              sourceRefs: [],
            },
          ]
        : []),
      ...(onShift
        ? [
            {
              stableKey: `${key}:on-shift`,
              optionKey: "organize",
              kind: "available-time",
              explanation: "They are on their recorded work shift.",
              sourceRefs: [],
            },
          ]
        : []),
    ],
    considerations: reasons,
    perceptionIds: [],
    randomness: "none",
    retention: "durable",
  });
}

/** Generic causes keep the existing organization/member paths, including civic stake. */
export function organizeSharedCauseGroup(
  world: World,
  input: SharedCauseInput,
): World {
  const person = world.people[input.personId];
  const town = person?.homeJurisdictionId;
  if (
    !person ||
    !town ||
    (world.control.kind === "person" &&
      world.control.personId === input.personId)
  )
    return world;
  const groupId = sharedCauseGroup(
    world,
    town,
    input.subjectEntityId,
    input.stance,
  );
  const members = groupId ? lawInterestMembers(world, groupId) : [];
  if (members.includes(input.personId)) return world;
  const goal = activeGoal(world, input);
  const evaluation = causeDecision(world, input, goal, members, !groupId);
  if (
    world.history.decisionTraces.some(
      (row) => row.stableKey === `${evaluation.context.stableKey}:trace`,
    )
  )
    return world;
  let next = recordDurableDecisionTrace(world, evaluation);
  if (
    evaluation.outcomeKind !== "selected" ||
    evaluation.selectedOptionKey !== "organize"
  )
    return next;
  const explanation = evaluation.context.considerations
    .filter((row) => row.optionKey === "organize")
    .map((row) => row.explanation)
    .join(" ");
  let organizationId = groupId;
  if (!organizationId) {
    if (!goal) return next;
    next = createOrganization(next, {
      stableKey: causeGroupKey(
        world,
        town,
        input.subjectEntityId,
        input.stance,
      ),
      formedAt: next.currentDate,
      provenance: {
        kind: "authored",
        note: `Founded toward recorded goal ${goal.id}. ${explanation}`,
      },
      initialProfile: {
        name: `${lifePlaceByJurisdictionId(town)?.displayName ?? next.jurisdictions[town]?.name ?? "Local"} Residents: ${goal.objective}`,
        classification: "membership:law-interest",
        locationJurisdictionId: town,
      },
    });
    organizationId = sharedCauseGroup(
      next,
      town,
      input.subjectEntityId,
      input.stance,
    )!;
  }
  return createOrganizationParticipation(next, {
    stableKey: `law-interest:member:${organizationId}:${input.personId}`,
    personId: input.personId,
    organizationId,
    startedAt: next.currentDate,
    kind: "membership:law-interest",
    roleKind: groupId ? "member:law-interest" : "leader:shared-cause",
    context: JSON.stringify({
      subjectEntityId: input.subjectEntityId,
      propositionId: input.propositionId,
      stance: input.stance,
      goalStateId: goal?.id ?? null,
    }),
    provenance: {
      kind: "authored",
      note: `${groupId ? "Joined" : "Founded"} through their recorded decision. ${explanation}`,
    },
  });
}

/** Existing law reflections use the same founder/join gate, with actual goals. */
export function joinLawInterestGroup(
  world: World,
  exposure: LawExposureRecord,
): World {
  const goal = world.history.goalStates
    .filter(
      (row) =>
        row.personId === exposure.personId &&
        row.targetEntityId === exposure.measureId &&
        row.status === "active" &&
        row.recordedAt <= world.currentDate,
    )
    .at(-1);
  if (!goal) return world;
  const measure = world.history.legislativeMeasures?.find(
    (row) => row.id === exposure.measureId,
  );
  return organizeSharedCauseGroup(world, {
    personId: exposure.personId,
    subjectEntityId: exposure.measureId,
    propositionId: measure?.propositionAnswers?.[0]?.propositionId ?? null,
    stance: exposure.direction === "gain" ? "support" : "oppose",
    goalStateId: goal.id,
    exposureId: exposure.id,
  });
}

function knowsAMember(
  world: World,
  personId: EntityId,
  members: readonly EntityId[],
): boolean {
  const others = new Set(members.filter((id) => id !== personId));
  return peopleTiedTo(world, [personId], "known").some((id) => others.has(id));
}

export interface SharedCauseGroupActionContext {
  readonly organizationId: EntityId;
  readonly leaderPersonId: EntityId;
  readonly propositionId: EntityId | null;
  readonly stance: "support" | "oppose";
}

/** Canonical action writers can be supplied independently; absent writers stay unavailable. */
export function actForSharedCauseGroup(
  world: World,
  input: {
    readonly organizationId: EntityId;
    readonly leaderPersonId: EntityId;
    readonly decisionDayEventId: EntityId;
    readonly handlers?: Readonly<
      Record<
        string,
        (world: World, context: SharedCauseGroupActionContext) => World
      >
    >;
  },
): World {
  if (
    world.control.kind === "person" &&
    world.control.personId === input.leaderPersonId
  )
    return world;
  const leader = activeOrganizationParticipationsAt(
    world,
    input.leaderPersonId,
  ).find(
    (row) =>
      row.participation.organizationId === input.organizationId &&
      row.state.roleKind === "leader:shared-cause",
  );
  const day = eventById(world, input.decisionDayEventId);
  if (
    !leader?.state.context ||
    !day ||
    day.occurredAt !== world.currentDate ||
    !day.participants.some((row) => row.personId === input.leaderPersonId)
  )
    return world;
  const cause: {
    propositionId: EntityId | null;
    subjectEntityId: EntityId;
    stance: "support" | "oppose";
  } = JSON.parse(leader.state.context);
  const key = `shared-cause:action:${input.organizationId}:${day.id}`;
  if (
    world.history.decisionTraces.some((row) => row.stableKey === `${key}:trace`)
  )
    return world;
  const context: SharedCauseGroupActionContext = {
    ...input,
    propositionId: cause.propositionId,
    stance: cause.stance,
  };
  const handlers: Record<
    string,
    (world: World, context: SharedCauseGroupActionContext) => World
  > = { ...input.handlers };
  const town = world.people[input.leaderPersonId]?.homeJurisdictionId;
  const place = town ? lifePlaceByJurisdictionId(town) : null;
  const government = place ? municipalGovernmentForLifePlace(place) : null;
  const petitionTerms = government
    ? petitionRule("local-initiative", government.state, {
        world,
        governmentKey: government.key,
      })
    : null;
  if (
    !handlers.petition &&
    cause.propositionId &&
    cause.stance === "support" &&
    government &&
    town &&
    petitionTerms?.available &&
    isEligibleVoterIn(world, input.leaderPersonId, town, world.currentDate)
  ) {
    const propositionId = cause.propositionId;
    handlers.petition = (next) =>
      startCitizenPetition(next, {
        kind: "local-initiative",
        petitionerPersonId: input.leaderPersonId,
        jurisdictionId: town,
        stateUsps: government.state,
        governmentKey: government.key,
        propositionId,
      });
  }
  const goals = world.history.goalStates.filter(
    (goal) =>
      goal.personId === input.leaderPersonId &&
      goal.status === "active" &&
      goal.recordedAt <= world.currentDate &&
      goal.targetEntityId !== null &&
      [cause.subjectEntityId, cause.propositionId].includes(
        goal.targetEntityId,
      ) &&
      !world.history.goalStates.some(
        (later) =>
          later.goalId === goal.goalId &&
          later.sequence > goal.sequence &&
          later.recordedAt <= world.currentDate,
      ),
  );
  const busy = workSchedulesFor(world, input.leaderPersonId).some((schedule) =>
    onShiftAt(schedule, world.currentMoment),
  );
  const evaluation = evaluateDecision(world, {
    stableKey: key,
    decisionType: "civic.shared-cause-group-action",
    actorPersonId: input.leaderPersonId,
    cutoff: {
      asOfDate: world.currentDate,
      historySequenceExclusive: world.history.nextSequence,
    },
    subject: {
      kind: "entity:organization",
      key: input.organizationId,
      entityId: input.organizationId,
    },
    options: [
      ...groupActionRows.actions.map((row) => ({
        key: row.key,
        label: row.label,
        description: row.description,
      })),
      {
        key: "later",
        label: "Leave it for now",
        description: "Keep their time for other commitments.",
      },
    ],
    constraints: groupActionRows.actions.flatMap((row) =>
      busy || !handlers[row.key]
        ? [
            {
              stableKey: `${key}:unavailable:${row.key}`,
              optionKey: row.key,
              kind: busy ? "available-time" : "canonical-action-writer",
              explanation: busy
                ? "The leader is on their recorded work shift."
                : row.key === "petition" &&
                    petitionTerms &&
                    !petitionTerms.available
                  ? petitionTerms.reason
                  : "The canonical action writer or required subject is not available.",
              sourceRefs: [],
            },
          ]
        : [],
    ),
    considerations: [
      ...groupActionRows.actions.flatMap((row) =>
        goals
          .filter((goal) => goal.goalKey === row.goalKey)
          .map((goal): DecisionConsideration => ({
            stableKey: `${key}:goal:${goal.id}:${row.key}`,
            optionKey: row.key,
            sourceType: "mind:goal",
            direction: "supports",
            importance: goal.priority === "critical" ? "decisive" : "strong",
            confidence: "high",
            explanation: goal.objective,
            sourceRefs: [{ kind: "goal-state", goalStateId: goal.id }],
          })),
      ),
      {
        stableKey: `${key}:time`,
        optionKey: "later",
        sourceType: "context:time",
        direction: "supports",
        importance: "slight",
        confidence: "high",
        explanation: "Acting would take the leader's time.",
        sourceRefs: [],
      },
    ],
    perceptionIds: [],
    randomness: "none",
    retention: "durable",
  });
  const next = recordDurableDecisionTrace(world, evaluation);
  const handler =
    evaluation.outcomeKind === "selected" && evaluation.selectedOptionKey
      ? handlers[evaluation.selectedOptionKey]
      : null;
  return handler ? handler(next, context) : next;
}
