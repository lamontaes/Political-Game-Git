import {
  activeCampaignForCandidate,
  addDays,
  ageOnDate,
  campaignActionResult,
  campaignActions,
  campaignForCandidate,
  campaignResultsFor,
  campaignState,
  campaignTreasuryPosition,
  candidacyEligibility,
  candidacyPackForJurisdiction,
  compareSimulationMoments,
  controlledCommitmentsBlockingActivityPerformance,
  daysUntilElection,
  electionContestResult,
  ensureCampaignOpponents,
  fileCampaign,
  lifePlaceByJurisdictionId,
  makeCurrencyCode,
  performCampaignAction,
  personName,
  requireElectionContest,
  scheduleCampaignAction,
  scheduledActivityState,
  simulationMomentAtLocalTime,
} from "../simulation";
import type {
  CampaignActionKind,
  CampaignRecord,
  CampaignStatus,
  CandidateTally,
  ElectiveOfficeOption,
  EntityId,
  MoneyAmount,
  World,
} from "../simulation";

/**
 * What a candidate can actually see.
 *
 * This module is the boundary the whole design leans on. Canonical support
 * exists, decides the election, and cannot be read from here: the simulation
 * barrel does not export the reader, so there is no import that would reach it
 * even by mistake. What this projects instead is the campaign's own field memo,
 * and it projects that only when the world records the candidate having been
 * told — a memo written but not yet read is not something the player knows.
 *
 * Nothing here is a meter. There is no percentage-to-win, no threshold, no
 * "support 38/50". There is a number somebody wrote down, a margin they
 * admitted to, and a date.
 */

/** The currency the accepted places transact in. Stated once, not guessed at. */
const CAMPAIGN_CURRENCY = makeCurrencyCode("USD");

/** How much of an afternoon a session takes. Long enough to cost something. */
const SESSION_MINUTES = 90;

export interface CampaignActionOffer {
  readonly kind: CampaignActionKind;
  readonly label: string;
  /** What it costs, in the player's words rather than in units. */
  readonly cost: string;
  /** Null when the offer is available; otherwise why it is not. */
  readonly unavailable: string | null;
  /** Money this offer would commit, for the surface to show before it is spent. */
  readonly spend: MoneyAmount | null;
}

export interface CampaignSessionRecord {
  readonly id: EntityId;
  readonly kind: CampaignActionKind;
  readonly title: string;
  readonly on: string;
  readonly done: boolean;
  /** The sentence the world recorded, not one this module composes. */
  readonly outcome: string | null;
  readonly raised: MoneyAmount | null;
  readonly spent: MoneyAmount | null;
  /** Somebody else's commitment is standing in the way of this one. */
  readonly blockedBy: readonly string[];
}

/** The field memo, and nothing stronger than a field memo. */
export interface CampaignReading {
  readonly percent: number;
  readonly marginPercent: number | null;
  /** The sentence the candidate was actually told. */
  readonly summary: string;
  readonly on: string;
}

export interface CampaignTallyLine extends CandidateTally {
  readonly candidateName: string;
  readonly isThisCandidate: boolean;
}

export interface CampaignView {
  readonly phase: "unavailable" | "can-file" | CampaignStatus;
  /** Said plainly when there is nothing to offer. Never an empty screen. */
  readonly unavailableReason: string | null;
  readonly candidateName: string;
  readonly placeName: string | null;
  /** The office on offer, or the one being stood for. */
  readonly officeTitle: string | null;
  /** How the game knows this office exists at all. */
  readonly officeAuthority: string | null;
  /** What the game admits it does not know about standing here. */
  readonly openQuestions: readonly string[];
  readonly campaignId: EntityId | null;
  readonly committeeName: string | null;
  readonly opponentNames: readonly string[];
  readonly electionDate: string | null;
  readonly daysLeft: number | null;
  readonly treasury: MoneyAmount;
  readonly offers: readonly CampaignActionOffer[];
  readonly sessions: readonly CampaignSessionRecord[];
  readonly reading: CampaignReading | null;
  readonly tallies: readonly CampaignTallyLine[];
  /** After the election: what happened, and that life carries on. */
  readonly afterword: string | null;
}

