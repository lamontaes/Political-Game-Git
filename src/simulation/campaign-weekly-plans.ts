import { jailTermOn } from "./justice/jail-terms";
import {
  activeCampaignForCandidate,
  campaignActionById,
  campaignActionResult,
  campaignResultsFor,
  campaignTreasuryPosition,
  campaignWeeklyPlanRecords,
} from "./campaign-queries";
import {
  CAMPAIGN_LIFE_CATALOG_VERSION,
  type CampaignAdChannel,
  type CampaignPlanEmphasis,
  type CampaignWeeklyAdvertising,
  type CampaignWeeklyAllocation,
  type CampaignWeeklyPlanRecord,
  type CampaignWeeklyRefusal,
} from "./campaign-life-types";
import { performCampaignAction, scheduleCampaignAction } from "./campaigns";
import {
  addDays,
  addSimulationMinutes,
  compareSimulationMoments,
  simulationMomentAtLocalTime,
} from "./dates";
import {
  electionContestStatus,
  requireElectionContest,
} from "./election-contests";
import { createStableId } from "./ids";
import { workStatusAt } from "./life-queries";
import { personName } from "./people";
import {
  cancelScheduledActivity,
  controlledCommitmentsBlockingActivityPerformance,
  scheduledActivityState,
} from "./time-work";
import type {
  CampaignActionKind,
  CampaignActionRecord,
  CampaignActionStrategyRecord,
  CampaignRecord,
  EntityId,
  IsoDate,
  MoneyAmount,
  SimulationMoment,
  World,
} from "./types";
import { assertWorldIntegrity, recordWorldEvent } from "./world";
import { moneyText } from "./money-text";

export type {
  CampaignAdChannel,
  CampaignPlanEmphasis,
  CampaignWeeklyAdvertising,
  CampaignWeeklyAllocation,
  CampaignWeeklyPlanRecord,
  CampaignWeeklyRefusal,
} from "./campaign-life-types";

/**
 * A campaign week, planned once and then lived.
 *
 * The per-action strategy conversation decides one afternoon. This decides a
 * week: which emphasis the staff (or the candidate alone) proposes, how many
 * field shifts, call sessions and advertising buys go on the calendar, which
 * channel and which represented geography the buys use, and how much each buy
 * costs. Committing it books ordinary campaign actions through the accepted
 * `scheduleCampaignAction` writer on concrete free slots of the week, so the
 * hours are real hours and something else the character promised can still get
 * in the way. Money moves only when a buy is actually signed off through
 * `performCampaignAction`; nothing about committing a plan touches the
 * treasury or canonical support.
 *
 * A plan the committee cannot carry out is not an exception the player never
 * sees. It is recorded as a refused plan with the reason and the balance the
 * decision was made against, and the treasury, the calendar and support are
 * left exactly as they were. Mistakes of input — a stale proposal, a channel
 * that cannot reach the chosen geography, a negative allocation — are refused
 * by throwing and write nothing.
 *
 * Nothing here estimates reach or a probability of winning. The channel
 * catalog below is an authored game limit on how many buys a week can carry and
 * what the smallest buy is; it is not a claim about any real media market.
 */

/* -------------------------------------------------------------------------- */
/* Authored catalogs                                                           */
/* -------------------------------------------------------------------------- */

export type CampaignGeographyKind = "jurisdiction" | "district";

export interface CampaignAdChannelEntry {
  readonly channel: CampaignAdChannel;
  readonly label: string;
  /** Authored weekly capacity; a game default, not a market fact. */
  readonly maxBuysPerWeek: number;
  /** Authored smallest buy in the committee currency's minor units. */
  readonly minimumBuyMinorUnits: number;
  readonly geographyKinds: readonly CampaignGeographyKind[];
  /** Reach is not modeled; a surface must say so rather than invent it. */
  readonly reach: "not-modeled";
  readonly basis: "authored";
}

export const CAMPAIGN_AD_CHANNELS: readonly CampaignAdChannelEntry[] = [
  {
    channel: "digital",
    label: "Digital advertising",
    maxBuysPerWeek: 3,
    minimumBuyMinorUnits: 5_000,
    geographyKinds: ["jurisdiction", "district"],
    reach: "not-modeled",
    basis: "authored",
  },
  {
    channel: "radio",
    label: "Radio spots",
    maxBuysPerWeek: 2,
    minimumBuyMinorUnits: 20_000,
    geographyKinds: ["jurisdiction"],
    reach: "not-modeled",
    basis: "authored",
  },
  {
    channel: "print",
    label: "Print advertising",
    maxBuysPerWeek: 2,
    minimumBuyMinorUnits: 10_000,
    geographyKinds: ["jurisdiction", "district"],
    reach: "not-modeled",
    basis: "authored",
  },
  {
    channel: "mail",
    label: "Direct mail",
    maxBuysPerWeek: 1,
    minimumBuyMinorUnits: 25_000,
    geographyKinds: ["jurisdiction", "district"],
    reach: "not-modeled",
    basis: "authored",
  },
];

export interface CampaignWeeklySessionEntry {
  readonly kind: CampaignActionKind;
  readonly label: string;
  readonly minutes: number;
  readonly locationKey: string;
  readonly locationLabel: string;
  readonly title: string;
  readonly summary: string;
  readonly basis: "authored";
}

/** Authored game-default session lengths and venues for a planned week. */
export const CAMPAIGN_WEEKLY_SESSIONS: Readonly<
  Record<CampaignActionKind, CampaignWeeklySessionEntry>
