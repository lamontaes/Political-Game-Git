import { compareSimulationMoments } from "./dates";
import {
  ELECTION_CONTEST_TRANSITION_KEY,
  electionContestResult,
  electionContestStatus,
  electionContestTransitionHandler,
  requireElectionContest,
  resolveElectionContest,
  scheduleElectionContest,
} from "./election-contests";
import { createFutureTransitionHandlerRegistry } from "./future-transitions";
import { createStableId, stableHash } from "./ids";
import {
  createOrganization,
  createWorkRelationship,
  recordWorkStatus,
} from "./life";
import { workStatusHistory } from "./life-queries";
import { createExactQuantity } from "./quantity";
import { positionOwnerEndpoint, resourcePositionAt } from "./resource-queries";
import {
  createResourceFlow,
  createResourcePosition,
  recordResourceTransferOutcome,
} from "./resources";
import { recordEventKnowledge, recordRelationshipInteraction } from "./records";
import { SeededRng } from "./rng";
import {
  controlledCommitmentsBlockingActivityPerformance,
  createScheduledActivity,
  performScheduledActivity,
  scheduledActivityState,
} from "./time-work";
import type {
  CampaignActionRecord,
  CampaignActionResultRecord,
  CampaignCandidateSupportScope,
  CampaignRecord,
  CampaignStateRecord,
  CandidateTally,
  CurrencyCode,
  ElectiveOfficeRef,
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerRegistry,
  FutureTransitionHandlerResult,
  MetricSegmentKey,
  ScheduledActivityRecord,
  SimulationMoment,
  World,
  WorldMetricDefinition,
  WorldMetricObservationRecord,
  WorldMetricStateRecord,
} from "./types";
import {
  createWorldMetricCatalog,
  createWorldMetricDefinition,
  mostRecentWorldMetricStateAt,
  recordWorldMetricObservation,
  recordWorldMetricState,
} from "./world-metrics";
import { assertWorldIntegrity, recordWorldEvent } from "./world";

export const CAMPAIGN_SUPPORT_METRIC_STABLE_KEY =
  "campaign.candidate-support-share";

export interface CampaignActivityPlan {
  readonly start: SimulationMoment;
  readonly end: SimulationMoment;
  readonly location: ScheduledActivityRecord["location"];
  readonly title: string;
  readonly summary: string;
}

export interface FileCampaignInput {
  readonly stableKey: string;
  readonly candidatePersonId: EntityId;
  readonly rivalPersonIds: readonly EntityId[];
  readonly jurisdictionId: EntityId;
  readonly office: ElectiveOfficeRef;
  readonly electionDate: string;
  readonly existingContestId: EntityId | null;
  readonly campaignOrganizationName: string;
  readonly donorPoolOrganizationName: string;
  readonly staffPersonIds: readonly EntityId[];
  readonly endorserPersonId: EntityId | null;
  readonly treasuryCurrency: CurrencyCode;
  readonly fundraising: CampaignActivityPlan;
  readonly outreach: CampaignActivityPlan;
  readonly election: CampaignActivityPlan;
}

export interface FiledCampaignResult {
  readonly world: World;
  readonly campaign: CampaignRecord;
  readonly fundraisingAction: CampaignActionRecord;
  readonly outreachAction: CampaignActionRecord;
}

export interface CampaignOutcome {
  readonly winnerPersonId: EntityId;
  readonly tallies: readonly CandidateTally[];
}

const CAMPAIGN_STATUSES = ["active", "won", "lost"] as const;
const CAMPAIGN_ACTION_KINDS = ["fundraising", "outreach"] as const;

function requireText(value: string, label: string): void {
  if (value.trim().length === 0) throw new Error(`${label} must not be empty.`);
}

function canonicalIds(ids: readonly EntityId[], label: string): EntityId[] {
  const result = [...new Set(ids)].sort();
  if (result.length !== ids.length) {
    throw new Error(`${label} contains duplicate IDs.`);
  }
  return result;
}

function campaignSupportDefinition(): WorldMetricDefinition {
  return createWorldMetricDefinition({
    stableKey: CAMPAIGN_SUPPORT_METRIC_STABLE_KEY,
    name: "Candidate support",
    description:
      "Hidden bounded candidate support for one contest context at an explicit point in time.",
    domainKey: "campaign.support",
    valueKind: "quantity",
    quantityUnit: "rate:share",
    measureNature: "rate",
    referencePeriodKind: "point",
    denominatorMetricId: null,
    aggregationKind: "not-aggregatable",
    aggregationNote:
      "Candidate support is contest-specific and cannot be summed across candidates or jurisdictions.",
    stateSemantics: "primitive",
    tags: ["campaign.hidden-support", "election.candidate"],
  });
}

export function ensureCampaignSupportMetric(world: World): World {
  const definition = campaignSupportDefinition();
  if (world.metricCatalog.definitions[definition.id]) return world;
  const definitions = world.metricCatalog.definitionOrder.map(
    (id) => world.metricCatalog.definitions[id]!,
  );
  const next: World = {
    ...world,
    metricCatalog: createWorldMetricCatalog({
      definitions: [...definitions, definition],
    }),
  };
  assertWorldIntegrity(next);
  return next;
}

function lastOrganizationId(world: World): EntityId {
  const organization = world.history.organizations.at(-1);
  if (!organization) throw new Error("Campaign organization was not created.");
  return organization.id;
}

function lastWorkRelationshipId(world: World): EntityId {
  const work = world.history.workRelationships.at(-1);
  if (!work) throw new Error("Campaign work relationship was not created.");
  return work.id;
}

function lastActivityId(world: World): EntityId {
  const activity = world.history.scheduledActivities.at(-1);
  if (!activity) throw new Error("Campaign activity was not created.");
  return activity.id;
}

function supportSegment(
  contestId: EntityId,
  candidatePersonId: EntityId,
): MetricSegmentKey {
  return `candidate.${stableHash(`${contestId}:${candidatePersonId}`)}` as MetricSegmentKey;
}

function createCampaignActivity(
  world: World,
  stableKey: string,
  plan: CampaignActivityPlan,
  participantPersonIds: readonly EntityId[],
  responsiblePersonId: EntityId,
  sourceEventId: EntityId,
  kind: ScheduledActivityRecord["kind"],
): World {
  return createScheduledActivity(world, {
    stableKey,
    title: plan.title,
    summary: plan.summary,
    kind,
    start: plan.start,
    end: plan.end,
    participantPersonIds,
    responsiblePersonId,
    location: plan.location,
    sourceEntityIds: [sourceEventId],
    flexibility: { kind: "fixed" },
    access: { kind: "private", personIds: participantPersonIds },
  });
}

