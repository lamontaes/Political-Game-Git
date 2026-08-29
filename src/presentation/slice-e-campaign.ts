import {
  addDays,
  campaignActionResult,
  campaignForCandidate,
  campaignState,
  campaignTreasuryPosition,
  compareSimulationMoments,
  controlledCommitmentsBlockingActivityPerformance,
  electionContestResult,
  fileCampaign,
  makeCurrencyCode,
  organizationProfileAt,
  performCampaignAction,
  requireElectionContest,
  scheduledActivityState,
  simulationMomentAtLocalTime,
} from "../simulation";
import type {
  CampaignActionKind,
  CampaignActionRecord,
  CampaignStatus,
  CandidateTally,
  EntityId,
  MoneyAmount,
  ScheduledActivityStateRecord,
  World,
} from "../simulation";
import type { RunDLiteFixture } from "./run-d-lite";

export interface CampaignActionProjection {
  readonly id: EntityId;
  readonly kind: CampaignActionKind;
  readonly title: string;
  readonly scheduledState: ScheduledActivityStateRecord;
  readonly resultId: EntityId | null;
  readonly raisedAmount: MoneyAmount | null;
  readonly blockingActivityTitles: readonly string[];
  readonly canPerform: boolean;
}

export interface CampaignTallyProjection extends CandidateTally {
  readonly candidateName: string;
}

export interface RunECampaignProjection {
  readonly phase: "not-filed" | CampaignStatus;
  readonly campaignId: EntityId | null;
  readonly campaignName: string | null;
  readonly candidateName: string;
  readonly rivalNames: readonly string[];
  readonly officeTitle: string;
  readonly electionDate: string;
  readonly filedAt: string | null;
  readonly endorsementSummary: string | null;
  readonly treasury: MoneyAmount;
  readonly fundraising: CampaignActionProjection | null;
  readonly outreach: CampaignActionProjection | null;
  readonly electionActivityId: EntityId | null;
  readonly electionActivityState: ScheduledActivityStateRecord | null;
  readonly observedSupportPercent: number | null;
  readonly observationMarginPercent: number | null;
  readonly feedbackSummary: string | null;
  readonly resultId: EntityId | null;
  readonly winnerPersonId: EntityId | null;
  readonly winnerName: string | null;
  readonly tallies: readonly CampaignTallyProjection[];
}

const PRIMARY_OFFICE = {
  officeKey: "council:weekend-playtest-seat",
  title: "Council District Seat",
  seatKey: "weekend-playtest",
  occupationClassification: "custom:local-legislator",
} as const;

function localMoment(world: World, date: string, hour: number, minute: number) {
  return simulationMomentAtLocalTime({
    date,
    minuteOfDay: hour * 60 + minute,
    timeZone: world.currentMoment.timeZone,
    preferredUtcOffsetMinutes: world.currentMoment.utcOffsetMinutes,
  });
}

function displayName(world: World, personId: EntityId): string {
  const person = world.people[personId];
  if (!person)
    throw new Error(`Campaign projection is missing person ${personId}.`);
  return `${person.givenName} ${person.familyName}`;
}

function quantityPercent(
  value: World["history"]["metricObservations"][number]["value"],
): number | null {
  if (value.kind !== "quantity" || value.quantity.unit !== "rate:share") {
    return null;
  }
  return (value.quantity.numerator / value.quantity.denominator) * 100;
}