> = {
  outreach: {
    kind: "outreach",
    label: "Field shift",
    minutes: 90,
    locationKey: "campaign-doors",
    locationLabel: "Somebody's street",
    title: "A field shift",
    summary:
      "A planned shift on the doors, talking to whoever answers. One way to learn what people are hearing.",
    basis: "authored",
  },
  fundraising: {
    kind: "fundraising",
    label: "Fundraising call session",
    minutes: 60,
    locationKey: "campaign-call-desk",
    locationLabel: "The campaign's call desk",
    title: "A fundraising call session",
    summary:
      "A planned hour on the phones asking people who might give for something the campaign cannot do without.",
    basis: "authored",
  },
  advertising: {
    kind: "advertising",
    label: "Advertising sign-off",
    minutes: 30,
    locationKey: "campaign-office",
    locationLabel: "The campaign office",
    title: "Signing off an advertising buy",
    summary:
      "Approving one planned buy from the week's advertising plan, with money the campaign already raised.",
    basis: "authored",
  },
};

/** Local start times searched each day, in order. Authored game defaults. */
export const CAMPAIGN_WEEKLY_SLOT_MINUTES: readonly number[] = [
  10 * 60,
  14 * 60,
  18 * 60,
];

/** The most sessions one weekly plan may book. */
export const CAMPAIGN_WEEKLY_MAX_SESSIONS = 7;

const OPPONENT_EVENT_LOOKBACK_DAYS = 14;

const EMPHASIS_KIND: Readonly<
  Record<CampaignPlanEmphasis, CampaignActionKind>
> = {
  field: "outreach",
  communications: "advertising",
  relationships: "fundraising",
};

const EMPHASIS_LABEL: Readonly<Record<CampaignPlanEmphasis, string>> = {
  field: "A field week",
  communications: "A communications week",
  relationships: "A relationships and fundraising week",
};

/* -------------------------------------------------------------------------- */
/* Views                                                                       */
/* -------------------------------------------------------------------------- */

export interface CampaignWeekGeographyChoice {
  readonly key: string;
  readonly label: string;
  readonly kind: CampaignGeographyKind;
}

export interface CampaignWeekChannelChoice {
  readonly channel: CampaignAdChannel;
  readonly label: string;
  readonly maxBuysPerWeek: number;
  readonly minimumBuy: MoneyAmount;
  readonly geographyKinds: readonly CampaignGeographyKind[];
  readonly reach: "not-modeled";
  /** Whether the treasury covers one minimum buy today. */
  readonly affordable: boolean;
}

export interface CampaignWeekPlanOption {
  readonly emphasis: CampaignPlanEmphasis;
  readonly label: string;
  readonly suggestedAllocation: CampaignWeeklyAllocation;
  readonly suggestedAdvertising: CampaignWeeklyAdvertising | null;
  /** Built only from recorded facts the candidate has. */
  readonly reasons: readonly string[];
}

export interface CampaignWeekSessionView {
  readonly actionId: EntityId;
  readonly kind: CampaignActionKind;
  readonly label: string;
  readonly start: SimulationMoment;
  readonly end: SimulationMoment;
  readonly plannedSpend: MoneyAmount | null;
  readonly status: "scheduled" | "completed" | "cancelled";
  /**
   * True when the session is still on the calendar but its start has already
   * gone by, so it can no longer be done as planned; it can only be let go.
   */
  readonly passed: boolean;
}

export interface CampaignCommittedWeekView {
  readonly planId: EntityId;
  readonly emphasis: CampaignPlanEmphasis;
  readonly allocation: CampaignWeeklyAllocation;
  readonly advertising: CampaignWeeklyAdvertising | null;
  readonly sessions: readonly CampaignWeekSessionView[];
  /** The next session that can still be done, in time order, or null. */
  readonly nextActionId: EntityId | null;
  /**
   * The session the clock is stopped at or already past, still on the
   * calendar: the player either does it (when it has not begun) or lets it go
   * through `releaseCampaignWeekSession`. Null when nothing is holding time.
   */
  readonly holdingActionId: EntityId | null;
}

export interface CampaignWeekRefusalView {
  readonly planId: EntityId;
  readonly refusal: CampaignWeeklyRefusal;
  readonly explanation: string;
  readonly decidedOn: IsoDate;
  readonly treasuryAtDecision: MoneyAmount;
}

export interface CampaignWeekView {
  readonly campaignId: EntityId;
  readonly weekStart: IsoDate;
  readonly weekEnd: IsoDate;
  /** True when the recorded election date is today or earlier. */
  readonly electionPassed: boolean;
  readonly daysLeft: number;
  readonly proposerPersonId: EntityId | null;
  readonly proposerName: string;
  readonly attribution: string;
  /** Staff proposal text; null on the no-staff route. */
  readonly proposal: string | null;
  readonly proposedEmphasis: CampaignPlanEmphasis | null;
  readonly treasury: MoneyAmount;
  readonly options: readonly CampaignWeekPlanOption[];
  readonly geographyChoices: readonly CampaignWeekGeographyChoice[];
  readonly channels: readonly CampaignWeekChannelChoice[];
  readonly reachNote: string;
  readonly maxSessions: number;
  readonly committed: CampaignCommittedWeekView | null;
  readonly lastRefusal: CampaignWeekRefusalView | null;
  /** Pass back unchanged on commit; a mismatch refuses a stale proposal. */
  readonly revision: string;
}

export interface CommitCampaignWeekInput {
  readonly campaignId: EntityId;
  readonly weekStart: IsoDate;
  readonly proposerPersonId: EntityId | null;
  readonly revision: string;
  readonly emphasis: CampaignPlanEmphasis;
  readonly allocation: CampaignWeeklyAllocation;
  readonly advertising: {
    readonly channel: CampaignAdChannel;
    readonly geographyKey: string;
    readonly amount: MoneyAmount;
  } | null;
}

