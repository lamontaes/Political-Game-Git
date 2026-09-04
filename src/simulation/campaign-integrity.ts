import { candidacyPackById } from "./candidacy";
import {
  campaignActionRecords,
  campaignActionResultRecords,
  campaignStateRecords,
  campaigns,
} from "./campaign-queries";
import { createStableId } from "./ids";
import type {
  CampaignActionRecord,
  CampaignActionResultRecord,
  CampaignRecord,
  CampaignStateRecord,
  EntityId,
  World,
} from "./types";

/**
 * What a campaign record has to be able to prove.
 *
 * The rules below are not defensive programming; they are the campaign's half
 * of the world's integrity contract, and they run on every write. Two of them
 * carry most of the weight:
 *
 * - a terminal campaign state must agree with the election result it names, so
 *   a campaign cannot be recorded as won by somebody the contest says lost;
 * - every action result must carry canonical support for *every* candidate in
 *   the contest and exactly one observation of the filer's own, so support truth
 *   and the campaign's reading of it can never collapse into one record.
 */

export const CAMPAIGN_STATUSES = ["active", "won", "lost"] as const;
export const CAMPAIGN_ACTION_KINDS = [
  "fundraising",
  "outreach",
  "advertising",
] as const;

/** The classification a campaign committee's organization profile must carry. */
export const CAMPAIGN_ORGANIZATION_CLASSIFICATION =
  "custom:political-campaign";

function assertIdentity(
  ids: Set<EntityId>,
  world: World,
  record: {
    readonly id: EntityId;
    readonly stableKey: string;
    readonly sequence: number;
  },
  kind:
    | "campaign"
    | "campaign-state"
    | "campaign-action"
    | "campaign-action-result",
): void {
  if (ids.has(record.id)) {
    throw new Error(`Duplicate campaign history identity: ${record.id}`);
  }
  ids.add(record.id);
  if (record.id !== createStableId(kind, `${world.id}:${record.stableKey}`)) {
    throw new Error(
      `Campaign record identity does not match its stable key: ${record.id}`,
    );
  }
  if (!Number.isSafeInteger(record.sequence) || record.sequence < 0) {
    throw new Error(`Campaign record sequence is invalid: ${record.id}`);
  }
}

function assertOrdered(
  records: readonly { readonly sequence: number; readonly stableKey: string }[],
  label: string,
): void {
  const keys = new Set<string>();
  let prior = -1;
  for (const record of records) {
    if (record.sequence <= prior) {
      throw new Error(`${label} records are not sequence ordered.`);
    }
    if (keys.has(record.stableKey)) {
      throw new Error(`Duplicate ${label} stable key: ${record.stableKey}`);
    }
    keys.add(record.stableKey);
    prior = record.sequence;
  }
}

