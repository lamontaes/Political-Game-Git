import { makeIsoDate } from "../dates";
import { evaluateDecision, recordDurableDecisionTrace } from "../decisions";
import { scheduleFutureDueItem } from "../future-transitions";
import {
  createOrganizationParticipation,
  recordOrganizationParticipationState,
} from "../life";
import {
  organizationParticipationStateAt,
  kinshipRelationshipsAt,
} from "../life-queries";
import { relationshipHistory } from "../queries";
import { partyRecords } from "../world-setup/integrity";
import { personTraits } from "../people-traits";
import type {
  DecisionConsideration,
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  IsoDate,
  OrganizationParticipation,
  World,
} from "../types";
import type { PartyPlatformRecord } from "../world-setup/types";
import { recordWorldEvent } from "../world";
import { partyUnits } from "./party-registry";

export type LeadershipSuccessionCause = "death" | "step-down" | "retirement";
export const MOVEMENT_BODY_REVIEW_TRANSITION_KEY =
  "party-life:body-review" as const;

function firstOfMonthAfter(date: IsoDate, months: number): IsoDate {
  const [year, month] = date.split("-").map(Number);
  const absoluteMonth = year! * 12 + month! - 1 + months;
  const nextYear = Math.floor(absoluteMonth / 12);
  const nextMonth = (absoluteMonth % 12) + 1;
  return makeIsoDate(`${nextYear}-${String(nextMonth).padStart(2, "0")}-01`);
}

/** Owner's open retirement choice: living retired leaders remain in office. */
export const MOVEMENT_SUCCESSION_SETTINGS: {
  retiredLeaderKeepsLeading: boolean;
} = {
  retiredLeaderKeepsLeading: true,
};

function living(world: World, personId: EntityId): boolean {
  return (
    world.people[personId] !== undefined &&
    !world.history.personDeaths.some(
      (death) =>
        death.personId === personId && death.diedAt <= world.currentDate,
    )
  );
}

function role(participation: OrganizationParticipation, world: World) {
  return organizationParticipationStateAt(world, participation.id);
}

function activeLeaderships(world: World, personId: EntityId) {
  return world.history.organizationParticipations.filter((participation) => {
    const state = role(participation, world);
    return (
      participation.personId === personId &&
      participation.startedAt <= world.currentDate &&
      state?.status === "active" &&
      state.roleKind?.startsWith("leader:") === true
    );
  });
}

function membersOf(world: World, organizationId: EntityId): EntityId[] {
  return [
    ...new Set(
      world.history.organizationParticipations
        .filter((participation) => {
          const state = role(participation, world);
          return (
            participation.organizationId === organizationId &&
            participation.startedAt <= world.currentDate &&
            state?.status === "active" &&
            state.roleKind?.startsWith("member:") === true &&
            living(world, participation.personId)
          );
        })
        .map((participation) => participation.personId),
    ),
  ].sort();
}

function recordedRelationship(
  world: World,
  firstPersonId: EntityId,
  secondPersonId: EntityId,
) {
  return relationshipHistory(world, firstPersonId, secondPersonId).filter(
    (interaction) => interaction.occurredAt <= world.currentDate,
  );
}

function relationshipConsideration(
  world: World,
  voterId: EntityId,
  candidateId: EntityId,
  optionKey: string,
): DecisionConsideration | null {
  if (voterId === candidateId) return null;
  const interactions = recordedRelationship(world, voterId, candidateId);
  if (interactions.length === 0) return null;
  const latest = interactions.at(-1)!;
  const supports =
    latest.change !== "strained" &&
    latest.change !== "ended" &&
    !latest.kind.startsWith("conflict:");
  return {
    stableKey: `relationship:${candidateId}:${latest.id}`,
    optionKey,
    sourceType: "context:relationship-history",
    direction: supports ? "supports" : "opposes",
    importance:
      latest.significance === "major"
        ? "strong"
        : latest.significance === "meaningful"
          ? "moderate"
          : "slight",
    confidence: "high",
    explanation: supports
      ? `The member's recorded relationship with this candidate includes ${latest.kind.replaceAll(":", " ")}.`
      : `The member's latest recorded relationship with this candidate was strained (${latest.kind.replaceAll(":", " ")}).`,
    sourceRefs: [
      { kind: "relationship-interaction", interactionId: latest.id },
    ],
  };
}