/* -------------------------------------------------------------------------- */
/* Shared context                                                              */
/* -------------------------------------------------------------------------- */

function money(amount: MoneyAmount): string {
  return moneyText(amount);
}

function activeStaff(
  world: World,
  campaign: CampaignRecord,
): readonly EntityId[] {
  return campaign.staffWorkRelationshipIds.flatMap((workRelationshipId) => {
    const work = world.history.workRelationships.find(
      (candidate) => candidate.id === workRelationshipId,
    );
    return work && workStatusAt(world, work.id)?.status === "active"
      ? [work.personId]
      : [];
  });
}

function geographyChoices(
  world: World,
  campaign: CampaignRecord,
): readonly CampaignWeekGeographyChoice[] {
  const contest = requireElectionContest(world, campaign.contestId);
  const choices: CampaignWeekGeographyChoice[] = [
    {
      key: `jurisdiction:${campaign.jurisdictionId}`,
      label:
        world.jurisdictions[campaign.jurisdictionId]?.name ??
        "the campaign jurisdiction",
      kind: "jurisdiction",
    },
  ];
  const binding = contest.office.districtBinding ?? null;
  if (binding) {
    choices.push({
      key: `district:${binding.vintage}:${binding.chamber}:${binding.geoid}`,
      label: `${binding.stateUsps} ${binding.chamber.replaceAll("-", " ")} district ${binding.geoid}`,
      kind: "district",
    });
  }
  return choices;
}

function plansFor(
  world: World,
  campaignId: EntityId,
): readonly CampaignWeeklyPlanRecord[] {
  return campaignWeeklyPlanRecords(world).filter(
    (plan) => plan.campaignId === campaignId,
  );
}

function committedPlanCovering(
  world: World,
  campaignId: EntityId,
  date: IsoDate,
): CampaignWeeklyPlanRecord | null {
  return (
    [...plansFor(world, campaignId)]
      .reverse()
      .find(
        (plan) =>
          plan.status === "committed" &&
          plan.weekStart <= date &&
          date <= plan.weekEnd,
      ) ?? null
  );
}

interface WeekContext {
  readonly campaign: CampaignRecord;
  readonly weekStart: IsoDate;
  readonly weekEnd: IsoDate;
  readonly electionPassed: boolean;
  readonly daysLeft: number;
  readonly treasury: MoneyAmount;
  readonly staff: readonly EntityId[];
  readonly proposerPersonId: EntityId | null;
  readonly committed: CampaignWeeklyPlanRecord | null;
  readonly revision: string;
}

function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      86_400_000,
  );
}

function weekContext(world: World, campaign: CampaignRecord): WeekContext {
  const contest = requireElectionContest(world, campaign.contestId);
  const weekStart = world.currentDate;
  const lastWorkDay = addDays(contest.electionDate, -1);
  const electionPassed = lastWorkDay < weekStart;
  const weekEnd = electionPassed
    ? weekStart
    : [addDays(weekStart, 6), lastWorkDay].sort()[0]!;
  const treasury = campaignTreasuryPosition(world, campaign)?.liquidBalance ?? {
    minorUnits: 0,
    currency: campaign.treasuryCurrency,
  };
  const staff = activeStaff(world, campaign);
  const committed = committedPlanCovering(world, campaign.id, weekStart);
  const revision = [
    `week:${weekStart}:${weekEnd}`,
    `treasury:${treasury.minorUnits}:${treasury.currency}`,
    `staff:${[...staff].sort().join(",")}`,
    `committed:${committed?.id ?? "none"}`,
    `plans:${plansFor(world, campaign.id).length}`,
  ].join("|");
  return {
    campaign,
    weekStart,
    weekEnd,
    electionPassed,
    daysLeft: Math.max(0, daysBetween(weekStart, contest.electionDate)),
    treasury,
    staff,
    proposerPersonId: staff.at(0) ?? null,
    committed,
    revision,
  };
}

interface MemoReading {
  readonly on: IsoDate;
  readonly percent: number;
  readonly marginPercent: number | null;
}

/** The latest field memo the candidate actually read, if any. */
function latestMemo(
  world: World,
  campaign: CampaignRecord,
): MemoReading | null {
  const result = campaignResultsFor(world, campaign.id).at(-1);
  if (!result) return null;
  const known = world.history.knowledge.some(
    (candidate) =>
      candidate.id === result.feedbackKnowledgeId &&
      candidate.personId === campaign.candidatePersonId,
  );
  if (!known) return null;
  const observation = world.history.metricObservations.find(
    (candidate) => candidate.id === result.observationId,
  );
  if (
    !observation ||
    observation.value.kind !== "quantity" ||
    observation.value.quantity.unit !== "rate:share"
  ) {
    return null;
  }
  const quantity = observation.value.quantity;
  const uncertainty = observation.uncertainty;
  return {
    on: result.completedAt,
    percent: (quantity.numerator / quantity.denominator) * 100,
    marginPercent:
      uncertainty?.kind === "margin-of-error" &&
      uncertainty.margin.kind === "quantity"
        ? (uncertainty.margin.quantity.numerator /
            uncertainty.margin.quantity.denominator) *
          100
        : null,
  };
}

/**
 * Public events recorded by the opponent-campaign lane ("campaign.opponent-*")
 * in this contest over the last fourteen days. Public events are the ones the
 * candidate can know about without a private channel.
 */