function assertCampaignRoots(
  world: World,
  ids: Set<EntityId>,
  campaign: CampaignRecord,
): void {
  assertIdentity(ids, world, campaign, "campaign");

  const contest = (world.history.electionContests ?? []).find(
    (candidate) => candidate.id === campaign.contestId,
  );
  if (
    !contest ||
    contest.sequence >= campaign.sequence ||
    contest.jurisdictionId !== campaign.jurisdictionId ||
    !contest.candidatePersonIds.includes(campaign.candidatePersonId)
  ) {
    throw new Error(
      `Campaign has an invalid contest/candidate link: ${campaign.id}`,
    );
  }

  // A filing has to name the sourced office it was authorized against, and that
  // office has to be the one the contest is actually for. Without this a
  // campaign could cite Kentucky's pack and stand in a contest for something
  // nobody has rules for.
  const option = candidacyPackById(campaign.candidacyPackId)?.offices.find(
    (candidate) => candidate.officeKey === campaign.officeKey,
  );
  if (
    !option ||
    option.office.officeKey !== contest.office.officeKey ||
    option.office.title !== contest.office.title ||
    option.office.seatKey !== contest.office.seatKey ||
    option.office.occupationClassification !==
      contest.office.occupationClassification
  ) {
    throw new Error(
      `Campaign cites an office no accepted candidacy pack supports: ${campaign.id}`,
    );
  }

  const organization = world.history.organizations.find(
    (candidate) => candidate.id === campaign.organizationId,
  );
  const organizationProfile = world.history.organizationProfiles
    .filter((candidate) => candidate.organizationId === campaign.organizationId)
    .at(-1);
  if (
    !organization ||
    organization.sequence >= campaign.sequence ||
    !organizationProfile ||
    organizationProfile.sequence >= campaign.sequence ||
    organizationProfile.classification !==
      CAMPAIGN_ORGANIZATION_CLASSIFICATION ||
    organizationProfile.locationJurisdictionId !== campaign.jurisdictionId
  ) {
    throw new Error(`Campaign organization is unavailable: ${campaign.id}`);
  }
  const counterparties = [
    campaign.organizationId,
    campaign.donorPoolOrganizationId,
    campaign.advertisingVendorOrganizationId,
  ];
  if (new Set(counterparties).size !== counterparties.length) {
    throw new Error(
      `Campaign cannot be its own donor or its own vendor: ${campaign.id}`,
    );
  }
  for (const organizationId of [
    campaign.donorPoolOrganizationId,
    campaign.advertisingVendorOrganizationId,
  ]) {
    if (
      !world.history.organizations.some(
        (candidate) =>
          candidate.id === organizationId &&
          candidate.sequence < campaign.sequence,
      )
    ) {
      throw new Error(
        `Campaign money counterparty is unavailable: ${campaign.id}`,
      );
    }
  }

  const treasury = world.history.resourcePositions.find(
    (candidate) => candidate.id === campaign.treasuryPositionId,
  );
  if (
    !treasury ||
    treasury.sequence >= campaign.sequence ||
    treasury.owner.kind !== "organization" ||
    treasury.owner.organizationId !== campaign.organizationId ||
    treasury.openingBalance.currency !== campaign.treasuryCurrency
  ) {
    throw new Error(`Campaign treasury is invalid: ${campaign.id}`);
  }

  const filingEvent = world.history.events.find(
    (event) => event.id === campaign.filingEventId,
  );
  if (
    !filingEvent ||
    filingEvent.sequence >= campaign.sequence ||
    filingEvent.occurredAt !== campaign.filedAt
  ) {
    throw new Error(`Campaign filing event is invalid: ${campaign.id}`);
  }

  const workIds = [
    campaign.candidateWorkRelationshipId,
    ...campaign.staffWorkRelationshipIds,
  ];
  const candidateWork = world.history.workRelationships.find(
    (work) => work.id === campaign.candidateWorkRelationshipId,
  );
  const staffWork = campaign.staffWorkRelationshipIds.map((id) =>
    world.history.workRelationships.find((work) => work.id === id),
  );
  if (
    new Set(workIds).size !== workIds.length ||
    !candidateWork ||
    candidateWork.personId !== campaign.candidatePersonId ||
    staffWork.some(
      (work) => !work || work.personId === campaign.candidatePersonId,
    ) ||
    new Set(staffWork.map((work) => work?.personId)).size !==
      staffWork.length ||
    workIds.some(
      (id) =>
        !world.history.workRelationships.some(
          (work) =>
            work.id === id &&
            work.organizationId === campaign.organizationId &&
            work.sequence < campaign.sequence,
        ),
    )
  ) {
    throw new Error(`Campaign work linkage is invalid: ${campaign.id}`);
  }

  const definition = world.metricCatalog.definitions[campaign.supportMetricId];
  if (!definition || definition.quantityUnit !== "rate:share") {
    throw new Error(`Campaign support definition is invalid: ${campaign.id}`);
  }
  const scopedCandidates = campaign.candidateSupportScopes.map(
    (scope) => scope.candidatePersonId,
  );
  if (
    JSON.stringify([...scopedCandidates].sort()) !==
      JSON.stringify([...contest.candidatePersonIds].sort()) ||
    new Set(campaign.candidateSupportScopes.map((scope) => scope.segmentKey))
      .size !== scopedCandidates.length
  ) {
    throw new Error(`Campaign support scopes are invalid: ${campaign.id}`);
  }
}