function platformConsiderations(
  world: World,
  organizationId: EntityId,
  candidateId: EntityId,
  optionKey: string,
): readonly DecisionConsideration[] {
  const platform = partyRecords(world)
    .filter(
      (record) =>
        record.kind === "party-platform" &&
        record.organizationId === organizationId &&
        record.effectiveDate <= world.currentDate,
    )
    .at(-1) as PartyPlatformRecord | undefined;
  if (!platform) return [];
  const considerations: DecisionConsideration[] = [];
  for (const position of platform.positions) {
    const belief = world.history.privateBeliefs
      .filter(
        (record) =>
          record.personId === candidateId &&
          record.subject?.kind === "party-question" &&
          record.subject.key === position.questionKey &&
          record.formedAt <= world.currentDate,
      )
      .at(-1);
    if (!belief?.optionKey) continue;
    const importance =
      belief.conviction === "settled" || belief.conviction === "strong"
        ? "strong"
        : "moderate";
    considerations.push({
      stableKey: `platform:${platform.id}:${candidateId}:${belief.id}`,
      optionKey,
      sourceType: "context:movement-platform",
      direction:
        belief.optionKey === position.optionKey ? "supports" : "opposes",
      importance,
      confidence: "high",
      explanation:
        belief.optionKey === position.optionKey
          ? `The candidate's recorded position (${belief.id}) matches platform ${platform.id} on ${position.questionKey}.`
          : `The candidate's recorded position (${belief.id}) differs from platform ${platform.id} on ${position.questionKey}.`,
      sourceRefs: [],
    });
  }
  return considerations;
}

function temperamentConsiderations(
  world: World,
  voterId: EntityId,
  candidateId: EntityId,
  oldLeaderId: EntityId,
  optionKey: string,
): readonly DecisionConsideration[] {
  const traits = personTraits(world, voterId);
  const deliberation = traits.find((trait) => trait.trait === "deliberation")!;
  const risk = traits.find((trait) => trait.trait === "risk")!;
  const candidateToLeader = recordedRelationship(
    world,
    candidateId,
    oldLeaderId,
  );
  const candidateLeaderInteraction = candidateToLeader.at(-1);
  const candidateLeaderInteractionId =
    candidateLeaderInteraction?.id ?? "unavailable-record";
  const familiarityImportance =
    Math.abs(risk.value) === 2
      ? "strong"
      : Math.abs(risk.value) === 1
        ? "moderate"
        : "slight";
  const deliberationImportance =
    Math.abs(deliberation.value) === 2
      ? "strong"
      : Math.abs(deliberation.value) === 1
        ? "moderate"
        : "slight";
  const temperamentSourceRefs = [deliberation.recordId, risk.recordId]
    .filter((recordId): recordId is EntityId => recordId !== null)
    .map((tendencyRecordId) => ({
      kind: "personality-tendency" as const,
      tendencyRecordId,
    }));
  const continuityLeansPositive = risk.value <= 0;
  return [
    {
      stableKey: `temperament:familiarity:${candidateId}:${candidateLeaderInteraction?.id ?? "no-recorded-tie"}`,
      optionKey,
      sourceType: "context:temperament",
      direction:
        candidateToLeader.length > 0
          ? continuityLeansPositive
            ? "supports"
            : "opposes"
          : continuityLeansPositive
            ? "opposes"
            : "supports",
      importance: familiarityImportance,
      confidence: "medium",
      explanation:
        candidateToLeader.length > 0
          ? `The member's risk temperament weighs this candidate's recorded tie (${candidateLeaderInteractionId}) to the outgoing leader.`
          : "The member's risk temperament weighs the absence of a recorded tie to the outgoing leader.",
      sourceRefs: temperamentSourceRefs,
    },
    {
      stableKey: `temperament:deliberation:${candidateId}`,
      optionKey,
      sourceType: "context:temperament",
      direction: "supports",
      importance: deliberationImportance,
      confidence: "medium",
      explanation:
        "The member's deliberation temperament gives weight to the candidate's recorded policy positions and relationships.",
      sourceRefs: temperamentSourceRefs,
    },
  ];
}

/**
 * Let the organization's living members choose whether anyone succeeds the
 * outgoing leader. Each vote is an ordinary durable decision trace; a tie
 * leaves leadership open instead of drawing or applying a succession rule.
 */
