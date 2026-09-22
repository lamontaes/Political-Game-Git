import {
  CAMPAIGN_LIFE_CATALOG,
  CHAPTER_MEETING_ATTENDED_EVENT,
  campaignById,
  homePartyChapters,
  personName,
  projectCampaignGuidance,
  projectCampaignLifeActivities,
  projectCampaignWeek,
  projectKnownOpponentActivity,
  type CampaignAdChannel,
  type CampaignGeographyKind,
  type CampaignGuidanceValue,
  type CampaignLifeActivityView,
  type CampaignLifeFamily,
  type CampaignLifeForm,
  type CampaignPlanEmphasis,
  type CampaignWeekView,
  type CampaignWeeklyAllocation,
  type EntityId,
  type FutureTransitionHandlerRegistry,
  type MoneyAmount,
  type SimulationMoment,
  type World,
} from "../simulation";
import { formatMinute } from "./player-calendar";
import { proseDate } from "./prose-dates";
import { venueActivities } from "./venue-activity";

/**
 * What party and campaign life looks like from where the player stands
 * (CRUNCH46 CAMPAIGN). Pure readings for the player surfaces: plain words,
 * readable American dates, dollars, and no meter, estimate of reach or
 * probability anywhere. Nothing here writes; the actions module does.
 */

/* -------------------------------------------------------------------------- */
/* Shared formatting                                                          */
/* -------------------------------------------------------------------------- */

const ISO_DATE = /\b(\d{4}-\d{2}-\d{2})\b/g;

/** Every stored ISO date inside a sentence, written the way a reader does. */
export function readableDatesIn(text: string): string {
  return text.replace(ISO_DATE, (iso: string) => proseDate(iso));
}