function actionProjection(
  world: World,
  action: CampaignActionRecord,
): CampaignActionProjection {
  const result = campaignActionResult(world, action.id);
  const activity = world.history.scheduledActivities.find(
    (candidate) => candidate.id === action.scheduledActivityId,
  );
  if (!activity) throw new Error("Campaign action is missing its activity.");
  const scheduledState = scheduledActivityState(world, activity.id);
  const blockingActivityTitles =
    scheduledState.status === "scheduled" &&
    compareSimulationMoments(scheduledState.start, world.currentMoment) >= 0
      ? controlledCommitmentsBlockingActivityPerformance(world, activity.id)
          .map(
            (activityId) =>
              world.history.scheduledActivities.find(
                (candidate) => candidate.id === activityId,
              )?.title,
          )
          .filter((title): title is string => Boolean(title))
      : [];
  return {
    id: action.id,
    kind: action.kind,
    title: activity.title,
    scheduledState,
    resultId: result?.id ?? null,
    raisedAmount: result?.raisedAmount ? { ...result.raisedAmount } : null,
    blockingActivityTitles,
    canPerform:
      scheduledState.status === "scheduled" &&
      compareSimulationMoments(scheduledState.start, world.currentMoment) >=
        0 &&
      blockingActivityTitles.length === 0,
  };
}

export function fileRunECampaign(
  world: World,
  fixture: RunDLiteFixture,
): World {
  if (campaignForCandidate(world, fixture.playerPersonId)) {
    throw new Error("The controlled person already has a Slice E campaign.");
  }
  const candidate = world.people[fixture.playerPersonId];
  if (!candidate) throw new Error("Slice E fixture is missing its candidate.");
  const fundraisingDate = addDays(world.currentDate, 1);
  const outreachDate = addDays(world.currentDate, 2);
  const electionDate = addDays(world.currentDate, 4);
  return fileCampaign(world, {
    stableKey: "slice-e:primary-council-campaign",
    candidatePersonId: fixture.playerPersonId,
    rivalPersonIds: [fixture.dLite.reedPersonId],
    jurisdictionId: fixture.roomContext.jurisdictionId,
    office: PRIMARY_OFFICE,
    electionDate,
    existingContestId: null,
    campaignOrganizationName: `${candidate.familyName} for Council — playtest campaign`,
    donorPoolOrganizationName:
      "Community supporters — aggregate playtest source",
    staffPersonIds: [fixture.dLite.collinsPersonId],
    endorserPersonId: fixture.dLite.collinsPersonId,
    treasuryCurrency: makeCurrencyCode("USD"),
    fundraising: {
      start: localMoment(world, fundraisingDate, 9, 30),
      end: localMoment(world, fundraisingDate, 10, 30),
      location: {
        locationKey: "campaign-office-call-desk",
        label: "Campaign call desk",
        jurisdictionId: fixture.roomContext.jurisdictionId,
      },
      title: "Supporter fundraising calls",
      summary:
        "A focused hour asking an aggregate pool of fixture supporters for campaign resources.",
    },
    outreach: {
      start: localMoment(world, outreachDate, 13, 0),
      end: localMoment(world, outreachDate, 14, 15),
      location: {
        locationKey: "neighborhood-campaign-walk",
        label: "Neighborhood campaign walk",
        jurisdictionId: fixture.roomContext.jurisdictionId,
      },
      title: "Neighborhood voter outreach",
      summary:
        "A bounded neighborhood contact session without individual voter simulation.",
    },
    election: {
      start: localMoment(world, electionDate, 18, 30),
      end: localMoment(world, electionDate, 19, 15),
      location: {
        locationKey: "campaign-election-night",
        label: "Campaign election-night room",
        jurisdictionId: fixture.roomContext.jurisdictionId,
      },
      title: "Election night results",
      summary:
        "Reach the canonical election frontier and receive the persisted contest result.",
    },
  }).world;
}

export function performRunECampaignAction(
  world: World,
  actionId: EntityId,
): World {
  return performCampaignAction(world, actionId);
}

