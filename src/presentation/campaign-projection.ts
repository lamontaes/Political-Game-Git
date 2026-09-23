import {
  legacyLegislativeSeat,
  legislativeTermDates,
  legislativeTermForRelationship,
} from "../simulation/legislative-office-terms";
import { workStatusAt } from "../simulation/life-queries";
import { proseDate } from "./prose-dates";
import {
  FILING_LEAD_DAYS,
  nextTownElection,
} from "../simulation/nationwide-world/town-election-calendar";

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
  electiveOfficesForJurisdiction,
  compareSimulationMoments,
  controlledCommitmentsBlockingActivityPerformance,
  daysUntilElection,
  electionContestResult,
  ensureCampaignOpponents,
  fileCampaign,
  lifePlaceByJurisdictionId,
  localGoverningBodyIdentityForOfficeKey,
  makeCurrencyCode,
  nextStateLegislativeElection,
  performCampaignAction,
  personName,
  requireElectionContest,
  scheduleCampaignAction,
  scheduledActivityState,
  simulationMomentAtLocalTime,
  stateExecutiveEntryStatus,
} from "../simulation";
import type {
  CampaignActionKind,
  CampaignActionStrategyRecord,
  CampaignRecord,
  CampaignStatus,
  CandidateTally,
  DistrictSeatBinding,
  ElectionContestRecord,
  ElectionContestResultRecord,
  ElectiveOfficeOption,
  EntityId,
  IsoDate,
  MoneyAmount,
  World,
} from "../simulation";
import { moneyText } from "../simulation/money-text";

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

/**
 * The campaign's sessions as a log a person can read.
 *
 * A Presque Isle race held about three hundred door-knocking sessions, and
 * the log printed every one with the same sentence, above the result. Sessions
 * with the same title and state are said once, with how many there were and
 * when. A session still waiting on somebody else's commitment stays on its own
 * line, because what it is waiting on is different each time.
 */
export interface CampaignSessionGroup {
  readonly key: string;
  readonly title: string;
  readonly count: number;
  readonly firstOn: string;
  readonly lastOn: string;
  readonly done: boolean;
  /** The recorded sentence when every session in the group said the same. */
  readonly outcome: string | null;
  readonly blockedBy: readonly string[];
}

export function groupCampaignSessions(
  sessions: readonly CampaignSessionRecord[],
): readonly CampaignSessionGroup[] {
  const groups = new Map<
    string,
    { rows: CampaignSessionRecord[]; blockedBy: readonly string[] }
  >();
  for (const session of sessions) {
    const key =
      session.blockedBy.length > 0
        ? `waiting:${session.id}`
        : `${session.done ? "done" : "planned"}:${session.title}`;
    const group = groups.get(key);
    if (group) group.rows.push(session);
    else groups.set(key, { rows: [session], blockedBy: session.blockedBy });
  }
  return [...groups.entries()]
    .map(([key, { rows, blockedBy }]) => {
      const dates = rows.map((row) => row.on).sort();
      const outcomes = new Set(rows.map((row) => row.outcome));
      return {
        key,
        title: rows[0]!.title,
        count: rows.length,
        firstOn: dates[0]!,
        lastOn: dates.at(-1)!,
        done: rows[0]!.done,
        outcome: outcomes.size === 1 ? rows[0]!.outcome : null,
        blockedBy,
      };
    })
    .sort(
      (left, right) =>
        left.lastOn.localeCompare(right.lastOn) ||
        left.key.localeCompare(right.key),
    );
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
  /**
   * The share as election night prints it, to one decimal place.
   *
   * Not `voteShare` rounded on its own. Rounding each share by itself let a
   * two-way race print 100.1 percent — walked in Chicago, where 71.95 and
   * 28.05 came out as 72.0 and 28.1, and again in Hannibal. Nothing is wrong
   * with the count; the game allocates whole basis points and they sum. It is
   * the last step, where a reader does the addition.
   */
  readonly displayedSharePercent: string;
}

/**
 * Rounds shares for display so that what is printed still adds up.
 *
 * Largest remainder: round every share down, then hand the leftover tenths to
 * whoever was cut by the most. That is the ordinary way an election night
 * table is made to total, and it moves at most one tenth on one candidate.
 */