function assertCampaignStates(
  world: World,
  ids: Set<EntityId>,
  campaignById: ReadonlyMap<EntityId, CampaignRecord>,
): Map<EntityId, CampaignStateRecord[]> {
  const byCampaign = new Map<EntityId, CampaignStateRecord[]>();
  for (const state of campaignStateRecords(world)) {
    assertIdentity(ids, world, state, "campaign-state");
    const campaign = campaignById.get(state.campaignId);
    if (
      !campaign ||
      campaign.sequence >= state.sequence ||
      !(CAMPAIGN_STATUSES as readonly string[]).includes(state.status)
    ) {
      throw new Error(`Campaign state is invalid: ${state.id}`);
    }
    const prior = byCampaign.get(campaign.id) ?? [];
    const previous = prior.at(-1);
    if (!previous) {
      if (
        state.status !== "active" ||
        state.supersedesStateId !== null ||
        state.electionResultId !== null ||
        state.effectiveAt !== campaign.filedAt
      ) {
        throw new Error(`Campaign initial state is invalid: ${state.id}`);
      }
    } else {
      if (
        previous.status !== "active" ||
        state.status === "active" ||
        state.supersedesStateId !== previous.id ||
        state.electionResultId === null
      ) {
        throw new Error(`Campaign terminal state is invalid: ${state.id}`);
      }
      const electionResult = (world.history.electionContestResults ?? []).find(
        (result) => result.id === state.electionResultId,
      );
      if (
        !electionResult ||
        electionResult.contestId !== campaign.contestId ||
        electionResult.sequence >= state.sequence ||
        electionResult.resolvedAt !== state.effectiveAt
      ) {
        throw new Error(`Campaign result linkage is invalid: ${state.id}`);
      }
      const expected =
        electionResult.winnerPersonId === campaign.candidatePersonId
          ? "won"
          : "lost";
      if (state.status !== expected) {
        throw new Error(
          `Campaign outcome state disagrees with election result: ${state.id}`,
        );
      }
    }
    prior.push(state);
    byCampaign.set(campaign.id, prior);
  }
  return byCampaign;
}

function assertCampaignActions(
  world: World,
  ids: Set<EntityId>,
  campaignById: ReadonlyMap<EntityId, CampaignRecord>,
): Map<EntityId, CampaignActionRecord> {
  const actionById = new Map<EntityId, CampaignActionRecord>();
  const usedActivities = new Set<EntityId>();
  for (const action of campaignActionRecords(world)) {
    assertIdentity(ids, world, action, "campaign-action");
    const campaign = campaignById.get(action.campaignId);
    const activity = world.history.scheduledActivities.find(
      (candidate) => candidate.id === action.scheduledActivityId,
    );
    if (
      !campaign ||
      campaign.sequence >= action.sequence ||
      !activity ||
      activity.sequence >= action.sequence ||
      !(CAMPAIGN_ACTION_KINDS as readonly string[]).includes(action.kind) ||
      usedActivities.has(action.scheduledActivityId) ||
      !activity.participantPersonIds.includes(campaign.candidatePersonId) ||
      action.createdAt < campaign.filedAt
    ) {
      throw new Error(`Campaign action is invalid: ${action.id}`);
    }
    // Money is committed when the buy is placed, not invented when it lands.
    // Only an advertising buy spends; the other two cost time.
    if (action.kind === "advertising") {
      if (
        action.plannedSpend === null ||
        action.plannedSpend.minorUnits <= 0 ||
        action.plannedSpend.currency !== campaign.treasuryCurrency
      ) {
        throw new Error(
          `Campaign advertising action lacks a committed spend: ${action.id}`,
        );
      }
    } else if (action.plannedSpend !== null) {
      throw new Error(
        `Campaign action commits money it does not spend: ${action.id}`,
      );
    }
    usedActivities.add(action.scheduledActivityId);
    actionById.set(action.id, action);
  }
  return actionById;
}

