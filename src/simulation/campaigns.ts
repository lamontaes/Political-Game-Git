import { requireCandidacyPack } from "./candidacy-packs";
import { candidacyEligibility } from "./candidacy";
import {
  activeCampaignForCandidate,
  campaignActionById,
  campaignActionResult,
  campaignActions,
  campaignById,
  campaignForContest,
  campaignState,
  campaigns,
  requireCampaign,
} from "./campaign-queries";
import { createCharacterHistoryContextPerson } from "./character-history";
import {
  addDays,
  compareSimulationMoments,
  isoDateFromParts,
  simulationMinutesBetween,
} from "./dates";
import {
  ELECTION_CONTEST_TRANSITION_KEY,
  electionContestResult,
  electionContestStatus,
  electionContestTransitionHandler,
  requireElectionContest,
  resolveElectionContest,
  scheduleElectionContest,
} from "./election-contests";
import {
  composeFutureTransitionHandlerRegistries,
  createFutureTransitionHandlerRegistry,
} from "./future-transitions";
import { createStableId, stableHash } from "./ids";
import {
  createOrganization,
  createWorkRelationship,
  recordWorkStatus,
} from "./life";
import { LIFE_TRANSITION_HANDLERS } from "./life-callbacks";
import { workStatusHistory } from "./life-queries";
import { drawCanonicalName } from "./people";
import { createExactQuantity } from "./quantity";
import { positionOwnerEndpoint } from "./resource-queries";
import {
  createResourceFlow,
  createResourcePosition,
  recordResourceTransferOutcome,
} from "./resources";
import { recordEventKnowledge } from "./records";
import { SeededRng } from "./rng";
import {
  controlledCommitmentsBlockingActivityPerformance,
  createScheduledActivity,
  performScheduledActivity,
  scheduledActivityState,
} from "./time-work";
import type {
  CampaignActionKind,
  CampaignActionRecord,
  CampaignActionResultRecord,
  CampaignCandidateSupportScope,
  CampaignRecord,
  CampaignStateRecord,
  CandidateTally,
  CurrencyCode,
  EntityId,
  FutureDueItem,
  IsoDate,
  FutureTransitionHandlerRegistry,
  FutureTransitionHandlerResult,
  MetricSegmentKey,
  MoneyAmount,
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

/**
 * Standing for office.
 *
 * A campaign is a piece of somebody's life, so it is built from the systems the
 * rest of their life already runs on. The contest is the accepted
 * election-contest substrate's and fires through the ordinary time advance. The
 * committee's money is a resource position like any other, owned by an
 * organization rather than by the candidate. An afternoon on the doors is a
 * scheduled activity that takes real hours out of a real day and can be blocked
 * by something else the character already promised to do. Nothing here is a
 * campaign-shaped copy of a system that already exists.
 *
 * The one thing this module owns outright is the distinction the whole design
 * turns on. Canonical support is a world metric state, it decides the election,
 * and it is never shown to anybody. What the campaign gets instead is a field
 * memo: an observation of that state, wrong by a deterministic amount drawn
 * from the seed, carrying its own margin of error and capable of exceeding it.
 * The two are separate records with separate meanings, and the readers that can
 * see the first are deliberately not exported through the simulation barrel.
 *
 * Losing is not an ending. A lost campaign closes its committee, ends the work
 * it created, writes itself into history, and leaves the character standing in
 * the same life they were living the day before.
 */

export const CAMPAIGN_SUPPORT_METRIC_STABLE_KEY =
  "campaign.candidate-support-share";

/** No candidate is allowed to fall below one percent of canonical support. */
const SUPPORT_FLOOR_BASIS_POINTS = 100;

/** Support is carried in basis points of one, so ten thousand is everybody. */
const SUPPORT_DENOMINATOR = 10_000;

/**
 * What the campaign's field memo claims about its own precision. Four points is
 * a claim, not a guarantee: the error below is drawn from a wider range and
 * sometimes lands outside it, which is what makes reading it a judgement.
 */
const OBSERVATION_MARGIN_BASIS_POINTS = 400;

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
  readonly jurisdictionId: EntityId;
  /**
   * The office being stood for. Which pack authorizes it is read from the
   * jurisdiction, never supplied here, so a filing cannot cite a pack that does
   * not govern the place it is filed in.
   */
  readonly officeKey: string;
  readonly electionDate: string;
  readonly rivalPersonIds: readonly EntityId[];
  readonly existingContestId: EntityId | null;
  readonly committeeName: string;
  readonly donorPoolName: string;
  readonly advertisingVendorName: string;
  readonly staffPersonIds: readonly EntityId[];
  readonly treasuryCurrency: CurrencyCode;
}

export interface FiledCampaignResult {
  readonly world: World;
  readonly campaign: CampaignRecord;
}

export interface ScheduleCampaignActionInput {
  readonly campaignId: EntityId;
  readonly kind: CampaignActionKind;
  readonly plan: CampaignActivityPlan;
  /** Required for an advertising buy, forbidden for anything else. */
  readonly spend: MoneyAmount | null;
}

export interface ScheduledCampaignActionResult {
  readonly world: World;
  readonly action: CampaignActionRecord;
}

export interface CampaignOutcome {
  readonly winnerPersonId: EntityId;
  readonly tallies: readonly CandidateTally[];
}