function knownOpponentEventCount(
  world: World,
  campaign: CampaignRecord,
): number {
  const contest = requireElectionContest(world, campaign.contestId);
  const rivals = new Set(
    contest.candidatePersonIds.filter(
      (personId) => personId !== campaign.candidatePersonId,
    ),
  );
  const since = addDays(world.currentDate, -OPPONENT_EVENT_LOOKBACK_DAYS);
  return world.history.events.filter(
    (event) =>
      event.type.startsWith("campaign.opponent-") &&
      event.visibility === "public" &&
      event.occurredAt >= since &&
      event.occurredAt <= world.currentDate &&
      (event.involvedEntityIds.includes(contest.id) ||
        event.involvedEntityIds.some((id) => rivals.has(id))),
  ).length;
}

function cheapestChannel(): CampaignAdChannelEntry {
  return [...CAMPAIGN_AD_CHANNELS].sort(
    (left, right) => left.minimumBuyMinorUnits - right.minimumBuyMinorUnits,
  )[0]!;
}

function suggestedAdvertising(
  treasury: MoneyAmount,
  geography: CampaignWeekGeographyChoice,
): {
  readonly buys: number;
  readonly advertising: CampaignWeeklyAdvertising;
} | null {
  const channel = cheapestChannel();
  const buys = Math.min(
    channel.maxBuysPerWeek,
    Math.floor(treasury.minorUnits / channel.minimumBuyMinorUnits),
  );
  if (buys <= 0) return null;
  const halfPerBuy = Math.floor(treasury.minorUnits / 2 / buys / 100) * 100;
  const amount = Math.max(channel.minimumBuyMinorUnits, halfPerBuy);
  return {
    buys,
    advertising: {
      channel: channel.channel,
      geographyKey: geography.key,
      geographyLabel: geography.label,
      geographyKind: geography.kind,
      amount: { minorUnits: amount, currency: treasury.currency },
    },
  };
}

function planOptions(
  world: World,
  context: WeekContext,
  geography: readonly CampaignWeekGeographyChoice[],
): readonly CampaignWeekPlanOption[] {
  const memo = latestMemo(world, context.campaign);
  const opponentEvents = knownOpponentEventCount(world, context.campaign);
  const treasuryFact = `The committee has ${money(context.treasury)}.`;
  const daysFact = context.electionPassed
    ? "The recorded election date has arrived; there are no campaign days left."
    : `${context.daysLeft} ${context.daysLeft === 1 ? "day remains" : "days remain"} before the recorded election date.`;
  const memoFact = memo
    ? `The latest field memo, dated ${memo.on}, put the campaign near ${memo.percent.toFixed(1)}%${memo.marginPercent === null ? "" : ` with a stated margin of ${memo.marginPercent.toFixed(1)} points`}.`
    : "The campaign has no field memo yet.";
  const opponentFact =
    opponentEvents === 0
      ? "No public campaign events by the other side are on record in the last 14 days."
      : `${opponentEvents} public campaign ${opponentEvents === 1 ? "event" : "events"} by the other side ${opponentEvents === 1 ? "is" : "are"} on record in the last 14 days.`;

  const options: CampaignWeekPlanOption[] = [
    {
      emphasis: "field",
      label: EMPHASIS_LABEL.field,
      suggestedAllocation: {
        fieldShifts: 3,
        fundraisingSessions: 1,
        advertisingBuys: 0,
      },
      suggestedAdvertising: null,
      reasons: [memoFact, daysFact],
    },
  ];
  const preferred =
    geography.find((choice) => choice.kind === "district") ?? geography[0]!;
  const ads = suggestedAdvertising(context.treasury, preferred);
  if (ads) {
    options.push({
      emphasis: "communications",
      label: EMPHASIS_LABEL.communications,
      suggestedAllocation: {
        fieldShifts: 1,
        fundraisingSessions: 1,
        advertisingBuys: ads.buys,
      },
      suggestedAdvertising: ads.advertising,
      reasons: [treasuryFact, opponentFact],
    });
  }
  options.push({
    emphasis: "relationships",
    label: EMPHASIS_LABEL.relationships,
    suggestedAllocation: {
      fieldShifts: 1,
      fundraisingSessions: 3,
      advertisingBuys: 0,
    },
    suggestedAdvertising: null,
    reasons: [treasuryFact, daysFact],
  });
  return options;
}

function proposedEmphasis(
  world: World,
  context: WeekContext,
  options: readonly CampaignWeekPlanOption[],
): CampaignPlanEmphasis {
  if (!options.some((option) => option.emphasis === "communications")) {
    return "relationships";
  }
  return latestMemo(world, context.campaign) === null
    ? "field"
    : "communications";
}

function refusalExplanation(refusal: CampaignWeeklyRefusal): string {
  switch (refusal) {
    case "insufficient-funds":
      return "The committee did not have enough money for the advertising in that plan. Nothing was booked and nothing was spent.";
    case "no-free-time":
      return "There was not a free slot this week for every session in that plan. Nothing was booked.";
    case "election-passed":
      return "The recorded election date has arrived, so there is no campaign week left to plan.";
    case "channel-capacity":
      return "That channel cannot carry that many buys in a week, or the buy was below its smallest size. Nothing was booked.";
    case "empty-plan":
      return "The plan had no sessions in it. Nothing was booked.";
  }
}

function sessionView(
  world: World,
  action: CampaignActionRecord,
): CampaignWeekSessionView {
  const state = scheduledActivityState(world, action.scheduledActivityId);
  const status = campaignActionResult(world, action.id)
    ? "completed"
    : state.status;
  return {
    actionId: action.id,
    kind: action.kind,
    label: CAMPAIGN_WEEKLY_SESSIONS[action.kind].label,
    start: state.start,
    end: state.end,
    plannedSpend: action.plannedSpend ? { ...action.plannedSpend } : null,
    status,
    passed:
      status === "scheduled" &&
      compareSimulationMoments(state.start, world.currentMoment) < 0,
  };
}