function appendCampaignRoots(
  world: World,
  campaign: Omit<CampaignRecord, "sequence">,
): FiledCampaignResult {
  const campaignRecord: CampaignRecord = {
    ...campaign,
    sequence: world.history.nextSequence,
  };
  const initialStateKey = `${campaign.stableKey}:state:active`;
  const state: CampaignStateRecord = {
    id: createStableId("campaign-state", `${world.id}:${initialStateKey}`),
    stableKey: initialStateKey,
    sequence: world.history.nextSequence + 1,
    campaignId: campaign.id,
    effectiveAt: campaign.filedAt,
    status: "active",
    electionResultId: null,
    reason: null,
    supersedesStateId: null,
  };
  const fundraisingKey = `${campaign.stableKey}:action:fundraising`;
  const fundraisingAction: CampaignActionRecord = {
    id: createStableId("campaign-action", `${world.id}:${fundraisingKey}`),
    stableKey: fundraisingKey,
    sequence: world.history.nextSequence + 2,
    campaignId: campaign.id,
    kind: "fundraising",
    scheduledActivityId: campaign.fundraisingActivityId,
    createdAt: campaign.filedAt,
  };
  const outreachKey = `${campaign.stableKey}:action:outreach`;
  const outreachAction: CampaignActionRecord = {
    id: createStableId("campaign-action", `${world.id}:${outreachKey}`),
    stableKey: outreachKey,
    sequence: world.history.nextSequence + 3,
    campaignId: campaign.id,
    kind: "outreach",
    scheduledActivityId: campaign.outreachActivityId,
    createdAt: campaign.filedAt,
  };
  const next: World = {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 4,
      campaigns: [...(world.history.campaigns ?? []), campaignRecord],
      campaignStates: [...(world.history.campaignStates ?? []), state],
      campaignActions: [
        ...(world.history.campaignActions ?? []),
        fundraisingAction,
        outreachAction,
      ],
    },
  };
  assertWorldIntegrity(next);
  return {
    world: next,
    campaign: campaignRecord,
    fundraisingAction,
    outreachAction,
  };
}

function allocateBasisPoints(
  entries: readonly { readonly id: EntityId; readonly weight: number }[],
): Readonly<Record<string, number>> {
  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
  const provisional = entries.map((entry) => {
    const exact = (entry.weight * 10_000) / totalWeight;
    return { ...entry, basisPoints: Math.floor(exact), remainder: exact % 1 };
  });
  let remaining =
    10_000 - provisional.reduce((sum, entry) => sum + entry.basisPoints, 0);
  provisional
    .sort(
      (left, right) =>
        right.remainder - left.remainder || left.id.localeCompare(right.id),
    )
    .forEach((entry) => {
      if (remaining > 0) {
        entry.basisPoints += 1;
        remaining -= 1;
      }
    });
  return Object.fromEntries(
    provisional.map((entry) => [entry.id, entry.basisPoints]),
  );
}

function recordInitialSupport(world: World, campaign: CampaignRecord): World {
  const rng = new SeededRng(world.seed).fork(
    `campaign-initial-support:${campaign.contestId}`,
  );
  const weights = campaign.candidateSupportScopes.map((scope) => ({
    id: scope.candidatePersonId,
    weight:
      850 +
      rng.fork(scope.candidatePersonId).integer(0, 301) +
      (scope.candidatePersonId === campaign.candidatePersonId ? 25 : 0),
  }));
  const basisPoints = allocateBasisPoints(weights);
  let next = world;
  for (const scope of campaign.candidateSupportScopes) {
    next = recordWorldMetricState(next, {
      stableKey: `${campaign.stableKey}:support:${scope.candidatePersonId}:initial`,
      metricId: campaign.supportMetricId,
      scope: {
        jurisdictionId: campaign.jurisdictionId,
        segmentKey: scope.segmentKey,
      },
      referencePeriod: { kind: "point", at: campaign.filedAt },
      value: {
        kind: "quantity",
        quantity: createExactQuantity(
          basisPoints[scope.candidatePersonId]!,
          10_000,
          "rate:share",
        ),
      },
      recordedAt: campaign.filedAt,
      provenance: {
        kind: "simulated",
        sourceEntityIds: [
          campaign.filingEventId,
          ...(campaign.endorsementEventId ? [campaign.endorsementEventId] : []),
        ].sort(),
      },
      supersedesStateId: null,
    });
  }
  return next;
}