/* -------------------------------------------------------------------------- */
/* Support metric                                                              */
/* -------------------------------------------------------------------------- */

function campaignSupportDefinition(): WorldMetricDefinition {
  return createWorldMetricDefinition({
    stableKey: CAMPAIGN_SUPPORT_METRIC_STABLE_KEY,
    name: "Candidate support",
    description:
      "Canonical bounded support for one candidate in one contest at an explicit point in time. Not shown to any player; the campaign reads it only through fallible observations.",
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
    tags: ["campaign.canonical-support", "election.candidate"],
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

function supportSegment(
  contestId: EntityId,
  candidatePersonId: EntityId,
): MetricSegmentKey {
  return `candidate.${stableHash(`${contestId}:${candidatePersonId}`)}` as MetricSegmentKey;
}

/**
 * Splits a whole into basis points without losing or inventing any. Largest
 * remainder first, ties broken by id, so the split is the same every run.
 */
function allocateBasisPoints(
  entries: readonly { readonly id: EntityId; readonly weight: number }[],
): Readonly<Record<string, number>> {
  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
  const provisional = entries.map((entry) => {
    const exact = (entry.weight * SUPPORT_DENOMINATOR) / totalWeight;
    return { ...entry, basisPoints: Math.floor(exact), remainder: exact % 1 };
  });
  let remaining =
    SUPPORT_DENOMINATOR -
    provisional.reduce((sum, entry) => sum + entry.basisPoints, 0);
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

/* -------------------------------------------------------------------------- */
/* Canonical support readers — deliberately not re-exported by the barrel      */
/* -------------------------------------------------------------------------- */

/**
 * Canonical support, in basis points.
 *
 * Exported so the election can be resolved and so tests can prove the truth and
 * the observation are different numbers. `src/simulation/index.ts` names its
 * campaign exports one by one and omits this, so nothing in the presentation or
 * player layers can reach it through the ordinary import path.
 */
export function canonicalSupportBasisPoints(
  world: World,
  campaign: CampaignRecord,
  candidatePersonId: EntityId,
): number {
  const scope = campaign.candidateSupportScopes.find(
    (candidate) => candidate.candidatePersonId === candidatePersonId,
  );
  if (!scope) {
    throw new Error(
      `That person is not a candidate in this contest: ${candidatePersonId}`,
    );
  }
  return quantityBasisPoints(latestSupportState(world, campaign, scope));
}

function quantityBasisPoints(state: WorldMetricStateRecord): number {
  if (
    state.value.kind !== "quantity" ||
    state.value.quantity.unit !== "rate:share"
  ) {
    throw new Error("Campaign support state is not an exact share.");
  }
  const scaled =
    (state.value.quantity.numerator * SUPPORT_DENOMINATOR) /
    state.value.quantity.denominator;
  if (!Number.isSafeInteger(scaled)) {
    throw new Error("Campaign support cannot be represented in basis points.");
  }
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
  if (!state) {
    throw new Error(
      `Campaign support state is missing: ${scope.candidatePersonId}`,
    );
  }
  return state;
}

function recordInitialSupport(world: World, campaign: CampaignRecord): World {
  const rng = new SeededRng(world.seed).fork(
    `campaign-initial-support:${campaign.contestId}`,
  );
  // A first-time filer starts behind somebody who is already known. Nothing
  // here is a handicap the player can read; it is a starting position.
  const weights = campaign.candidateSupportScopes.map((scope) => ({
    id: scope.candidatePersonId,
    weight:
      850 +
      rng.fork(scope.candidatePersonId).integer(0, 301) +
      (scope.candidatePersonId === campaign.candidatePersonId ? -60 : 0),
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
          SUPPORT_DENOMINATOR,
          "rate:share",
        ),
      },
      recordedAt: campaign.filedAt,
      provenance: {
        kind: "simulated",
        sourceEntityIds: [campaign.filingEventId],
      },
      supersedesStateId: null,
    });
  }
  return next;
}

/* -------------------------------------------------------------------------- */
/* Opponents                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * A birth date that makes somebody exactly this old today. The day of the month
 * is clamped to the 28th so a leap day never lands in a year that has none.
 */
function birthDateForAge(onDate: IsoDate, age: number): IsoDate {
  const year = Number(onDate.slice(0, 4)) - age;
  const month = Number(onDate.slice(5, 7));
  const day = Math.min(Number(onDate.slice(8, 10)), 28);
  return isoDateFromParts(year, month, day);
}

export interface EnsureCampaignOpponentsInput {
  readonly stableKey: string;
  readonly jurisdictionId: EntityId;
  readonly count: number;
  /** Nobody in this list is offered as an opponent. */
  readonly excludePersonIds: readonly EntityId[];
}

export interface EnsuredOpponents {
  readonly world: World;
  readonly personIds: readonly EntityId[];
}

/**
 * Somebody to run against.
 *
 * A contest needs at least two people and a quiet life rarely contains a second
 * one already standing for the seat. So the opponent is materialized the way
 * every other background person in this world is: through the character-history
 * context-person writer, named from the versioned corpus by the world's own
 * seed, with a birth date and a residence and nothing else claimed about them.
 * They are a person in the world afterwards, not a slot in a campaign screen.
 */
export function ensureCampaignOpponents(
  world: World,
  input: EnsureCampaignOpponentsInput,
): EnsuredOpponents {
  if (!Number.isSafeInteger(input.count) || input.count < 1) {
    throw new Error("A contest needs at least one opponent.");
  }
  const excluded = new Set(input.excludePersonIds);
  let next = world;
  const personIds: EntityId[] = [];
  for (let index = 0; index < input.count; index += 1) {
    const key = `${input.stableKey}:opponent:${index}`;
    const rng = new SeededRng(world.seed).fork(`campaign-opponent:${key}`);
    const name = drawCanonicalName(rng);
    const before = next;
    next = createCharacterHistoryContextPerson(next, {
      stableKey: key,
      givenName: name.givenName,
      familyName: name.familyName,
      // An adult, because the office is one. The exact age is a fact about
      // this person and says nothing else about them.
      birthDate: birthDateForAge(next.currentDate, rng.integer(32, 66)),
      homeJurisdictionId: input.jurisdictionId,
    });
    const created = next.personOrder.find(
      (personId) => !before.people[personId],
    );
    const personId = created ?? next.personOrder.at(-1)!;
    if (excluded.has(personId)) {
      throw new Error("An opponent cannot also be the candidate or staff.");
    }
    personIds.push(personId);
  }
  return { world: next, personIds };
}

/* -------------------------------------------------------------------------- */
/* Filing                                                                      */
/* -------------------------------------------------------------------------- */

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

function createCounterparty(
  world: World,
  stableKey: string,
  name: string,
  classification: "community:campaign-supporters" | "enterprise:media-buying",
  jurisdictionId: EntityId,
  note: string,
): World {
  return createOrganization(world, {
    stableKey,
    formedAt: world.currentDate,
    detailLevel: "lightweight",
    provenance: { kind: "authored", note },
    initialProfile: {
      name,
      classification,
      locationJurisdictionId: jurisdictionId,
    },
  });
}

export function fileCampaign(
  inputWorld: World,
  input: FileCampaignInput,
): FiledCampaignResult {
  assertWorldIntegrity(inputWorld);
  requireText(input.stableKey, "Campaign stable key");
  requireText(input.committeeName, "Campaign committee name");
  requireText(input.donorPoolName, "Campaign supporter pool name");
  requireText(input.advertisingVendorName, "Campaign advertising vendor name");
  if (
    campaigns(inputWorld).some(
      (campaign) => campaign.stableKey === input.stableKey,
    )
  ) {
    throw new Error(`Campaign stable key already exists: ${input.stableKey}`);
  }
  if (!inputWorld.jurisdictions[input.jurisdictionId]) {
    throw new Error("Campaign filing references a missing jurisdiction.");
  }

  // The honesty gate. A filing that the accepted sources cannot support is
  // refused here, in the same words the player was already shown, rather than
  // quietly succeeding against an office nobody has rules for.
  const eligibility = candidacyEligibility(inputWorld, {
    personId: input.candidatePersonId,
    jurisdictionId: input.jurisdictionId,
    officeKey: input.officeKey,
    alreadyACandidate:
      activeCampaignForCandidate(inputWorld, input.candidatePersonId) !== null,
  });
  if (!eligibility.eligible || !eligibility.office || !eligibility.pack) {
    throw new Error(
      eligibility.blocks[0]?.reason ?? "This character cannot file here.",
    );
  }
  const option = eligibility.office;
  const packId = eligibility.pack.packId;

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
  if (input.electionDate <= inputWorld.currentDate) {
    throw new Error("An election has to be in the future to campaign for it.");
  }

  let world = ensureCampaignSupportMetric(inputWorld);
  let contestId = input.existingContestId;
  if (contestId === null) {
    world = scheduleElectionContest(world, {
      stableKey: `${input.stableKey}:contest`,
      jurisdictionId: input.jurisdictionId,
      office: option.office,
      electionDate: input.electionDate,
      candidatePersonIds: [input.candidatePersonId, ...rivals],
      provenance: {
        method: "simulated",
        sourceEntityIds: [input.candidatePersonId, ...rivals].sort(),
        note: `Contest opened by a candidacy filing against ${packId}.`,
      },
    });
    contestId = (world.history.electionContests ?? []).at(-1)!.id;
  } else {
    const existing = requireElectionContest(world, contestId);
    if (
      electionContestStatus(world, existing.id) !== "pending" ||
      existing.jurisdictionId !== input.jurisdictionId ||
      !existing.candidatePersonIds.includes(input.candidatePersonId)
    ) {
      throw new Error("Existing contest is not compatible with this filing.");
    }
  }
  const contest = requireElectionContest(world, contestId);
  const expectedCandidates = [input.candidatePersonId, ...rivals].sort();
  if (
    contest.electionDate !== input.electionDate ||
    contest.office.officeKey !== option.office.officeKey ||
    contest.office.title !== option.office.title ||
    contest.office.seatKey !== option.office.seatKey ||
    contest.office.occupationClassification !==
      option.office.occupationClassification ||
    JSON.stringify([...contest.candidatePersonIds].sort()) !==
      JSON.stringify(expectedCandidates)
  ) {
    throw new Error("Election contest does not match the campaign filing.");
  }

  world = createOrganization(world, {
    stableKey: `${input.stableKey}:committee`,
    formedAt: world.currentDate,
    detailLevel: "detailed",
    provenance: {
      kind: "authored",
      note: "Campaign committee created by the filing operation.",
    },
    initialProfile: {
      name: input.committeeName,
      classification: "custom:political-campaign",
      locationJurisdictionId: input.jurisdictionId,
    },
  });
  const organizationId = lastOrganizationId(world);

  world = createCounterparty(
    world,
    `${input.stableKey}:supporters`,
    input.donorPoolName,
    "community:campaign-supporters",
    input.jurisdictionId,
    "An aggregate pool of supporters. The game has no donor corpus and does not pretend to model individual contributions.",
  );
  const donorPoolOrganizationId = lastOrganizationId(world);

  world = createCounterparty(
    world,
    `${input.stableKey}:advertising`,
    input.advertisingVendorName,
    "enterprise:media-buying",
    input.jurisdictionId,
    "An aggregate advertising counterparty. The game has no media market and does not pretend to model one.",
  );
  const advertisingVendorOrganizationId = lastOrganizationId(world);

  world = createResourcePosition(world, {
    stableKey: `${input.stableKey}:treasury`,
    owner: { kind: "organization", organizationId },
    openedAt: world.currentDate,
    openingBalance: { minorUnits: 0, currency: input.treasuryCurrency },
    provenance: {
      kind: "authored",
      note: "The committee's own account, opened empty on the day it filed.",
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
    provenance: {
      kind: "authored",
      note: "Running for office is unpaid work that takes real hours.",
    },
    initialRole: {
      title: "Candidate",
      occupationClassification: "service:campaign-candidate",
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
        note: "Somebody who agreed to help, recorded as the work it is.",
      },
      initialRole: {
        title: "Campaign volunteer",
        occupationClassification: "service:campaign-volunteer",
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

  const candidate = inputWorld.people[input.candidatePersonId]!;
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
        detail: `Filed for a ${option.office.title}`,
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: ["campaign.filing", "election.candidacy"],
    summary: `${candidate.givenName} ${candidate.familyName} filed as a candidate for a ${option.office.title}.`,
    context: {
      location: {
        jurisdictionId: input.jurisdictionId,
        label: inputWorld.jurisdictions[input.jurisdictionId]!.name,
        setting: "Filing for office",
      },
      socialContext:
        "A public candidacy, on the record from the day it was filed.",
      pressure: null,
      choice: "Put their name on the ballot.",
      motivation: "Stand for something they cannot change from outside.",
      immediateReaction:
        "There is a committee, an empty account, and a date to work towards.",
    },
  });
  const filingEventId = world.history.events.at(-1)!.id;

  const candidateSupportScopes: CampaignCandidateSupportScope[] =
    contest.candidatePersonIds.map((candidatePersonId) => ({
      candidatePersonId,
      segmentKey: supportSegment(contest.id, candidatePersonId),
    }));
  const campaignId = createStableId(
    "campaign",
    `${world.id}:${input.stableKey}`,
  );
  const campaignRecord: CampaignRecord = {
    id: campaignId,
    stableKey: input.stableKey,
    sequence: world.history.nextSequence,
    contestId: contest.id,
    candidatePersonId: input.candidatePersonId,
    jurisdictionId: input.jurisdictionId,
    officeKey: option.officeKey,
    candidacyPackId: packId,
    organizationId,
    donorPoolOrganizationId,
    advertisingVendorOrganizationId,
    treasuryPositionId,
    treasuryCurrency: input.treasuryCurrency,
    candidateWorkRelationshipId,
    staffWorkRelationshipIds,
    supportMetricId: campaignSupportDefinition().id,
    candidateSupportScopes,
    filingEventId,
    filedAt: world.currentDate,
  };
  const initialStateKey = `${input.stableKey}:state:active`;
  const initialState: CampaignStateRecord = {
    id: createStableId("campaign-state", `${world.id}:${initialStateKey}`),
    stableKey: initialStateKey,
    sequence: world.history.nextSequence + 1,
    campaignId,
    effectiveAt: world.currentDate,
    status: "active",
    electionResultId: null,
    reason: null,
    supersedesStateId: null,
  };
  world = {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 2,
      campaigns: [...campaigns(world), campaignRecord],
      campaignStates: [...(world.history.campaignStates ?? []), initialState],
    },
  };
  assertWorldIntegrity(world);
  world = recordInitialSupport(world, campaignRecord);
  assertWorldIntegrity(world);
  return { world, campaign: campaignRecord };
}

/* -------------------------------------------------------------------------- */
/* Campaign work                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Puts an afternoon of campaign work on the calendar.
 *
 * The activity is an ordinary scheduled activity, which is the point: it takes
 * hours the character does not get back, it sits in the same calendar as
 * everything else, and something they already promised somebody can block it.
 */
export function scheduleCampaignAction(
  world: World,
  input: ScheduleCampaignActionInput,
): ScheduledCampaignActionResult {
  const campaign = requireCampaign(world, input.campaignId);
  if (campaignState(world, campaign.id).status !== "active") {
    throw new Error("A finished campaign cannot take on more work.");
  }
  if (input.kind === "advertising") {
    if (!input.spend || input.spend.minorUnits <= 0) {
      throw new Error("An advertising buy has to commit some money.");
    }
    if (input.spend.currency !== campaign.treasuryCurrency) {
      throw new Error(
        "An advertising buy must be in the committee's currency.",
      );
    }
  } else if (input.spend !== null) {
    throw new Error(
      `A ${input.kind} session does not spend from the treasury.`,
    );
  }
  const contest = requireElectionContest(world, campaign.contestId);
  if (input.plan.start.date > contest.electionDate) {
    throw new Error("Campaign work has to happen before election day.");
  }

  const ordinal = campaignActions(world, campaign.id).length;
  const stableKey = `${campaign.stableKey}:action:${input.kind}:${ordinal}`;
  const participants = canonicalIds(
    [
      campaign.candidatePersonId,
      ...campaign.staffWorkRelationshipIds.map(
        (id) =>
          world.history.workRelationships.find((work) => work.id === id)!
            .personId,
      ),
    ],
    "Campaign activity participants",
  );
  let next = createScheduledActivity(world, {
    stableKey: `${stableKey}:activity`,
    title: input.plan.title,
    summary: input.plan.summary,
    kind: "confirmed",
    start: input.plan.start,
    end: input.plan.end,
    participantPersonIds: participants,
    responsiblePersonId: campaign.candidatePersonId,
    location: input.plan.location,
    sourceEntityIds: [campaign.filingEventId],
    flexibility: { kind: "fixed" },
    access: { kind: "private", personIds: participants },
  });
  const activityId = next.history.scheduledActivities.at(-1)!.id;
  const action: CampaignActionRecord = {
    id: createStableId("campaign-action", `${next.id}:${stableKey}`),
    stableKey,
    sequence: next.history.nextSequence,
    campaignId: campaign.id,
    kind: input.kind,
    scheduledActivityId: activityId,
    plannedSpend: input.spend ? { ...input.spend } : null,
    createdAt: next.currentDate,
  };
  next = {
    ...next,
    history: {
      ...next.history,
      nextSequence: next.history.nextSequence + 1,
      campaignActions: [...(next.history.campaignActions ?? []), action],
    },
  };
  assertWorldIntegrity(next);
  return { world: next, action };
}

/**
 * What an afternoon actually moves.
 *
 * The size of the effect comes from things the world records: how many people
 * worked, for how many minutes, and — for an advertising buy — how much the
 * committee actually spent. Seeded variation then widens or narrows it, because
 * a good day on the doors and a bad one are not the same day. What it never is
 * is a flat bonus per click.
 */
function requestedGainBasisPoints(
  world: World,
  campaign: CampaignRecord,
  action: CampaignActionRecord,
): number {
  // How long the session was booked for. The activity record carries what it
  // is; its state record carries when, which is the half this needs.
  const timing = scheduledActivityState(world, action.scheduledActivityId);
  const minutes = Math.max(
    1,
    simulationMinutesBetween(timing.start, timing.end),
  );
  const workers = 1 + campaign.staffWorkRelationshipIds.length;
  const base =
    action.kind === "outreach"
      ? Math.floor((minutes * workers * 3) / 2)
      : action.kind === "fundraising"
        ? Math.floor((minutes * workers) / 2)
        : Math.floor((action.plannedSpend?.minorUnits ?? 0) / 500);
  const swing = new SeededRng(world.seed)
    .fork(`campaign-action-effect:${action.id}`)
    .integer(60, 141);
  return Math.max(1, Math.floor((base * swing) / 100));
}

/**
 * Support is a share, so a gain is a transfer. Taking it evenly from the field
 * and refusing to push anybody below the floor keeps the split a real
 * distribution rather than a score that only ever goes up.
 */
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
  const rivals = campaign.candidateSupportScopes
    .map((scope) => scope.candidatePersonId)
    .filter((personId) => personId !== campaign.candidatePersonId)
    .sort();
  let remaining = requestedGainBasisPoints(world, campaign, action);
  let removed = 0;
  for (let index = 0; index < rivals.length && remaining > 0; index += 1) {
    const rivalId = rivals[index]!;
    const share = Math.ceil(remaining / (rivals.length - index));
    const take = Math.min(
      share,
      Math.max(0, current[rivalId]! - SUPPORT_FLOOR_BASIS_POINTS),
    );
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
          SUPPORT_DENOMINATOR,
          "rate:share",
        ),
      },
      recordedAt: next.currentDate,
      provenance: { kind: "simulated", sourceEntityIds: [outcomeEventId] },
      supersedesStateId: samePeriod?.id ?? null,
    });
    const stateId = next.history.metricStates.at(-1)!.id;
    stateIds.push(stateId);
    if (scope.candidatePersonId === campaign.candidatePersonId) {
      candidateStateId = stateId;
    }
  }
  if (!candidateStateId) {
    throw new Error("Candidate support state was not recorded.");
  }
  return { world: next, stateIds, candidateStateId };
}