function orderedSessions(
  world: World,
  plan: CampaignWeeklyPlanRecord,
): readonly CampaignWeekSessionView[] {
  return plan.scheduledActionIds
    .map((actionId) => sessionView(world, campaignActionById(world, actionId)!))
    .sort((left, right) => compareSimulationMoments(left.start, right.start));
}

/** The first session still scheduled whose start has not gone by. */
function nextSession(
  sessions: readonly CampaignWeekSessionView[],
): CampaignWeekSessionView | null {
  return (
    sessions.find(
      (session) => session.status === "scheduled" && !session.passed,
    ) ?? null
  );
}

function requireControlledCandidate(
  world: World,
  personId: EntityId,
): CampaignRecord {
  if (world.control.kind !== "person" || world.control.personId !== personId) {
    throw new Error("Only the person you are playing can plan this campaign.");
  }
  const campaign = activeCampaignForCandidate(world, personId);
  if (!campaign) throw new Error("There is no active campaign to plan for.");
  return campaign;
}

/* -------------------------------------------------------------------------- */
/* Projection                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * The week the controlled candidate can plan now, or null when there is no
 * active campaign with a pending contest.
 */
export function projectCampaignWeek(
  world: World,
  personId: EntityId,
): CampaignWeekView | null {
  if (world.control.kind !== "person" || world.control.personId !== personId) {
    return null;
  }
  const campaign = activeCampaignForCandidate(world, personId);
  if (!campaign) return null;
  if (electionContestStatus(world, campaign.contestId) !== "pending") {
    return null;
  }
  const context = weekContext(world, campaign);
  const geography = geographyChoices(world, campaign);
  const options = planOptions(world, context, geography);
  const proposerName = context.proposerPersonId
    ? personName(world.people[context.proposerPersonId]!)
    : personName(world.people[personId]!);
  const proposed = context.proposerPersonId
    ? proposedEmphasis(world, context, options)
    : null;
  const committed = context.committed;
  const sessions = committed ? orderedSessions(world, committed) : [];
  const latest = plansFor(world, campaign.id).at(-1) ?? null;
  return {
    campaignId: campaign.id,
    weekStart: context.weekStart,
    weekEnd: context.weekEnd,
    electionPassed: context.electionPassed,
    daysLeft: context.daysLeft,
    proposerPersonId: context.proposerPersonId,
    proposerName,
    attribution: context.proposerPersonId
      ? `${proposerName}, an active campaign staff member`
      : `${proposerName}, planning without campaign staff`,
    proposal:
      proposed && context.proposerPersonId
        ? `${proposerName} proposes ${EMPHASIS_LABEL[proposed].toLowerCase()}. The allocation, channel, geography and amount are yours to change before committing.`
        : null,
    proposedEmphasis: proposed,
    treasury: { ...context.treasury },
    options,
    geographyChoices: geography,
    channels: CAMPAIGN_AD_CHANNELS.map((entry) => ({
      channel: entry.channel,
      label: entry.label,
      maxBuysPerWeek: entry.maxBuysPerWeek,
      minimumBuy: {
        minorUnits: entry.minimumBuyMinorUnits,
        currency: campaign.treasuryCurrency,
      },
      geographyKinds: entry.geographyKinds,
      reach: entry.reach,
      affordable: context.treasury.minorUnits >= entry.minimumBuyMinorUnits,
    })),
    reachNote:
      "How many people an advertising buy reaches is not modeled. Channel limits and minimum buys are game defaults.",
    maxSessions: CAMPAIGN_WEEKLY_MAX_SESSIONS,
    committed: committed
      ? {
          planId: committed.id,
          emphasis: committed.chosenEmphasis,
          allocation: { ...committed.allocation },
          advertising: committed.advertising,
          sessions,
          nextActionId: nextSession(sessions)?.actionId ?? null,
          holdingActionId:
            sessions.find(
              (session) =>
                session.status === "scheduled" &&
                compareSimulationMoments(session.start, world.currentMoment) <=
                  0 &&
                compareSimulationMoments(world.currentMoment, session.end) < 0,
            )?.actionId ?? null,
        }
      : null,
    lastRefusal:
      latest && latest.status === "refused" && latest.refusal
        ? {
            planId: latest.id,
            refusal: latest.refusal,
            explanation: refusalExplanation(latest.refusal),
            decidedOn: latest.createdAt,
            treasuryAtDecision: { ...latest.treasuryAtDecision },
          }
        : null,
    revision: context.revision,
  };
}

/* -------------------------------------------------------------------------- */
/* Commit                                                                      */
/* -------------------------------------------------------------------------- */

function appendPlan(
  world: World,
  campaign: CampaignRecord,
  fields: Omit<
    CampaignWeeklyPlanRecord,
    | "id"
    | "stableKey"
    | "sequence"
    | "catalogVersion"
    | "campaignId"
    | "createdAt"
  >,
): World {
  const ordinal = plansFor(world, campaign.id).length;
  const stableKey = `${campaign.stableKey}:weekly-plan:${fields.weekStart}:${ordinal}`;
  const record: CampaignWeeklyPlanRecord = {
    id: createStableId("campaign-weekly-plan", `${world.id}:${stableKey}`),
    stableKey,
    sequence: world.history.nextSequence,
    catalogVersion: CAMPAIGN_LIFE_CATALOG_VERSION,
    campaignId: campaign.id,
    createdAt: world.currentDate,
    ...fields,
  };
  const next: World = {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 1,
      campaignWeeklyPlans: [
        ...(world.history.campaignWeeklyPlans ?? []),
        record,
      ],
    },
  };
  assertWorldIntegrity(next);
  return next;
}