export function displayedSharePercents(
  shares: readonly number[],
  decimals = 1,
): readonly string[] {
  const scale = 10 ** decimals;
  const exact = shares.map((share) => share * 100 * scale);
  const floors = exact.map((value) => Math.floor(value));
  const total = Math.round(exact.reduce((sum, value) => sum + value, 0));
  let remaining = total - floors.reduce((sum, value) => sum + value, 0);
  // Ties are real: a two-way race lands on exactly half a tenth each, which
  // is how Chicago produced 71.95 and 28.05. Break toward the larger share, so
  // the extra tenth goes to the leader and the same race always prints the
  // same table rather than depending on the sort's own order.
  const order = exact
    .map((value, index) => ({
      index,
      remainder: value - floors[index]!,
      value,
    }))
    .sort(
      (left, right) =>
        right.remainder - left.remainder ||
        right.value - left.value ||
        left.index - right.index,
    );
  const adjusted = [...floors];
  for (const entry of order) {
    if (remaining <= 0) break;
    adjusted[entry.index] = adjusted[entry.index]! + 1;
    remaining -= 1;
  }
  return adjusted.map((value) => (value / scale).toFixed(decimals));
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
 * Only a caller-selected established office is resolved. Numbered district
 * identity is bound at filing from an explicit Gazetteer record.
 */
function offeredOffice(
  jurisdictionId: EntityId,
  officeKey: string,
): ElectiveOfficeOption | null {
  return (
    electiveOfficesForJurisdiction(jurisdictionId).find(
      (option) => option.officeKey === officeKey,
    ) ?? null
  );
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
  geographyLabel?: string,
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
          title: "A fundraising session",
          summary:
            "Asking people who might give for something the campaign cannot do without.",
        }
      : kind === "outreach"
        ? {
            locationKey: "campaign-doors",
            label: "Somebody's street",
            title: "A session on the doors",
            summary:
              "Knocking, listening, and talking to whoever opens. One way to learn what people are hearing.",
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
      label: geographyLabel
        ? `${detail.label} — ${geographyLabel}`
        : detail.label,
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
  selectedOfficeKey: string | null = null,
): CampaignView {
  const person = world.people[personId];
  if (!person) throw new Error("This character is not in the world.");
  const candidateName = personName(person);
  const place = lifePlaceByJurisdictionId(person.homeJurisdictionId);
  const placeName = place?.displayName ?? null;
  const existing = campaignForCandidate(world, personId);

  // A race that is over does not close the office list: once the player picks
  // an office again, they are offered the filing for it, as before their
  // first race. Until they do, the last race's result stays on the screen.
  if (
    !existing ||
    (selectedOfficeKey !== null &&
      campaignState(world, existing.id).status !== "active")
  )
    return notYetFiled(
      world,
      personId,
      candidateName,
      placeName,
      selectedOfficeKey,
    );

  const campaign = existing;
  const state = campaignState(world, campaign.id);
  const contest = requireElectionContest(world, campaign.contestId);
  const option = offeredOffice(campaign.jurisdictionId, campaign.officeKey);
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
    tallies: (() => {
      const rows = result?.tallies ?? [];
      const printed = displayedSharePercents(rows.map((row) => row.voteShare));
      return rows.map((tally, index) => ({
        ...tally,
        candidateName: displayName(world, tally.candidatePersonId),
        isThisCandidate: tally.candidatePersonId === personId,
        displayedSharePercent: printed[index]!,
      }));
    })(),
    afterword:
      state.status === "won"
        ? ((term) =>
            term
              ? "alreadyHeld" in term && term.alreadyHeld
                ? `${candidateName} won and keeps the seat. The new term begins ${proseDate(term.startsAt)}.`
                : `${candidateName} won. The term begins ${proseDate(term.startsAt)}; until then the office is not theirs.`
              : `${candidateName} won.`)(
            wonSeatTerm(world, personId, contest, result) ??
              executiveTermStart(world, personId, contest.id),
          )
        : state.status === "lost"
          ? `${candidateName} lost. That is a thing that happened to them, not the end of them — tomorrow is still there.`
          : null,
  };
}

/**
 * When the won term begins, and whether the winner already sits in that seat.
 * The start comes from the term the win recorded, and only from the office's
 * rule when none was recorded. A member who won the seat they already hold
 * keeps it; the new term follows on from the old one.
 */