/**
 * The field memo.
 *
 * Three small independent draws rather than one wide one, so the error clusters
 * near the truth and occasionally does not. The memo states a four-point margin
 * and the error can exceed it, which is true of real polling and is the whole
 * reason the number is worth arguing about.
 */
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
  const rng = new SeededRng(world.seed).fork(
    `campaign-observation:${action.id}:${candidateStateId}`,
  );
  const error =
    rng.integer(-200, 201) + rng.integer(-200, 201) + rng.integer(-200, 201);
  const observedBasisPoints = Math.max(
    0,
    Math.min(SUPPORT_DENOMINATOR, trueBasisPoints + error),
  );
  const previous = world.history.metricObservations
    .filter(
      (observation) =>
        observation.metricId === campaign.supportMetricId &&
        observation.scope.jurisdictionId === campaign.jurisdictionId &&
        observation.scope.segmentKey === state.scope.segmentKey &&
        observation.referencePeriod.kind === "point" &&
        observation.referencePeriod.at === world.currentDate &&
        observation.sourceSeriesKey === "campaign.field-memo",
    )
    .at(-1);
  const next = recordWorldMetricObservation(world, {
    stableKey: `${action.stableKey}:observation`,
    metricId: campaign.supportMetricId,
    scope: { ...state.scope },
    referencePeriod: { kind: "point", at: world.currentDate },
    value: {
      kind: "quantity",
      quantity: createExactQuantity(
        observedBasisPoints,
        SUPPORT_DENOMINATOR,
        "rate:share",
      ),
    },
    sourceSeriesKey: "campaign.field-memo",
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
        quantity: createExactQuantity(
          OBSERVATION_MARGIN_BASIS_POINTS,
          SUPPORT_DENOMINATOR,
          "rate:share",
        ),
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

function moneyLabel(amount: MoneyAmount): string {
  return `${amount.currency} ${(amount.minorUnits / 100).toFixed(2)}`;
}

function actionMoney(
  world: World,
  campaign: CampaignRecord,
  action: CampaignActionRecord,
  completionEventId: EntityId,
): {
  readonly world: World;
  readonly resourceFlowId: EntityId | null;
  readonly resourceOutcomeId: EntityId | null;
  readonly raisedAmount: MoneyAmount | null;
  readonly spentAmount: MoneyAmount | null;
} {
  if (action.kind === "outreach") {
    return {
      world,
      resourceFlowId: null,
      resourceOutcomeId: null,
      raisedAmount: null,
      spentAmount: null,
    };
  }
  const raising = action.kind === "fundraising";
  const amount: MoneyAmount = raising
    ? {
        minorUnits: new SeededRng(world.seed)
          .fork(`campaign-fundraising:${action.id}`)
          .integer(85_000, 175_001),
        currency: campaign.treasuryCurrency,
      }
    : { ...action.plannedSpend! };
  let next = createResourceFlow(world, {
    stableKey: `${action.stableKey}:flow`,
    source: {
      kind: "organization",
      organizationId: raising
        ? campaign.donorPoolOrganizationId
        : campaign.organizationId,
    },
    recipient: positionOwnerEndpoint({
      kind: "organization",
      organizationId: raising
        ? campaign.organizationId
        : campaign.advertisingVendorOrganizationId,
    }),
    startsAt: world.currentDate,
    initialStatus: "active",
    amount,
    cadenceKind: "schedule:one-time",
    basisKind: raising
      ? "custom:campaign-contribution"
      : "custom:campaign-expenditure",
    basisReference: { kind: "general" },
    restrictionKind: "purpose:campaign",
    jurisdictionId: campaign.jurisdictionId,
    provenance: { kind: "simulated-event", eventId: completionEventId },
  });
  const resourceFlowId = next.history.resourceFlows.at(-1)!.id;
  next = recordResourceTransferOutcome(next, {
    stableKey: `${action.stableKey}:transfer`,
    resourceFlowId,
    periodStartsAt: next.currentDate,
    periodEndsAt: next.currentDate,
    occurredAt: next.currentDate,
    status: "completed",
    attemptedAmount: amount,
    transferredAmount: amount,
    reasonKind: null,
    note: raising
      ? "Proceeds of a scheduled fundraising session, received by the committee."
      : "An advertising buy, paid out of the committee's own account.",
    provenance: { kind: "simulated-event", eventId: completionEventId },
  });
  return {
    world: next,
    resourceFlowId,
    resourceOutcomeId: next.history.resourceTransferOutcomes.at(-1)!.id,
    raisedAmount: raising ? amount : null,
    spentAmount: raising ? null : amount,
  };
}

/**
 * Doing the work.
 *
 * Returns the world unchanged when something the character already agreed to do
 * is in the way. That is not a failure to report; it is the answer, and the
 * surface above says whose commitment it was.
 */
export function performCampaignAction(world: World, actionId: EntityId): World {
  const action = campaignActionById(world, actionId);
  if (!action) throw new Error(`Campaign action not found: ${actionId}`);
  if (campaignActionResult(world, action.id)) {
    throw new Error("Campaign action is already complete.");
  }
  const campaign = campaignById(world, action.campaignId);
  if (!campaign || campaignState(world, campaign.id).status !== "active") {
    throw new Error("Only an active campaign can do campaign work.");
  }
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
    createCampaignElectionTransitionRegistry(),
  );
  const completionEventId = actionCompletionEvent(
    next,
    action.scheduledActivityId,
  );

  const money = actionMoney(next, campaign, action, completionEventId);
  next = money.world;

  const outcomeSummary =
    action.kind === "fundraising"
      ? `The committee spent the session on the phones and took in ${moneyLabel(money.raisedAmount!)}.`
      : action.kind === "advertising"
        ? `The committee placed an advertising buy worth ${moneyLabel(money.spentAmount!)}.`
        : "The campaign spent the session knocking on doors and talking to people who answered.";
  next = recordWorldEvent(next, {
    stableKey: `${action.stableKey}:outcome-event`,
    type: `campaign.${action.kind}-completed`,
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
            ? "Led a fundraising session"
            : action.kind === "advertising"
              ? "Signed off the advertising buy"
              : "Led the door-knocking",
      },
    ],
    personFactConstraints: [],
    visibility: "limited",
    tags: [`campaign.${action.kind}`, "campaign.action"],
    summary: outcomeSummary,
    context: {
      location: {
        jurisdictionId: campaign.jurisdictionId,
        label: next.history.scheduledActivities.find(
          (activity) => activity.id === action.scheduledActivityId,
        )!.location.label,
        setting: "Campaign work",
      },
      socialContext: "Campaign work, on the same clock as the rest of the day.",
      pressure: "There are only so many days left before the election.",
      choice:
        action.kind === "fundraising"
          ? "Spend the afternoon asking people for money."
          : action.kind === "advertising"
            ? "Spend the committee's money reaching people nobody had time to meet."
            : "Spend the afternoon meeting people instead.",
      motivation: "Be in a position to win on the day.",
      immediateReaction:
        action.kind === "fundraising"
          ? "There is more in the account than there was this morning."
          : action.kind === "advertising"
            ? "There is less in the account, and more people have heard the name."
            : "Somebody who had never heard of them now has.",
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
        detail: "Read the field memo",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: ["campaign.feedback", "campaign.observation"],
    summary: `The field memo puts them somewhere around ${Math.round(observed)} percent, give or take four points.`,
    context: {
      location: {
        jurisdictionId: campaign.jurisdictionId,
        label: "Campaign office",
        setting: "A memo left on the desk",
      },
      socialContext:
        "Somebody's best estimate from the calls they made, not the electorate itself.",
      pressure: null,
      choice: null,
      motivation: "Give the candidate something to act on.",
      immediateReaction: "It could be wrong, and there is no way to check.",
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
    resourceFlowId: money.resourceFlowId,
    resourceOutcomeId: money.resourceOutcomeId,
    raisedAmount: money.raisedAmount,
    spentAmount: money.spentAmount,
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

/* -------------------------------------------------------------------------- */
/* Election day                                                                */
/* -------------------------------------------------------------------------- */

/**
 * The result.
 *
 * Canonical support decides it, with a bounded keyed swing on top, because an
 * election is not a poll of the electorate's settled mind — turnout, weather and
 * the last week all move it. The swing is drawn per candidate from the world's
 * seed and the contest's identity, so the same world always produces the same
 * night, and a campaign that is genuinely behind can still occasionally win.
 */
export function evaluateCampaignAwareOutcome(
  world: World,
  contestId: EntityId,
): CampaignOutcome {
  const contest = requireElectionContest(world, contestId);
  const campaign = campaignForContest(world, contestId);
  if (!campaign || contest.candidatePersonIds.length < 2) {
    throw new Error(
      "A campaign-aware result needs a filed campaign and somebody to run against.",
    );
  }
  const scores = campaign.candidateSupportScopes.map((scope) => {
    const support = quantityBasisPoints(
      latestSupportState(world, campaign, scope),
    );
    const swing = new SeededRng(world.seed)
      .fork(
        `campaign-election-uncertainty:${contest.id}:${scope.candidatePersonId}`,
      )
      .integer(-350, 351);
    return {
      id: scope.candidatePersonId,
      weight: Math.max(1, support + swing),
    };
  });
  const votes = allocateBasisPoints(scores);
  const tallies = contest.candidatePersonIds
    .map((candidatePersonId) => ({
      candidatePersonId,
      votes: votes[candidatePersonId]!,
      voteShare: Number(
        (votes[candidatePersonId]! / SUPPORT_DENOMINATOR).toFixed(4),
      ),
    }))
    .sort(
      (left, right) =>
        right.votes - left.votes ||
        left.candidatePersonId.localeCompare(right.candidatePersonId),
    );
  return { winnerPersonId: tallies[0]!.candidatePersonId, tallies };
}

/**
 * What winning actually gets you.
 *
 * A result record says who won; it does not put anybody in a chair. The seat is
 * taken up the way every other working life in this game is recorded — an
 * organization, a work relationship, a role in a jurisdiction — which is what
 * makes the office real to the rest of the game rather than a status word on a
 * campaign screen. The existing capability rules then do the rest: the surfaces
 * that appear because somebody works in a legislature appear because they now
 * do.
 *
 * Two things are deliberately not claimed. Nothing here states what a member is
 * styled or what the seat pays, because no accepted source in this repository
 * says. And the term starts the day the result is recorded, because no pack
 * states when a term begins — recorded as an open question rather than dressed
 * up as a rule.
 */
function seatTheWinner(
  world: World,
  campaign: CampaignRecord,
  effectiveAt: string,
  outcomeEventId: EntityId,
): World {
  const pack = requireCandidacyPack(campaign.candidacyPackId);
  const contest = requireElectionContest(world, campaign.contestId);
  // One body per legislature, not one per election. Reused across campaigns
  // because a chamber is not created by the contest that fills a seat in it.
  const bodyKey = `legislature:${pack.packId}`;
  let next = world;
  const existing = next.history.organizations.find(
    (organization) => organization.stableKey === bodyKey,
  );
  if (!existing) {
    next = createOrganization(next, {
      stableKey: bodyKey,
      formedAt: next.currentDate,
      detailLevel: "lightweight",
      provenance: {
        kind: "authored",
        note: `The body the accepted rule pack ${pack.legislativeRulePackId} describes.`,
      },
      initialProfile: {
        name: pack.displayName,
        classification: "sector:government",
        locationJurisdictionId: campaign.jurisdictionId,
      },
    });
  }
  const bodyId =
    existing?.id ??
    next.history.organizations.find(
      (organization) => organization.stableKey === bodyKey,
    )!.id;

  next = createWorkRelationship(next, {
    stableKey: `${campaign.stableKey}:seat`,
    personId: campaign.candidatePersonId,
    organizationId: bodyId,
    startedAt: effectiveAt,
    // The prefix the capability rules already read to open the office and the
    // legislative surfaces. A member is not staff, and the kind says which.
    kind: "employment:legislative-member",
    compensation: "paid",
    authority: "shared",
    dependency: "partly-dependent",
    economicRisk: "organization-borne",
    provenance: { kind: "simulated-event", eventId: outcomeEventId },
    initialRole: {
      title: contest.office.title,
      occupationClassification:
        contest.office.occupationClassification ?? "service:elected-legislator",
      locationJurisdictionId: campaign.jurisdictionId,
      timeDemand: {
        expectedWeekly: { minimumHours: 10, maximumHours: 45 },
        attention: "high",
        concurrency: "partly-concurrent",
        scheduleRigidity: "mixed",
        interruptibility: "limited",
        locationJurisdictionId: campaign.jurisdictionId,
      },
    },
  });
  assertWorldIntegrity(next);
  return next;
}

/**
 * Closing a campaign, won or lost.
 *
 * Both endings do the same work, and that is the point: the committee's roles
 * end, the record is written, and the character carries on. A loss closes
 * nothing else.
 */
function closeCampaignAfterElection(
  world: World,
  campaign: CampaignRecord,
  resultId: EntityId,
): World {
  const result = electionContestResult(world, campaign.contestId);
  if (!result || result.id !== resultId) {
    throw new Error("Campaign closure requires its election result.");
  }
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
        ? "They won, and the office follows."
        : "They lost. The campaign is over; the life is not.",
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
        reason: "The campaign ended with the election.",
        provenance: { kind: "simulated-event", eventId: result.outcomeEventId },
        supersedesStatusId: previous.id,
      });
    }
  }
  if (status === "won") {
    next = seatTheWinner(
      next,
      campaign,
      result.resolvedAt,
      result.outcomeEventId,
    );
  }
  assertWorldIntegrity(next);
  return next;
}