function assertAllocation(allocation: CampaignWeeklyAllocation): void {
  for (const value of [
    allocation.fieldShifts,
    allocation.fundraisingSessions,
    allocation.advertisingBuys,
  ]) {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new Error(
        "Each part of the week's plan has to be a whole number of sessions, zero or more.",
      );
    }
  }
  const total =
    allocation.fieldShifts +
    allocation.fundraisingSessions +
    allocation.advertisingBuys;
  if (total > CAMPAIGN_WEEKLY_MAX_SESSIONS) {
    throw new Error(
      `A week's plan can hold at most ${CAMPAIGN_WEEKLY_MAX_SESSIONS} sessions.`,
    );
  }
}

function overlaps(
  world: World,
  participantIds: readonly EntityId[],
  start: SimulationMoment,
  end: SimulationMoment,
): boolean {
  const participants = new Set(participantIds);
  return world.history.scheduledActivities.some((activity) => {
    if (!activity.participantPersonIds.some((id) => participants.has(id))) {
      return false;
    }
    const state = scheduledActivityState(world, activity.id);
    return (
      state.status === "scheduled" &&
      compareSimulationMoments(start, state.end) < 0 &&
      compareSimulationMoments(state.start, end) < 0
    );
  });
}

/**
 * Places every session on a free slot of the week, in order, or returns null.
 * The whole plan is placed or nothing is.
 */
function placeSessions(
  world: World,
  context: WeekContext,
  kinds: readonly CampaignActionKind[],
  strategyFor: (kind: CampaignActionKind) => CampaignActionStrategyRecord,
  spendFor: (kind: CampaignActionKind) => MoneyAmount | null,
): { readonly world: World; readonly actionIds: readonly EntityId[] } | null {
  const campaign = context.campaign;
  const participants = [campaign.candidatePersonId, ...context.staff];
  const slots: SimulationMoment[] = [];
  for (
    let date = context.weekStart;
    date <= context.weekEnd;
    date = addDays(date, 1)
  ) {
    for (const minuteOfDay of CAMPAIGN_WEEKLY_SLOT_MINUTES) {
      const start = simulationMomentAtLocalTime({
        date,
        minuteOfDay,
        timeZone: world.currentMoment.timeZone,
        preferredUtcOffsetMinutes: world.currentMoment.utcOffsetMinutes,
      });
      if (compareSimulationMoments(start, world.currentMoment) > 0) {
        slots.push(start);
      }
    }
  }
  let scratch = world;
  const actionIds: EntityId[] = [];
  let cursor = 0;
  for (const kind of kinds) {
    const session = CAMPAIGN_WEEKLY_SESSIONS[kind];
    let placed = false;
    while (cursor < slots.length && !placed) {
      const start = slots[cursor]!;
      cursor += 1;
      const end = addSimulationMinutes(start, session.minutes);
      if (overlaps(scratch, participants, start, end)) continue;
      try {
        const scheduled = scheduleCampaignAction(scratch, {
          campaignId: campaign.id,
          kind,
          plan: {
            start,
            end,
            location: {
              locationKey: session.locationKey,
              label: `${session.locationLabel} — ${strategyFor(kind).geographyLabel}`,
              jurisdictionId: campaign.jurisdictionId,
            },
            title: session.title,
            summary: session.summary,
          },
          spend: spendFor(kind),
          strategy: strategyFor(kind),
        });
        scratch = scheduled.world;
        actionIds.push(scheduled.action.id);
        placed = true;
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.startsWith("Scheduled activity conflicts with")
        ) {
          continue;
        }
        throw error;
      }
    }
    if (!placed) return null;
  }
  return { world: scratch, actionIds };
}

/**
 * Commits the week's plan. Input mistakes throw and write nothing; a plan the
 * campaign cannot carry out is recorded as refused with nothing else changed.
 */