function assertCampaignActionResults(
  world: World,
  ids: Set<EntityId>,
  campaignById: ReadonlyMap<EntityId, CampaignRecord>,
  actionById: ReadonlyMap<EntityId, CampaignActionRecord>,
): void {
  const resultActions = new Set<EntityId>();
  for (const result of campaignActionResultRecords(world)) {
    assertIdentity(ids, world, result, "campaign-action-result");
    const action = actionById.get(result.campaignActionId);
    const campaign = action ? campaignById.get(action.campaignId) : undefined;
    if (
      !action ||
      !campaign ||
      action.sequence >= result.sequence ||
      resultActions.has(action.id)
    ) {
      throw new Error(`Campaign action result is invalid: ${result.id}`);
    }
    resultActions.add(action.id);

    const activityState = world.history.scheduledActivityStates
      .filter((state) => state.activityId === action.scheduledActivityId)
      .at(-1);
    if (
      !activityState ||
      activityState.status !== "completed" ||
      activityState.recordedAt.date !== result.completedAt
    ) {
      throw new Error(
        `Campaign result lacks a completed canonical activity: ${result.id}`,
      );
    }

    const outcomeEvent = world.history.events.find(
      (event) => event.id === result.outcomeEventId,
    );
    const observation = world.history.metricObservations.find(
      (item) => item.id === result.observationId,
    );
    const feedbackEvent = world.history.events.find(
      (event) => event.id === result.feedbackEventId,
    );
    const knowledge = world.history.knowledge.find(
      (item) => item.id === result.feedbackKnowledgeId,
    );
    if (
      !outcomeEvent ||
      !observation ||
      !feedbackEvent ||
      !knowledge ||
      [
        outcomeEvent.sequence,
        observation.sequence,
        feedbackEvent.sequence,
        knowledge.sequence,
      ].some((sequence) => sequence >= result.sequence) ||
      knowledge.personId !== campaign.candidatePersonId ||
      knowledge.eventId !== feedbackEvent.id ||
      knowledge.learnedAt !== result.completedAt ||
      feedbackEvent.occurredAt !== result.completedAt ||
      outcomeEvent.occurredAt !== result.completedAt ||
      observation.underlyingStateId === null ||
      observation.metricId !== campaign.supportMetricId ||
      observation.scope.jurisdictionId !== campaign.jurisdictionId
    ) {
      throw new Error(
        `Campaign result consequence linkage is invalid: ${result.id}`,
      );
    }

    // Support has to move for everybody in the contest, not only the filer:
    // a campaign that recorded its own rise without recording whose it came
    // from would be keeping a score rather than modelling an electorate.
    const supportStates = result.supportStateIds.map((id) =>
      world.history.metricStates.find(
        (state) => state.id === id && state.sequence < result.sequence,
      ),
    );
    const expectedSegments = campaign.candidateSupportScopes
      .map((scope) => scope.segmentKey)
      .sort();
    const filerSegment = campaign.candidateSupportScopes.find(
      (scope) => scope.candidatePersonId === campaign.candidatePersonId,
    )?.segmentKey;
    if (
      result.supportStateIds.length !==
        campaign.candidateSupportScopes.length ||
      supportStates.some(
        (state) =>
          !state ||
          state.metricId !== campaign.supportMetricId ||
          state.scope.jurisdictionId !== campaign.jurisdictionId ||
          state.referencePeriod.kind !== "point" ||
          state.referencePeriod.at !== result.completedAt,
      ) ||
      JSON.stringify(
        supportStates.map((state) => state?.scope.segmentKey).sort(),
      ) !== JSON.stringify(expectedSegments) ||
      !result.supportStateIds.includes(observation.underlyingStateId) ||
      observation.scope.segmentKey !== filerSegment
    ) {
      throw new Error(
        `Campaign result support linkage is invalid: ${result.id}`,
      );
    }

    assertCampaignMoney(world, result, action, campaign);
  }
}