export function projectRunECampaign(
  world: World,
  fixture: RunDLiteFixture,
): RunECampaignProjection {
  const candidateName = displayName(world, fixture.playerPersonId);
  const campaign = campaignForCandidate(world, fixture.playerPersonId);
  if (!campaign) {
    return {
      phase: "not-filed",
      campaignId: null,
      campaignName: null,
      candidateName,
      rivalNames: [displayName(world, fixture.dLite.reedPersonId)],
      officeTitle: PRIMARY_OFFICE.title,
      electionDate: addDays(world.currentDate, 4),
      filedAt: null,
      endorsementSummary: null,
      treasury: { minorUnits: 0, currency: makeCurrencyCode("USD") },
      fundraising: null,
      outreach: null,
      electionActivityId: null,
      electionActivityState: null,
      observedSupportPercent: null,
      observationMarginPercent: null,
      feedbackSummary: null,
      resultId: null,
      winnerPersonId: null,
      winnerName: null,
      tallies: [],
    };
  }

  const contest = requireElectionContest(world, campaign.contestId);
  const state = campaignState(world, campaign.id);
  const campaignName = organizationProfileAt(
    world,
    campaign.organizationId,
  )?.name;
  if (!campaignName)
    throw new Error("Campaign organization profile is missing.");
  const actions = (world.history.campaignActions ?? []).filter(
    (action) => action.campaignId === campaign.id,
  );
  const fundraisingAction = actions.find(
    (action) => action.kind === "fundraising",
  );
  const outreachAction = actions.find((action) => action.kind === "outreach");
  if (!fundraisingAction || !outreachAction) {
    throw new Error("Campaign actions are incomplete.");
  }
  const actionResults = (world.history.campaignActionResults ?? [])
    .filter((result) =>
      actions.some((action) => action.id === result.campaignActionId),
    )
    .sort((left, right) => left.sequence - right.sequence);
  const latestResult = actionResults.at(-1);
  const observation = latestResult
    ? world.history.metricObservations.find(
        (candidate) => candidate.id === latestResult.observationId,
      )
    : undefined;
  const knowledge = latestResult
    ? world.history.knowledge.find(
        (candidate) =>
          candidate.id === latestResult.feedbackKnowledgeId &&
          candidate.personId === fixture.playerPersonId,
      )
    : undefined;
  const disclosedObservation = knowledge ? observation : undefined;
  const observedSupportPercent = disclosedObservation
    ? quantityPercent(disclosedObservation.value)
    : null;
  const observationMarginPercent =
    disclosedObservation?.uncertainty?.kind === "margin-of-error"
      ? quantityPercent(disclosedObservation.uncertainty.margin)
      : null;
  const treasury = campaignTreasuryPosition(world, campaign);
  if (!treasury) throw new Error("Campaign treasury position is missing.");
  const result = electionContestResult(world, campaign.contestId);
  const tallies = (result?.tallies ?? []).map((tally) => ({
    ...tally,
    candidateName: displayName(world, tally.candidatePersonId),
  }));
  return {
    phase: state.status,
    campaignId: campaign.id,
    campaignName,
    candidateName,
    rivalNames: contest.candidatePersonIds
      .filter((personId) => personId !== fixture.playerPersonId)
      .map((personId) => displayName(world, personId)),
    officeTitle: contest.office.title,
    electionDate: contest.electionDate,
    filedAt: campaign.filedAt,
    endorsementSummary: campaign.endorsementEventId
      ? (world.history.events.find(
          (event) => event.id === campaign.endorsementEventId,
        )?.summary ?? null)
      : null,
    treasury: { ...treasury.liquidBalance },
    fundraising: actionProjection(world, fundraisingAction),
    outreach: actionProjection(world, outreachAction),
    electionActivityId: campaign.electionActivityId,
    electionActivityState: scheduledActivityState(
      world,
      campaign.electionActivityId,
    ),
    observedSupportPercent,
    observationMarginPercent,
    feedbackSummary: knowledge?.believedSummary ?? null,
    resultId: result?.id ?? null,
    winnerPersonId: result?.winnerPersonId ?? null,
    winnerName: result ? displayName(world, result.winnerPersonId) : null,
    tallies,
  };
}