function wonSeatTerm(
  world: World,
  personId: EntityId,
  contest: ElectionContestRecord,
  result: ElectionContestResultRecord | null | undefined,
) {
  const seats = world.history.workRelationships.filter(
    (relationship) =>
      relationship.personId === personId &&
      relationship.kind === "employment:legislative-member",
  );
  const won = result
    ? seats.find(
        (relationship) =>
          relationship.provenance.kind === "simulated-event" &&
          relationship.provenance.eventId === result.outcomeEventId,
      )
    : undefined;
  const startsAt =
    (won && legislativeTermForRelationship(world, won.id)?.startsAt) ??
    legislativeTermDates(contest.office.officeKey, contest.electionDate)
      ?.startsAt;
  if (!startsAt) return null;
  const alreadyHeld = seats.some((relationship) => {
    if (relationship.id === won?.id || relationship.startedAt >= startsAt)
      return false;
    const held =
      legislativeTermForRelationship(world, relationship.id)?.contest ??
      legacyLegislativeSeat(world, relationship.id)?.contest;
    const status = workStatusAt(world, relationship.id);
    return (
      held?.office.officeKey === contest.office.officeKey &&
      (status?.status === "active" ||
        (status?.status === "ended" && status.effectiveAt >= startsAt))
    );
  });
  return { startsAt, alreadyHeld };
}

/**
 * How many seats the office has, when the world knows.
 *
 * The known branch is in-world civic fact and reads like one, because the pack
 * name is a real institution: "120 of them, as the Kentucky General Assembly
 * records it."
 *
 * The unknown branch used to fall through to the rule pack's own note, which is
 * addressed to whoever compiles the packs — "the formal chamber seat count was
 * carried from compiled research, but no instrument fixing it was separately
 * read for this pack. The unresolved formal count carries no numeric fallback."
 * A candidate deciding whether to run does not need the provenance of a number
 * they were not going to be shown either way, so the line is now absent rather
 * than replaced. Nothing about the gate changes: an unknown seat count is still
 * unknown, and still refuses to invent a figure.
 */
function officeAuthority(option: ElectiveOfficeOption): string | null {
  return option.seats.kind === "known"
    ? `${option.seats.value} of them, as ${option.recordedBy.packName} records it.`
    : null;
}