function assertCampaignMoney(
  world: World,
  result: CampaignActionResultRecord,
  action: CampaignActionRecord,
  campaign: CampaignRecord,
): void {
  const flow = world.history.resourceFlows.find(
    (item) => item.id === result.resourceFlowId,
  );
  const transfer = world.history.resourceTransferOutcomes.find(
    (item) => item.id === result.resourceOutcomeId,
  );

  if (action.kind === "outreach") {
    if (
      result.resourceFlowId !== null ||
      result.resourceOutcomeId !== null ||
      result.raisedAmount !== null ||
      result.spentAmount !== null
    ) {
      throw new Error(
        `Campaign outreach invented a resource transfer: ${result.id}`,
      );
    }
    return;
  }

  const money =
    action.kind === "fundraising" ? result.raisedAmount : result.spentAmount;
  const unusedSide =
    action.kind === "fundraising" ? result.spentAmount : result.raisedAmount;
  if (!flow || !transfer || money === null || unusedSide !== null) {
    throw new Error(`Campaign ${action.kind} result is invalid: ${result.id}`);
  }
  if (
    transfer.resourceFlowId !== flow.id ||
    transfer.status !== "completed" ||
    transfer.transferredAmount.minorUnits !== money.minorUnits ||
    transfer.transferredAmount.currency !== money.currency ||
    money.currency !== campaign.treasuryCurrency ||
    money.minorUnits <= 0
  ) {
    throw new Error(`Campaign ${action.kind} transfer is invalid: ${result.id}`);
  }

  // Which way the money went is the whole difference between the two, and the
  // committee has to be on the correct end of it.
  const [expectedSource, expectedRecipient] =
    action.kind === "fundraising"
      ? [campaign.donorPoolOrganizationId, campaign.organizationId]
      : [campaign.organizationId, campaign.advertisingVendorOrganizationId];
  if (
    flow.source.kind !== "organization" ||
    flow.source.organizationId !== expectedSource ||
    flow.recipient.kind !== "organization" ||
    flow.recipient.organizationId !== expectedRecipient
  ) {
    throw new Error(
      `Campaign ${action.kind} moved money the wrong way: ${result.id}`,
    );
  }
  if (
    action.kind === "advertising" &&
    (action.plannedSpend === null ||
      action.plannedSpend.minorUnits !== money.minorUnits ||
      action.plannedSpend.currency !== money.currency)
  ) {
    throw new Error(
      `Campaign advertising spent something other than what it committed: ${result.id}`,
    );
  }
}

export function assertCampaignIntegrity(
  world: World,
  ids: Set<EntityId>,
): void {
  const campaignRecords = campaigns(world);
  assertOrdered(campaignRecords, "campaign");
  assertOrdered(campaignStateRecords(world), "campaign state");
  assertOrdered(campaignActionRecords(world), "campaign action");
  assertOrdered(campaignActionResultRecords(world), "campaign action result");

  const campaignById = new Map<EntityId, CampaignRecord>();
  for (const campaign of campaignRecords) {
    assertCampaignRoots(world, ids, campaign);
    campaignById.set(campaign.id, campaign);
  }

  const statesByCampaign = assertCampaignStates(world, ids, campaignById);
  for (const campaign of campaignRecords) {
    const states = statesByCampaign.get(campaign.id) ?? [];
    if (states.length === 0) {
      throw new Error(`Campaign lacks state: ${campaign.id}`);
    }
    const contestResult = (world.history.electionContestResults ?? []).find(
      (result) => result.contestId === campaign.contestId,
    );
    const terminal = states.at(-1)!;
    if (
      (contestResult === undefined && terminal.status !== "active") ||
      (contestResult !== undefined &&
        (terminal.status === "active" ||
          terminal.electionResultId !== contestResult.id))
    ) {
      throw new Error(
        `Campaign lifecycle disagrees with its election contest: ${campaign.id}`,
      );
    }
  }

  const actionById = assertCampaignActions(world, ids, campaignById);
  assertCampaignActionResults(world, ids, campaignById, actionById);
}