export function decideSuccession(
  world: World,
  organizationId: EntityId,
  cause: LeadershipSuccessionCause,
  outgoingLeaderId: EntityId,
): World {
  const stableKey = `movement-succession:${organizationId}:${outgoingLeaderId}:${cause}:${world.currentDate}`;
  if (
    world.history.events.some(
      (event) => event.stableKey === `${stableKey}:event`,
    )
  )
    return world;

  const memberships = membersOf(world, organizationId);
  const kin = kinshipRelationshipsAt(world, outgoingLeaderId).flatMap(
    (relationship) => relationship.personIds,
  );
  const tieCounts = new Map<EntityId, number>();
  for (const interaction of world.history.relationshipInteractions) {
    if (
      !interaction.personIds.includes(outgoingLeaderId) ||
      interaction.occurredAt > world.currentDate
    )
      continue;
    const other = interaction.personIds.find((id) => id !== outgoingLeaderId)!;
    if (
      interaction.kind.startsWith("mentorship:") ||
      interaction.significance !== "minor"
    )
      tieCounts.set(other, (tieCounts.get(other) ?? 0) + 1);
  }
  const mentorIds = world.history.relationshipInteractions
    .filter(
      (interaction) =>
        interaction.personIds.includes(outgoingLeaderId) &&
        interaction.kind.startsWith("mentorship:") &&
        interaction.occurredAt <= world.currentDate,
    )
    .map((interaction) =>
      interaction.personIds.find((id) => id !== outgoingLeaderId)!,
    );
  const closeTies = [
    ...new Set([
      ...kin,
      ...[...tieCounts]
        .filter(
          ([personId, count]) => count >= 2 || mentorIds.includes(personId),
        )
        .map(([personId]) => personId),
    ]),
  ].filter((personId) => living(world, personId));
  const candidateIds = [...new Set([...memberships, ...closeTies])]
    .filter((personId) => personId !== outgoingLeaderId)
    .sort();
  const voters = memberships.filter(
    (personId) => personId !== outgoingLeaderId,
  );
  let next = world;
  const tally = new Map<EntityId, number>();
  for (const voterId of voters) {
    const voteOptions = candidateIds.map((candidateId) => ({
      key: `candidate:${candidateId}`,
      label: world.people[candidateId]!.givenName,
      description: `Choose ${world.people[candidateId]!.givenName} to lead the organization.`,
    }));
    if (voteOptions.length === 0) continue;
    if (voteOptions.length === 1) {
      voteOptions.push({
        key: "leave-vacant",
        label: "Leave the position open",
        description: "Choose not to appoint a successor now.",
      });
    }
    const considerations: DecisionConsideration[] = [];
    for (const option of voteOptions) {
      if (!option.key.startsWith("candidate:")) continue;
      const candidateId = option.key.slice("candidate:".length) as EntityId;
      considerations.push(
        ...platformConsiderations(
          next,
          organizationId,
          candidateId,
          option.key,
        ),
        ...temperamentConsiderations(
          next,
          voterId,
          candidateId,
          outgoingLeaderId,
          option.key,
        ),
      );
      const relationship = relationshipConsideration(
        next,
        voterId,
        candidateId,
        option.key,
      );
      if (relationship) considerations.push(relationship);
    }
    const stableVoteKey = `${stableKey}:vote:${voterId}`;
    const evaluation = evaluateDecision(next, {
      stableKey: stableVoteKey,
      decisionType: "movement.leadership-succession",
      actorPersonId: voterId,
      cutoff: {
        asOfDate: next.currentDate,
        historySequenceExclusive: next.history.nextSequence,
      },
      subject: {
        kind: "context:organization",
        key: `leadership-succession:${organizationId}`,
        entityId: organizationId,
      },
      options: voteOptions,
      constraints: [],
      considerations,
      perceptionIds: [],
      randomness: "none",
      retention: "durable",
    });
    next = recordDurableDecisionTrace(next, evaluation);
    const selected = evaluation.selectedOptionKey;
    if (selected?.startsWith("candidate:")) {
      const candidateId = selected.slice("candidate:".length) as EntityId;
      tally.set(candidateId, (tally.get(candidateId) ?? 0) + 1);
    }
  }

  const maxVotes = Math.max(0, ...tally.values());
  const winners = [...tally]
    .filter(([, votes]) => votes === maxVotes && votes > 0)
    .map(([candidateId]) => candidateId)
    .sort();
  const winner = winners.length === 1 ? winners[0]! : null;
  const organization = next.history.organizations.find(
    (row) => row.id === organizationId,
  );
  if (!organization)
    throw new Error(`Unknown succession organization: ${organizationId}`);
  let locationJurisdictionId: EntityId | null = null;
  for (const profile of next.history.organizationProfiles)
    if (profile.organizationId === organizationId)
      locationJurisdictionId = profile.locationJurisdictionId;
  next = recordWorldEvent(next, {
    stableKey: `${stableKey}:event`,
    type: "movement.leadership-succession",
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: locationJurisdictionId,
    involvedEntityIds: [organizationId, outgoingLeaderId, ...candidateIds],
    participants: [
      {
        personId: outgoingLeaderId,
        role: "agency:outgoing-leader",
        detail: cause,
      },
      ...voters.map((personId) => ({
        personId,
        role: "agency:member-voter" as const,
        detail: (() => {
          const trace = next.history.decisionTraces.find(
            (row) => row.context.stableKey === `${stableKey}:vote:${personId}`,
          );
          return trace
            ? `${trace.id}: ${trace.selectedOptionKey ?? "undecided"}`
            : "No recorded decision trace";
        })(),
      })),
      ...(winner
        ? [
            {
              personId: winner,
              role: "agency:new-leader" as const,
              detail: "Selected by member votes.",
            },
          ]
        : []),
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      "movement-succession",
      `cause:${cause}`,
      ...(winner ? [`leader:${winner}`] : ["leader:vacant"]),
    ],
    summary: winner
      ? `${organization.stableKey} members chose ${next.people[winner]!.givenName} to lead after their leader ${cause === "death" ? "died" : cause === "retirement" ? "left play" : "stepped down"}.`
      : `${organization.stableKey} members did not settle on a successor after their leader ${cause === "death" ? "died" : cause === "retirement" ? "left play" : "stepped down"}.`,
    context: {
      location: null,
      socialContext:
        "Members considered the candidate's recorded positions, relationships, and their own temperament.",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const eventId = next.history.events.at(-1)!.id;

  const outgoingParticipations = next.history.organizationParticipations.filter(
    (participation) =>
      participation.personId === outgoingLeaderId &&
      participation.organizationId === organizationId &&
      role(participation, next)?.status === "active" &&
      role(participation, next)?.roleKind?.startsWith("leader:") === true,
  );
  for (const participation of outgoingParticipations) {
    const state = role(participation, next)!;
    next = recordOrganizationParticipationState(next, {
      stableKey: `${stableKey}:end:${participation.id}`,
      participationId: participation.id,
      effectiveAt: next.currentDate,
      status: "ended",
      roleKind: state.roleKind,
      context: `Leadership ended after ${cause}.`,
      provenance: { kind: "simulated-event", eventId },
      supersedesStateId: state.id,
    });
  }
  if (winner) {
    const party = partyUnits(next).find(
      (unit) => unit.organizationId === organizationId,
    );
    const kind = party
      ? party.level === "local"
        ? "leadership:party-chapter"
        : "leadership:party-officer"
      : "leadership:movement-succession";
    const roleKind = party
      ? party.level === "local"
        ? "leader:organizer"
        : "leader:officer"
      : "leader:movement";
    const alreadyLeading = activeLeaderships(next, winner).some(
      (participation) => participation.organizationId === organizationId,
    );
    if (!alreadyLeading)
      next = createOrganizationParticipation(next, {
        stableKey: `${stableKey}:leader:${winner}`,
        personId: winner,
        organizationId,
        startedAt: next.currentDate,
        kind,
        roleKind,
        context: "Chosen by the organization's members.",
        provenance: { kind: "simulated-event", eventId },
      });
  }
  const reviewAnchor = memberships[0] ?? winner;
  if (reviewAnchor)
    next = scheduleFutureDueItem(next, {
      stableKey: `${stableKey}:review`,
      dueAt: firstOfMonthAfter(next.currentDate, 3),
      transitionKey: MOVEMENT_BODY_REVIEW_TRANSITION_KEY,
      entityIds: [organizationId, reviewAnchor].sort(),
      jurisdictionId: locationJurisdictionId,
      provenance: {
        kind: "initialization",
        reference: `${stableKey}:membership-review`,
      },
    });
  return next;
}

/** A living leader's explicit choice to leave leadership; members choose next. */
export function stepDownFromLeadership(
  world: World,
  organizationId: EntityId,
  personId: EntityId,
): World {
  if (!living(world, personId)) return world;
  const leader = activeLeaderships(world, personId).find(
    (participation) => participation.organizationId === organizationId,
  );
  if (!leader) return world;
  return decideSuccession(world, organizationId, "step-down", personId);
}

/** Pass every organization led by a person who died. */
export function succeedDeceasedLeader(world: World, personId: EntityId): World {
  let next = world;
  const organizations = [
    ...new Set(
      activeLeaderships(world, personId).map((row) => row.organizationId),
    ),
  ].sort();
  for (const organizationId of organizations)
    next = decideSuccession(next, organizationId, "death", personId);
  return next;
}

/** Apply the open owner option if a living player character leaves play. */
export function succeedRetiredLeader(world: World, personId: EntityId): World {
  if (MOVEMENT_SUCCESSION_SETTINGS.retiredLeaderKeepsLeading) return world;
  let next = world;
  const organizations = [
    ...new Set(
      activeLeaderships(world, personId).map((row) => row.organizationId),
    ),
  ].sort();
  for (const organizationId of organizations)
    next = decideSuccession(next, organizationId, "retirement", personId);
  return next;
}

function isPersonalFollowing(
  participation: OrganizationParticipation,
  roleKind: string | null,
): boolean {
  return (
    roleKind === "member:movement-personal" ||
    roleKind === "member:personal-following" ||
    participation.kind === "membership:movement-personal"
  );
}

function isCauseMembership(
  participation: OrganizationParticipation,
  roleKind: string | null,
): boolean {
  return (
    roleKind?.endsWith(":cause") === true ||
    participation.kind.startsWith("membership:law-interest") ||
    participation.kind.startsWith("membership:party-") ||
    (!isPersonalFollowing(participation, roleKind) &&
      (roleKind?.startsWith("member:") === true ||
        participation.kind.startsWith("membership:")))
  );
}

/**
 * The body review scheduled after succession gives each active member one
 * chance to weigh the incoming leader. Personal followers may leave; members
 * recorded as joining for the cause have a reason to remain.
 */
export function movementBodyReviewTransitionHandler(
  world: World,
  dueItem: FutureDueItem,
): FutureTransitionHandlerResult {
  if (
    dueItem.transitionKey !== MOVEMENT_BODY_REVIEW_TRANSITION_KEY ||
    !dueItem.stableKey.startsWith("movement-succession:") ||
    !dueItem.stableKey.endsWith(":review")
  )
    throw new Error("The movement review handler received another transition.");

  const organization = world.history.organizations.find((candidate) =>
    dueItem.entityIds.includes(candidate.id),
  );
  if (!organization)
    return {
      world,
      status: "blocked",
      reasonKey: "movement:organization-missing",
      context: null,
      outcomeEventId: null,
    };
  const successionKey = dueItem.stableKey.slice(0, -":review".length);
  const succession = world.history.events.find(
    (event) => event.stableKey === `${successionKey}:event`,
  );
  const oldLeaderId = succession?.participants.find(
    (participant) => participant.role === "agency:outgoing-leader",
  )?.personId;
  const newLeaderTag = succession?.tags.find((tag) =>
    tag.startsWith("leader:"),
  );
  const newLeaderId =
    newLeaderTag && newLeaderTag !== "leader:vacant"
      ? (newLeaderTag.slice("leader:".length) as EntityId)
      : null;
  if (!succession || !oldLeaderId)
    return {
      world,
      status: "blocked",
      reasonKey: "movement:succession-record-missing",
      context: null,
      outcomeEventId: null,
    };
  const reviewEventKey = `${dueItem.stableKey}:event`;
  const completedEvent = world.history.events.find(
    (event) => event.stableKey === reviewEventKey,
  );
  if (completedEvent)
    return {
      world,
      status: "resolved",
      reasonKey: "movement:membership-already-reviewed",
      context: null,
      outcomeEventId: completedEvent.id,
    };

  const activeMemberships = world.history.organizationParticipations.filter(
    (participation) =>
      participation.organizationId === organization.id &&
      participation.startedAt <= world.currentDate &&
      role(participation, world)?.status === "active" &&
      role(participation, world)?.roleKind?.startsWith("member:") === true &&
      living(world, participation.personId),
  );
  let next = world;
  const decisions = new Map<EntityId, string>();
  const leave = new Set<EntityId>();
  for (const personId of [
    ...new Set(activeMemberships.map((row) => row.personId)),
  ].sort()) {
    const options = [
      {
        key: "remain",
        label: "Stay with the organization",
        description: "Continue as a member under the new leader.",
      },
      {
        key: "leave",
        label: "Leave the organization",
        description: "End membership after considering the leadership change.",
      },
    ];
    const considerations: DecisionConsideration[] = [];
    const personMemberships = activeMemberships.filter(
      (row) => row.personId === personId,
    );
    const personal = personMemberships.some((participation) =>
      isPersonalFollowing(
        participation,
        role(participation, next)?.roleKind ?? null,
      ),
    );
    const cause = personMemberships.some((participation) =>
      isCauseMembership(
        participation,
        role(participation, next)?.roleKind ?? null,
      ),
    );
    if (personal)
      considerations.push({
        stableKey: `old-leader-following:${personId}:${oldLeaderId}`,
        optionKey: "leave",
        sourceType: "context:membership-reason",
        direction: "supports",
        importance: "strong",
        confidence: "high",
        explanation:
          "This participation was recorded as following the outgoing leader personally.",
        sourceRefs: [],
      });
    if (cause)
      considerations.push({
        stableKey: `shared-cause:${personId}:${organization.id}`,
        optionKey: "remain",
        sourceType: "context:membership-reason",
        direction: "supports",
        importance: "strong",
        confidence: "high",
        explanation:
          "This participation is recorded as membership in the shared cause or party.",
        sourceRefs: [],
      });
    if (newLeaderId) {
      const relationship = relationshipConsideration(
        next,
        personId,
        newLeaderId,
        "remain",
      );
      if (relationship)
        considerations.push({
          ...relationship,
          stableKey: `new-leader:${relationship.stableKey}`,
          explanation:
            relationship.direction === "supports"
              ? `The member's recorded relationship with the new leader supports staying (${relationship.stableKey}).`
              : `The member's recorded relationship with the new leader weighs against staying (${relationship.stableKey}).`,
        });
    }
    const stableKey = `${dueItem.stableKey}:member:${personId}`;
    const evaluation = evaluateDecision(next, {
      stableKey,
      decisionType: "movement.membership-review",
      actorPersonId: personId,
      cutoff: {
        asOfDate: next.currentDate,
        historySequenceExclusive: next.history.nextSequence,
      },
      subject: {
        kind: "context:organization",
        key: `movement-membership-review:${organization.id}`,
        entityId: organization.id,
      },
      options,
      constraints: [],
      considerations,
      perceptionIds: [],
      randomness: "none",
      retention: "durable",
    });
    next = recordDurableDecisionTrace(next, evaluation);
    const trace = next.history.decisionTraces.at(-1)!;
    decisions.set(
      personId,
      `${trace.id}: ${evaluation.selectedOptionKey ?? "undecided"}`,
    );
    if (evaluation.selectedOptionKey === "leave") leave.add(personId);
  }

  next = recordWorldEvent(next, {
    stableKey: reviewEventKey,
    type: "movement.membership-review",
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId:
      world.history.organizationProfiles
        .filter((profile) => profile.organizationId === organization.id)
        .at(-1)?.locationJurisdictionId ?? null,
    involvedEntityIds: [
      organization.id,
      oldLeaderId,
      ...(newLeaderId ? [newLeaderId] : []),
      ...decisions.keys(),
    ],
    participants: [...decisions].map(([personId, detail]) => ({
      personId,
      role: "agency:member-reviewer",
      detail,
    })),
    personFactConstraints: [],
    visibility: "public",
    tags: ["movement-membership-review", `organization:${organization.id}`],
    summary: `${leave.size} of ${decisions.size} members left ${organization.stableKey} after weighing its new leadership.`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const eventId = next.history.events.at(-1)!.id;
  for (const participation of activeMemberships) {
    if (!leave.has(participation.personId)) continue;
    const state = role(participation, next);
    if (!state || state.status !== "active") continue;
    next = recordOrganizationParticipationState(next, {
      stableKey: `${dueItem.stableKey}:leave:${participation.id}`,
      participationId: participation.id,
      effectiveAt: next.currentDate,
      status: "ended",
      roleKind: state.roleKind,
      context: `Left after the members' review of the new leader; decision ${decisions.get(participation.personId)}.`,
      provenance: { kind: "simulated-event", eventId },
      supersedesStateId: state.id,
    });
  }
  return {
    world: next,
    status: "resolved",
    reasonKey: "movement:membership-reviewed",
    context: null,
    outcomeEventId: eventId,
  };
}