/* -------------------------------------------------------------------------- */

function displayName(world: World, personId: EntityId): string {
  const person = world.people[personId];
  if (!person) throw new Error(`The campaign is missing person ${personId}.`);
  return personName(person);
}

function quantityPercent(value: {
  readonly kind: string;
  readonly quantity?: {
    readonly numerator: number;
    readonly denominator: number;
    readonly unit: string;
  };
}): number | null {
  if (value.kind !== "quantity" || !value.quantity) return null;
  if (value.quantity.unit !== "rate:share") return null;
  return (value.quantity.numerator / value.quantity.denominator) * 100;
}

/**
 * The offer to run.
 *
 * Only one office is offered even where a pack establishes two chambers,
 * because the game has no district geography and therefore no way to tell one
 * seat from another. Which chamber it is remains true and cited; which seat it
 * is remains an open question this view states rather than invents.
 */
function offeredOffice(
  world: World,
  jurisdictionId: EntityId,
): ElectiveOfficeOption | null {
  return candidacyPackForJurisdiction(jurisdictionId)?.offices[0] ?? null;
}

/** Nothing gets booked past the evening; a campaign is not a night shift. */
const LATEST_SESSION_END = 21 * 60;

/** Long enough after now to actually get there. */
const SOONEST_START_OFFSET = 15;

/**
 * When this afternoon could actually happen.
 *
 * A commitment the character already has stops them starting something new
 * after it — that is the time-and-attention rule, and it is the right rule. So
 * this looks for room *before* the next thing on the calendar rather than
 * booking on top of it and discovering the refusal afterwards. Null means today
 * is spoken for, which is a true and useful thing to be told.
 */
function freeSlotToday(
  world: World,
  personId: EntityId,
  kind: CampaignActionKind,
): { readonly startMinute: number; readonly endMinute: number } | null {
  const preferred = kind === "fundraising" ? 10 * 60 : 14 * 60;
  const startMinute = Math.max(
    world.currentMoment.minuteOfDay + SOONEST_START_OFFSET,
    preferred,
  );
  const endMinute = startMinute + SESSION_MINUTES;
  if (endMinute > LATEST_SESSION_END) return null;

  // Only a commitment that has not finished yet can get in the way, and only
  // for something starting after it begins.
  const nextCommitment = world.history.scheduledActivities
    .filter((activity) => activity.participantPersonIds.includes(personId))
    .map((activity) => scheduledActivityState(world, activity.id))
    .filter(
      (state) =>
        state.status === "scheduled" &&
        compareSimulationMoments(state.end, world.currentMoment) > 0,
    )
    .map((state) => state.start)
    .sort((left, right) => compareSimulationMoments(left, right))
    .at(0);
  if (
    nextCommitment &&
    nextCommitment.date === world.currentDate &&
    endMinute > nextCommitment.minuteOfDay
  ) {
    return null;
  }
  if (nextCommitment && nextCommitment.date < world.currentDate) return null;
  return { startMinute, endMinute };
}

function planFor(
  world: World,
  kind: CampaignActionKind,
  jurisdictionId: EntityId,
  slot: { readonly startMinute: number; readonly endMinute: number },
) {
  const date = world.currentDate;
  const local = (minuteOfDay: number) =>
    simulationMomentAtLocalTime({
      date,
      minuteOfDay,
      timeZone: world.currentMoment.timeZone,
      preferredUtcOffsetMinutes: world.currentMoment.utcOffsetMinutes,
    });
  const detail =
    kind === "fundraising"
      ? {
          locationKey: "campaign-call-desk",
          label: "The campaign's call desk",
          title: "An afternoon on the phones",
          summary:
            "Asking people who might give for something the campaign cannot do without.",
        }
      : kind === "outreach"
        ? {
            locationKey: "campaign-doors",
            label: "Somebody's street",
            title: "An afternoon on the doors",
            summary:
              "Knocking, and talking to whoever opens. Slow, and the only thing that changes minds.",
          }
        : {
            locationKey: "campaign-office",
            label: "The campaign office",
            title: "Placing an advertising buy",
            summary:
              "Reaching people nobody had the hours to meet, with money the campaign already raised.",
          };
  return {
    start: local(slot.startMinute),
    end: local(slot.endMinute),
    location: {
      locationKey: detail.locationKey,
      label: detail.label,
      jurisdictionId,
    },
    title: detail.title,
    summary: detail.summary,
  };
}

