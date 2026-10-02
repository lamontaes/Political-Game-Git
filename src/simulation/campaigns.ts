import { recordCampaignFundraiserReceipts } from "./campaign-money-sources";
import { inventedPersonBirthDate } from "./invented-person-age";
import { createProsecutionTransitionRegistry } from "./justice/prosecution-transitions";
import {
  HOUSEHOLD_LOAN_MONTH_KEY,
  householdLoanMonthHandler,
} from "./household-loans";
import { paydayHandlers } from "./living-world/town-pay";
import { rentDayHandlers } from "./living-world/town-rent";
import { jailTermOn } from "./justice/jail-terms";
import {
  OFFICIAL_VIEW_TRANSITION_KEY,
  officialViewReflectionHandler,
} from "./living-world/official-views";
import { contestDistrictGeography } from "./campaign-geography";
import {
  MIGRATION_REVIEW_TRANSITION_KEY,
  migrationReviewHandler,
} from "./migration";
import { createPressTransitionRegistry } from "./press/transitions";
import { recordElectionSpeech } from "./campaign-speeches";
import { doorKnockingReturn } from "./campaign-recognition";
import { startingSupportAdjustment } from "./record-in-office";
import { campaignOfficePollingEstimate } from "./campaign-polling-estimate";
import type { CampaignPollingEstimate } from "./campaign-polling-estimate";
import { campaignPollingQuality } from "./campaign-polling";
import { majorPartyOf } from "./statewide-electorate";
import {
  legislativeTermDates,
  supportedLegislativeTermDates,
  scheduleLegislativeTerm,
  createLegislativeTermTransitionRegistry,
} from "./legislative-office-terms";
import { stateGoverningHandlers } from "./governing/state-governing";
import { publicProgramHandlers } from "./governing/public-program";
import { publicServiceHandlers } from "./public-service-producer";
import { enactedDutyHandlers } from "./enacted-duties";
import { officeContinuityHandlers } from "./governing/office-continuity";
import { governorTurnoverHandlers } from "./nationwide-world/state-executive-turnover";
import { constitutionalReformHandlers } from "./living-world/constitutional-reform";
import { federalReformHandlers } from "./living-world/federal-reform";
import { articleVHandlers } from "./governing/article-v";
import {
  POLITICAL_REFLECTION_TRANSITION_KEY,
  politicalReflectionTransitionHandler,
} from "./living-world/political-reflection";
import { presidentialTurnoverHandlers } from "./nationwide-world/presidential-turnover";
import { recallHandlers } from "./recall";
import { councilActHandlers } from "./municipal-ordinance-procedure";
import { dcCouncilSittingHandlers } from "./dc-council-sittings";
import { localCouncilMeetingHandlers } from "./living-world/local-council-meetings";
import { localGoverningBodyRules } from "./nationwide-world/local-governing-body-rules";
import {
  localMemberAgendaHandlers,
  scheduleLocalMemberAgendaIntakes,
} from "./governing/member-agenda";
import {
  createNationalElectionTransitionRegistry,
  linkedNationalUnitTransition,
} from "./national-election-consumer";
import { createTransitTransitionRegistry } from "./transit-service";
import { settlePublicResourcePayment } from "./public-fiscal";
import { createTaxTransitionHandlerRegistry } from "./tax-policy";
import { createCrisisTransitionRegistry } from "./crisis";
import { createClemencyTransitionRegistry } from "./justice/clemency-transitions";
import { composeExecutiveWorkHandlers } from "./executive-work";
import { lifePaths2Handlers } from "./life-paths2";
import { requireCandidacyPack } from "./candidacy-packs";
import { candidacyEligibility, districtSeatMustBeNamed } from "./candidacy";
import { stateExecutiveIdentityForOfficeKey } from "./nationwide-world/state-executive-candidacy-packs";
import { localGoverningBodyIdentityForOfficeKey } from "./nationwide-world/local-governing-body-candidacy-packs";
import {
  localElectionHandlers,
  localCampaignSeat,
  localSeatHolder,
  withdrawTownRaceForCampaign,
} from "./living-world/local-elections";
import { congressSeatIdentityForOfficeKey } from "./nationwide-world/congress-candidacy-packs";
import type { LocalGoverningBodyIdentity } from "./nationwide-world/local-governing-body-candidacy-packs";
import {
  ensureLocalGovernmentOrganization,
  localGovernmentOrganizationKey,
  municipalWorkspaceGovernmentForUnit,
} from "./nationwide-world/local-governments";
import { primaryReading } from "./municipal-government";
import {
  municipalSeatChoiceByKey,
  municipalSeatMustBeNamed,
} from "./municipal-seat-identity";
import {
  installMunicipalGovernment,
  municipalOrganizationFor,
  municipalSeatKey,
  municipalSeats,
} from "./municipal-public-work";
import { planOrdinaryStateExecutiveTerm } from "./nationwide-world/state-executive-terms";
import {
  activeCampaignForCandidate,
  campaignActionById,
  campaignActionForActivity,
  campaignActionResult,
  campaignActions,
  campaignById,
  campaignForContest,
  campaignState,
  campaignTreasuryPosition,
  campaigns,
  requireCampaign,
} from "./campaign-queries";
import { createCharacterHistoryContextPerson } from "./character-history";
import {
  addDays,
  compareSimulationMoments,
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
  createOrganizationParticipation,
  createWorkRelationship,
  recordOrganizationParticipationState,
  recordWorkStatus,
} from "./life";
import { lifeTransitionHandlers } from "./life-callbacks";
import { PEOPLE_CONTACT_HANDLERS } from "./people-contact";
import { PEOPLE_GOAL_HANDLERS } from "./people-goal-review";
import { peopleFamilyHandlers } from "./people-family-plan";
import {
  CLAIM_CONTRADICTION_TRANSITION_KEY,
  claimContradictionTransitionHandler,
} from "./claim-contradictions";
import {
  CHAPTER_OUTREACH_TRANSITION_KEY,
  chapterOutreachTransitionHandler,
} from "./living-world/party-chapters";
import {
  MACRO_MONTHLY_STEP_KEY,
  macroMonthlyStepHandler,
} from "./macro-economy/producer";
import {
  DEVELOPMENT_STEP_TRANSITION_KEY,
  developmentStepTransitionHandler,
} from "./living-world/developments";
import {
  PARTY_BODY_REVIEW_TRANSITION_KEY,
  partyBodyReviewTransitionHandler,
} from "./living-world/party-evolution";
import {
  activeOrganizationParticipationsAt,
  organizationParticipationStateAt,
  workStatusAt,
  workStatusHistory,
} from "./life-queries";
import {
  lifePlaceByJurisdictionId,
  stateJurisdictionForKey,
} from "./life-places";
import { drawGeneratedPersonName, personName } from "./people";
import { createExactQuantity } from "./quantity";
import { positionOwnerEndpoint, resourcePositionAt } from "./resource-queries";
import {
  createResourceFlow,
  createResourcePosition,
  recordResourceTransferOutcome,
} from "./resources";
import { recordEventKnowledge } from "./records";
import {
  CAMPAIGN_ROUTINE_WORK,
  campaignRoutineBlockAt,
  campaignRoutineSlots,
  routineIdOfActivity,
} from "./campaign-routine";
import { SeededRng } from "./rng";
import {
  cancelScheduledActivity,
  controlledCommitmentsBlockingActivityPerformance,
  createScheduledActivity,
  performScheduledActivity,
  scheduledActivityState,
} from "./time-work";
import type {
  ResolveElectionContestInput,
  CampaignActionKind,
  CampaignActionRecord,
  CampaignActionResultRecord,
  CampaignActionStrategyRecord,
  CampaignCandidateSupportScope,
  CampaignRecord,
  CampaignStateRecord,
  CandidateTally,
  CurrencyCode,
  DistrictSeatBinding,
  ElectionContestRecord,
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerRegistry,
  FutureTransitionHandlerResult,
  MetricSegmentKey,
  MoneyAmount,
  RoutineTimeHook,
  RoutineWindow,
  ScheduledActivityRecord,
  SimulationMoment,
  World,
  WorldMetricDefinition,
  WorldMetricObservationRecord,
} from "./types";
import {
  createWorldMetricCatalog,
  createWorldMetricDefinition,
  recordWorldMetricObservation,
  recordWorldMetricState,
} from "./world-metrics";
import {
  advanceWithWorldIntegrityAtEnd,
  assertWorldIntegrity,
  recordWorldEvent,
} from "./world";
import { campaignLifeHandlers } from "./campaign-life-handlers";
import { ensureCampaignWeeklyEvaluation } from "./campaign-opponents";
import {
  SUPPORT_DENOMINATOR,
  SUPPORT_FLOOR_BASIS_POINTS,
  latestSupportState,
  quantityBasisPoints,
  recordSupportShift,
} from "./campaign-support";
import { moneyText } from "./money-text";

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
  /**
   * Explicit Gazetteer district for a numbered chamber seat. It identifies
   * the contested seat and is never inferred from state residence.
   */
  readonly districtBinding?: DistrictSeatBinding | null;
  /** Chosen council seat identity, saved on the election contest. */
  readonly municipalSeatKey?: string | null;
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
  /** Optional explicit approval context for the bounded strategy interaction. */
  readonly strategy?: CampaignActionStrategyRecord | null;
  /** The event of the standing routine that booked this session (D-11). */
  readonly routineEventId?: EntityId;
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
      "Canonical bounded support for one candidate in one contest at an explicit point in time. The campaign reads the saved support through separate observation records.",
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