export function commitCampaignWeek(
  world: World,
  personId: EntityId,
  input: CommitCampaignWeekInput,
): World {
  const campaign = requireControlledCandidate(world, personId);
  if (campaign.id !== input.campaignId) {
    throw new Error("That campaign plan is no longer available.");
  }
  if (electionContestStatus(world, campaign.contestId) !== "pending") {
    throw new Error("This contest has already been decided.");
  }
  const jailed = jailTermOn(world, personId);
  if (jailed) {
    throw new Error(
      `You are in jail until ${jailed.until} and cannot campaign.`,
    );
  }
  const context = weekContext(world, campaign);
  if (input.weekStart !== context.weekStart) {
    throw new Error(
      "That plan was for a different week. Review this week's plan again.",
    );
  }
  if (input.proposerPersonId !== context.proposerPersonId) {
    throw new Error(
      "The campaign staff situation changed. Review the plan again.",
    );
  }
  if (input.revision !== context.revision) {
    throw new Error(
      "The campaign's situation changed since this plan was drawn up. Review it again.",
    );
  }
  if (context.committed) {
    throw new Error("This week's plan is already committed.");
  }
  assertAllocation(input.allocation);

  const geography = geographyChoices(world, campaign);
  const options = planOptions(world, context, geography);
  const offeredEmphases = options.map((option) => option.emphasis);
  if (!offeredEmphases.includes(input.emphasis)) {
    throw new Error("That plan is not one of this week's options.");
  }

  let advertising: CampaignWeeklyAdvertising | null = null;
  let channel: CampaignAdChannelEntry | null = null;
  if (input.advertising) {
    channel =
      CAMPAIGN_AD_CHANNELS.find(
        (entry) => entry.channel === input.advertising!.channel,
      ) ?? null;
    if (!channel) throw new Error("That advertising channel is not offered.");
    const place = geography.find(
      (choice) => choice.key === input.advertising!.geographyKey,
    );
    if (!place) {
      throw new Error("That campaign geography is not available.");
    }
    if (!channel.geographyKinds.includes(place.kind)) {
      throw new Error(`${channel.label} cannot be bought for that place.`);
    }
    const amount = input.advertising.amount;
    if (
      !Number.isSafeInteger(amount.minorUnits) ||
      amount.minorUnits <= 0 ||
      amount.currency !== campaign.treasuryCurrency
    ) {
      throw new Error(
        "An advertising buy needs a positive amount in the committee's currency.",
      );
    }
    if (input.allocation.advertisingBuys === 0) {
      throw new Error(
        "Choose how many advertising buys the week holds, or leave advertising out.",
      );
    }
    advertising = {
      channel: channel.channel,
      geographyKey: place.key,
      geographyLabel: place.label,
      geographyKind: place.kind,
      // Built field by field so nothing extra the caller passed is stored.
      amount: { minorUnits: amount.minorUnits, currency: amount.currency },
    };
  } else if (input.allocation.advertisingBuys > 0) {
    throw new Error("Advertising buys need a channel, geography and amount.");
  }

  const base = {
    weekStart: context.weekStart,
    weekEnd: context.weekEnd,
    proposerPersonId: context.proposerPersonId,
    offeredEmphases,
    chosenEmphasis: input.emphasis,
    allocation: {
      fieldShifts: input.allocation.fieldShifts,
      fundraisingSessions: input.allocation.fundraisingSessions,
      advertisingBuys: input.allocation.advertisingBuys,
    },
    advertising,
    treasuryAtDecision: { ...context.treasury },
  };
  const refuse = (refusal: CampaignWeeklyRefusal): World =>
    appendPlan(world, campaign, {
      ...base,
      status: "refused",
      refusal,
      scheduledActionIds: [],
    });

  const total =
    input.allocation.fieldShifts +
    input.allocation.fundraisingSessions +
    input.allocation.advertisingBuys;
  if (context.electionPassed) return refuse("election-passed");
  if (total === 0) return refuse("empty-plan");
  if (
    advertising &&
    channel &&
    (input.allocation.advertisingBuys > channel.maxBuysPerWeek ||
      advertising.amount.minorUnits < channel.minimumBuyMinorUnits)
  ) {
    return refuse("channel-capacity");
  }
  if (
    advertising &&
    (advertising.amount.currency !== context.treasury.currency ||
      advertising.amount.minorUnits * input.allocation.advertisingBuys >
        context.treasury.minorUnits)
  ) {
    return refuse("insufficient-funds");
  }

  const jurisdictionGeography = geography.find(
    (choice) => choice.kind === "jurisdiction",
  )!;
  const zero: MoneyAmount = {
    minorUnits: 0,
    currency: campaign.treasuryCurrency,
  };
  const strategyFor = (
    kind: CampaignActionKind,
  ): CampaignActionStrategyRecord => {
    const place =
      kind === "advertising" && advertising
        ? {
            key: advertising.geographyKey,
            label: advertising.geographyLabel,
            kind: advertising.geographyKind,
          }
        : jurisdictionGeography;
    return {
      proposerPersonId: context.proposerPersonId,
      proposedActionKind: EMPHASIS_KIND[input.emphasis],
      geographyKey: place.key,
      geographyLabel: place.label,
      geographyKind: place.kind,
      approvedSpendCeiling:
        kind === "advertising" && advertising
          ? { ...advertising.amount }
          : { ...zero },
    };
  };
  const kinds: CampaignActionKind[] = [
    ...Array<CampaignActionKind>(input.allocation.fieldShifts).fill("outreach"),
    ...Array<CampaignActionKind>(input.allocation.fundraisingSessions).fill(
      "fundraising",
    ),
    ...Array<CampaignActionKind>(input.allocation.advertisingBuys).fill(
      "advertising",
    ),
  ];
  // Sessions of an earlier week that were never done are released first, with
  // a recorded reason, so a missed week never leaves a stale hold behind.
  const released = releaseEarlierWeekSessions(
    world,
    campaign,
    context.weekStart,
  );
  const placed = placeSessions(released, context, kinds, strategyFor, (kind) =>
    kind === "advertising" && advertising ? { ...advertising.amount } : null,
  );
  if (!placed) return refuse("no-free-time");
  return appendPlan(placed.world, campaign, {
    ...base,
    status: "committed",
    refusal: null,
    scheduledActionIds: placed.actionIds,
  });
}

/* -------------------------------------------------------------------------- */
/* Doing the week                                                              */
/* -------------------------------------------------------------------------- */

function planForAction(
  world: World,
  actionId: EntityId,
): CampaignWeeklyPlanRecord | null {
  return (
    campaignWeeklyPlanRecords(world).find(
      (plan) =>
        plan.status === "committed" &&
        plan.scheduledActionIds.includes(actionId),
    ) ?? null
  );
}

/**
 * Does one session of a committed weekly plan, when it is the plan's next
 * session in time order. Returns the same world when an earlier commitment
 * blocks it. Refuses, without writing, a buy the committee can no longer pay.
 */