/** What an advertising buy costs. Half of what is there, so it is a choice. */
export function advertisingBuyFor(treasury: MoneyAmount): MoneyAmount {
  return {
    minorUnits: Math.max(1, Math.floor(treasury.minorUnits / 2)),
    currency: treasury.currency,
  };
}

/* -------------------------------------------------------------------------- */

export function projectCampaign(
  world: World,
  personId: EntityId,
): CampaignView {
  const person = world.people[personId];
  if (!person) throw new Error("This character is not in the world.");
  const candidateName = personName(person);
  const place = lifePlaceByJurisdictionId(person.homeJurisdictionId);
  const placeName = place?.displayName ?? null;
  const existing = campaignForCandidate(world, personId);

  if (!existing) return notYetFiled(world, personId, candidateName, placeName);

  const campaign = existing;
  const state = campaignState(world, campaign.id);
  const contest = requireElectionContest(world, campaign.contestId);
  const option = offeredOffice(world, campaign.jurisdictionId);
  const treasury = campaignTreasuryPosition(world, campaign)?.liquidBalance ?? {
    minorUnits: 0,
    currency: campaign.treasuryCurrency,
  };
  const committee =
    world.history.organizationProfiles
      .filter((profile) => profile.organizationId === campaign.organizationId)
      .at(-1)?.name ?? null;
  const result = electionContestResult(world, campaign.contestId);

  return {
    phase: state.status,
    unavailableReason: null,
    candidateName,
    placeName,
    officeTitle: contest.office.title,
    officeAuthority: option ? officeAuthority(option) : null,
    openQuestions: option ? [...option.unresolvedGaps] : [],
    campaignId: campaign.id,
    committeeName: committee,
    opponentNames: contest.candidatePersonIds
      .filter((candidate) => candidate !== personId)
      .map((candidate) => displayName(world, candidate)),
    electionDate: contest.electionDate,
    daysLeft:
      state.status === "active" ? daysUntilElection(world, campaign) : null,
    treasury,
    offers:
      state.status === "active" ? offersFor(world, campaign, treasury) : [],
    sessions: sessionsFor(world, campaign),
    reading: latestReading(world, campaign),
    tallies: (result?.tallies ?? []).map((tally) => ({
      ...tally,
      candidateName: displayName(world, tally.candidatePersonId),
      isThisCandidate: tally.candidatePersonId === personId,
    })),
    afterword:
      state.status === "won"
        ? `${candidateName} won. The seat is theirs, and so is everything that came before it.`
        : state.status === "lost"
          ? `${candidateName} lost. That is a thing that happened to them, not the end of them — tomorrow is still there.`
          : null,
  };
}

function officeAuthority(option: ElectiveOfficeOption): string {
  return `${option.seats} of them, as ${option.recordedBy.packName} records it.`;
}