function recordInitialSupport(world: World, campaign: CampaignRecord): World {
  // Every candidate starts from the same owner-approved baseline.
  // A candidate's past moves where they start: a remembered ethics finding,
  // a sitting governor's record on the economy, or how the voters here see
  // their votes on the questions they hold views about (`record-in-office.ts`).
  const weights = campaign.candidateSupportScopes.map((scope) => ({
    id: scope.candidatePersonId,
    weight: Math.max(
      1,
      850 +
        startingSupportAdjustment(
          world,
          scope.candidatePersonId,
          campaign.filedAt,
          campaign.jurisdictionId,
        ),
    ),
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
    const name = drawGeneratedPersonName(rng);
    const before = next;
    next = createCharacterHistoryContextPerson(next, {
      stableKey: key,
      givenName: name.givenName,
      familyName: name.familyName,
      identity: name.identity,
      // An adult, because the office is one. The exact age is a fact about
      // this person and says nothing else about them.
      birthDate: inventedPersonBirthDate(rng, {
        role: "campaign-opponent",
        referenceDate: next.currentDate,
        placement: "reference-day",
      }),
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
    districtBinding: input.districtBinding ?? null,
    municipalSeatKey: input.municipalSeatKey ?? null,
  });
  if (!eligibility.eligible || !eligibility.office || !eligibility.pack) {
    throw new Error(
      eligibility.blocks[0]?.reason ?? "This character cannot file here.",
    );
  }

  // A numbered chamber seat needs a Gazetteer identity at filing. This sits
  // after eligibility so a sourced residence refusal can speak first when it
  // applies. Even without that rule, an unbound contest cannot identify the
  // generated seat the winner would replace.
  if (
    (input.districtBinding ?? null) === null &&
    districtSeatMustBeNamed(input.jurisdictionId, input.officeKey)
  ) {
    throw new Error(
      "This seat is filled by district, and the filing named none. Name its recorded Gazetteer district before filing so the election and winner belong to one seat.",
    );
  }
  if (!input.municipalSeatKey && municipalSeatMustBeNamed(input.officeKey)) {
    throw new Error(
      "This council elects named seats. Choose a recorded at-large or ward seat before filing.",
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
    JSON.stringify(contest.office.districtBinding ?? null) !==
      JSON.stringify(option.office.districtBinding ?? null) ||
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
        detail: `Filed to run for ${option.office.title}`,
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: ["campaign.filing", "election.candidacy"],
    summary: `${candidate.givenName} ${candidate.familyName} filed to run for ${option.office.title}.`,
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
    compliancePackId:
      lifePlaceByJurisdictionId(input.jurisdictionId)?.stateJurisdictionKey ===
      "US-KY"
        ? "us-ky-candidate-campaign-compliance-v1"
        : null,
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
  // CRUNCH46 CAMPAIGN: the rivals in this race start campaigning on the
  // world's weekly clock.
  world = ensureCampaignWeeklyEvaluation(world, campaignRecord.id);
  // A town seat the town's own election already has on its ballot is decided
  // in this campaign's election instead.
  world = withdrawTownRaceForCampaign(world, campaignRecord.contestId);
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
  // One booking calls several writers (the scheduled activity, the action,
  // their events), and each checked the whole World again. They run with the
  // check deferred, and the booked World is checked once against its input.
  const booking: { result?: ScheduledCampaignActionResult } = {};
  advanceWithWorldIntegrityAtEnd(() => {
    booking.result = bookCampaignAction(world, input);
    return booking.result.world;
  }, world);
  return booking.result!;
}

function bookCampaignAction(
  world: World,
  input: ScheduleCampaignActionInput,
): ScheduledCampaignActionResult {
  const campaign = requireCampaign(world, input.campaignId);
  if (campaignState(world, campaign.id).status !== "active") {
    throw new Error("A finished campaign cannot take on more work.");
  }
  const jailed = jailTermOn(
    world,
    campaign.candidatePersonId,
    input.plan.start.date,
  );
  if (jailed) {
    throw new Error(
      `The candidate is in jail until ${jailed.until} and cannot campaign.`,
    );
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

  const activeStaff = campaign.staffWorkRelationshipIds.flatMap(
    (workRelationshipId) => {
      const work = world.history.workRelationships.find(
        (candidate) => candidate.id === workRelationshipId,
      );
      return work && workStatusAt(world, work.id)?.status === "active"
        ? [work.personId]
        : [];
    },
  );
  if (input.strategy) {
    const strategy = input.strategy;
    if (
      strategy.proposerPersonId !== null &&
      !activeStaff.includes(strategy.proposerPersonId)
    ) {
      throw new Error(
        "The staff member who made this proposal is no longer available. Review the plan again.",
      );
    }
    if (
      strategy.geographyKey.trim().length === 0 ||
      strategy.geographyLabel.trim().length === 0 ||
      strategy.approvedSpendCeiling.minorUnits < 0 ||
      !Number.isSafeInteger(strategy.approvedSpendCeiling.minorUnits) ||
      strategy.approvedSpendCeiling.currency !== campaign.treasuryCurrency ||
      (input.kind === "advertising" &&
        strategy.approvedSpendCeiling.minorUnits !==
          (input.spend?.minorUnits ?? 0)) ||
      (input.kind !== "advertising" &&
        strategy.approvedSpendCeiling.minorUnits !== 0)
    ) {
      throw new Error("The approved campaign strategy is invalid.");
    }
    if (strategy.geographyKind === "jurisdiction") {
      if (strategy.geographyKey !== `jurisdiction:${campaign.jurisdictionId}`) {
        throw new Error("The approved geography does not match this campaign.");
      }
    } else {
      const expected = contestDistrictGeography(contest.office)?.key ?? null;
      if (strategy.geographyKey !== expected) {
        throw new Error("The approved district does not match this campaign.");
      }
    }
  }

  const ordinal = campaignActions(world, campaign.id).length;
  const stableKey = `${campaign.stableKey}:action:${input.kind}:${ordinal}`;
  const participants = canonicalIds(
    [campaign.candidatePersonId, ...activeStaff],
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
    sourceEntityIds: [
      campaign.filingEventId,
      ...(input.routineEventId ? [input.routineEventId] : []),
    ],
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
    strategy: input.strategy
      ? {
          ...input.strategy,
          approvedSpendCeiling: {
            ...input.strategy.approvedSpendCeiling,
          },
        }
      : null,
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

/** The existing paid-message effect, shared by every committee. */
export function requestedCampaignAdvertisingGainBasisPoints(
  spend: MoneyAmount,
): number {
  return Math.floor(spend.minorUnits / 500);
}

/** Field effect from recorded effort, shared by player and rival work. */
export function requestedCampaignFieldGainBasisPoints(
  world: World,
  campaign: CampaignRecord,
  minutes: number,
  workers: number,
  excludingActionId: EntityId | null = null,
): number {
  if (!Number.isFinite(minutes) || !Number.isFinite(workers)) return 0;
  if (minutes <= 0 || workers <= 0) return 0;
  return Math.floor(
    (minutes *
      workers *
      3 *
      doorKnockingReturn(world, campaign, excludingActionId).percent) /
      200,
  );
}

/** Only a completed activity linked to this outcome proves field effort. */
export function requestedCompletedCampaignFieldGainBasisPoints(
  world: World,
  campaign: CampaignRecord,
  candidatePersonId: EntityId,
  outcomeEventId: EntityId,
): number {
  const completion = world.history.scheduledActivityStates.find(
    (state) =>
      state.status === "completed" &&
      state.outcomeEventId === outcomeEventId &&
      compareSimulationMoments(state.end, world.currentMoment) <= 0,
  );
  if (!completion) return 0;
  const activity = world.history.scheduledActivities.find(
    (record) => record.id === completion.activityId,
  );
  if (!activity?.participantPersonIds.includes(candidatePersonId)) return 0;
  return requestedCampaignFieldGainBasisPoints(
    world,
    { ...campaign, candidatePersonId },
    simulationMinutesBetween(completion.start, completion.end),
    activity.participantPersonIds.length,
  );
}

/**
 * What an afternoon actually moves.
 *
 * The size of the effect comes from things the world records: how many people
 * worked, for how many minutes, and — for an advertising buy — how much the
 * committee actually spent. Seeded variation then widens or narrows it, because
 * a good day on the doors and a bad one are not the same day. What it never is
 * is a flat bonus per click.
 *
 * A fundraising session moves nothing. An afternoon on the phones converts the
 * candidate's time into the committee's money, and money persuades nobody until
 * it is spent — which is what an advertising buy is for. Asking somebody who
 * already supports you for a check is not the same act as changing a mind, and
 * paying the campaign twice for one afternoon would make the phones strictly
 * better than the doors.
 */
function requestedGainBasisPoints(
  world: World,
  campaign: CampaignRecord,
  action: CampaignActionRecord,
): number {
  if (action.kind === "fundraising") return 0;
  // How long the session was booked for. The activity record carries what it
  // is; its state record carries when, which is the half this needs.
  const timing = scheduledActivityState(world, action.scheduledActivityId);
  const minutes = Math.max(
    1,
    simulationMinutesBetween(timing.start, timing.end),
  );
  const activity = world.history.scheduledActivities.find(
    (candidate) => candidate.id === action.scheduledActivityId,
  );
  const workers = Math.max(1, activity?.participantPersonIds.length ?? 1);
  // Who is knocking changes what a door returns: see `campaign-recognition.ts`.
  const base =
    action.kind === "outreach"
      ? requestedCampaignFieldGainBasisPoints(
          world,
          campaign,
          minutes,
          workers,
          action.id,
        )
      : requestedCampaignAdvertisingGainBasisPoints(
          action.plannedSpend ?? {
            minorUnits: 0,
            currency: campaign.treasuryCurrency,
          },
        );
  return Math.max(1, Math.floor(base));
}

/**
 * Support is a share, so a gain is a transfer. Taking it evenly from the field
 * and refusing to push anybody below the floor keeps the split a real
 * distribution rather than a score that only ever goes up. The shared writer
 * in `campaign-support.ts` does both, for this campaign and for opponents.
 */
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
  const shift = recordSupportShift(world, campaign, {
    stableKeyBase: action.stableKey,
    gainerPersonId: campaign.candidatePersonId,
    gainBasisPoints: requestedGainBasisPoints(world, campaign, action),
    sourceEntityIds: [outcomeEventId],
  });
  const candidateStateId = shift.stateIdByPerson[campaign.candidatePersonId];
  if (!candidateStateId) {
    throw new Error("Candidate support state was not recorded.");
  }
  return { world: shift.world, stateIds: shift.stateIds, candidateStateId };
}

/**
 * No recorded voter responses means a district comparison, never an own poll.
 * Its reported spread is measured across the listed game records; confidence
 * is deliberately unspecified because those districts are not respondents.
 */
function recordCampaignObservation(
  world: World,
  campaign: CampaignRecord,
  action: CampaignActionRecord,
  candidateStateId: EntityId,
): {
  readonly world: World;
  readonly observation: WorldMetricObservationRecord;
  readonly estimate: CampaignPollingEstimate;
  readonly party: "democratic" | "republican" | null;
} {
  const estimate = campaignOfficePollingEstimate(world, campaign);
  const party = majorPartyOf(
    world,
    campaign.candidatePersonId,
    world.currentDate,
  );
  const share =
    party === "republican"
      ? 1 - estimate.democraticShare
      : estimate.democraticShare;
  const observedBasisPoints = Math.round(share * SUPPORT_DENOMINATOR);
  const scope = campaign.candidateSupportScopes.find(
    (candidate) => candidate.candidatePersonId === campaign.candidatePersonId,
  );
  if (!scope) throw new Error("The campaign candidate has no metric segment.");
  const previous = world.history.metricObservations
    .filter(
      (observation) =>
        observation.metricId === campaign.supportMetricId &&
        observation.scope.jurisdictionId === campaign.jurisdictionId &&
        observation.scope.segmentKey === scope.segmentKey &&
        observation.referencePeriod.kind === "point" &&
        observation.referencePeriod.at === world.currentDate &&
        observation.sourceSeriesKey === "campaign.field-memo",
    )
    .at(-1);
  const next = recordWorldMetricObservation(world, {
    stableKey: `${action.stableKey}:observation`,
    metricId: campaign.supportMetricId,
    scope: {
      jurisdictionId: campaign.jurisdictionId,
      segmentKey: scope.segmentKey,
    },
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
    sourceLabel: estimate.label,
    sourceReference: {
      title: "Recorded district comparison, not contacted voter responses",
      locator: JSON.stringify({
        comparison: estimate.comparison,
        party,
        peers: estimate.peers,
      }),
    },
    methodologyKey: "campaign.estimated-district-comparison",
    releaseDate: world.currentDate,
    recordedAt: world.currentDate,
    vintageKey: `campaign.v${world.history.nextSequence}`,
    uncertainty: {
      kind: "margin-of-error",
      margin: {
        kind: "quantity",
        quantity: createExactQuantity(
          Math.round(estimate.standardDeviation * SUPPORT_DENOMINATOR),
          SUPPORT_DENOMINATOR,
          "rate:share",
        ),
      },
      confidence: null,
    },
    supersedesObservationId: previous?.id ?? null,
    // Retain the private integrity link without reading its hidden value.
    underlyingStateId: candidateStateId,
  });
  return {
    world: next,
    observation: next.history.metricObservations.at(-1)!,
    estimate,
    party,
  };
}

function actionCompletionEvent(world: World, activityId: EntityId): EntityId {
  const state = scheduledActivityState(world, activityId);
  if (state.status !== "completed" || state.outcomeEventId === null) {
    throw new Error("Campaign action activity did not complete canonically.");
  }
  return state.outcomeEventId;
}

function moneyLabel(amount: MoneyAmount): string {
  return moneyText(amount);
}

/** The existing advertising transfer, using the spender's actual saved endpoints. */
export function recordCampaignAdvertisingExpenditure(
  world: World,
  input: {
    readonly stableKey: string;
    readonly committeeOrganizationId: EntityId;
    readonly vendorOrganizationId: EntityId;
    readonly treasuryPositionId: EntityId;
    readonly jurisdictionId: EntityId;
    readonly outcomeEventId: EntityId;
    readonly amount: MoneyAmount;
  },
) {
  const amount = input.amount;
  const treasury = resourcePositionAt(
    world,
    { kind: "organization", organizationId: input.committeeOrganizationId },
    amount.currency,
  );
  if (
    !treasury ||
    treasury.positionId !== input.treasuryPositionId ||
    amount.minorUnits <= 0 ||
    treasury.liquidBalance.minorUnits < amount.minorUnits
  )
    throw new Error(
      "The spending committee cannot overdraw its recorded treasury.",
    );
  let next = createResourceFlow(world, {
    stableKey: `${input.stableKey}:flow`,
    source: {
      kind: "organization",
      organizationId: input.committeeOrganizationId,
    },
    recipient: positionOwnerEndpoint({
      kind: "organization",
      organizationId: input.vendorOrganizationId,
    }),
    startsAt: world.currentDate,
    initialStatus: "active",
    amount,
    cadenceKind: "schedule:one-time",
    basisKind: "custom:campaign-expenditure",
    basisReference: { kind: "general" },
    restrictionKind: "purpose:campaign",
    jurisdictionId: input.jurisdictionId,
    provenance: { kind: "simulated-event", eventId: input.outcomeEventId },
  });
  const resourceFlowId = next.history.resourceFlows.at(-1)!.id;
  next = recordResourceTransferOutcome(next, {
    stableKey: `${input.stableKey}:transfer`,
    resourceFlowId,
    periodStartsAt: next.currentDate,
    periodEndsAt: next.currentDate,
    occurredAt: next.currentDate,
    status: "completed",
    attemptedAmount: amount,
    transferredAmount: amount,
    reasonKind: null,
    note: "An advertising buy, paid out of the committee's own account.",
    provenance: { kind: "simulated-event", eventId: input.outcomeEventId },
  });
  return {
    world: next,
    resourceFlowId,
    resourceOutcomeId: next.history.resourceTransferOutcomes.at(-1)!.id,
  };
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
  if (action.kind === "advertising") {
    const amount = { ...action.plannedSpend! };
    const paid = recordCampaignAdvertisingExpenditure(world, {
      stableKey: action.stableKey,
      committeeOrganizationId: campaign.organizationId,
      vendorOrganizationId: campaign.advertisingVendorOrganizationId,
      treasuryPositionId: campaign.treasuryPositionId,
      jurisdictionId: campaign.jurisdictionId,
      outcomeEventId: completionEventId,
      amount,
    });
    return { ...paid, raisedAmount: null, spentAmount: amount };
  }
  const receipts = recordCampaignFundraiserReceipts(world, {
    eventId: completionEventId,
    committeeOrganizationId: campaign.organizationId,
    candidatePersonId: campaign.candidatePersonId,
    currency: campaign.treasuryCurrency,
  });
  return {
    world: receipts.world,
    resourceFlowId: receipts.resourceFlowId,
    resourceOutcomeId: receipts.resourceOutcomeId,
    raisedAmount: receipts.raisedAmount,
    spentAmount: null,
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
  // Doing the work calls a dozen writers (the activity, money, events, support
  // and its observation), and each checked the whole World again. They run
  // with the check deferred, and the result is checked once against its input.
  return advanceWithWorldIntegrityAtEnd(
    () => doCampaignAction(world, actionId),
    world,
  );
}

function doCampaignAction(world: World, actionId: EntityId): World {
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
  if (action.kind === "advertising") {
    const available = campaignTreasuryPosition(world, campaign)?.liquidBalance;
    if (
      !available ||
      available.currency !== action.plannedSpend!.currency ||
      available.minorUnits < action.plannedSpend!.minorUnits
    ) {
      throw new Error(
        "The committee cannot overdraw its account; it no longer has enough money for the approved buy. Review the plan again.",
      );
    }
  }

  const performed = performScheduledActivity(
    world,
    action.scheduledActivityId,
    createCampaignElectionTransitionRegistry(),
  );
  // A session the standing routine booked was written up by the routine the
  // moment it finished.
  if (campaignActionResult(performed, action.id)) return performed;
  return recordCampaignActionOutcome(performed, campaign, action);
}

/**
 * Everything a finished campaign session writes once its hours are done: the
 * money, the outcome, the candidate's support and the field memo.
 */
function recordCampaignActionOutcome(
  world: World,
  campaign: CampaignRecord,
  action: CampaignActionRecord,
): World {
  let next = world;
  const completionEventId = actionCompletionEvent(
    next,
    action.scheduledActivityId,
  );

  const money = actionMoney(next, campaign, action, completionEventId);
  next = money.world;

  const baseOutcomeSummary =
    action.kind === "fundraising"
      ? money.raisedAmount
        ? `The committee reported completed gifts of ${moneyLabel(money.raisedAmount)} from its fundraising session.`
        : "The fundraising session recorded no completed gifts; a dated monetary ask and contribution-cap law term are not available."
      : action.kind === "advertising"
        ? `The committee placed an advertising buy worth ${moneyLabel(money.spentAmount!)}.`
        : "The campaign spent the session knocking on doors and talking to people who answered.";
  const outcomeSummary = action.strategy
    ? `${baseOutcomeSummary} The approved geography was ${action.strategy.geographyLabel}.`
    : baseOutcomeSummary;
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
      choice: action.strategy
        ? `Approve ${action.kind} for ${action.strategy.geographyLabel} with a ${moneyLabel(action.strategy.approvedSpendCeiling)} committee spending ceiling.`
        : action.kind === "fundraising"
          ? "Spend the session asking people for money."
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
  const { estimate, party } = observationResult;
  const reader = campaignPollingQuality(next, campaign).reader;
  const compared = estimate.peers
    .map(
      (peer) =>
        congressSeatIdentityForOfficeKey(peer.seatKey)?.displayName ??
        peer.seatKey,
    )
    .join("; ");
  const comparisonLabel =
    party === null
      ? "Democratic district comparison (your major-party affiliation is not recorded)"
      : `${party} district comparison`;
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
    tags: [
      "campaign.feedback",
      "campaign.observation",
      "campaign.estimate",
      ...new Set(
        estimate.peers.map(
          (peer) => `campaign.estimate-source:${peer.sourceEntityId}`,
        ),
      ),
    ],
    summary: `${estimate.label}: ${comparisonLabel} around ${Math.round(observed)} percent, give or take ${(estimate.standardDeviation * 100).toFixed(1)} points of recorded district spread. Compared ${compared}.`,
    context: {
      location: {
        jurisdictionId: campaign.jurisdictionId,
        label: "Campaign office",
        setting: "A memo left on the desk",
      },
      socialContext:
        reader.kind === "experienced"
          ? `Prepared by ${personName(next.people[reader.personId]!)}, whose recorded survey work totals ${reader.surveyDays} days. This is district evidence, not contacted voter responses.`
          : "Prepared by the campaign's volunteer reader from recorded district evidence, not contacted voter responses.",
      pressure: null,
      choice: null,
      motivation: "Give the candidate something to act on.",
      immediateReaction:
        "The compared districts and their recorded spread are listed; there is no poll of your own yet.",
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

/** Read the latest saved candidate support without an election-night swing. */
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
    return {
      id: scope.candidatePersonId,
      weight: Math.max(SUPPORT_FLOOR_BASIS_POINTS, support),
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
 * Dated supported offices plan expected work and take up authority at the
 * recorded term boundary. Unadmitted offices retain the accepted authored
 * result-day behavior; that legacy work start is not a sourced legal term.
 */
function seatTheWinner(
  world: World,
  campaign: CampaignRecord,
  effectiveAt: string,
  outcomeEventId: EntityId,
  winnerPersonId = campaign.candidatePersonId,
): World {
  const pack = requireCandidacyPack(campaign.candidacyPackId);
  const contest = requireElectionContest(world, campaign.contestId);
  const local = localGoverningBodyIdentityForOfficeKey(
    contest.office.officeKey,
  );
  if (local)
    return seatOnLocalGoverningBody(
      world,
      campaign,
      contest,
      local,
      effectiveAt,
      outcomeEventId,
      winnerPersonId,
    );
  const governingJurisdiction = stateJurisdictionForKey(pack.jurisdictionKey);
  if (!governingJurisdiction) {
    throw new Error(
      `No governing jurisdiction for candidacy pack ${pack.packId}.`,
    );
  }
  // Register the existing state identity in this save, without moving anybody
  // or copying state capabilities onto the municipality they live in.
  const governingJurisdictionId = governingJurisdiction.id;
  let next = world.jurisdictions[governingJurisdictionId]
    ? world
    : {
        ...world,
        jurisdictions: {
          ...world.jurisdictions,
          [governingJurisdictionId]: governingJurisdiction,
        },
        jurisdictionOrder: [
          ...world.jurisdictionOrder,
          governingJurisdictionId,
        ],
      };
  // One body per legislature, not one per election. Reused across campaigns
  // because a chamber is not created by the contest that fills a seat in it.
  const bodyKey = `legislature:${pack.packId}`;
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
        locationJurisdictionId: governingJurisdictionId,
      },
    });
  }
  const bodyId =
    existing?.id ??
    next.history.organizations.find(
      (organization) => organization.stableKey === bodyKey,
    )!.id;

  const timing = legislativeTermDates(
    contest.office.officeKey,
    contest.electionDate,
  );
  next = createWorkRelationship(next, {
    stableKey:
      winnerPersonId === campaign.candidatePersonId
        ? `${campaign.stableKey}:seat`
        : `${campaign.stableKey}:rival:${winnerPersonId}:seat`,
    personId: winnerPersonId,
    organizationId: bodyId,
    startedAt: timing?.startsAt ?? effectiveAt,
    ...(timing ? { initialStatus: "expected" as const } : {}),
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
      locationJurisdictionId: governingJurisdictionId,
      timeDemand: {
        expectedWeekly: { minimumHours: 10, maximumHours: 45 },
        attention: "high",
        concurrency: "partly-concurrent",
        scheduleRigidity: "mixed",
        interruptibility: "limited",
        locationJurisdictionId: governingJurisdictionId,
      },
    },
  });
  if (timing)
    next = scheduleLegislativeTerm(
      next,
      next.history.workRelationships.at(-1)!.id,
      contest.id,
    );
  assertWorldIntegrity(next);
  return next;
}

/**
 * A seat on a town's governing body, or its mayoralty, taken up in that town's
 * own government.
 *
 * Recorded the way every municipal seat in this game is recorded — a
 * participation in the town government's organization, as a member or as
 * mayor — so the city screens that already read seats read this one. A town
 * the game has read in depth keeps its own compiled government and its own
 * seat limit; any other town gets the government the Census listing records,
 * placed once.
 *
 * No term, ward or seat number is written, because none has been read. A full
 * fictional opening council yields one generated seat to a newly elected
 * member. An older or otherwise populated council is not silently displaced.
 *
 * A town has one mayor, so a new mayor's term begins the day the sitting
 * mayor's ends. A council member who wins the mayoralty keeps the council
 * seat: whether the town's law makes them give it up has not been read
 * (PLACEHOLDER, see local-chief-executive-rules.ts).
 */
function seatOnLocalGoverningBody(
  world: World,
  campaign: CampaignRecord,
  contest: ElectionContestRecord,
  office: LocalGoverningBodyIdentity,
  effectiveAt: string,
  outcomeEventId: EntityId,
  winnerPersonId: EntityId,
): World {
  const unit = office.unit;
  const mayor = office.seat === "chief-executive";
  const roleKind = mayor ? "leader:municipal-mayor" : "leader:municipal-member";
  const compiled = municipalWorkspaceGovernmentForUnit(unit);
  const namedSeat = contest.office.seatKey
    ? municipalSeatChoiceByKey(office.officeKey, contest.office.seatKey)
    : null;
  // An older unbound contest cannot silently take any D.C. ward or at-large
  // place when its result arrives. Its win remains recorded without a seat.
  if (!mayor && municipalSeatMustBeNamed(office.officeKey) && !namedSeat)
    return world;
  let next = world;
  let organizationId: EntityId | undefined;
  let stableKey: string;
  if (compiled) {
    next = installMunicipalGovernment(next, {
      governmentKey: compiled.key,
      jurisdictionId: campaign.jurisdictionId,
      formedAt: next.currentDate,
    });
    organizationId = municipalOrganizationFor(next, compiled.key)?.id;
    stableKey = municipalSeatKey(compiled.key, winnerPersonId);
  } else {
    next = ensureLocalGovernmentOrganization(next, unit);
    organizationId = next.history.organizations.find(
      (organization) =>
        organization.stableKey === localGovernmentOrganizationKey(unit),
    )?.id;
    stableKey = `local-government-seat:${unit.id}:${winnerPersonId}`;
  }
  if (mayor) stableKey = `${stableKey}:mayor`;
  if (!organizationId)
    throw new Error(
      `The town government ${unit.id} cannot be placed in this world, so nobody can be seated on it.`,
    );
  // Re-elected: somebody who still holds this office keeps the seat they hold.
  // Writing a second seat for the same person used to refuse the whole result.
  if (
    activeOrganizationParticipationsAt(next, winnerPersonId).some(
      (active) =>
        active.participation.organizationId === organizationId &&
        active.state.roleKind === roleKind,
    )
  )
    return next;
  // The sitting mayor's term ends as the new one's begins. A member takes
  // the seat the town's own elections left off this year's ballot for the
  // campaign; on a full body without one, the seat of the member who has held
  // theirs longest, whose term is the one most likely up.
  // A named seat (a D.C. ward or at-large place) displaces whoever holds that
  // very seat; the town's own ballot seat applies only without one.
  const namedHolder =
    namedSeat && compiled
      ? municipalSeats(next, compiled.key).filter(
          (seat) =>
            (seat.role === "member" || seat.role === "presiding-member") &&
            seat.seatLabel === namedSeat.label,
        )
      : [];
  if (namedHolder.length > 1)
    throw new Error(
      "More than one sitting councilor holds the contested seat.",
    );
  const campaignSeat = namedSeat
    ? null
    : localCampaignSeat(unit, mayor, contest.electionDate, {
        world: next,
        town: campaign.jurisdictionId,
        personId: winnerPersonId,
      });
  const campaignHolder = namedSeat
    ? (namedHolder[0] ?? null)
    : campaignSeat === null
      ? null
      : localSeatHolder(next, unit, campaignSeat);
  const seatLimit = mayor
    ? 1
    : compiled
      ? primaryReading(compiled).bodySize
      : (localGoverningBodyRules(unit)?.seats?.value ?? null);
  const sitting = next.history.organizationParticipations
    .filter((participation) => {
      if (participation.organizationId !== organizationId) return false;
      const state = organizationParticipationStateAt(next, participation.id);
      return (
        state?.status === "active" &&
        (state.roleKind === roleKind ||
          (!mayor && state.roleKind === "leader:municipal-presiding-member"))
      );
    })
    .sort(
      (left, right) =>
        left.startedAt.localeCompare(right.startedAt) ||
        left.sequence - right.sequence,
    );
  const displaced = Math.max(0, sitting.length - (seatLimit ?? Infinity) + 1);
  const held = sitting.find(
    (participation) => participation.id === campaignHolder?.participationId,
  );
  const succeeded =
    seatLimit === null || displaced === 0
      ? []
      : held
        ? [
            held,
            ...sitting
              .filter((participation) => participation !== held)
              .slice(0, displaced - 1),
          ]
        : sitting.slice(0, displaced);
  {
    for (const participation of succeeded) {
      const state = organizationParticipationStateAt(next, participation.id);
      if (state?.status !== "active") continue;
      next = recordOrganizationParticipationState(next, {
        stableKey: `${participation.stableKey}:state:succeeded:${contest.id}`,
        participationId: participation.id,
        effectiveAt:
          effectiveAt > participation.startedAt
            ? effectiveAt
            : participation.startedAt,
        status: "ended",
        roleKind: state.roleKind,
        context: `Succeeded after the election of ${contest.electionDate}`,
        provenance: { kind: "simulated-event", eventId: outcomeEventId },
        supersedesStateId: state.id,
      });
    }
  }
  // Returning after time away: a new seat, so the earlier one stays as it was.
  if (
    next.history.organizationParticipations.some(
      (participation) => participation.stableKey === stableKey,
    )
  )
    stableKey = `${stableKey}:${contest.id}`;
  next = createOrganizationParticipation(next, {
    stableKey,
    personId: winnerPersonId,
    organizationId,
    startedAt: effectiveAt,
    kind: "leadership:municipal-office",
    roleKind,
    context:
      namedSeat?.label ??
      (mayor || campaignSeat === null
        ? `Elected ${contest.electionDate}`
        : `Elected ${contest.electionDate}, seat ${campaignSeat}`),
    provenance: { kind: "simulated-event", eventId: outcomeEventId },
  });
  next = scheduleLocalMemberAgendaIntakes(next);
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
  // CRUNCH46 CAMPAIGN: campaign work still on the calendar can no longer be
  // performed once the race is decided, so release it instead of leaving a
  // confirmed hold that blocks the life that carries on.
  for (const action of campaignActions(next, campaign.id)) {
    next = cancelScheduledActivity(next, action.scheduledActivityId);
  }
  const closedContest = requireElectionContest(next, campaign.contestId);
  // Rivals give their election-night speeches now; the person the player
  // controls gives theirs only by choosing to.
  for (const candidatePersonId of closedContest.candidatePersonIds) {
    if (
      next.control.kind === "person" &&
      next.control.personId === candidatePersonId
    )
      continue;
    next = recordElectionSpeech(next, closedContest.id, candidatePersonId);
  }
  if (stateExecutiveIdentityForOfficeKey(closedContest.office.officeKey)) {
    // A state executive office is not a legislative seat. The winner, whoever
    // it is, gets a dated term only through the admitted term facts and the
    // elected executive term chain; nothing is occupied on election night.
    next = planOrdinaryStateExecutiveTerm(next, closedContest.id);
  } else if (congressSeatIdentityForOfficeKey(closedContest.office.officeKey)) {
    // A seat in Congress is filled by congressional turnover on 3 January,
    // which reads this contest's result for the seat. Nothing is occupied on
    // election night, and no separate job is created beside the membership.
  } else if (
    status === "won" ||
    supportedLegislativeTermDates(
      closedContest.office.officeKey,
      closedContest.electionDate,
    )
  ) {
    next = seatTheWinner(
      next,
      campaign,
      result.resolvedAt,
      result.outcomeEventId,
      result.winnerPersonId,
    );
  }
  assertWorldIntegrity(next);
  return next;
}

/** Supplied canonical result receiver over the shared resolver and campaign closure. */
export function resolveCampaignElectionFromRecordedInput(
  world: World,
  input: ResolveElectionContestInput,
): World {
  const campaign = campaignForContest(world, input.contestId);
  if (!campaign || campaignState(world, campaign.id).status !== "active")
    throw new Error("A recorded campaign result requires its active campaign.");
  if (input.winnerPersonId === undefined || input.tallies === undefined)
    throw new Error(
      "The recorded-result receiver requires actual supplied results, not a forecast.",
    );
  const resolved = resolveElectionContest(world, input);
  return closeCampaignAfterElection(
    resolved,
    campaign,
    electionContestResult(resolved, campaign.contestId)!.id,
  );
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
  const national = linkedNationalUnitTransition(world, dueItem);
  if (national) return national;
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
      note: "Resolved from recorded canonical candidate support.",
    },
  });
  const result = electionContestResult(resolved, campaign.contestId)!;
  const closed = closeCampaignAfterElection(resolved, campaign, result.id);
  return {
    world: closed,
    status: "resolved",
    reasonKey: null,
    context: `The contest for ${requireElectionContest(closed, campaign.contestId).office.title} was decided.`,
    outcomeEventId: result.outcomeEventId,
  };
}

export function composeWorldTimeHandlers(
  additional?: FutureTransitionHandlerRegistry,
): FutureTransitionHandlerRegistry {
  // A campaign is one more thing in a life, not a mode the world switches into,
  // so an advance that carries the election handler must also carry the ordinary
  // life handlers: election day and a promised conversation can fall due on the
  // same day, and time refuses to step over a due item it has no handler for.
  const ordinary = composeExecutiveWorkHandlers(
    composeFutureTransitionHandlerRegistries(
      createNationalElectionTransitionRegistry(),
      createLegislativeTermTransitionRegistry(),
      createTransitTransitionRegistry((world, input, resolver) =>
        settlePublicResourcePayment(world, input, resolver),
      ),
      createTaxTransitionHandlerRegistry(),
      createProsecutionTransitionRegistry(),
      lifePaths2Handlers(),
      // D-11: the candidate's standing campaign hours, after the day job's.
      createFutureTransitionHandlerRegistry([], campaignRoutineHook()),
      // CRUNCH46 CRISIS: mortality windows, deaths and health reviews.
      createCrisisTransitionRegistry(),
      // G12: a saved clemency petition comes due on its own court date.
      createClemencyTransitionRegistry(),
      createFutureTransitionHandlerRegistry([
        [ELECTION_CONTEST_TRANSITION_KEY, campaignElectionTransitionHandler],
        // GOVERNING: state office matters, their deadlines and reports.
        ...stateGoverningHandlers(),
        ...governorTurnoverHandlers(),
        // A legislature and voters changing the governor's term limit.
        ...constitutionalReformHandlers(),
        // Congress and the states amending the U.S. Constitution.
        ...federalReformHandlers(),
        ...articleVHandlers(),
        ...presidentialTurnoverHandlers(),
        // Voters recalling a town official: petition, then recall election.
        ...recallHandlers(),
        // The player's town electing its council and mayor on its own.
        ...localElectionHandlers(),
        // Local councils enact on their own clocks. Money they appropriate
        // goes to their executive the same day, as a legislature's does.
        ...[
          // Scheduled council readings and executive/return deadlines.
          ...councilActHandlers(),
          // The Council of the District of Columbia sitting on its own.
          ...dcCouncilSittingHandlers(),
          // Admitted city and county councils use a separate quarterly game clock.
          ...localMemberAgendaHandlers(),
          // The player's town council meeting and voting on ordinances.
          ...localCouncilMeetingHandlers(),
        ],
        ...publicProgramHandlers(),
        // Residents ask for a paid public service, then take part in it.
        ...publicServiceHandlers(),
        // An enacted law's duty falling due on the bodies it covers.
        ...enactedDutyHandlers(),
        ...officeContinuityHandlers(),
        [
          POLITICAL_REFLECTION_TRANSITION_KEY,
          politicalReflectionTransitionHandler,
        ],
        // Spec 5: people credit or blame the officials behind a law that
        // reached them, and the official who answers for what happened to
        // them.
        [OFFICIAL_VIEW_TRANSITION_KEY, officialViewReflectionHandler],
        // ALIVE43 W2: a local chapter organizer acts while ordinary time passes.
        [CHAPTER_OUTREACH_TRANSITION_KEY, chapterOutreachTransitionHandler],
        // ALIVE43 W3: background public developments take their next step.
        [DEVELOPMENT_STEP_TRANSITION_KEY, developmentStepTransitionHandler],
        // PROSE B: an earlier answer may meet evidence once the world holds it.
        [
          CLAIM_CONTRADICTION_TRANSITION_KEY,
          claimContradictionTransitionHandler,
        ],
        // CRUNCH46 CHANGE: canonical macro history closes each month once.
        [MACRO_MONTHLY_STEP_KEY, macroMonthlyStepHandler],
        [HOUSEHOLD_LOAN_MONTH_KEY, householdLoanMonthHandler],
        // CRUNCH46 WORLD: party governing bodies meet and may change.
        [PARTY_BODY_REVIEW_TRANSITION_KEY, partyBodyReviewTransitionHandler],
        // MIGRATION: households leave town, newcomers arrive, waves step.
        [MIGRATION_REVIEW_TRANSITION_KEY, migrationReviewHandler],
        // PAYDAY: everyone with a recorded job is paid, every four weeks.
        ...paydayHandlers(),
        // RENT DAY: every renting household pays its landlord on the first.
        ...rentDayHandlers(),
        // CRUNCH46 CAMPAIGN: organizer outreach and weekly opponent evaluation.
        ...campaignLifeHandlers(),
      ]),
      // CRUNCH46 PRESS: newsroom desk, story steps, procedures, bookkeeping.
      createPressTransitionRegistry(),
      // CRUNCH47 PEOPLE: somebody answers a request to meet, in their own time.
      PEOPLE_CONTACT_HANDLERS,
      // 1A PEOPLE: residents take their own steps toward private goals.
      PEOPLE_GOAL_HANDLERS,
      // CRUNCH47 PEOPLE: a family two people agreed to, on the day it lands.
      peopleFamilyHandlers(),
      lifeTransitionHandlers(),
    ),
  );
  return additional
    ? composeFutureTransitionHandlerRegistries(additional, ordinary)
    : ordinary;
}

/** Compatibility name; all complete handler composition lives above. */
export function createCampaignElectionTransitionRegistry(): FutureTransitionHandlerRegistry {
  return composeWorldTimeHandlers();
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

/* -------------------------------------------------------------------------- */
/* D-11: the standing campaign routine on the ordinary clock                   */
/* -------------------------------------------------------------------------- */

function scheduledRoutineActivity(
  world: World,
  routineEventId: EntityId,
): ScheduledActivityRecord | undefined {
  return world.history.scheduledActivities.find(
    (activity) =>
      activity.sourceEntityIds.includes(routineEventId) &&
      scheduledActivityState(world, activity.id).status === "scheduled",
  );
}

/**
 * The clock hook for a candidate's standing campaign hours. It offers the
 * routine's sessions as routine windows, books each one as an ordinary
 * campaign action when the clock reaches it, and writes the session up when
 * its hours are done. A session something else already holds the time for is
 * not offered, and a session whose start has gone by is lost.
 */
let sharedCampaignRoutineHook: RoutineTimeHook | null = null;

/** One hook object, so registries composed together keep the hours once. */
function campaignRoutineHook(): RoutineTimeHook {
  sharedCampaignRoutineHook ??= createCampaignRoutineHook();
  return sharedCampaignRoutineHook;
}

export function createCampaignRoutineHook(): RoutineTimeHook {
  return {
    isAutoResolvableActivity(world, activityId) {
      if (world.control.kind !== "person") return false;
      const activity = world.history.scheduledActivities.find(
        (candidate) => candidate.id === activityId,
      );
      if (
        !activity ||
        activity.responsiblePersonId !== world.control.personId ||
        !routineIdOfActivity(world, activity.sourceEntityIds)
      )
        return false;
      const action = campaignActionForActivity(world, activityId);
      return Boolean(action) && !campaignActionResult(world, action!.id);
    },
    projectWindows(world, target) {
      if (world.control.kind !== "person") return [];
      const campaign = activeCampaignForCandidate(
        world,
        world.control.personId,
      );
      if (!campaign) return [];
      if (electionContestStatus(world, campaign.contestId) !== "pending")
        return [];
      const slots = campaignRoutineSlots(
        world,
        campaign,
        world.currentMoment,
        target,
      );
      const routineEventId = slots[0]?.eventId;
      const booked = routineEventId
        ? scheduledRoutineActivity(world, routineEventId)
        : undefined;
      const windows: RoutineWindow[] = [];
      if (booked) {
        const state = scheduledActivityState(world, booked.id);
        windows.push({
          relationshipId: routineEventId!,
          kind: "campaign",
          start: state.start,
          end: state.end,
          autoResolvable: true,
        });
      }
      for (const slot of slots) {
        if (
          booked &&
          compareSimulationMoments(
            slot.start,
            scheduledActivityState(world, booked.id).start,
          ) === 0
        )
          continue;
        if (jailTermOn(world, campaign.candidatePersonId, slot.start.date))
          continue;
        windows.push({
          relationshipId: slot.eventId,
          kind: "campaign",
          start: slot.start,
          end: slot.end,
          autoResolvable: true,
        });
      }
      return windows;
    },
    ensureScheduled(world, slot) {
      if (slot.kind !== "campaign" || world.control.kind !== "person")
        return world;
      if (scheduledRoutineActivity(world, slot.relationshipId)) return world;
      const campaign = activeCampaignForCandidate(
        world,
        world.control.personId,
      );
      const block = campaignRoutineBlockAt(
        world,
        slot.relationshipId,
        slot.start,
      );
      if (!campaign || !block) return world;
      if (compareSimulationMoments(slot.start, world.currentMoment) < 0)
        return world;
      const work = CAMPAIGN_ROUTINE_WORK[block.work];
      try {
        return scheduleCampaignAction(world, {
          campaignId: campaign.id,
          kind: block.work,
          plan: {
            start: slot.start,
            end: slot.end,
            location: {
              locationKey: work.locationKey,
              label: work.locationLabel,
              jurisdictionId: campaign.jurisdictionId,
            },
            title: work.title,
            summary: work.summary,
          },
          spend: null,
          routineEventId: slot.relationshipId,
        }).world;
      } catch (error) {
        // Something else holds the time, or the candidate cannot campaign
        // that day: the session is lost, not moved.
        if (
          error instanceof Error &&
          (error.message.startsWith("Scheduled activity conflicts with") ||
            error.message.includes("cannot campaign"))
        )
          return world;
        throw error;
      }
    },
    afterActivityCompleted(world, activityId) {
      const activity = world.history.scheduledActivities.find(
        (candidate) => candidate.id === activityId,
      );
      if (!activity || !routineIdOfActivity(world, activity.sourceEntityIds))
        return world;
      const action = campaignActionForActivity(world, activityId);
      if (!action || campaignActionResult(world, action.id)) return world;
      const campaign = campaignById(world, action.campaignId);
      if (!campaign || campaignState(world, campaign.id).status !== "active")
        return world;
      return recordCampaignActionOutcome(world, campaign, action);
    },
  };
}