/** "$1,234.50" for dollars; other currencies keep their code. */
export function dollars(amount: MoneyAmount): string {
  const sign = amount.minorUnits < 0 ? "-" : "";
  const value = (Math.abs(amount.minorUnits) / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return amount.currency === "USD"
    ? `${sign}$${value}`
    : `${amount.currency} ${sign}${value}`;
}

/**
 * Reads what a person typed as a dollar amount: "50", "50.5", "$1,250.00".
 * Returns whole cents, or null when it is not a plain positive amount.
 */
export function parseDollars(text: string): number | null {
  const cleaned = text.trim().replace(/^\$/, "").replaceAll(",", "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, fraction = ""] = cleaned.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

export function readableMoment(moment: SimulationMoment): string {
  return `${proseDate(moment.date)}, ${formatMinute(moment.minuteOfDay)}`;
}

function organizationName(world: World, organizationId: EntityId): string {
  return (
    world.history.organizationProfiles
      .filter((profile) => profile.organizationId === organizationId)
      .at(-1)?.name ?? "the organization"
  );
}

function nameOf(world: World, personId: EntityId | null): string {
  const person = personId ? world.people[personId] : undefined;
  return person ? personName(person) : "Somebody";
}

/* -------------------------------------------------------------------------- */
/* Party and community work                                                   */
/* -------------------------------------------------------------------------- */

export type PartyWorkAction =
  "accept" | "decline" | "attend" | "attend-condensed" | "take-shift";

export const FAMILY_LABELS: Readonly<Record<CampaignLifeFamily, string>> = {
  "organization-meeting": "Organizing",
  "volunteer-shift": "Volunteer shift",
  "candidate-guidance": "About running for office",
  "support-and-fundraising": "Support and fundraising",
  "community-event": "Community event",
};

const STATE_LABELS: Readonly<
  Record<CampaignLifeActivityView["state"], string>
> = {
  offered: "Offered. Going is up to you.",
  accepted: "You said you would do it.",
  declined: "You declined.",
  expired: "It passed without you.",
  completed: "Done.",
};

export interface PartyWorkRow {
  readonly lifeActivityId: EntityId;
  readonly form: CampaignLifeForm;
  readonly title: string;
  readonly familyLabel: string;
  readonly hostName: string;
  readonly hostPersonId: EntityId;
  readonly organizationName: string;
  readonly state: CampaignLifeActivityView["state"];
  readonly stateLabel: string;
  readonly when: string;
  readonly placeLabel: string;
  readonly presence: "in-person" | "remote";
  /** Journey minutes and the travel-cost disclosure; null when remote. */
  readonly travelNote: string | null;
  readonly actions: readonly PartyWorkAction[];
  /** True when the calendar entry is done but what happened is not recorded. */
  readonly awaitingRecord: boolean;
  /** Why going cannot happen right now, from the ordinary venue rules. */
  readonly attendNote: string | null;
  /** Plain-language account of what happened; empty until it has. */
  readonly outcomeLines: readonly string[];
  /** Candidate guidance only: what the host could honestly say. */
  readonly guidanceFacts: readonly string[];
}

export interface PartyWorkRequestOption {
  readonly form: CampaignLifeForm;
  readonly title: string;
  readonly hostOrganizationId: EntityId;
  readonly hostName: string;
  readonly organizationName: string;
}

export interface PartyAndCommunityWorkView {
  readonly rows: readonly PartyWorkRow[];
  readonly requestable: readonly PartyWorkRequestOption[];
}

const SUPPORT_DECISION_TEXT = {
  granted: "said the chapter will back your campaign",
  declined: "said the chapter will not back your campaign",
  deferred: "said the chapter will take it up later",
} as const;

function guidanceLines(world: World, personId: EntityId) {
  const view = projectCampaignGuidance(world, personId);
  const facts: string[] = [];
  const sources = new Set<string>();
  const say = <T>(
    value: CampaignGuidanceValue<T>,
    known: (v: T) => string,
    unknown: string,
  ): string => {
    if (value.state !== "known") return unknown;
    sources.add(value.citation);
    return known(value.value);
  };
  if (view.offices.length === 0) {
    facts.push(view.noOfficeReason ?? "No elected office is established here.");
  }
  for (const office of view.offices) {
    facts.push(
      `${office.chamberName}: ${say(
        office.minimumAge,
        (age) => `you must be at least ${age}`,
        "the minimum age is not known to this game",
      )}; ${say(
        office.residency,
        (text) => `residency: ${text}`,
        "the residency rule is not known to this game",
      )}; ${say(
        office.termYears,
        (years) => `a term is ${years} ${years === 1 ? "year" : "years"}`,
        "the term length is not known to this game",
      )}.`,
    );
  }
  facts.push(
    "Who accepts candidacy papers, the filing deadline, any filing fee and any petition requirement are not established by this game's sourced rules, so nobody here can tell you them.",
  );
  facts.push(
    `The game itself will not put anyone under ${view.gameAdultCandidacyAge} on a ballot. That is the game's rule, not the law's.`,
  );
  return { facts, sources: [...sources] };
}

function outcomeLines(
  world: World,
  view: CampaignLifeActivityView,
  hostName: string,
): string[] {
  const outcome = view.outcome;
  if (!outcome) return [];
  const lines: string[] = [];
  lines.push(
    view.form === "candidate-guidance"
      ? `${hostName} went over what is known about running for office here.`
      : readableDatesIn(outcome.summary),
  );
  const met = [
    hostName,
    ...outcome.contactPersonIds.map((id) => nameOf(world, id)),
  ];
  lines.push(`You met ${met.join(" and ")}.`);
  if (outcome.raisedAmount) {
    lines.push(
      `${dollars(outcome.raisedAmount)} went to your campaign committee.`,
    );
  } else if (view.form === "fundraiser") {
    lines.push("No money was collected.");
  }
  if (outcome.supportDecision) {
    lines.push(
      `${hostName} ${SUPPORT_DECISION_TEXT[outcome.supportDecision]}. Nothing about the ballot or your filing changed.`,
    );
  }
  if (outcome.attendance === "condensed") {
    lines.push(
      "You went briefly: the same outcome, less of the evening shown.",
    );
  }
  return lines;
}

function actionsFor(
  view: CampaignLifeActivityView,
  awaitingRecord: boolean,
): PartyWorkAction[] {
  if (view.state === "offered") return ["accept", "decline"];
  if (view.state === "accepted") {
    return view.presence === "remote"
      ? ["take-shift"]
      : ["attend", "attend-condensed"];
  }
  // Time already passed through it: only what happened is left to record.
  if (awaitingRecord) return ["attend-condensed"];
  return [];
}

/** An organizer the person has sat in a chapter meeting with. */
function metOrganizerId(world: World, personId: EntityId): EntityId | null {
  for (const chapter of homePartyChapters(world)) {
    const organizerId = chapter.organizerPersonId;
    if (!organizerId) continue;
    const met = world.history.events.some(
      (event) =>
        event.type === CHAPTER_MEETING_ATTENDED_EVENT &&
        event.participants.some((p) => p.personId === personId) &&
        event.participants.some((p) => p.personId === organizerId),
    );
    if (met) return organizerId;
  }
  return null;
}

const CHAPTER_FORMS: readonly CampaignLifeForm[] = [
  "organization-meeting",
  "door-canvass",
  "phone-shift",
  "candidate-guidance",
  "town-hall",
];
const CHAPTER_CAMPAIGN_FORMS: readonly CampaignLifeForm[] = [
  "fundraiser",
  "support-request",
];
const COMMITTEE_FORMS: readonly CampaignLifeForm[] = [
  "door-canvass",
  "phone-shift",
  "fundraiser",
];

/**
 * The player's party and campaign activities, newest first, and what they can
 * ask for now. Requestable forms follow the writer's own rules; the writer
 * still has the last word and refuses with its own sentence.
 */
export function projectPartyAndCommunityWork(
  world: World,
  personId: EntityId,
  transitionHandlers?: FutureTransitionHandlerRegistry,
): PartyAndCommunityWorkView {
  const views = projectCampaignLifeActivities(world, personId);
  const needsVenue = views.some(
    (view) => view.state === "accepted" && view.presence === "in-person",
  );
  const venue = needsVenue
    ? venueActivities(world, personId, transitionHandlers)
    : [];
  const guidance = views.some(
    (view) => view.form === "candidate-guidance" && view.outcome,
  )
    ? guidanceLines(world, personId)
    : null;
  const rows = [...views].reverse().map((view): PartyWorkRow => {
    const hold = world.history.scheduledActivities.find(
      (activity) => activity.id === view.scheduledActivityId,
    );
    const hostName = nameOf(world, view.hostPersonId);
    const awaitingRecord = view.state === "completed" && view.outcome === null;
    return {
      lifeActivityId: view.lifeActivityId,
      form: view.form,
      title: view.title,
      familyLabel: FAMILY_LABELS[view.family],
      hostName,
      hostPersonId: view.hostPersonId,
      organizationName: organizationName(world, view.hostOrganizationId),
      state: view.state,
      stateLabel: awaitingRecord
        ? "It has happened. What came of it is not recorded yet."
        : STATE_LABELS[view.state],
      when: readableMoment(view.start),
      placeLabel: hold?.location.label ?? "",
      presence: view.presence,
      travelNote:
        view.journeyMinutes === null
          ? null
          : `A ${view.journeyMinutes}-minute local journey there is included when you go. ${view.travelCostDisclosure ?? ""}`.trim(),
      actions: actionsFor(view, awaitingRecord),
      awaitingRecord,
      attendNote:
        view.state === "accepted" && view.presence === "in-person"
          ? (venue.find(
              (entry) => entry.activity.id === view.scheduledActivityId,
            )?.refusal ?? null)
          : null,
      outcomeLines: outcomeLines(world, view, hostName),
      guidanceFacts:
        view.form === "candidate-guidance" && view.outcome && guidance
          ? guidance.facts
          : [],
    };
  });

  const adult =
    world.control.kind === "person" && world.control.personId === personId;
  const openFor = (hostPersonId: EntityId, form: CampaignLifeForm) =>
    views.some(
      (view) =>
        view.hostPersonId === hostPersonId &&
        view.form === form &&
        (view.state === "offered" || view.state === "accepted"),
    );
  const week = adult ? projectCampaignWeek(world, personId) : null;
  const requestable: PartyWorkRequestOption[] = [];
  if (adult) {
    for (const chapter of homePartyChapters(world)) {
      const hostId = chapter.organizerPersonId;
      if (!hostId || !world.people[hostId]) continue;
      const forms = [...CHAPTER_FORMS, ...(week ? CHAPTER_CAMPAIGN_FORMS : [])];
      for (const form of forms) {
        if (openFor(hostId, form)) continue;
        requestable.push({
          form,
          title: CAMPAIGN_LIFE_CATALOG[form].title,
          hostOrganizationId: chapter.organizationId,
          hostName: nameOf(world, hostId),
          organizationName: chapter.name,
        });
      }
    }
    const campaign = week ? campaignById(world, week.campaignId) : null;
    const committeeHost = week
      ? (week.proposerPersonId ?? metOrganizerId(world, personId))
      : null;
    if (campaign && committeeHost) {
      for (const form of COMMITTEE_FORMS) {
        if (openFor(committeeHost, form)) continue;
        requestable.push({
          form,
          title: CAMPAIGN_LIFE_CATALOG[form].title,
          hostOrganizationId: campaign.organizationId,
          hostName: nameOf(world, committeeHost),
          organizationName: organizationName(world, campaign.organizationId),
        });
      }
    }
  }
  return { rows, requestable };
}

/* -------------------------------------------------------------------------- */
/* This week's plan                                                           */
/* -------------------------------------------------------------------------- */

export interface WeekPlanCard {
  readonly emphasis: CampaignPlanEmphasis;
  readonly label: string;
  readonly reasons: readonly string[];
  readonly proposed: boolean;
  readonly suggestedAllocation: CampaignWeeklyAllocation;
  readonly suggestedAdvertising: {
    readonly channel: CampaignAdChannel;
    readonly geographyKey: string;
    /** Whole dollars and cents as a person would type them. */
    readonly amountText: string;
  } | null;
}

export interface WeekChannelChoice {
  readonly channel: CampaignAdChannel;
  readonly label: string;
  readonly limitLabel: string;
  readonly maxBuysPerWeek: number;
  readonly minimumBuyMinorUnits: number;
  readonly geographyKinds: readonly CampaignGeographyKind[];
  readonly affordable: boolean;
}

export interface WeekSessionRow {
  readonly actionId: EntityId;
  readonly label: string;
  readonly when: string;
  readonly spendLabel: string | null;
  readonly statusLabel: string;
  readonly canDo: boolean;
  readonly canLetGo: boolean;
  readonly holding: boolean;
}

export interface CampaignWeekPanelView {
  /** Raw values the commit writer needs back unchanged. */
  readonly campaignId: EntityId;
  readonly weekStart: CampaignWeekView["weekStart"];
  readonly proposerPersonId: EntityId | null;
  readonly revision: string;
  readonly currency: MoneyAmount["currency"];
  readonly treasuryMinorUnits: number;
  readonly maxSessions: number;

  readonly weekLabel: string;
  readonly daysLeftLabel: string;
  readonly electionPassed: boolean;
  readonly attribution: string;
  /** Staff proposal in words; null when nobody on staff proposed anything. */
  readonly proposal: string | null;
  readonly treasuryLabel: string;
  readonly cards: readonly WeekPlanCard[];
  readonly channels: readonly WeekChannelChoice[];
  readonly geographyChoices: CampaignWeekView["geographyChoices"];
  readonly reachNote: string;
  readonly committed: {
    readonly planId: EntityId;
    readonly summary: string;
    readonly sessions: readonly WeekSessionRow[];
    readonly anyLeft: boolean;
  } | null;
  readonly refusal: {
    readonly explanation: string;
    readonly moneyNote: string;
  } | null;
}

const EMPHASIS_NAMES: Readonly<Record<CampaignPlanEmphasis, string>> = {
  field: "a field week",
  communications: "a communications week",
  relationships: "a relationships and fundraising week",
};

function usdText(_whole: string, units: string, cents: string): string {
  return dollars({
    minorUnits: Number(units) * 100 + Number(cents),
    currency: "USD" as MoneyAmount["currency"],
  });
}

function amountText(amount: MoneyAmount): string {
  return (amount.minorUnits / 100).toFixed(2);
}

function count(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** The week the player can plan now, in display strings; null without one. */
export function projectCampaignWeekPanel(
  world: World,
  personId: EntityId,
): CampaignWeekPanelView | null {
  const view = projectCampaignWeek(world, personId);
  if (!view) return null;
  const committed = view.committed;
  const anyLeft =
    committed?.sessions.some((session) => session.status === "scheduled") ??
    false;
  return {
    campaignId: view.campaignId,
    weekStart: view.weekStart,
    proposerPersonId: view.proposerPersonId,
    revision: view.revision,
    currency: view.treasury.currency,
    treasuryMinorUnits: view.treasury.minorUnits,
    maxSessions: view.maxSessions,
    weekLabel:
      view.weekStart === view.weekEnd
        ? proseDate(view.weekStart)
        : `${proseDate(view.weekStart)} to ${proseDate(view.weekEnd)}`,
    daysLeftLabel: view.electionPassed
      ? "Election day has arrived."
      : `${count(view.daysLeft, "day", "days")} until the election.`,
    electionPassed: view.electionPassed,
    attribution: view.proposerPersonId
      ? `Proposed by ${view.proposerName}, on your campaign staff.`
      : "Planning without campaign staff.",
    proposal:
      view.proposal && view.proposerPersonId && view.proposedEmphasis
        ? `${view.proposerName} suggests ${EMPHASIS_NAMES[view.proposedEmphasis]}. Everything below is yours to change before you commit.`
        : null,
    treasuryLabel: `Your committee has ${dollars(view.treasury)}.`,
    cards: view.options.map((option) => ({
      emphasis: option.emphasis,
      label: option.label,
      reasons: option.reasons.map((reason) =>
        readableDatesIn(reason.replace(/\bUSD (\d+)\.(\d{2})\b/g, usdText)),
      ),
      proposed:
        view.proposedEmphasis === option.emphasis &&
        view.proposerPersonId !== null,
      suggestedAllocation: { ...option.suggestedAllocation },
      suggestedAdvertising: option.suggestedAdvertising
        ? {
            channel: option.suggestedAdvertising.channel,
            geographyKey: option.suggestedAdvertising.geographyKey,
            amountText: amountText(option.suggestedAdvertising.amount),
          }
        : null,
    })),
    channels: view.channels.map((channel) => ({
      channel: channel.channel,
      label: channel.label,
      limitLabel: `Up to ${count(channel.maxBuysPerWeek, "buy", "buys")} a week; the smallest buy is ${dollars(channel.minimumBuy)}.`,
      maxBuysPerWeek: channel.maxBuysPerWeek,
      minimumBuyMinorUnits: channel.minimumBuy.minorUnits,
      geographyKinds: channel.geographyKinds,
      affordable: channel.affordable,
    })),
    geographyChoices: view.geographyChoices,
    reachNote: view.reachNote,
    committed: committed
      ? {
          planId: committed.planId,
          summary: `You committed to ${EMPHASIS_NAMES[committed.emphasis]}: ${count(committed.allocation.fieldShifts, "field shift", "field shifts")}, ${count(committed.allocation.fundraisingSessions, "call session", "call sessions")} and ${count(committed.allocation.advertisingBuys, "advertising buy", "advertising buys")}.`,
          anyLeft,
          sessions: committed.sessions.map((session) => ({
            actionId: session.actionId,
            label: session.label,
            when: readableMoment(session.start),
            spendLabel: session.plannedSpend
              ? `Spends ${dollars(session.plannedSpend)}`
              : null,
            statusLabel:
              session.status === "completed"
                ? "Done."
                : session.status === "cancelled"
                  ? "Let go."
                  : session.passed
                    ? "Its time has passed. It can only be let go."
                    : committed.holdingActionId === session.actionId
                      ? "Waiting on you now."
                      : "Planned.",
            canDo: committed.nextActionId === session.actionId,
            canLetGo: session.status === "scheduled",
            holding: committed.holdingActionId === session.actionId,
          })),
        }
      : null,
    refusal: view.lastRefusal
      ? {
          explanation: view.lastRefusal.explanation,
          moneyNote: `On ${proseDate(view.lastRefusal.decidedOn)} the committee had ${dollars(view.lastRefusal.treasuryAtDecision)}; that money was not touched.`,
        }
      : null,
  };
}

/* -------------------------------------------------------------------------- */
/* What the other campaigns have done                                         */
/* -------------------------------------------------------------------------- */

const OPPONENT_KIND_LABELS = {
  fundraising: "Fundraising",
  messaging: "Messaging",
  "field-event": "Field event",
  "support-request": "Support",
} as const;

export interface OpponentActivityRow {
  readonly eventId: EntityId;
  readonly opponentPersonId: EntityId;
  readonly opponentName: string;
  readonly dateLabel: string;
  readonly kindLabel: string;
  readonly summary: string;
}

/** Public steps by the other campaigns that this person learned of, newest first. */
export function projectOpponentActivityPanel(
  world: World,
  personId: EntityId,
): readonly OpponentActivityRow[] {
  return [...projectKnownOpponentActivity(world, personId)]
    .reverse()
    .map((row) => ({
      eventId: row.eventId,
      opponentPersonId: row.opponentPersonId,
      opponentName: nameOf(world, row.opponentPersonId),
      dateLabel: proseDate(row.date),
      kindLabel: OPPONENT_KIND_LABELS[row.kind] ?? "Campaign activity",
      summary: readableDatesIn(row.summary),
    }));
}