function notYetFiled(
  world: World,
  personId: EntityId,
  candidateName: string,
  placeName: string | null,
): CampaignView {
  const person = world.people[personId]!;
  const jurisdictionId = person.homeJurisdictionId;
  const option = offeredOffice(world, jurisdictionId);
  const eligibility = candidacyEligibility(world, {
    personId,
    jurisdictionId,
    officeKey: option?.officeKey ?? "",
    alreadyACandidate: activeCampaignForCandidate(world, personId) !== null,
  });
  const emptyTreasury: MoneyAmount = {
    minorUnits: 0,
    currency: CAMPAIGN_CURRENCY,
  };
  const base = {
    unavailableReason: null as string | null,
    candidateName,
    placeName,
    officeTitle: option?.office.title ?? null,
    officeAuthority: option ? officeAuthority(option) : null,
    openQuestions: option ? [...option.unresolvedGaps] : [],
    campaignId: null,
    committeeName: null,
    opponentNames: [] as readonly string[],
    electionDate: null,
    daysLeft: null,
    treasury: emptyTreasury,
    offers: [] as readonly CampaignActionOffer[],
    sessions: [] as readonly CampaignSessionRecord[],
    reading: null,
    tallies: [] as readonly CampaignTallyLine[],
    afterword: null,
  };
  if (!eligibility.eligible) {
    return {
      ...base,
      phase: "unavailable",
      unavailableReason: eligibility.blocks
        .map((block) => block.reason)
        .join(" "),
    };
  }
  return { ...base, phase: "can-file" };
}

function offersFor(
  world: World,
  campaign: CampaignRecord,
  treasury: MoneyAmount,
): readonly CampaignActionOffer[] {
  const daysLeft = daysUntilElection(world, campaign);
  const closed = daysLeft <= 0;
  const buy = advertisingBuyFor(treasury);
  return (["fundraising", "outreach", "advertising"] as const).map((kind) => {
    const spend = kind === "advertising" ? buy : null;
    const unavailable = closed
      ? "Election day has arrived. There is nothing left to do but wait for the count."
      : kind === "advertising" && treasury.minorUnits <= 0
        ? "There is nothing in the account to spend."
        : freeSlotToday(world, campaign.candidatePersonId, kind) === null
          ? "The rest of today is already spoken for. Get on with the day and pick this up tomorrow."
          : null;
    return {
      kind,
      label:
        kind === "fundraising"
          ? "Spend the afternoon on the phones"
          : kind === "outreach"
            ? "Spend the afternoon on the doors"
            : "Place an advertising buy",
      cost:
        kind === "advertising"
          ? `An hour and a half, and ${money(buy)} of what the committee has raised.`
          : "An hour and a half of a day that has other things in it.",
      unavailable,
      spend,
    };
  });
}

function money(amount: MoneyAmount): string {
  return `${amount.currency} ${(amount.minorUnits / 100).toFixed(2)}`;
}

function sessionsFor(
  world: World,
  campaign: CampaignRecord,
): readonly CampaignSessionRecord[] {
  return campaignActions(world, campaign.id).map((action) => {
    const activityState = scheduledActivityState(
      world,
      action.scheduledActivityId,
    );
    const activity = world.history.scheduledActivities.find(
      (candidate) => candidate.id === action.scheduledActivityId,
    )!;
    const result = campaignActionResult(world, action.id);
    const outcomeEvent = result
      ? world.history.events.find((event) => event.id === result.outcomeEventId)
      : undefined;
    const blockedBy =
      activityState.status === "scheduled" &&
      compareSimulationMoments(activityState.start, world.currentMoment) >= 0
        ? controlledCommitmentsBlockingActivityPerformance(
            world,
            action.scheduledActivityId,
          )
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
      on: activityState.start.date,
      done: result !== null,
      outcome: outcomeEvent?.summary ?? null,
      raised: result?.raisedAmount ?? null,
      spent: result?.spentAmount ?? null,
      blockedBy,
    };
  });
}

/**
 * The most recent thing the candidate was actually told.
 *
 * Gated on the knowledge record, not on the observation. A memo the world wrote
 * but has not recorded anybody reading is not something the player knows, and
 * the difference matters on the day somebody else reads it first.
 */