function notYetFiled(
  world: World,
  personId: EntityId,
  candidateName: string,
  placeName: string | null,
  selectedOfficeKey: string | null,
): CampaignView {
  const person = world.people[personId]!;
  const jurisdictionId = person.homeJurisdictionId;
  const options = electiveOfficesForJurisdiction(jurisdictionId);
  const option = selectedOfficeKey
    ? offeredOffice(jurisdictionId, selectedOfficeKey)
    : null;
  const assessments = (
    selectedOfficeKey
      ? [selectedOfficeKey]
      : options.map((item) => item.officeKey)
  ).map((officeKey) =>
    candidacyEligibility(world, {
      personId,
      jurisdictionId,
      officeKey,
      alreadyACandidate: activeCampaignForCandidate(world, personId) !== null,
    }),
  );
  const eligible = assessments.some((assessment) => assessment.eligible);
  const emptyTreasury: MoneyAmount = {
    minorUnits: 0,
    currency: CAMPAIGN_CURRENCY,
  };
  const base = {
    unavailableReason: null as string | null,
    candidateName,
    placeName,
    officeTitle:
      option?.office.title ??
      (options.map((item) => item.office.title).join(" or ") || null),
    officeAuthority: option
      ? officeAuthority(option)
      : /* Offices with no known seat count now contribute nothing, so they are
           dropped rather than joined in as empty strings. */
        [
          ...new Set(
            options
              .map(officeAuthority)
              .filter((line): line is string => line !== null),
          ),
        ].join(" ") || null,
    openQuestions: option
      ? [...option.unresolvedGaps]
      : [...new Set(options.flatMap((item) => item.unresolvedGaps))],
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
  if (!eligible) {
    return {
      ...base,
      phase: "unavailable",
      unavailableReason: (assessments.length
        ? assessments
        : [
            candidacyEligibility(world, {
              personId,
              jurisdictionId,
              officeKey: "",
              alreadyACandidate: false,
            }),
          ]
      )
        .flatMap((assessment) => assessment.blocks.map((block) => block.reason))
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
          ? "Spend a session on the phones"
          : kind === "outreach"
            ? "Spend a session on the doors"
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
  return moneyText(amount);
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
/**
 * The election a filing for this office stands in. A state legislative seat
 * is elected at the state's next regular legislative election, on the state's
 * own calendar. A town's own body is elected on the November general election
 * day where the state's municipal election law puts it there, and otherwise
 * on the short placeholder schedule until the town's calendar is read.
 */
export function campaignElectionDate(
  world: World,
  jurisdictionId: EntityId,
  officeKey: string,
) {
  const stateKey =
    lifePlaceByJurisdictionId(jurisdictionId)?.stateJurisdictionKey ?? null;
  const town = localGoverningBodyIdentityForOfficeKey(officeKey);
  if (town) {
    // The state's municipal election law where it fixes the day; otherwise
    // the marked placeholder in town-election-calendar.ts.
    const placeGeoid = town.unit.placeGeoid;
    return (
      (placeGeoid
        ? nextTownElection(town.unit.stateUsps, placeGeoid, world.currentDate)
            ?.electionDate
        : null) ?? addDays(world.currentDate, FILING_LEAD_DAYS)
    );
  }
  if (!stateKey) return addDays(world.currentDate, 28);
  return nextStateLegislativeElection(
    stateKey.replace(/^US-/, ""),
    world.currentDate,
  ).electionDate;
}

export function fileForOffice(
  world: World,
  personId: EntityId,
  districtBinding: DistrictSeatBinding | null = null,
  officeKey: string | null = null,
  /**
   * Scenario fixtures only: an authored election date in place of the
   * office's own calendar. Play never passes it.
   */
  authoredElectionDate: IsoDate | null = null,
): World {
  const person = world.people[personId];
  if (!person) throw new Error("This character is not in the world.");
  const jurisdictionId = person.homeJurisdictionId;
  if (!officeKey)
    throw new Error("Choose an established office before filing.");
  const option = offeredOffice(jurisdictionId, officeKey);
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
  const electionDate =
    authoredElectionDate ??
    campaignElectionDate(world, jurisdictionId, officeKey);
  return fileCampaign(opponents.world, {
    stableKey,
    candidatePersonId: personId,
    jurisdictionId,
    officeKey: option.officeKey,
    districtBinding,
    electionDate,
    rivalPersonIds: opponents.personIds,
    existingContestId: null,
    // What a committee is actually called: the candidate and the body they
    // want a seat in, rather than the game's own description of the seat. A
    // mayor sits in no body, so the committee is named for the office.
    committeeName:
      localGoverningBodyIdentityForOfficeKey(option.officeKey)?.seat ===
      "chief-executive"
        ? `${person.familyName} for ${option.office.title}`
        : `${person.familyName} for the ${option.chamberName}`,
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

export interface PlannedCampaignActionInput {
  readonly kind: CampaignActionKind;
  readonly spend: MoneyAmount | null;
  readonly strategy: CampaignActionStrategyRecord;
}

/**
 * Commits one explicit strategy choice through the campaign's existing action
 * writer. The caller supplies the already-projected structured choice rather
 * than free text, and this boundary rechecks the committee's current funds.
 */
export function spendPlannedCampaignAction(
  world: World,
  personId: EntityId,
  input: PlannedCampaignActionInput,
): World {
  const campaign = activeCampaignForCandidate(world, personId);
  if (!campaign) throw new Error("There is no active campaign to plan for.");
  const treasury = campaignTreasuryPosition(world, campaign)?.liquidBalance ?? {
    minorUnits: 0,
    currency: campaign.treasuryCurrency,
  };
  if (
    input.kind === "advertising" &&
    (!input.spend ||
      input.spend.currency !== treasury.currency ||
      input.spend.minorUnits > treasury.minorUnits)
  ) {
    throw new Error(
      "The committee no longer has enough money for that buy. Review the plan again.",
    );
  }
  if (input.kind !== "advertising" && input.spend !== null) {
    throw new Error("This campaign action does not spend committee money.");
  }
  const slot = freeSlotToday(world, personId, input.kind);
  if (!slot) {
    throw new Error(
      "The rest of today is already spoken for. Get on with the day and pick this up tomorrow.",
    );
  }
  const scheduled = scheduleCampaignAction(world, {
    campaignId: campaign.id,
    kind: input.kind,
    plan: planFor(
      world,
      input.kind,
      campaign.jurisdictionId,
      slot,
      input.strategy.geographyLabel,
    ),
    spend: input.spend,
    strategy: input.strategy,
  });
  const performed = performCampaignAction(scheduled.world, scheduled.action.id);
  if (performed === scheduled.world) return world;
  return performed;
}

/** How old this character is, for a surface that wants to explain a refusal. */
export function candidateAge(world: World, personId: EntityId): number {
  const person = world.people[personId];
  if (!person) throw new Error("This character is not in the world.");
  return ageOnDate(person.birthDate, world.currentDate);
}

/** When a won state executive term begins, where the game has dated it. */
function executiveTermStart(
  world: World,
  personId: EntityId,
  contestId: EntityId,
): { readonly startsAt: IsoDate } | null {
  const status = stateExecutiveEntryStatus(world, personId);
  return "startsAt" in status && status.contestId === contestId
    ? { startsAt: status.startsAt }
    : null;
}