export function fileCampaign(
  inputWorld: World,
  input: FileCampaignInput,
): FiledCampaignResult {
  assertWorldIntegrity(inputWorld);
  requireText(input.stableKey, "Campaign stable key");
  requireText(input.campaignOrganizationName, "Campaign organization name");
  requireText(input.donorPoolOrganizationName, "Campaign donor pool name");
  if (
    (inputWorld.history.campaigns ?? []).some(
      (campaign) => campaign.stableKey === input.stableKey,
    )
  ) {
    throw new Error(`Campaign stable key already exists: ${input.stableKey}`);
  }
  if (!inputWorld.people[input.candidatePersonId]) {
    throw new Error("Campaign filing references a missing candidate.");
  }
  if (!inputWorld.jurisdictions[input.jurisdictionId]) {
    throw new Error("Campaign filing references a missing jurisdiction.");
  }
  const rivals = canonicalIds(input.rivalPersonIds, "Campaign rivals");
  if (rivals.length === 0 || rivals.includes(input.candidatePersonId)) {
    throw new Error("Campaign filing requires at least one distinct rival.");
  }
  const staffPersonIds = canonicalIds(input.staffPersonIds, "Campaign staff");
  if (
    staffPersonIds.includes(input.candidatePersonId) ||
    staffPersonIds.some((personId) => rivals.includes(personId))
  ) {
    throw new Error(
      "Campaign staff must be distinct from the contest candidates.",
    );
  }
  for (const personId of [...rivals, ...staffPersonIds]) {
    if (!inputWorld.people[personId]) {
      throw new Error(
        `Campaign filing references a missing person: ${personId}`,
      );
    }
  }
  if (
    input.endorserPersonId !== null &&
    !inputWorld.people[input.endorserPersonId]
  ) {
    throw new Error("Campaign endorsement references a missing person.");
  }
  if (input.endorserPersonId === input.candidatePersonId) {
    throw new Error("A candidate cannot endorse their own campaign.");
  }
  if (
    input.fundraising.start.date >= input.electionDate ||
    input.outreach.start.date >= input.electionDate ||
    input.election.start.date !== input.electionDate ||
    compareSimulationMoments(input.fundraising.start, input.outreach.start) >=
      0 ||
    compareSimulationMoments(input.outreach.start, input.election.start) >= 0
  ) {
    throw new Error("Campaign activity chronology must lead to election day.");
  }

  let world = ensureCampaignSupportMetric(inputWorld);
  let contestId = input.existingContestId;
  if (contestId === null) {
    world = scheduleElectionContest(world, {
      stableKey: `${input.stableKey}:contest`,
      jurisdictionId: input.jurisdictionId,
      office: input.office,
      electionDate: input.electionDate,
      candidatePersonIds: [input.candidatePersonId, ...rivals],
      provenance: {
        method: "simulated",
        sourceEntityIds: [input.candidatePersonId, ...rivals].sort(),
        note: "Bounded Slice E campaign filing fixture.",
      },
    });
    contestId = (world.history.electionContests ?? []).at(-1)!.id;
  } else {
    const contest = requireElectionContest(world, contestId);
    if (
      electionContestStatus(world, contest.id) !== "pending" ||
      contest.jurisdictionId !== input.jurisdictionId ||
      !contest.candidatePersonIds.includes(input.candidatePersonId)
    ) {
      throw new Error("Existing contest is not compatible with this filing.");
    }
  }
  const contest = requireElectionContest(world, contestId);
  const expectedCandidates = [input.candidatePersonId, ...rivals].sort();
  if (
    contest.electionDate !== input.electionDate ||
    contest.office.officeKey !== input.office.officeKey ||
    contest.office.title !== input.office.title ||
    contest.office.seatKey !== input.office.seatKey ||
    contest.office.occupationClassification !==
      input.office.occupationClassification ||
    JSON.stringify([...contest.candidatePersonIds].sort()) !==
      JSON.stringify(expectedCandidates)
  ) {
    throw new Error("Election contest does not match the campaign filing.");
  }

  world = createOrganization(world, {
    stableKey: `${input.stableKey}:organization`,
    formedAt: world.currentDate,
    detailLevel: "detailed",
    provenance: {
      kind: "authored",
      note: "Bounded campaign organization created by the filing operation.",
    },
    initialProfile: {
      name: input.campaignOrganizationName,
      classification: "custom:political-campaign",
      locationJurisdictionId: input.jurisdictionId,
    },
  });
  const organizationId = lastOrganizationId(world);
  world = createOrganization(world, {
    stableKey: `${input.stableKey}:donor-pool`,
    formedAt: world.currentDate,
    detailLevel: "lightweight",
    provenance: {
      kind: "authored",
      note: "Aggregate fixture source for bounded fundraising; not a donor database.",
    },
    initialProfile: {
      name: input.donorPoolOrganizationName,
      classification: "community:campaign-supporters",
      locationJurisdictionId: input.jurisdictionId,
    },
  });
  const donorPoolOrganizationId = lastOrganizationId(world);
  world = createResourcePosition(world, {
    stableKey: `${input.stableKey}:treasury`,
    owner: { kind: "organization", organizationId },
    openedAt: world.currentDate,
    openingBalance: { minorUnits: 0, currency: input.treasuryCurrency },
    provenance: {
      kind: "authored",
      note: "Bounded campaign opening position.",
    },
  });
  const treasuryPositionId = world.history.resourcePositions.at(-1)!.id;

  world = createWorkRelationship(world, {
    stableKey: `${input.stableKey}:work:candidate`,
    personId: input.candidatePersonId,
    organizationId,
    startedAt: world.currentDate,
    kind: "service:campaign-candidate",
    compensation: "unpaid",
    authority: "directs-others",
    dependency: "partly-dependent",
    economicRisk: "person-borne",
    provenance: { kind: "authored", note: "Campaign candidacy work." },
    initialRole: {
      title: "Candidate",
      occupationClassification: "custom:campaign-candidate",
      locationJurisdictionId: input.jurisdictionId,
      timeDemand: {
        expectedWeekly: { minimumHours: 5, maximumHours: 30 },
        attention: "high",
        concurrency: "mostly-exclusive",
        scheduleRigidity: "mixed",
        interruptibility: "limited",
        locationJurisdictionId: input.jurisdictionId,
      },
    },
  });
  const candidateWorkRelationshipId = lastWorkRelationshipId(world);
  const staffWorkRelationshipIds: EntityId[] = [];
  for (const staffPersonId of staffPersonIds) {
    world = createWorkRelationship(world, {
      stableKey: `${input.stableKey}:work:staff:${staffPersonId}`,
      personId: staffPersonId,
      organizationId,
      startedAt: world.currentDate,
      kind: "volunteer:campaign-staff",
      compensation: "unpaid",
      authority: "shared",
      dependency: "partly-dependent",
      economicRisk: "organization-borne",
      provenance: {
        kind: "authored",
        note: "Bounded campaign volunteer role.",
      },
      initialRole: {
        title: "Campaign volunteer",
        occupationClassification: "custom:campaign-staff",
        locationJurisdictionId: input.jurisdictionId,
        timeDemand: {
          expectedWeekly: { minimumHours: 2, maximumHours: 12 },
          attention: "moderate",
          concurrency: "partly-concurrent",
          scheduleRigidity: "flexible",
          interruptibility: "interruptible",
          locationJurisdictionId: input.jurisdictionId,
        },
      },
    });
    staffWorkRelationshipIds.push(lastWorkRelationshipId(world));
  }

  world = recordWorldEvent(world, {
    stableKey: `${input.stableKey}:filing-event`,
    type: "campaign.candidacy-filed",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: input.jurisdictionId,
    involvedEntityIds: [
      contest.id,
      organizationId,
      input.candidatePersonId,
      input.jurisdictionId,
    ],
    participants: [
      {
        personId: input.candidatePersonId,
        role: "agency:candidate",
        detail: `Filed for ${contest.office.title}`,
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: ["campaign.filing", "election.candidacy", "slice-e"],
    summary: `${inputWorld.people[input.candidatePersonId]!.givenName} ${inputWorld.people[input.candidatePersonId]!.familyName} filed as a candidate for ${contest.office.title}.`,
    context: {
      location: {
        jurisdictionId: input.jurisdictionId,
        label: inputWorld.jurisdictions[input.jurisdictionId]!.name,
        setting: "Campaign filing",
      },
      socialContext:
        "A bounded public candidacy filing for the weekend playtest.",
      pressure: null,
      choice: "Enter the election contest.",
      motivation: "Begin a public campaign.",
      immediateReaction:
        "The campaign can now organize, raise money, and contact voters.",
    },
  });
  const filingEventId = world.history.events.at(-1)!.id;
  let endorsementEventId: EntityId | null = null;
  if (input.endorserPersonId !== null) {
    world = recordWorldEvent(world, {
      stableKey: `${input.stableKey}:endorsement-event`,
      type: "campaign.person-endorsed",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: input.jurisdictionId,
      involvedEntityIds: [
        input.endorserPersonId,
        input.candidatePersonId,
        organizationId,
        contest.id,
      ],
      participants: [
        {
          personId: input.endorserPersonId,
          role: "agency:endorser",
          detail: "Publicly endorsed the candidacy",
        },
        {
          personId: input.candidatePersonId,
          role: "focus:candidate",
          detail: "Received the endorsement",
        },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: ["campaign.endorsement", "relationship.support", "slice-e"],
      summary: `${inputWorld.people[input.endorserPersonId]!.givenName} ${inputWorld.people[input.endorserPersonId]!.familyName} endorsed the candidacy.`,
      context: {
        location: {
          jurisdictionId: input.jurisdictionId,
          label: inputWorld.jurisdictions[input.jurisdictionId]!.name,
          setting: "Campaign launch",
        },
        socialContext:
          "A bounded person endorsement recorded through ordinary public history.",
        pressure: null,
        choice: "Publicly support the candidate.",
        motivation: "Help launch the campaign.",
        immediateReaction:
          "The endorsement becomes part of the campaign's public history.",
      },
    });
    endorsementEventId = world.history.events.at(-1)!.id;
    world = recordRelationshipInteraction(world, {
      stableKey: `${input.stableKey}:endorsement-relationship`,
      personIds: [input.endorserPersonId, input.candidatePersonId],
      eventId: endorsementEventId,
      occurredAt: world.currentDate,
      kind: "support:campaign-endorsement",
      change: "strengthened",
      significance: "meaningful",
      summary:
        "A public endorsement strengthened their political working relationship.",
      tags: ["campaign.endorsement", "relationship.support"],
    });
  }

  const participants = canonicalIds(
    [input.candidatePersonId, ...staffPersonIds],
    "Campaign activity participants",
  );
  world = createCampaignActivity(
    world,
    `${input.stableKey}:activity:fundraising`,
    input.fundraising,
    participants,
    input.candidatePersonId,
    filingEventId,
    "confirmed",
  );
  const fundraisingActivityId = lastActivityId(world);
  world = createCampaignActivity(
    world,
    `${input.stableKey}:activity:outreach`,
    input.outreach,
    participants,
    input.candidatePersonId,
    filingEventId,
    "confirmed",
  );
  const outreachActivityId = lastActivityId(world);
  world = createCampaignActivity(
    world,
    `${input.stableKey}:activity:election`,
    input.election,
    [input.candidatePersonId],
    input.candidatePersonId,
    filingEventId,
    "confirmed",
  );
  const electionActivityId = lastActivityId(world);

  const supportMetricId = campaignSupportDefinition().id;
  const candidateSupportScopes: CampaignCandidateSupportScope[] =
    contest.candidatePersonIds.map((candidatePersonId) => ({
      candidatePersonId,
      segmentKey: supportSegment(contest.id, candidatePersonId),
    }));
  const campaignId = createStableId(
    "campaign",
    `${world.id}:${input.stableKey}`,
  );
  const appended = appendCampaignRoots(world, {
    id: campaignId,
    stableKey: input.stableKey,
    contestId: contest.id,
    candidatePersonId: input.candidatePersonId,
    jurisdictionId: input.jurisdictionId,
    organizationId,
    donorPoolOrganizationId,
    treasuryPositionId,
    treasuryCurrency: input.treasuryCurrency,
    candidateWorkRelationshipId,
    staffWorkRelationshipIds,
    supportMetricId,
    candidateSupportScopes,
    filingEventId,
    endorsementEventId,
    fundraisingActivityId,
    outreachActivityId,
    electionActivityId,
    filedAt: world.currentDate,
  });
  const supportedWorld = recordInitialSupport(
    appended.world,
    appended.campaign,
  );
  assertWorldIntegrity(supportedWorld);
  return { ...appended, world: supportedWorld };
}

export function campaignById(
  world: World,
  campaignId: EntityId,
): CampaignRecord | null {
  return (
    (world.history.campaigns ?? []).find(
      (campaign) => campaign.id === campaignId,
    ) ?? null
  );
}

export function campaignForCandidate(
  world: World,
  candidatePersonId: EntityId,
): CampaignRecord | null {
  return (
    [...(world.history.campaigns ?? [])]
      .reverse()
      .find((campaign) => campaign.candidatePersonId === candidatePersonId) ??
    null
  );
}

export function campaignForContest(
  world: World,
  contestId: EntityId,
): CampaignRecord | null {
  return (
    (world.history.campaigns ?? []).find(
      (campaign) => campaign.contestId === contestId,
    ) ?? null
  );
}

export function campaignState(
  world: World,
  campaignId: EntityId,
): CampaignStateRecord {
  const state = (world.history.campaignStates ?? [])
    .filter((candidate) => candidate.campaignId === campaignId)
    .at(-1);
  if (!state) throw new Error(`Campaign state is missing: ${campaignId}`);
  return state;
}

export function campaignActionForActivity(
  world: World,
  activityId: EntityId,
): CampaignActionRecord | null {
  return (
    (world.history.campaignActions ?? []).find(
      (action) => action.scheduledActivityId === activityId,
    ) ?? null
  );
}

export function campaignActionResult(
  world: World,
  actionId: EntityId,
): CampaignActionResultRecord | null {
  return (
    (world.history.campaignActionResults ?? []).find(
      (result) => result.campaignActionId === actionId,
    ) ?? null
  );
}

export function campaignTreasuryPosition(
  world: World,
  campaign: CampaignRecord,
) {
  return resourcePositionAt(
    world,
    { kind: "organization", organizationId: campaign.organizationId },
    campaign.treasuryCurrency,
  );
}

function quantityBasisPoints(state: WorldMetricStateRecord): number {
  if (
    state.value.kind !== "quantity" ||
    state.value.quantity.unit !== "rate:share"
  ) {
    throw new Error("Campaign support state is not an exact share.");
  }
  const scaled =
    (state.value.quantity.numerator * 10_000) /
    state.value.quantity.denominator;
  if (!Number.isSafeInteger(scaled))
    throw new Error("Campaign support cannot be represented in basis points.");
  return scaled;
}

function latestSupportState(
  world: World,
  campaign: CampaignRecord,
  scope: CampaignCandidateSupportScope,
): WorldMetricStateRecord {
  const state = mostRecentWorldMetricStateAt(
    world,
    campaign.supportMetricId,
    { jurisdictionId: campaign.jurisdictionId, segmentKey: scope.segmentKey },
    {
      asOfDate: world.currentDate,
      historySequenceExclusive: world.history.nextSequence,
    },
  );
  if (!state)
    throw new Error(
      `Campaign support state is missing: ${scope.candidatePersonId}`,
    );
  return state;
}

function supportAfterAction(
  world: World,
  campaign: CampaignRecord,
  action: CampaignActionRecord,
): Readonly<Record<string, number>> {
  const current = Object.fromEntries(
    campaign.candidateSupportScopes.map((scope) => [
      scope.candidatePersonId,
      quantityBasisPoints(latestSupportState(world, campaign, scope)),
    ]),
  ) as Record<string, number>;
  const rng = new SeededRng(world.seed).fork(
    `campaign-action-effect:${action.id}`,
  );
  const requestedGain =
    action.kind === "fundraising"
      ? 40 + rng.integer(0, 61)
      : 150 + rng.integer(0, 151);
  const rivals = campaign.candidateSupportScopes
    .map((scope) => scope.candidatePersonId)
    .filter((personId) => personId !== campaign.candidatePersonId)
    .sort();
  let remaining = requestedGain;
  let removed = 0;
  for (let index = 0; index < rivals.length && remaining > 0; index += 1) {
    const rivalId = rivals[index]!;
    const share = Math.ceil(remaining / (rivals.length - index));
    const take = Math.min(share, Math.max(0, current[rivalId]! - 100));
    current[rivalId] = current[rivalId]! - take;
    remaining -= take;
    removed += take;
  }
  current[campaign.candidatePersonId] =
    current[campaign.candidatePersonId]! + removed;
  return current;
}

function recordSupportAfterAction(
  world: World,
  campaign: CampaignRecord,
  action: CampaignActionRecord,
  outcomeEventId: EntityId,
): {
  readonly world: World;
  readonly stateIds: readonly EntityId[];
  readonly candidateStateId: EntityId;
} {
  const support = supportAfterAction(world, campaign, action);
  let next = world;
  const stateIds: EntityId[] = [];
  let candidateStateId: EntityId | null = null;
  for (const scope of campaign.candidateSupportScopes) {
    const samePeriod = next.history.metricStates
      .filter(
        (state) =>
          state.metricId === campaign.supportMetricId &&
          state.scope.jurisdictionId === campaign.jurisdictionId &&
          state.scope.segmentKey === scope.segmentKey &&
          state.referencePeriod.kind === "point" &&
          state.referencePeriod.at === next.currentDate,
      )
      .at(-1);
    next = recordWorldMetricState(next, {
      stableKey: `${action.stableKey}:support:${scope.candidatePersonId}`,
      metricId: campaign.supportMetricId,
      scope: {
        jurisdictionId: campaign.jurisdictionId,
        segmentKey: scope.segmentKey,
      },
      referencePeriod: { kind: "point", at: next.currentDate },
      value: {
        kind: "quantity",
        quantity: createExactQuantity(
          support[scope.candidatePersonId]!,
          10_000,
          "rate:share",
        ),
      },
      recordedAt: next.currentDate,
      provenance: { kind: "simulated", sourceEntityIds: [outcomeEventId] },
      supersedesStateId: samePeriod?.id ?? null,
    });
    const stateId = next.history.metricStates.at(-1)!.id;
    stateIds.push(stateId);
    if (scope.candidatePersonId === campaign.candidatePersonId)
      candidateStateId = stateId;
  }
  if (!candidateStateId)
    throw new Error("Candidate support state was not recorded.");
  return { world: next, stateIds, candidateStateId };
}

function recordCampaignObservation(
  world: World,
  campaign: CampaignRecord,
  action: CampaignActionRecord,
  candidateStateId: EntityId,
): {
  readonly world: World;
  readonly observation: WorldMetricObservationRecord;
} {
  const state = world.history.metricStates.find(
    (candidate) => candidate.id === candidateStateId,
  )!;
  const trueBasisPoints = quantityBasisPoints(state);
  const error = new SeededRng(world.seed)
    .fork(`campaign-observation:${action.id}:${candidateStateId}`)
    .pick([-300, -200, -100, 100, 200, 300] as const);
  const observedBasisPoints = Math.max(
    0,
    Math.min(10_000, trueBasisPoints + error),
  );
  const previous = world.history.metricObservations
    .filter(
      (observation) =>
        observation.metricId === campaign.supportMetricId &&
        observation.scope.jurisdictionId === campaign.jurisdictionId &&
        observation.scope.segmentKey === state.scope.segmentKey &&
        observation.referencePeriod.kind === "point" &&
        observation.referencePeriod.at === world.currentDate &&
        observation.sourceSeriesKey === "campaign.staff-memo",
    )
    .at(-1);
  const next = recordWorldMetricObservation(world, {
    stableKey: `${action.stableKey}:observation`,
    metricId: campaign.supportMetricId,
    scope: { ...state.scope },
    referencePeriod: { kind: "point", at: world.currentDate },
    value: {
      kind: "quantity",
      quantity: createExactQuantity(observedBasisPoints, 10_000, "rate:share"),
    },
    sourceSeriesKey: "campaign.staff-memo",
    sourceLabel: "Campaign field memo",
    sourceReference: null,
    methodologyKey: "campaign.bounded-contact-sample",
    releaseDate: world.currentDate,
    recordedAt: world.currentDate,
    vintageKey: `campaign.v${world.history.nextSequence}`,
    uncertainty: {
      kind: "margin-of-error",
      margin: {
        kind: "quantity",
        quantity: createExactQuantity(400, 10_000, "rate:share"),
      },
      confidence: createExactQuantity(19, 20, "rate:share"),
    },
    supersedesObservationId: previous?.id ?? null,
    underlyingStateId: candidateStateId,
  });
  return { world: next, observation: next.history.metricObservations.at(-1)! };
}

function actionCompletionEvent(world: World, activityId: EntityId): EntityId {
  const state = scheduledActivityState(world, activityId);
  if (state.status !== "completed" || state.outcomeEventId === null) {
    throw new Error("Campaign action activity did not complete canonically.");
  }
  return state.outcomeEventId;
}

export function performCampaignAction(world: World, actionId: EntityId): World {
  const action = (world.history.campaignActions ?? []).find(
    (candidate) => candidate.id === actionId,
  );
  if (!action) throw new Error(`Campaign action not found: ${actionId}`);
  if (campaignActionResult(world, action.id))
    throw new Error("Campaign action is already complete.");
  const campaign = campaignById(world, action.campaignId);
  if (!campaign || campaignState(world, campaign.id).status !== "active") {
    throw new Error("Only an active campaign can perform campaign actions.");
  }
  const registry = createCampaignElectionTransitionRegistry();
  if (
    controlledCommitmentsBlockingActivityPerformance(
      world,
      action.scheduledActivityId,
    ).length > 0
  ) {
    return world;
  }
  let next = performScheduledActivity(
    world,
    action.scheduledActivityId,
    registry,
  );
  const completionEventId = actionCompletionEvent(
    next,
    action.scheduledActivityId,
  );

  let resourceFlowId: EntityId | null = null;
  let resourceOutcomeId: EntityId | null = null;
  let raisedAmount: CampaignActionResultRecord["raisedAmount"] = null;
  if (action.kind === "fundraising") {
    const minorUnits = new SeededRng(next.seed)
      .fork(`campaign-fundraising:${action.id}`)
      .integer(85_000, 175_001);
    raisedAmount = { minorUnits, currency: campaign.treasuryCurrency };
    next = createResourceFlow(next, {
      stableKey: `${action.stableKey}:fundraising-flow`,
      source: {
        kind: "organization",
        organizationId: campaign.donorPoolOrganizationId,
      },
      recipient: positionOwnerEndpoint({
        kind: "organization",
        organizationId: campaign.organizationId,
      }),
      startsAt: next.currentDate,
      initialStatus: "active",
      amount: raisedAmount,
      cadenceKind: "schedule:one-time",
      basisKind: "custom:campaign-fundraising",
      basisReference: { kind: "general" },
      restrictionKind: "unrestricted:campaign",
      jurisdictionId: campaign.jurisdictionId,
      provenance: { kind: "simulated-event", eventId: completionEventId },
    });
    resourceFlowId = next.history.resourceFlows.at(-1)!.id;
    next = recordResourceTransferOutcome(next, {
      stableKey: `${action.stableKey}:fundraising-outcome`,
      resourceFlowId,
      periodStartsAt: next.currentDate,
      periodEndsAt: next.currentDate,
      occurredAt: next.currentDate,
      status: "completed",
      attemptedAmount: raisedAmount,
      transferredAmount: raisedAmount,
      reasonKind: null,
      note: "Bounded deterministic proceeds from the scheduled fundraising activity.",
      provenance: { kind: "simulated-event", eventId: completionEventId },
    });
    resourceOutcomeId = next.history.resourceTransferOutcomes.at(-1)!.id;
  }

  next = recordWorldEvent(next, {
    stableKey: `${action.stableKey}:outcome-event`,
    type:
      action.kind === "fundraising"
        ? "campaign.fundraising-completed"
        : "campaign.outreach-completed",
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: campaign.jurisdictionId,
    involvedEntityIds: [
      campaign.contestId,
      campaign.organizationId,
      campaign.candidatePersonId,
      action.scheduledActivityId,
    ],
    participants: [
      {
        personId: campaign.candidatePersonId,
        role: "agency:candidate",
        detail:
          action.kind === "fundraising"
            ? "Led a fundraising call session"
            : "Led neighborhood voter outreach",
      },
    ],
    personFactConstraints: [],
    visibility: "limited",
    tags: [`campaign.${action.kind}`, "campaign.action", "slice-e"],
    summary:
      action.kind === "fundraising"
        ? `The campaign completed a fundraising session and received ${raisedAmount!.currency} ${(raisedAmount!.minorUnits / 100).toFixed(2)}.`
        : "The campaign completed a neighborhood outreach session and recorded the field contact.",
    context: {
      location: {
        jurisdictionId: campaign.jurisdictionId,
        label: next.history.scheduledActivities.find(
          (activity) => activity.id === action.scheduledActivityId,
        )!.location.label,
        setting: "Scheduled campaign activity",
      },
      socialContext:
        "A bounded campaign action with canonical time and history.",
      pressure: "The campaign has limited days before the election.",
      choice:
        action.kind === "fundraising"
          ? "Spend time asking supporters for campaign resources."
          : "Spend time contacting people in the community.",
      motivation: "Build a viable campaign before election day.",
      immediateReaction:
        action.kind === "fundraising"
          ? "Campaign cash increased."
          : "Staff prepared a fallible field memo.",
    },
  });
  const outcomeEventId = next.history.events.at(-1)!.id;
  const supportResult = recordSupportAfterAction(
    next,
    campaign,
    action,
    outcomeEventId,
  );
  next = supportResult.world;
  const observationResult = recordCampaignObservation(
    next,
    campaign,
    action,
    supportResult.candidateStateId,
  );
  next = observationResult.world;
  const observation = observationResult.observation;
  const observed =
    observation.value.kind === "quantity"
      ? (observation.value.quantity.numerator /
          observation.value.quantity.denominator) *
        100
      : 0;
  next = recordWorldEvent(next, {
    stableKey: `${action.stableKey}:feedback-event`,
    type: "campaign.feedback-released",
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: campaign.jurisdictionId,
    involvedEntityIds: [
      campaign.organizationId,
      campaign.candidatePersonId,
      observation.id,
    ],
    participants: [
      {
        personId: campaign.candidatePersonId,
        role: "focus:recipient",
        detail: "Received the campaign field memo",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: ["campaign.feedback", "campaign.observation", "slice-e"],
    summary: `The campaign field memo estimated support near ${Math.round(observed)}%, with a four-point margin of error.`,
    context: {
      location: {
        jurisdictionId: campaign.jurisdictionId,
        label: "Campaign office",
        setting: "Staff field memo",
      },
      socialContext:
        "A bounded, fallible observation rather than canonical support truth.",
      pressure: null,
      choice: null,
      motivation: "Give the candidate an imperfect read of the contest.",
      immediateReaction: "The estimate remains uncertain and may be wrong.",
    },
  });
  const feedbackEventId = next.history.events.at(-1)!.id;
  next = recordEventKnowledge(next, {
    stableKey: `${action.stableKey}:feedback-knowledge`,
    personId: campaign.candidatePersonId,
    eventId: feedbackEventId,
    learnedAt: next.currentDate,
    believedSummary: next.history.events.at(-1)!.summary,
    accuracy: "partial",
    confidence: "medium",
    source: { kind: "direct" },
  });
  const feedbackKnowledgeId = next.history.knowledge.at(-1)!.id;
  const resultKey = `${action.stableKey}:result`;
  const result: CampaignActionResultRecord = {
    id: createStableId("campaign-action-result", `${next.id}:${resultKey}`),
    stableKey: resultKey,
    sequence: next.history.nextSequence,
    campaignActionId: action.id,
    completedAt: next.currentDate,
    outcomeEventId,
    resourceFlowId,
    resourceOutcomeId,
    raisedAmount,
    supportStateIds: [...supportResult.stateIds],
    observationId: observation.id,
    feedbackEventId,
    feedbackKnowledgeId,
  };
  next = {
    ...next,
    history: {
      ...next.history,
      nextSequence: next.history.nextSequence + 1,
      campaignActionResults: [
        ...(next.history.campaignActionResults ?? []),
        result,
      ],
    },
  };
  assertWorldIntegrity(next);
  return next;
}

export function evaluateCampaignAwareOutcome(
  world: World,
  contestId: EntityId,
): CampaignOutcome {
  const contest = requireElectionContest(world, contestId);
  const campaign = campaignForContest(world, contestId);
  if (!campaign || contest.candidatePersonIds.length === 1) {
    throw new Error(
      "Campaign-aware outcome requires a contested campaign record.",
    );
  }
  const scores = campaign.candidateSupportScopes.map((scope) => {
    const support = quantityBasisPoints(
      latestSupportState(world, campaign, scope),
    );
    const noise = new SeededRng(world.seed)
      .fork(
        `campaign-election-uncertainty:${contest.id}:${scope.candidatePersonId}`,
      )
      .integer(-350, 351);
    return {
      id: scope.candidatePersonId,
      weight: Math.max(1, support + noise),
    };
  });
  const votes = allocateBasisPoints(scores);
  const tallies = contest.candidatePersonIds
    .map((candidatePersonId) => ({
      candidatePersonId,
      votes: votes[candidatePersonId]!,
      voteShare: Number((votes[candidatePersonId]! / 10_000).toFixed(4)),
    }))
    .sort(
      (left, right) =>
        right.votes - left.votes ||
        left.candidatePersonId.localeCompare(right.candidatePersonId),
    );
  return { winnerPersonId: tallies[0]!.candidatePersonId, tallies };
}

function closeCampaignAfterElection(
  world: World,
  campaign: CampaignRecord,
  resultId: EntityId,
): World {
  const result = electionContestResult(world, campaign.contestId);
  if (!result || result.id !== resultId)
    throw new Error("Campaign closure requires its election result.");
  const previousState = campaignState(world, campaign.id);
  const status =
    result.winnerPersonId === campaign.candidatePersonId ? "won" : "lost";
  const stateKey = `${campaign.stableKey}:state:${status}`;
  const terminal: CampaignStateRecord = {
    id: createStableId("campaign-state", `${world.id}:${stateKey}`),
    stableKey: stateKey,
    sequence: world.history.nextSequence,
    campaignId: campaign.id,
    effectiveAt: result.resolvedAt,
    status,
    electionResultId: result.id,
    reason:
      status === "won"
        ? "The candidate won the election."
        : "The candidate lost the election; play continues.",
    supersedesStateId: previousState.id,
  };
  let next: World = {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 1,
      campaignStates: [...(world.history.campaignStates ?? []), terminal],
    },
  };
  assertWorldIntegrity(next);
  for (const workRelationshipId of [
    campaign.candidateWorkRelationshipId,
    ...campaign.staffWorkRelationshipIds,
  ]) {
    const previous = workStatusHistory(next, workRelationshipId).at(-1);
    if (previous && previous.status !== "ended") {
      next = recordWorkStatus(next, {
        stableKey: `${campaign.stableKey}:work-ended:${workRelationshipId}`,
        workRelationshipId,
        effectiveAt: result.resolvedAt,
        status: "ended",
        reason: "Campaign concluded after the election result.",
        provenance: { kind: "simulated-event", eventId: result.outcomeEventId },
        supersedesStatusId: previous.id,
      });
    }
  }
  assertWorldIntegrity(next);
  return next;
}

export function campaignElectionTransitionHandler(
  world: World,
  dueItem: FutureDueItem,
): FutureTransitionHandlerResult {
  const contestId = dueItem.entityIds[0];
  const campaign = contestId ? campaignForContest(world, contestId) : null;
  if (!campaign || campaignState(world, campaign.id).status !== "active") {
    return electionContestTransitionHandler(world, dueItem);
  }
  const outcome = evaluateCampaignAwareOutcome(world, campaign.contestId);
  const actionOutcomeEventIds = (world.history.campaignActionResults ?? [])
    .filter((result) =>
      (world.history.campaignActions ?? []).some(
        (action) =>
          action.id === result.campaignActionId &&
          action.campaignId === campaign.id,
      ),
    )
    .map((result) => result.outcomeEventId)
    .sort();
  const resolved = resolveElectionContest(world, {
    stableKey: `${dueItem.stableKey}:campaign-result`,
    contestId: campaign.contestId,
    resolvedAt: dueItem.dueAt,
    winnerPersonId: outcome.winnerPersonId,
    tallies: outcome.tallies,
    provenance: {
      method: "simulated",
      sourceEntityIds: [
        dueItem.id,
        campaign.contestId,
        ...actionOutcomeEventIds,
      ],
      note: "Campaign-aware deterministic result with bounded keyed uncertainty.",
    },
  });
  const result = electionContestResult(resolved, campaign.contestId)!;
  const closed = closeCampaignAfterElection(resolved, campaign, result.id);
  return {
    world: closed,
    status: "resolved",
    reasonKey: null,
    context: `Campaign contest for ${requireElectionContest(closed, campaign.contestId).office.title} resolved on election day.`,
    outcomeEventId: result.outcomeEventId,
  };
}

export function createCampaignElectionTransitionRegistry(): FutureTransitionHandlerRegistry {
  return createFutureTransitionHandlerRegistry([
    [ELECTION_CONTEST_TRANSITION_KEY, campaignElectionTransitionHandler],
  ]);
}

export function campaignHistoryRecords(
  world: World,
): readonly (
  | CampaignRecord
  | CampaignStateRecord
  | CampaignActionRecord
  | CampaignActionResultRecord
)[] {
  return [
    ...(world.history.campaigns ?? []),
    ...(world.history.campaignStates ?? []),
    ...(world.history.campaignActions ?? []),
    ...(world.history.campaignActionResults ?? []),
  ];
}

export function campaignEntityExists(world: World, id: EntityId): boolean {
  return campaignHistoryRecords(world).some((record) => record.id === id);
}

export function campaignEntityAvailableAt(
  world: World,
  id: EntityId,
  asOfDate: string,
  sequenceExclusive: number,
): boolean {
  const record = campaignHistoryRecords(world).find(
    (candidate) => candidate.id === id,
  );
  if (!record || record.sequence >= sequenceExclusive) return false;
  const date =
    "filedAt" in record
      ? record.filedAt
      : "effectiveAt" in record
        ? record.effectiveAt
        : "completedAt" in record
          ? record.completedAt
          : record.createdAt;
  return date <= asOfDate;
}

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
  if (ids.has(record.id))
    throw new Error(`Duplicate campaign history identity: ${record.id}`);
  ids.add(record.id);
  if (record.id !== createStableId(kind, `${world.id}:${record.stableKey}`)) {
    throw new Error(
      `Campaign record identity does not match its stable key: ${record.id}`,
    );
  }
  if (!Number.isSafeInteger(record.sequence) || record.sequence < 0)
    throw new Error(`Campaign record sequence is invalid: ${record.id}`);
}

function assertOrdered(
  records: readonly { readonly sequence: number; readonly stableKey: string }[],
  label: string,
): void {
  const keys = new Set<string>();
  let prior = -1;
  for (const record of records) {
    if (record.sequence <= prior)
      throw new Error(`${label} records are not sequence ordered.`);
    if (keys.has(record.stableKey))
      throw new Error(`Duplicate ${label} stable key: ${record.stableKey}`);
    keys.add(record.stableKey);
    prior = record.sequence;
  }
}

export function assertCampaignIntegrity(
  world: World,
  ids: Set<EntityId>,
): void {
  const campaigns = world.history.campaigns ?? [];
  const states = world.history.campaignStates ?? [];
  const actions = world.history.campaignActions ?? [];
  const results = world.history.campaignActionResults ?? [];
  assertOrdered(campaigns, "campaign");
  assertOrdered(states, "campaign state");
  assertOrdered(actions, "campaign action");
  assertOrdered(results, "campaign action result");
  const campaignByIdMap = new Map<EntityId, CampaignRecord>();
  for (const campaign of campaigns) {
    assertIdentity(ids, world, campaign, "campaign");
    campaignByIdMap.set(campaign.id, campaign);
    const contest = (world.history.electionContests ?? []).find(
      (candidate) => candidate.id === campaign.contestId,
    );
    const organization = world.history.organizations.find(
      (candidate) => candidate.id === campaign.organizationId,
    );
    const organizationProfile = world.history.organizationProfiles
      .filter(
        (candidate) => candidate.organizationId === campaign.organizationId,
      )
      .at(-1);
    const treasury = world.history.resourcePositions.find(
      (candidate) => candidate.id === campaign.treasuryPositionId,
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
    if (
      !organization ||
      organization.sequence >= campaign.sequence ||
      !organizationProfile ||
      organizationProfile.sequence >= campaign.sequence ||
      organizationProfile.classification !== "custom:political-campaign" ||
      organizationProfile.locationJurisdictionId !== campaign.jurisdictionId
    )
      throw new Error(`Campaign organization is unavailable: ${campaign.id}`);
    if (
      !world.history.organizations.some(
        (candidate) =>
          candidate.id === campaign.donorPoolOrganizationId &&
          candidate.sequence < campaign.sequence,
      )
    )
      throw new Error(`Campaign donor pool is unavailable: ${campaign.id}`);
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
    )
      throw new Error(`Campaign filing event is invalid: ${campaign.id}`);
    if (
      campaign.endorsementEventId &&
      !world.history.events.some(
        (event) =>
          event.id === campaign.endorsementEventId &&
          event.sequence < campaign.sequence,
      )
    )
      throw new Error(`Campaign endorsement event is invalid: ${campaign.id}`);
    const workIds = [
      campaign.candidateWorkRelationshipId,
      ...campaign.staffWorkRelationshipIds,
    ];
    const candidateWork = world.history.workRelationships.find(
      (work) => work.id === campaign.candidateWorkRelationshipId,
    );
    const staffWorks = campaign.staffWorkRelationshipIds.map((id) =>
      world.history.workRelationships.find((work) => work.id === id),
    );
    if (
      new Set(workIds).size !== workIds.length ||
      !candidateWork ||
      candidateWork.personId !== campaign.candidatePersonId ||
      staffWorks.some(
        (work) => !work || work.personId === campaign.candidatePersonId,
      ) ||
      new Set(staffWorks.map((work) => work!.personId)).size !==
        staffWorks.length ||
      workIds.some(
        (id) =>
          !world.history.workRelationships.some(
            (work) =>
              work.id === id &&
              work.organizationId === campaign.organizationId &&
              work.sequence < campaign.sequence,
          ),
      )
    )
      throw new Error(`Campaign work linkage is invalid: ${campaign.id}`);
    const activityIds = [
      campaign.fundraisingActivityId,
      campaign.outreachActivityId,
      campaign.electionActivityId,
    ];
    if (
      new Set(activityIds).size !== activityIds.length ||
      activityIds.some(
        (id) =>
          !world.history.scheduledActivities.some(
            (activity) =>
              activity.id === id &&
              activity.sequence < campaign.sequence &&
              activity.participantPersonIds.includes(
                campaign.candidatePersonId,
              ),
          ),
      )
    )
      throw new Error(`Campaign activity linkage is invalid: ${campaign.id}`);
    const definition =
      world.metricCatalog.definitions[campaign.supportMetricId];
    if (
      !definition ||
      definition.stableKey !== CAMPAIGN_SUPPORT_METRIC_STABLE_KEY ||
      definition.quantityUnit !== "rate:share"
    )
      throw new Error(`Campaign support definition is invalid: ${campaign.id}`);
    const candidateIds = campaign.candidateSupportScopes.map(
      (scope) => scope.candidatePersonId,
    );
    if (
      JSON.stringify([...candidateIds].sort()) !==
        JSON.stringify([...contest.candidatePersonIds].sort()) ||
      new Set(campaign.candidateSupportScopes.map((scope) => scope.segmentKey))
        .size !== candidateIds.length
    )
      throw new Error(`Campaign support scopes are invalid: ${campaign.id}`);
  }
  const statesByCampaign = new Map<EntityId, CampaignStateRecord[]>();
  for (const state of states) {
    assertIdentity(ids, world, state, "campaign-state");
    const campaign = campaignByIdMap.get(state.campaignId);
    if (
      !campaign ||
      campaign.sequence >= state.sequence ||
      !CAMPAIGN_STATUSES.includes(state.status)
    )
      throw new Error(`Campaign state is invalid: ${state.id}`);
    const prior = statesByCampaign.get(campaign.id) ?? [];
    const previous = prior.at(-1);
    if (!previous) {
      if (
        state.status !== "active" ||
        state.supersedesStateId !== null ||
        state.electionResultId !== null ||
        state.effectiveAt !== campaign.filedAt
      )
        throw new Error(`Campaign initial state is invalid: ${state.id}`);
    } else {
      if (
        previous.status !== "active" ||
        state.status === "active" ||
        state.supersedesStateId !== previous.id ||
        state.electionResultId === null
      )
        throw new Error(`Campaign terminal state is invalid: ${state.id}`);
      const electionResult = (world.history.electionContestResults ?? []).find(
        (result) => result.id === state.electionResultId,
      );
      if (
        !electionResult ||
        electionResult.contestId !== campaign.contestId ||
        electionResult.sequence >= state.sequence ||
        electionResult.resolvedAt !== state.effectiveAt
      )
        throw new Error(`Campaign result linkage is invalid: ${state.id}`);
      const expected =
        electionResult.winnerPersonId === campaign.candidatePersonId
          ? "won"
          : "lost";
      if (state.status !== expected)
        throw new Error(
          `Campaign outcome state disagrees with election result: ${state.id}`,
        );
    }
    prior.push(state);
    statesByCampaign.set(campaign.id, prior);
  }
  for (const campaign of campaigns) {
    const campaignStates = statesByCampaign.get(campaign.id) ?? [];
    if (campaignStates.length === 0)
      throw new Error(`Campaign lacks state: ${campaign.id}`);
    const contestResult = (world.history.electionContestResults ?? []).find(
      (result) => result.contestId === campaign.contestId,
    );
    const terminalState = campaignStates.at(-1)!;
    if (
      (contestResult === undefined && terminalState.status !== "active") ||
      (contestResult !== undefined &&
        (terminalState.status === "active" ||
          terminalState.electionResultId !== contestResult.id))
    ) {
      throw new Error(
        `Campaign lifecycle disagrees with its election contest: ${campaign.id}`,
      );
    }
  }
  const actionById = new Map<EntityId, CampaignActionRecord>();
  const actionKindsByCampaign = new Map<EntityId, Set<string>>();
  const usedActivities = new Set<EntityId>();
  for (const action of actions) {
    assertIdentity(ids, world, action, "campaign-action");
    const campaign = campaignByIdMap.get(action.campaignId);
    const activity = world.history.scheduledActivities.find(
      (candidate) => candidate.id === action.scheduledActivityId,
    );
    if (
      !campaign ||
      campaign.sequence >= action.sequence ||
      !activity ||
      activity.sequence >= action.sequence ||
      !CAMPAIGN_ACTION_KINDS.includes(action.kind) ||
      usedActivities.has(action.scheduledActivityId)
    )
      throw new Error(`Campaign action is invalid: ${action.id}`);
    const expectedActivity =
      action.kind === "fundraising"
        ? campaign.fundraisingActivityId
        : campaign.outreachActivityId;
    if (
      action.scheduledActivityId !== expectedActivity ||
      action.createdAt !== campaign.filedAt
    )
      throw new Error(
        `Campaign action does not match its scheduled activity: ${action.id}`,
      );
    usedActivities.add(action.scheduledActivityId);
    actionById.set(action.id, action);
    const kinds = actionKindsByCampaign.get(campaign.id) ?? new Set<string>();
    kinds.add(action.kind);
    actionKindsByCampaign.set(campaign.id, kinds);
  }
  for (const campaign of campaigns) {
    const kinds = actionKindsByCampaign.get(campaign.id);
    if (
      !kinds ||
      kinds.size !== CAMPAIGN_ACTION_KINDS.length ||
      CAMPAIGN_ACTION_KINDS.some((kind) => !kinds.has(kind))
    ) {
      throw new Error(`Campaign lacks its bounded action set: ${campaign.id}`);
    }
  }
  const resultActions = new Set<EntityId>();
  for (const result of results) {
    assertIdentity(ids, world, result, "campaign-action-result");
    const action = actionById.get(result.campaignActionId);
    const campaign = action ? campaignByIdMap.get(action.campaignId) : null;
    if (
      !action ||
      !campaign ||
      action.sequence >= result.sequence ||
      resultActions.has(action.id)
    )
      throw new Error(`Campaign action result is invalid: ${result.id}`);
    resultActions.add(action.id);
    const activityState = world.history.scheduledActivityStates
      .filter((state) => state.activityId === action.scheduledActivityId)
      .at(-1);
    if (
      !activityState ||
      activityState.status !== "completed" ||
      activityState.recordedAt.date !== result.completedAt
    )
      throw new Error(
        `Campaign result lacks completed canonical activity: ${result.id}`,
      );
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
    )
      throw new Error(
        `Campaign result consequence linkage is invalid: ${result.id}`,
      );
    const supportStates = result.supportStateIds.map((id) =>
      world.history.metricStates.find(
        (state) => state.id === id && state.sequence < result.sequence,
      ),
    );
    const expectedSegments = campaign.candidateSupportScopes
      .map((scope) => scope.segmentKey)
      .sort();
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
        supportStates.map((state) => state!.scope.segmentKey).sort(),
      ) !== JSON.stringify(expectedSegments) ||
      !result.supportStateIds.includes(observation.underlyingStateId) ||
      observation.scope.segmentKey !==
        campaign.candidateSupportScopes.find(
          (scope) => scope.candidatePersonId === campaign.candidatePersonId,
        )?.segmentKey
    )
      throw new Error(
        `Campaign result support linkage is invalid: ${result.id}`,
      );
    if (action.kind === "fundraising") {
      const flow = world.history.resourceFlows.find(
        (item) => item.id === result.resourceFlowId,
      );
      const transfer = world.history.resourceTransferOutcomes.find(
        (item) => item.id === result.resourceOutcomeId,
      );
      if (
        !flow ||
        !transfer ||
        result.raisedAmount === null ||
        flow.source.kind !== "organization" ||
        flow.source.organizationId !== campaign.donorPoolOrganizationId ||
        flow.recipient.kind !== "organization" ||
        flow.recipient.organizationId !== campaign.organizationId ||
        transfer.resourceFlowId !== flow.id ||
        transfer.status !== "completed" ||
        transfer.transferredAmount.minorUnits !==
          result.raisedAmount.minorUnits ||
        transfer.transferredAmount.currency !== result.raisedAmount.currency ||
        result.raisedAmount.currency !== campaign.treasuryCurrency
      )
        throw new Error(`Campaign fundraising result is invalid: ${result.id}`);
    } else if (
      result.resourceFlowId !== null ||
      result.resourceOutcomeId !== null ||
      result.raisedAmount !== null
    ) {
      throw new Error(
        `Campaign outreach invented a resource transfer: ${result.id}`,
      );
    }
  }
}