function latestReading(
  world: World,
  campaign: CampaignRecord,
): CampaignReading | null {
  const result = campaignResultsFor(world, campaign.id).at(-1);
  if (!result) return null;
  const knowledge = world.history.knowledge.find(
    (candidate) =>
      candidate.id === result.feedbackKnowledgeId &&
      candidate.personId === campaign.candidatePersonId,
  );
  if (!knowledge) return null;
  const observation = world.history.metricObservations.find(
    (candidate) => candidate.id === result.observationId,
  );
  if (!observation) return null;
  const percent = quantityPercent(observation.value);
  if (percent === null) return null;
  return {
    percent,
    marginPercent:
      observation.uncertainty?.kind === "margin-of-error"
        ? quantityPercent(observation.uncertainty.margin)
        : null,
    summary: knowledge.believedSummary,
    on: result.completedAt,
  };
}

/* -------------------------------------------------------------------------- */
/* Commands                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Putting a name on the ballot.
 *
 * The opponent is materialized first and separately, because they are a person
 * in this world afterwards rather than a fixture belonging to a screen.
 */
export function fileForOffice(world: World, personId: EntityId): World {
  const person = world.people[personId];
  if (!person) throw new Error("This character is not in the world.");
  const jurisdictionId = person.homeJurisdictionId;
  const option = offeredOffice(world, jurisdictionId);
  if (!option) {
    throw new Error("There is no office here the game has read the rules for.");
  }
  const stableKey = `candidacy:${personId}:${world.currentDate}`;
  const opponents = ensureCampaignOpponents(world, {
    stableKey,
    jurisdictionId,
    count: 1,
    excludePersonIds: [personId],
  });
  // Long enough to have to choose what to spend the weeks on, short enough
  // that the election is a thing this life reaches rather than a horizon.
  const electionDate = addDays(world.currentDate, 28);
  return fileCampaign(opponents.world, {
    stableKey,
    candidatePersonId: personId,
    jurisdictionId,
    officeKey: option.officeKey,
    electionDate,
    rivalPersonIds: opponents.personIds,
    existingContestId: null,
    // What a committee is actually called: the candidate and the body they
    // want a seat in, rather than the game's own description of the seat.
    committeeName: `${person.familyName} for the ${option.chamberName}`,
    donorPoolName: "People who might give",
    advertisingVendorName: "Whoever sells the advertising",
    staffPersonIds: [],
    treasuryCurrency: CAMPAIGN_CURRENCY,
  }).world;
}

/**
 * An afternoon of campaign work, booked and then done.
 *
 * Booking and doing are one step here because a player choosing "spend the
 * afternoon on the doors" has already made both decisions. The two stay
 * separate underneath, so the calendar records a real commitment and something
 * the character already promised somebody can still get in the way.
 */
export function spendAnAfternoon(
  world: World,
  personId: EntityId,
  kind: CampaignActionKind,
): World {
  const campaign = activeCampaignForCandidate(world, personId);
  if (!campaign) throw new Error("There is no campaign to work on.");
  const treasury = campaignTreasuryPosition(world, campaign)?.liquidBalance ?? {
    minorUnits: 0,
    currency: campaign.treasuryCurrency,
  };
  if (kind === "advertising" && treasury.minorUnits <= 0) {
    throw new Error("There is nothing in the account to spend.");
  }
  const slot = freeSlotToday(world, personId, kind);
  if (!slot) {
    throw new Error(
      "The rest of today is already spoken for. Get on with the day and pick this up tomorrow.",
    );
  }
  const scheduled = scheduleCampaignAction(world, {
    campaignId: campaign.id,
    kind,
    plan: planFor(world, kind, campaign.jurisdictionId, slot),
    spend: kind === "advertising" ? advertisingBuyFor(treasury) : null,
  });
  const performed = performCampaignAction(scheduled.world, scheduled.action.id);
  // Booking and doing are one step for the player, so a session that turns out
  // not to be doable must not leave a dead entry behind on the calendar. The
  // booking is discarded and the original world handed back untouched.
  if (performed === scheduled.world) return world;
  return performed;
}

/** How old this character is, for a surface that wants to explain a refusal. */
export function candidateAge(world: World, personId: EntityId): number {
  const person = world.people[personId];
  if (!person) throw new Error("This character is not in the world.");
  return ageOnDate(person.birthDate, world.currentDate);
}