/**
 * Election day, arriving on the world's own clock.
 *
 * Registered against the accepted election-contest transition key, so a contest
 * with a campaign behind it resolves from that campaign's support and a contest
 * without one falls straight through to the substrate's own handler. There is no
 * second election engine and no second calendar.
 */
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
  const workEventIds = (world.history.campaignActionResults ?? [])
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
      sourceEntityIds: [dueItem.id, campaign.contestId, ...workEventIds],
      note: "Resolved from canonical candidate support with a bounded keyed swing.",
    },
  });
  const result = electionContestResult(resolved, campaign.contestId)!;
  const closed = closeCampaignAfterElection(resolved, campaign, result.id);
  return {
    world: closed,
    status: "resolved",
    reasonKey: null,
    context: `The contest for a ${requireElectionContest(closed, campaign.contestId).office.title} was decided.`,
    outcomeEventId: result.outcomeEventId,
  };
}

export function createCampaignElectionTransitionRegistry(): FutureTransitionHandlerRegistry {
  // A campaign is one more thing in a life, not a mode the world switches into,
  // so an advance that carries the election handler must also carry the ordinary
  // life handlers: election day and a promised conversation can fall due on the
  // same day, and time refuses to step over a due item it has no handler for.
  return composeFutureTransitionHandlerRegistries(
    createFutureTransitionHandlerRegistry([
      [ELECTION_CONTEST_TRANSITION_KEY, campaignElectionTransitionHandler],
    ]),
    LIFE_TRANSITION_HANDLERS,
  );
}

/** Days between now and the contest, for a surface that wants to say so. */
export function daysUntilElection(
  world: World,
  campaign: CampaignRecord,
): number {
  const contest = requireElectionContest(world, campaign.contestId);
  let days = 0;
  let cursor = world.currentDate;
  while (cursor < contest.electionDate && days < 3_650) {
    cursor = addDays(cursor, 1);
    days += 1;
  }
  return days;
}

/** True when the moment has passed for this activity to be worth performing. */
export function campaignActionIsStale(
  world: World,
  action: CampaignActionRecord,
): boolean {
  const state = scheduledActivityState(world, action.scheduledActivityId);
  return (
    state.status === "scheduled" &&
    compareSimulationMoments(state.start, world.currentMoment) < 0
  );
}