export function performCampaignWeekSession(
  world: World,
  personId: EntityId,
  actionId: EntityId,
): World {
  const campaign = requireControlledCandidate(world, personId);
  const action = campaignActionById(world, actionId);
  const plan = planForAction(world, actionId);
  if (!action || !plan || plan.campaignId !== campaign.id) {
    throw new Error("That session is not part of this campaign's weekly plan.");
  }
  if (campaignActionResult(world, action.id)) {
    throw new Error("That session is already done.");
  }
  const sessions = orderedSessions(world, plan);
  const own = sessions.find((session) => session.actionId === action.id);
  if (!own || own.status !== "scheduled") {
    throw new Error("That session is no longer on the calendar.");
  }
  if (own.passed) {
    throw new Error(
      "The time for that session has already passed, so it can no longer be done as planned.",
    );
  }
  if (nextSession(sessions)?.actionId !== action.id) {
    throw new Error("Do the earlier session in this week's plan first.");
  }
  // Something the character already promised comes first: that is the
  // answer, not a failure, and it wins over the money check below.
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
      !action.plannedSpend ||
      available.currency !== action.plannedSpend.currency ||
      available.minorUnits < action.plannedSpend.minorUnits
    ) {
      throw new Error(
        "The committee no longer has enough money for this planned buy. The money it has is untouched; review the plan.",
      );
    }
  }
  return performCampaignAction(world, action.id);
}

/**
 * Condensed attendance: does each remaining session of the plan in time order,
 * with exactly the outcomes of doing them one by one. Stops at the first
 * session something else blocks and returns the world as far as it got.
 */
export function runCondensedCampaignWeek(
  world: World,
  personId: EntityId,
  planId: EntityId,
): World {
  const campaign = requireControlledCandidate(world, personId);
  const plan = campaignWeeklyPlanRecords(world).find(
    (candidate) => candidate.id === planId,
  );
  if (!plan || plan.campaignId !== campaign.id || plan.status !== "committed") {
    throw new Error("That weekly plan is not committed for this campaign.");
  }
  let current = world;
  for (;;) {
    const next = nextSession(orderedSessions(current, plan));
    if (!next) return current;
    const performed = performCampaignWeekSession(
      current,
      personId,
      next.actionId,
    );
    if (performed === current) return current;
    current = performed;
  }
}

/**
 * Letting a planned session go.
 *
 * A booked session is a confirmed commitment, so ordinary time stops at its
 * start rather than stepping over it. Not doing it is the player's choice to
 * make, and it is made explicitly: the hold is canceled and a limited
 * campaign event records that the session was let go. Nothing is spent,
 * nobody's support moves and nobody is met. Works before the session, at its
 * start, or after its start has gone by.
 */
export function releaseCampaignWeekSession(
  world: World,
  personId: EntityId,
  actionId: EntityId,
): World {
  const campaign = requireControlledCandidate(world, personId);
  const action = campaignActionById(world, actionId);
  const plan = planForAction(world, actionId);
  if (!action || !plan || plan.campaignId !== campaign.id) {
    throw new Error("That session is not part of this campaign's weekly plan.");
  }
  if (
    campaignActionResult(world, action.id) ||
    scheduledActivityState(world, action.scheduledActivityId).status !==
      "scheduled"
  ) {
    throw new Error("That session is no longer on the calendar.");
  }
  return releaseSession(
    world,
    campaign,
    plan,
    action,
    "The candidate chose to let this planned session go.",
  );
}

function releaseSession(
  world: World,
  campaign: CampaignRecord,
  plan: CampaignWeeklyPlanRecord,
  action: CampaignActionRecord,
  reason: string,
): World {
  const session = CAMPAIGN_WEEKLY_SESSIONS[action.kind];
  const cancelled = cancelScheduledActivity(world, action.scheduledActivityId);
  const next = recordWorldEvent(cancelled, {
    stableKey: `${action.stableKey}:weekly-release`,
    type: "campaign.weekly-session-released",
    occurredAt: cancelled.currentDate,
    recordedAt: cancelled.currentDate,
    jurisdictionId: campaign.jurisdictionId,
    involvedEntityIds: [
      campaign.contestId,
      campaign.organizationId,
      campaign.candidatePersonId,
      action.scheduledActivityId,
      action.id,
      plan.id,
    ],
    participants: [
      {
        personId: campaign.candidatePersonId,
        role: "agency:candidate",
        detail: "Let a planned campaign session go",
      },
    ],
    personFactConstraints: [],
    visibility: "limited",
    tags: ["campaign.weekly-plan", "campaign.session-released"],
    summary: `${session.label} from the week's plan was not done. ${reason} Nothing was spent and no support moved.`,
    context: {
      location: null,
      socialContext: "Campaign work, on the same clock as the rest of the day.",
      pressure: null,
      choice: "Let the planned session go instead of doing it.",
      motivation: null,
      immediateReaction: null,
    },
  });
  assertWorldIntegrity(next);
  return next;
}

/**
 * Releases every still-scheduled session of this campaign's earlier committed
 * weeks. Called only when a new week is committed, which can only happen once
 * the earlier weeks have ended, so every such session's start has gone by.
 */
function releaseEarlierWeekSessions(
  world: World,
  campaign: CampaignRecord,
  weekStart: IsoDate,
): World {
  let current = world;
  for (const plan of plansFor(world, campaign.id)) {
    if (plan.status !== "committed" || plan.weekEnd >= weekStart) continue;
    for (const actionId of plan.scheduledActionIds) {
      const action = campaignActionById(current, actionId)!;
      if (
        campaignActionResult(current, action.id) ||
        scheduledActivityState(current, action.scheduledActivityId).status !==
          "scheduled"
      ) {
        continue;
      }
      current = releaseSession(
        current,
        campaign,
        plan,
        action,
        "Its week ended before it was done, and a new week was planned.",
      );
    }
  }
  return current;
}

/** Whether a campaign action was booked by a weekly plan. */
export function campaignWeeklyPlanForAction(
  world: World,
  actionId: EntityId,
): CampaignWeeklyPlanRecord | null {
  return planForAction(world, actionId);
}

/** Every weekly plan record for a campaign, oldest first. */
export function campaignWeeklyPlans(
  world: World,
  campaignId: EntityId,
): readonly CampaignWeeklyPlanRecord[] {
  return plansFor(world, campaignId);
}
