import { wasRefused } from "./scheduled-activity-answer";
import { rememberedAdverseFindingsAgainst } from "./press/findings";
import {
  CAMPAIGN_LIFE_CATALOG,
  CAMPAIGN_LIFE_TRAVEL_COST_DISCLOSURE,
  campaignLifeCatalogEntry,
} from "./campaign-life-catalog";
import {
  CAMPAIGN_LIFE_CATALOG_VERSION,
  CAMPAIGN_LIFE_OUTREACH_KEY,
  type CampaignLifeActivityRecord,
  type CampaignLifeAttendance,
  type CampaignLifeCatalogEntry,
  type CampaignLifeFamily,
  type CampaignLifeForm,
  type CampaignLifeOutcomeRecord,
  type CampaignSupportDecision,
} from "./campaign-life-types";
import {
  assessKentuckyCampaignContribution,
  campaignCompliancePackFor,
  type CampaignComplianceRulePack,
} from "./campaign-compliance";
import { assessContribution } from "./campaign-compliance-rules";
import {
  activeCampaignForCandidate,
  campaignById,
  campaignLifeActivityRecords,
  campaignLifeOutcomeRecords,
  campaignState,
  campaigns,
} from "./campaign-queries";
import { recordSupportShift } from "./campaign-support";
import { GAME_ADULT_CANDIDACY_AGE } from "./candidacy-packs";
import { candidacyAuthority } from "./candidacy";
import {
  characterHistoryContextPersonId,
  createCharacterHistoryContextPerson,
} from "./character-history";
import {
  addDays,
  addSimulationMinutes,
  ageOnDate,
  compareSimulationMoments,
  daysBetween,
  makeIsoDate,
  simulationMinutesBetween,
  simulationMomentAtLocalTime,
} from "./dates";
import { evaluateDecision } from "./decisions";
import {
  electionContestStatus,
  requireElectionContest,
} from "./election-contests";
import { scheduleFutureDueItem } from "./future-transitions";
import { createStableId } from "./ids";
import type { RuleValue } from "./legislature-rules";
import { organizationParticipationStateAt } from "./life-queries";
import { workStatusAt } from "./life-queries";
import { publicPartyAffiliation } from "./living-world/congress";
import {
  CHAPTER_MEETING_ATTENDED_EVENT,
  CHAPTER_MEMBERSHIP_KIND,
  homePartyChapters,
  type HomePartyChapter,
} from "./living-world/party-chapters";
import { drawCanonicalNamedIdentity, personName } from "./people";
import { generatePersonIdentity } from "./person-identity";
import { recordEventKnowledge, recordRelationshipInteraction } from "./records";
import { positionOwnerEndpoint, resourcePositionAt } from "./resource-queries";
import { createResourceFlow, recordResourceTransferOutcome } from "./resources";
import { SeededRng } from "./rng";
import {
  cancelScheduledActivity,
  createScheduledActivity,
  scheduledActivityState,
} from "./time-work";
import type {
  CampaignRecord,
  DecisionConsideration,
  DecisionOption,
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  IsoDate,
  MoneyAmount,
  ScheduledActivityRecord,
  SimulationMoment,
  World,
} from "./types";
import { assertWorldIntegrity, recordWorldEvent } from "./world";

/**
 * Party and campaign life at moderate depth (CRUNCH46 section 09).
 *
 * A persistent person — a chapter organizer, a campaign staffer — offers the
 * controlled person an organizing meeting, a canvass or phone shift, a talk
 * about running, a small fundraiser, a support request or a town hall, or the
 * controlled person asks for one. The offer is an ordinary calendar hold with
 * the host on it, so the host's real evening is checked; an in-person form
 * also carries the authored community-room journey. Declining uses the
 * ordinary venue decline. Attending (or condensing) the completed calendar
 * activity records what actually happened: who was met, what the field work
 * did to canonical support, what money moved and under whose rules, what the
 * host decided, and what the person now knows.
 *
 * What none of this does. Coming to a meeting is not joining, endorsing,
 * registering or voting. Meeting a volunteer is not meeting everyone in the
 * room. There is no ability meter and no win probability, and condensed play
 * produces exactly the outcome attended play does. Nothing a jurisdiction's
 * law has not been read for is stated as law.
 */

export const CAMPAIGN_LIFE_OFFERED_EVENT = "campaign.life-activity-offered";
export const CAMPAIGN_LIFE_ACCEPTED_EVENT = "campaign.life-activity-accepted";
export const CAMPAIGN_LIFE_ATTENDED_EVENT = "campaign.life-activity-attended";
export const CAMPAIGN_SUPPORT_REQUEST_DECIDED_EVENT =
  "campaign.support-request-decided";
/** PEOPLE contract: two people actually met at a party/campaign event. */
export const CAMPAIGN_LIFE_CONTACT_KIND = "contact:met-at-party-event";
/** PEOPLE contract: the same pair met again at a later campaign-life event. */
export const CAMPAIGN_LIFE_RECURRING_CONTACT_KIND =
  "contact:recurring-campaign-contact";
export const CAMPAIGN_LIFE_CONTACT_TAG = "campaign.contact";

/** No party or campaign evening in this game runs past nine. */
export const CAMPAIGN_LIFE_LATEST_END_MINUTE = 21 * 60;

/** Authored cadence for this fictional setting, not a claim about any party. */
const LIFE = {
  minimumAge: 18,
  firstOutreachDays: [5, 12],
  deferDays: 7,
  nextOutreachDays: [10, 21],
  offerDays: [2, 9],
  requestWindowDays: 14,
  inPersonStartMinute: 18 * 60 + 30,
  phoneStartMinute: 19 * 60,
  memoryDays: 42,
  rosterThreshold: 3,
  fundraiserMinorUnits: [25_000, 150_000],
  contactAgeYears: [22, 75],
} as const;

const FIELD_FORMS: readonly CampaignLifeForm[] = [
  "door-canvass",
  "phone-shift",
];
const CAMPAIGN_ONLY_FORMS: readonly CampaignLifeForm[] = [
  "fundraiser",
  "support-request",
];

export interface OfferCampaignLifeActivityInput {
  readonly form: CampaignLifeForm;
  readonly hostOrganizationId: EntityId;
  readonly hostPersonId: EntityId;
  readonly subjectPersonId: EntityId;
  readonly campaignId: EntityId | null;
  readonly origin: CampaignLifeActivityRecord["origin"];
  readonly start: SimulationMoment;
  readonly stableKey: string;
}

export interface RequestCampaignLifeActivityInput {
  readonly form: CampaignLifeForm;
  readonly hostOrganizationId: EntityId;
  readonly earliestDate?: IsoDate;
}

/* -------------------------------------------------------------------------- */
/* Small readers                                                              */
/* -------------------------------------------------------------------------- */

function controlled(world: World, personId: EntityId): boolean {
  return world.control.kind === "person" && world.control.personId === personId;
}

function deceased(world: World, personId: EntityId): boolean {
  return world.history.personDeaths.some(
    (death) => death.personId === personId,
  );
}

function momentAt(
  world: World,
  date: IsoDate,
  minuteOfDay: number,
): SimulationMoment {
  return simulationMomentAtLocalTime({
    date,
    minuteOfDay,
    timeZone: world.currentMoment.timeZone,
    preferredUtcOffsetMinutes: world.currentMoment.utcOffsetMinutes,
  });
}

function organizationRecord(world: World, organizationId: EntityId) {
  return world.history.organizations.find(
    (organization) => organization.id === organizationId,
  );
}

function organizationName(world: World, organizationId: EntityId): string {
  return (
    world.history.organizationProfiles
      .filter((profile) => profile.organizationId === organizationId)
      .at(-1)?.name ?? "the organization"
  );
}

function organizationJurisdiction(
  world: World,
  organizationId: EntityId,
  fallback: EntityId,
): EntityId {
  return (
    world.history.organizationProfiles
      .filter((profile) => profile.organizationId === organizationId)
      .at(-1)?.locationJurisdictionId ?? fallback
  );
}

function chapterFor(
  world: World,
  organizationId: EntityId,
): HomePartyChapter | undefined {
  return homePartyChapters(world).find(
    (chapter) => chapter.organizationId === organizationId,
  );
}

function committeeCampaign(
  world: World,
  organizationId: EntityId,
): CampaignRecord | undefined {
  return [...campaigns(world)]
    .reverse()
    .find((campaign) => campaign.organizationId === organizationId);
}

function activeStaffPersonIds(
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

/** An organizer the subject has actually sat in a chapter meeting with. */
function organizerMetAtChapterMeeting(
  world: World,
  subjectPersonId: EntityId,
  organizerPersonId: EntityId,
): boolean {
  return world.history.events.some(
    (event) =>
      event.type === CHAPTER_MEETING_ATTENDED_EVENT &&
      event.participants.some((p) => p.personId === subjectPersonId) &&
      event.participants.some((p) => p.personId === organizerPersonId),
  );
}

/** The subject's campaign, only while it is running toward a pending contest. */
function openCampaignFor(
  world: World,
  subjectPersonId: EntityId,
): CampaignRecord | null {
  const campaign = activeCampaignForCandidate(world, subjectPersonId);
  if (!campaign) return null;
  return electionContestStatus(world, campaign.contestId) === "pending"
    ? campaign
    : null;
}

function campaignIsOpen(world: World, campaign: CampaignRecord): boolean {
  return (
    campaignState(world, campaign.id).status === "active" &&
    electionContestStatus(world, campaign.contestId) === "pending"
  );
}

function lifeActivityById(
  world: World,
  lifeActivityId: EntityId,
): CampaignLifeActivityRecord | undefined {
  return campaignLifeActivityRecords(world).find(
    (record) => record.id === lifeActivityId,
  );
}

function holdsFor(
  world: World,
  record: CampaignLifeActivityRecord,
): readonly ScheduledActivityRecord[] {
  return world.history.scheduledActivities.filter(
    (activity) =>
      activity.kind !== "travel" &&
      activity.sourceEntityIds.includes(record.invitationEventId),
  );
}

/** The hold that currently represents the activity (confirmed replaces tentative). */
function currentHold(
  world: World,
  record: CampaignLifeActivityRecord,
): ScheduledActivityRecord {
  return holdsFor(world, record).at(-1)!;
}

function journeyFor(
  world: World,
  hold: ScheduledActivityRecord,
): ScheduledActivityRecord | undefined {
  return world.history.scheduledActivities.find(
    (activity) =>
      activity.kind === "travel" && activity.sourceEntityIds.includes(hold.id),
  );
}

function outcomeFor(
  world: World,
  lifeActivityId: EntityId,
): CampaignLifeOutcomeRecord | undefined {
  return campaignLifeOutcomeRecords(world).find(
    (outcome) => outcome.activityId === lifeActivityId,
  );
}

function offerIsOpen(
  world: World,
  record: CampaignLifeActivityRecord,
): boolean {
  if (outcomeFor(world, record.id)) return false;
  const state = scheduledActivityState(world, currentHold(world, record).id);
  return (
    state.status === "scheduled" &&
    compareSimulationMoments(state.end, world.currentMoment) > 0
  );
}

function busy(
  world: World,
  personIds: readonly EntityId[],
  start: SimulationMoment,
  end: SimulationMoment,
  ignoredActivityIds: readonly EntityId[] = [],
): boolean {
  return world.history.scheduledActivities.some((activity) => {
    if (ignoredActivityIds.includes(activity.id)) return false;
    if (!activity.participantPersonIds.some((id) => personIds.includes(id)))
      return false;
    const state = scheduledActivityState(world, activity.id);
    return (
      state.status === "scheduled" &&
      compareSimulationMoments(start, state.end) < 0 &&
      compareSimulationMoments(state.start, end) < 0
    );
  });
}

function formatMoney(amount: MoneyAmount): string {
  return `$${(amount.minorUnits / 100).toFixed(2)}`;
}

function titleFor(
  world: World,
  entry: CampaignLifeCatalogEntry,
  hostOrganizationId: EntityId,
): string {
  return `${entry.title} with ${organizationName(world, hostOrganizationId)}`;
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                 */
/* -------------------------------------------------------------------------- */

interface ValidatedParties {
  readonly entry: CampaignLifeCatalogEntry;
  readonly campaign: CampaignRecord | null;
  readonly hostName: string;
  readonly jurisdictionId: EntityId;
}

/** Everything about an offer except its time. Throws player-facing text. */
function validateParties(
  world: World,
  input: Omit<OfferCampaignLifeActivityInput, "start" | "stableKey" | "origin">,
): ValidatedParties {
  const entry = campaignLifeCatalogEntry(input.form);
  const subject = world.people[input.subjectPersonId];
  if (!subject || !controlled(world, input.subjectPersonId)) {
    throw new Error("Only the person you are playing can take this up.");
  }
  if (deceased(world, subject.id)) {
    throw new Error("That person is no longer living.");
  }
  if (ageOnDate(subject.birthDate, world.currentDate) < LIFE.minimumAge) {
    throw new Error("Party and campaign activities are for adults.");
  }
  const host = world.people[input.hostPersonId];
  if (!host || deceased(world, host.id)) {
    throw new Error("Nobody is available to host that.");
  }
  if (host.id === subject.id) {
    throw new Error("Somebody else has to host this.");
  }
  if (!organizationRecord(world, input.hostOrganizationId)) {
    throw new Error("That organization is not in this world.");
  }
  const chapter = chapterFor(world, input.hostOrganizationId);
  const committee = chapter
    ? undefined
    : committeeCampaign(world, input.hostOrganizationId);
  if (chapter) {
    if (chapter.organizerPersonId !== host.id) {
      throw new Error(
        `${personName(host)} does not organize for ${chapter.name} right now.`,
      );
    }
  } else if (committee) {
    if (committee.candidatePersonId !== subject.id) {
      throw new Error("That is somebody else's campaign committee.");
    }
    const staff = activeStaffPersonIds(world, committee);
    const organizerVolunteer = homePartyChapters(world).some(
      (candidate) =>
        candidate.organizerPersonId === host.id &&
        organizerMetAtChapterMeeting(world, subject.id, host.id),
    );
    if (!staff.includes(host.id) && !organizerVolunteer) {
      throw new Error(
        `${personName(host)} does not work on this campaign, so they cannot host its work.`,
      );
    }
    if (input.campaignId !== committee.id) {
      throw new Error("Campaign committee work has to serve that campaign.");
    }
  } else {
    throw new Error(
      "That organization does not host party or campaign activities.",
    );
  }
  if (input.form === "support-request" && !chapter) {
    throw new Error("A support request is put to a party chapter.");
  }
  let campaign: CampaignRecord | null = null;
  if (input.campaignId !== null) {
    campaign = campaignById(world, input.campaignId);
    if (!campaign || campaign.candidatePersonId !== subject.id) {
      throw new Error("That is not your campaign.");
    }
    if (!campaignIsOpen(world, campaign)) {
      throw new Error("That campaign is no longer running.");
    }
  } else if (CAMPAIGN_ONLY_FORMS.includes(input.form)) {
    throw new Error(
      `A ${entry.title.toLowerCase()} needs a campaign you are running.`,
    );
  }
  const alreadyOpen = campaignLifeActivityRecords(world).some(
    (record) =>
      record.form === input.form &&
      record.subjectPersonId === subject.id &&
      record.hostPersonId === host.id &&
      offerIsOpen(world, record),
  );
  if (alreadyOpen) {
    throw new Error(
      `A ${entry.title.toLowerCase()} with ${personName(host)} is already on your calendar.`,
    );
  }
  return {
    entry,
    campaign,
    hostName: personName(host),
    jurisdictionId: organizationJurisdiction(
      world,
      input.hostOrganizationId,
      subject.homeJurisdictionId,
    ),
  };
}

/** Why this start will not do, or null. */
function timingProblem(
  world: World,
  entry: CampaignLifeCatalogEntry,
  start: SimulationMoment,
  campaign: CampaignRecord | null,
): string | null {
  const leadMinutes = entry.journeyKey === null ? 0 : entry.journeyMinutes;
  if (start.minuteOfDay - leadMinutes < 0) {
    return "It has to start late enough in the day to travel there.";
  }
  const leave = momentAt(
    world,
    makeIsoDate(start.date),
    start.minuteOfDay - leadMinutes,
  );
  if (compareSimulationMoments(leave, world.currentMoment) <= 0) {
    return "That time has already passed.";
  }
  if (
    start.minuteOfDay + entry.defaultMinutes >
    CAMPAIGN_LIFE_LATEST_END_MINUTE
  ) {
    return "It would run past nine in the evening.";
  }
  if (
    campaign &&
    start.date >= requireElectionContest(world, campaign.contestId).electionDate
  ) {
    return "That is not before election day.";
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* Offer and accept                                                           */
/* -------------------------------------------------------------------------- */

function writeHold(
  world: World,
  args: {
    readonly keyBase: string;
    readonly kind: "tentative" | "confirmed";
    readonly entry: CampaignLifeCatalogEntry;
    readonly title: string;
    readonly invitationId: EntityId;
    readonly subjectPersonId: EntityId;
    readonly hostPersonId: EntityId;
    readonly jurisdictionId: EntityId;
    readonly start: SimulationMoment;
    readonly end: SimulationMoment;
  },
): World {
  const { entry } = args;
  const access = {
    kind: "private" as const,
    personIds: [args.subjectPersonId, args.hostPersonId].sort(),
  };
  let next = createScheduledActivity(world, {
    stableKey: `${args.keyBase}:hold:${args.kind}`,
    title: args.title,
    summary:
      args.kind === "tentative"
        ? `${entry.title} at the ${entry.locationLabel.toLowerCase()}. Coming is optional.`
        : `${entry.title} at the ${entry.locationLabel.toLowerCase()} that you said you would do.`,
    kind: args.kind,
    start: args.start,
    end: args.end,
    // The host is on the hold so their real evening is checked too.
    participantPersonIds: [args.subjectPersonId, args.hostPersonId],
    responsiblePersonId: args.subjectPersonId,
    location: {
      locationKey: entry.locationKey,
      label: entry.locationLabel,
      jurisdictionId: args.jurisdictionId,
    },
    sourceEntityIds: [args.invitationId],
    flexibility: { kind: "fixed" },
    access,
  });
  if (entry.journeyKey === null) return next;
  const hold = next.history.scheduledActivities.at(-1)!;
  // The same bounded game-authored local journey the chapter meeting uses.
  next = createScheduledActivity(next, {
    stableKey: `${args.keyBase}:journey:${args.kind}`,
    title: `Journey to the ${entry.locationLabel.toLowerCase()}`,
    summary: `A game-authored ${entry.journeyMinutes}-minute local journey included in Attend. ${CAMPAIGN_LIFE_TRAVEL_COST_DISCLOSURE}`,
    kind: "travel",
    start: addSimulationMinutes(args.start, -entry.journeyMinutes),
    end: args.start,
    participantPersonIds: [args.subjectPersonId],
    responsiblePersonId: args.subjectPersonId,
    location: {
      locationKey: entry.journeyKey,
      label: `On the way to the ${entry.locationLabel.toLowerCase()}`,
      jurisdictionId: args.jurisdictionId,
    },
    sourceEntityIds: [hold.id],
    flexibility: { kind: "fixed" },
    access,
  });
  return next;
}

/**
 * An offered or requested party/campaign activity, put on the calendar.
 *
 * Host outreach is a tentative hold the person may decline; a request the
 * person made themselves is confirmed at once. Refuses, writing nothing, when
 * either person already has something at that time.
 */
export function offerCampaignLifeActivity(
  world: World,
  input: OfferCampaignLifeActivityInput,
): World {
  const parties = validateParties(world, input);
  const { entry, campaign } = parties;
  const problem = timingProblem(world, entry, input.start, campaign);
  if (problem) throw new Error(problem);
  const keyBase = input.stableKey;
  if (campaignLifeActivityRecords(world).some((r) => r.stableKey === keyBase)) {
    throw new Error("That activity has already been arranged.");
  }
  const start = input.start;
  const end = addSimulationMinutes(start, entry.defaultMinutes);
  const leave =
    entry.journeyKey === null
      ? start
      : addSimulationMinutes(start, -entry.journeyMinutes);
  if (busy(world, [input.subjectPersonId], leave, end)) {
    throw new Error(
      `You already have something on your calendar then, so the ${entry.title.toLowerCase()} could not be arranged.`,
    );
  }
  if (busy(world, [input.hostPersonId], start, end)) {
    throw new Error(
      `${parties.hostName} is already busy then, so the ${entry.title.toLowerCase()} could not be arranged.`,
    );
  }
  const title = titleFor(world, entry, input.hostOrganizationId);
  const host = world.people[input.hostPersonId]!;
  const date = makeIsoDate(start.date);
  const kind = input.origin === "host-outreach" ? "tentative" : "confirmed";

  let next = recordWorldEvent(world, {
    stableKey: `${keyBase}:offered`,
    type: CAMPAIGN_LIFE_OFFERED_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: parties.jurisdictionId,
    involvedEntityIds: [
      input.subjectPersonId,
      input.hostPersonId,
      input.hostOrganizationId,
    ],
    participants: [
      {
        personId: input.hostPersonId,
        role: "agency:asked",
        detail:
          input.origin === "host-outreach"
            ? `Offered a ${entry.title.toLowerCase()}`
            : `Agreed to host a ${entry.title.toLowerCase()}`,
      },
      {
        personId: input.subjectPersonId,
        role: "focus:asked-of",
        detail:
          input.origin === "host-outreach" ? "Was invited" : "Asked for it",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      CAMPAIGN_LIFE_CATALOG_VERSION,
      `form:${input.form}`,
      `organization:${input.hostOrganizationId}`,
      `origin:${input.origin}`,
    ],
    summary:
      input.origin === "host-outreach"
        ? `${personName(host)} offered a ${entry.title.toLowerCase()} with ${organizationName(world, input.hostOrganizationId)} on ${date}.`
        : `${personName(host)} agreed to host the ${entry.title.toLowerCase()} you asked for on ${date}.`,
    context: {
      location: {
        jurisdictionId: parties.jurisdictionId,
        label: entry.locationLabel,
        setting: entry.presence === "remote" ? "from home" : "community room",
      },
      socialContext:
        "An optional party or campaign activity. Coming is not joining, endorsing or voting.",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const invitation = next.history.events.at(-1)!;
  next = writeHold(next, {
    keyBase,
    kind,
    entry,
    title,
    invitationId: invitation.id,
    subjectPersonId: input.subjectPersonId,
    hostPersonId: input.hostPersonId,
    jurisdictionId: parties.jurisdictionId,
    start,
    end,
  });
  const hold = next.history.scheduledActivities.find(
    (activity) => activity.stableKey === `${keyBase}:hold:${kind}`,
  )!;
  next = recordEventKnowledge(next, {
    stableKey: `${keyBase}:knowledge`,
    personId: input.subjectPersonId,
    eventId: invitation.id,
    learnedAt: world.currentDate,
    believedSummary:
      input.origin === "host-outreach"
        ? `${personName(host)} offered a ${entry.title.toLowerCase()} on ${date}. Coming is optional.`
        : `${personName(host)} will host the ${entry.title.toLowerCase()} on ${date}.`,
    accuracy: "accurate",
    confidence: "high",
    source: {
      kind: "told-by",
      sourcePersonId: input.hostPersonId,
      claimId: null,
    },
  });
  const record: CampaignLifeActivityRecord = {
    id: createStableId("campaign-life-activity", `${world.id}:${keyBase}`),
    stableKey: keyBase,
    sequence: next.history.nextSequence,
    catalogVersion: CAMPAIGN_LIFE_CATALOG_VERSION,
    form: input.form,
    hostOrganizationId: input.hostOrganizationId,
    hostPersonId: input.hostPersonId,
    subjectPersonId: input.subjectPersonId,
    campaignId: campaign?.id ?? null,
    origin: input.origin,
    invitationEventId: invitation.id,
    scheduledActivityId: hold.id,
    createdAt: world.currentDate,
  };
  next = {
    ...next,
    history: {
      ...next.history,
      nextSequence: next.history.nextSequence + 1,
      campaignLifeActivities: [
        ...(next.history.campaignLifeActivities ?? []),
        record,
      ],
    },
  };
  assertWorldIntegrity(next);
  return next;
}

/**
 * Says yes ahead of time: the optional hold becomes a commitment. Returns the
 * same world when there is nothing to accept.
 */
export function acceptCampaignLifeActivity(
  world: World,
  personId: EntityId,
  lifeActivityId: EntityId,
): World {
  const record = lifeActivityById(world, lifeActivityId);
  if (!record || record.subjectPersonId !== personId) return world;
  if (!controlled(world, personId) || outcomeFor(world, record.id))
    return world;
  const tentative = currentHold(world, record);
  if (tentative.kind !== "tentative") return world;
  const state = scheduledActivityState(world, tentative.id);
  if (
    state.status !== "scheduled" ||
    compareSimulationMoments(state.start, world.currentMoment) <= 0
  )
    return world;
  const entry = campaignLifeCatalogEntry(record.form);
  const journey = journeyFor(world, tentative);
  const leave = journey
    ? scheduledActivityState(world, journey.id).start
    : state.start;
  const ignored = [tentative.id, ...(journey ? [journey.id] : [])];
  if (compareSimulationMoments(leave, world.currentMoment) <= 0) return world;
  if (busy(world, [personId, record.hostPersonId], leave, state.end, ignored)) {
    throw new Error(
      `Something else is now on the calendar then, so the ${entry.title.toLowerCase()} cannot be confirmed.`,
    );
  }
  // Built on a local value: if anything below throws, nothing escapes.
  let next = recordWorldEvent(world, {
    stableKey: `${record.stableKey}:accepted`,
    type: CAMPAIGN_LIFE_ACCEPTED_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: tentative.location.jurisdictionId,
    involvedEntityIds: [personId, tentative.id],
    participants: [
      { personId, role: "agency:actor", detail: "Said they would come" },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      CAMPAIGN_LIFE_CATALOG_VERSION,
      `invitation:${record.invitationEventId}`,
      "time-neutral",
    ],
    summary: `You said you would do the ${entry.title.toLowerCase()}.`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: `Accept the ${entry.title.toLowerCase()}`,
      motivation: null,
      immediateReaction: null,
    },
  });
  for (const id of ignored)
    if (scheduledActivityState(next, id).status === "scheduled")
      next = cancelScheduledActivity(next, id);
  next = writeHold(next, {
    keyBase: record.stableKey,
    kind: "confirmed",
    entry,
    title: tentative.title,
    invitationId: record.invitationEventId,
    subjectPersonId: personId,
    hostPersonId: record.hostPersonId,
    jurisdictionId: tentative.location.jurisdictionId!,
    start: state.start,
    end: state.end,
  });
  assertWorldIntegrity(next);
  return next;
}

/**
 * The person asks for an activity. The host is a real person who would run
 * it; the first evening in the next two weeks free for both is used.
 */
export function requestCampaignLifeActivity(
  world: World,
  personId: EntityId,
  input: RequestCampaignLifeActivityInput,
): World {
  if (!controlled(world, personId)) {
    throw new Error("Only the person you are playing can ask for this.");
  }
  const entry = campaignLifeCatalogEntry(input.form);
  const chapter = chapterFor(world, input.hostOrganizationId);
  let hostPersonId: EntityId | null = null;
  let campaignId: EntityId | null = null;
  if (chapter) {
    hostPersonId = chapter.organizerPersonId;
    if (!hostPersonId) {
      throw new Error(`${chapter.name} has nobody organizing right now.`);
    }
    if (
      FIELD_FORMS.includes(input.form) ||
      CAMPAIGN_ONLY_FORMS.includes(input.form)
    ) {
      campaignId = openCampaignFor(world, personId)?.id ?? null;
    }
  } else {
    const committee = committeeCampaign(world, input.hostOrganizationId);
    if (!committee) {
      throw new Error(
        "That organization does not host party or campaign activities.",
      );
    }
    if (committee.candidatePersonId !== personId) {
      throw new Error("That is somebody else's campaign committee.");
    }
    campaignId = committee.id;
    hostPersonId =
      activeStaffPersonIds(world, committee)[0] ??
      homePartyChapters(world).find(
        (candidate) =>
          candidate.organizerPersonId !== null &&
          organizerMetAtChapterMeeting(
            world,
            personId,
            candidate.organizerPersonId,
          ),
      )?.organizerPersonId ??
      null;
    if (!hostPersonId) {
      throw new Error(
        "Nobody is organizing for this campaign yet, so there is nobody to host it.",
      );
    }
  }
  const parties = validateParties(world, {
    form: input.form,
    hostOrganizationId: input.hostOrganizationId,
    hostPersonId,
    subjectPersonId: personId,
    campaignId,
  });
  const first = input.earliestDate ?? addDays(world.currentDate, 1);
  const startMinute =
    entry.presence === "remote"
      ? LIFE.phoneStartMinute
      : LIFE.inPersonStartMinute;
  const ordinal =
    campaignLifeActivityRecords(world).filter(
      (record) =>
        record.subjectPersonId === personId &&
        record.hostOrganizationId === input.hostOrganizationId &&
        record.form === input.form &&
        record.origin === "subject-request",
    ).length + 1;
  const organizationKey = organizationRecord(
    world,
    input.hostOrganizationId,
  )!.stableKey;
  for (let offset = 0; offset < LIFE.requestWindowDays; offset += 1) {
    const start = momentAt(world, addDays(first, offset), startMinute);
    if (timingProblem(world, entry, start, parties.campaign)) continue;
    const end = addSimulationMinutes(start, entry.defaultMinutes);
    const leave =
      entry.journeyKey === null
        ? start
        : addSimulationMinutes(start, -entry.journeyMinutes);
    if (busy(world, [personId], leave, end)) continue;
    if (busy(world, [hostPersonId], start, end)) continue;
    return offerCampaignLifeActivity(world, {
      form: input.form,
      hostOrganizationId: input.hostOrganizationId,
      hostPersonId,
      subjectPersonId: personId,
      campaignId,
      origin: "subject-request",
      start,
      stableKey: `${organizationKey}:campaign-life:request:${personId}:${input.form}:${ordinal}`,
    });
  }
  throw new Error(
    `Neither you nor ${parties.hostName} has a shared free evening in the next two weeks for a ${entry.title.toLowerCase()}.`,
  );
}

/* -------------------------------------------------------------------------- */
/* Candidate guidance                                                         */
/* -------------------------------------------------------------------------- */

export type CampaignGuidanceValue<T> =
  | {
      readonly state: "known";
      readonly value: T;
      readonly citation: string;
    }
  | { readonly state: "unknown"; readonly note: string }
  | { readonly state: "not-applicable"; readonly note: string };

export interface CampaignGuidanceOffice {
  readonly officeKey: string;
  readonly chamberName: string;
  readonly minimumAge: CampaignGuidanceValue<number>;
  readonly residency: CampaignGuidanceValue<string>;
  readonly termYears: CampaignGuidanceValue<number>;
  readonly filing: CampaignGuidanceValue<string>;
}

/** Something this game's sourced rules do not establish at all. */
export interface CampaignGuidanceUnestablished {
  readonly state: "not-established";
  readonly note: string;
}

export interface CampaignGuidanceView {
  readonly personId: EntityId;
  readonly jurisdictionId: EntityId;
  readonly stateJurisdictionKey: string | null;
  readonly authorityScope: "local" | "state" | null;
  readonly localOfficesUnsourced: boolean;
  readonly offices: readonly CampaignGuidanceOffice[];
  /** Why there is nothing to stand for, when there is nothing. */
  readonly noOfficeReason: string | null;
  readonly filingAuthority: CampaignGuidanceUnestablished;
  readonly filingDeadline: CampaignGuidanceUnestablished;
  readonly filingFees: CampaignGuidanceUnestablished;
  readonly petitions: CampaignGuidanceUnestablished;
  /** The game's own adult floor, labelled as the game's and not the law's. */
  readonly gameAdultCandidacyAge: number;
  readonly runningNow: boolean;
}

function guidanceValue<T>(rule: RuleValue<T>): CampaignGuidanceValue<T> {
  if (rule.kind === "known") {
    return {
      state: "known",
      value: rule.value,
      citation: rule.source.citation,
    };
  }
  return rule.kind === "unknown"
    ? { state: "unknown", note: rule.note }
    : { state: "not-applicable", note: rule.note };
}

const NOT_ESTABLISHED = (what: string): CampaignGuidanceUnestablished => ({
  state: "not-established",
  note: `This game's sourced rules do not establish ${what} for any office here, so nobody can tell you one.`,
});

/**
 * What a host can honestly tell this person about running for office where
 * they live. Pure. Every value is either read from an accepted rule source or
 * reported as unknown; filing mechanics are never invented.
 */
export function projectCampaignGuidance(
  world: World,
  personId: EntityId,
): CampaignGuidanceView {
  const person = world.people[personId];
  if (!person) throw new Error("That person is not in this world.");
  const authority = candidacyAuthority(person.homeJurisdictionId);
  const offices = (authority.pack?.offices ?? []).map((option) => ({
    officeKey: option.officeKey,
    chamberName: option.chamberName,
    minimumAge: guidanceValue(option.qualification.minimumAge),
    residency: guidanceValue(option.qualification.residency),
    termYears: guidanceValue(option.qualification.termYears),
    filing: guidanceValue(option.qualification.filing),
  }));
  return {
    personId,
    jurisdictionId: person.homeJurisdictionId,
    stateJurisdictionKey: authority.stateJurisdictionKey,
    authorityScope: authority.scope,
    localOfficesUnsourced: authority.localOfficesUnsourced,
    offices,
    noOfficeReason:
      offices.length > 0
        ? null
        : authority.stateJurisdictionKey === null
          ? "The game has not read any elected office for this place."
          : "The game has not read this state's elected offices yet.",
    filingAuthority: NOT_ESTABLISHED("which official accepts candidacy papers"),
    filingDeadline: NOT_ESTABLISHED("a filing deadline"),
    filingFees: NOT_ESTABLISHED("a filing fee"),
    petitions: NOT_ESTABLISHED("a petition or signature requirement"),
    gameAdultCandidacyAge: GAME_ADULT_CANDIDACY_AGE,
    runningNow: activeCampaignForCandidate(world, personId) !== null,
  };
}

function guidanceText(view: CampaignGuidanceView): string {
  const describe = <T>(label: string, value: CampaignGuidanceValue<T>) =>
    value.state === "known"
      ? `${label} ${String(value.value)} (${value.citation})`
      : `${label} not known to this game`;
  const offices =
    view.offices.length === 0
      ? (view.noOfficeReason ?? "No office is established here.")
      : view.offices
          .map(
            (office) =>
              `${office.chamberName}: ${describe("minimum age", office.minimumAge)}; ${describe("residency", office.residency)}; ${describe("term in years", office.termYears)}`,
          )
          .join(". ");
  return `${offices}. Who accepts filings, the deadline, any fee and any petition requirement are not established by this game's sourced rules. The game itself will not put anyone under ${view.gameAdultCandidacyAge} on a ballot.`;
}

/* -------------------------------------------------------------------------- */
/* Persistent contacts                                                        */
/* -------------------------------------------------------------------------- */

function ensureContactPerson(
  world: World,
  stableKey: string,
  homeJurisdictionId: EntityId,
): { readonly world: World; readonly personId: EntityId } {
  const personId = characterHistoryContextPersonId(world, stableKey);
  if (world.people[personId]) return { world, personId };
  const rng = new SeededRng(world.seed).fork(
    `campaign-life-person:${stableKey}`,
  );
  const year =
    Number(world.currentDate.slice(0, 4)) -
    rng.integer(LIFE.contactAgeYears[0], LIFE.contactAgeYears[1] + 1);
  const next = createCharacterHistoryContextPerson(world, {
    stableKey,
    ...drawCanonicalNamedIdentity(
      rng.fork("name"),
      generatePersonIdentity(rng.fork("identity")),
    ),
    birthDate: makeIsoDate(
      `${year}-${String(rng.integer(1, 13)).padStart(2, "0")}-${String(rng.integer(1, 29)).padStart(2, "0")}`,
    ),
    homeJurisdictionId,
  });
  return { world: next, personId };
}

/* -------------------------------------------------------------------------- */
/* Attendance and outcomes                                                    */
/* -------------------------------------------------------------------------- */

function supportRequestDecision(
  world: World,
  record: CampaignLifeActivityRecord,
  decisionKey: string,
): CampaignSupportDecision {
  const chapter = chapterFor(world, record.hostOrganizationId)!;
  const considerations: DecisionConsideration[] = [];
  for (const outcome of campaignLifeOutcomeRecords(world)) {
    const activity = lifeActivityById(world, outcome.activityId)!;
    if (
      activity.subjectPersonId !== record.subjectPersonId ||
      activity.hostPersonId !== record.hostPersonId
    )
      continue;
    considerations.push({
      stableKey: `${decisionKey}:worked-with:${outcome.id}`,
      optionKey: "grant",
      sourceType: "social:relationship",
      direction: "supports",
      importance: "moderate",
      confidence: "high",
      explanation: "They have turned up for this chapter's work before.",
      sourceRefs: [
        { kind: "historical-event", eventId: outcome.outcomeEventId },
      ],
    });
  }
  const member = world.history.organizationParticipations.some(
    (participation) =>
      participation.personId === record.subjectPersonId &&
      participation.organizationId === record.hostOrganizationId &&
      participation.kind === CHAPTER_MEMBERSHIP_KIND &&
      organizationParticipationStateAt(world, participation.id)?.status ===
        "active",
  );
  if (!member) {
    considerations.push({
      stableKey: `${decisionKey}:not-a-member`,
      optionKey: "defer",
      sourceType: "context:chapter-membership",
      direction: "supports",
      importance: "moderate",
      confidence: "high",
      explanation: "They are not a member of the chapter.",
      sourceRefs: [],
    });
  }
  if (
    publicPartyAffiliation(world, record.subjectPersonId) !==
    chapter.partyOrganizationId
  ) {
    considerations.push({
      stableKey: `${decisionKey}:no-shared-affiliation`,
      optionKey: "decline",
      sourceType: "context:party-affiliation",
      direction: "supports",
      importance: "moderate",
      confidence: "high",
      explanation: "Nothing on record says they share the chapter's party.",
      sourceRefs: [],
    });
  }
  for (const finding of rememberedAdverseFindingsAgainst(
    world,
    record.subjectPersonId,
  )) {
    considerations.push({
      stableKey: `${decisionKey}:public-finding:${finding.step.id}`,
      optionKey: "decline",
      sourceType: "context:public-ethics-finding",
      direction: "supports",
      importance: "strong",
      confidence: "high",
      explanation: `The ${finding.proceeding.institutionLabel} has made a public finding against them.`,
      sourceRefs: [{ kind: "historical-event", eventId: finding.step.eventId }],
    });
  }
  const evaluation = evaluateDecision(world, {
    stableKey: decisionKey,
    decisionType: "campaign.support-request",
    actorPersonId: record.hostPersonId,
    cutoff: {
      asOfDate: world.currentDate,
      historySequenceExclusive: world.history.nextSequence,
    },
    subject: {
      kind: "context:life",
      key: "campaign-support-request",
      entityId: null,
    },
    options: [
      {
        key: "grant",
        label: "Back the campaign",
        description: "Tell them the chapter will support the campaign.",
      },
      {
        key: "decline",
        label: "Decline",
        description: "Tell them the chapter will not support it.",
      },
      {
        key: "defer",
        label: "Not yet",
        description: "Leave it for the chapter to take up later.",
      },
    ],
    constraints: [],
    considerations,
    perceptionIds: [],
    randomness: "close-choices",
    retention: "ephemeral",
  });
  return evaluation.selectedOptionKey === "grant"
    ? "granted"
    : evaluation.selectedOptionKey === "decline"
      ? "declined"
      : "deferred";
}

interface FundraiserPlan {
  readonly amount: MoneyAmount;
  readonly allowed: boolean;
  readonly note: string;
  readonly decisionTag: string;
}

function planFundraiser(
  world: World,
  campaign: CampaignRecord,
  donorPersonId: EntityId,
  outcomeId: EntityId,
): FundraiserPlan {
  const amount: MoneyAmount = {
    minorUnits: new SeededRng(world.seed)
      .fork(`campaign-life-fundraiser:${outcomeId}`)
      .integer(LIFE.fundraiserMinorUnits[0], LIFE.fundraiserMinorUnits[1] + 1),
    currency: campaign.treasuryCurrency,
  };
  const donor = world.people[donorPersonId]!;
  const donorPosition = resourcePositionAt(
    world,
    { kind: "person", personId: donorPersonId },
    amount.currency,
  );
  if (
    donorPosition &&
    donorPosition.liquidBalance.minorUnits < amount.minorUnits
  ) {
    return {
      amount,
      allowed: false,
      note: `${personName(donor)} did not have ${formatMoney(amount)} to give, so nothing was collected.`,
      decisionTag: "compliance:not-attempted",
    };
  }
  const kentucky = campaignCompliancePackFor(world, campaign.id);
  if (kentucky) {
    return planKentuckyGift(world, campaign, donorPersonId, amount, kentucky);
  }
  const ruling = assessContribution(world, {
    campaignId: campaign.id,
    sourcePersonId: donorPersonId,
    incomingMinorUnits: amount.minorUnits,
    statementOfOrganizationFiled: null,
    treasurerPersonId: null,
    treasurerQualifiedElector: null,
  });
  return {
    amount,
    allowed: ruling.decision !== "refused",
    note:
      ruling.decision === "refused"
        ? `The committee could not accept the gift: ${ruling.reason}`
        : ruling.reason,
    decisionTag: `compliance:${ruling.decision}`,
  };
}

/** What this donor has already given this committee through recorded gifts. */
function givenByDonorMinorUnits(
  world: World,
  campaign: CampaignRecord,
  donorPersonId: EntityId,
): number {
  const flowIds = new Set(
    world.history.resourceFlows
      .filter(
        (flow) =>
          flow.source.kind === "person" &&
          flow.source.personId === donorPersonId &&
          flow.recipient.kind === "organization" &&
          flow.recipient.organizationId === campaign.organizationId &&
          flow.basisKind === "custom:campaign-contribution",
      )
      .map((flow) => flow.id),
  );
  return world.history.resourceTransferOutcomes
    .filter(
      (outcome) =>
        flowIds.has(outcome.resourceFlowId) &&
        outcome.transferredAmount.currency === campaign.treasuryCurrency,
    )
    .reduce((sum, outcome) => sum + outcome.transferredAmount.minorUnits, 0);
}

/**
 * A Kentucky gift under the reviewed pack.
 *
 * The pack requires a contributor's address, employer and occupation once a
 * contributor's gifts pass its itemization threshold. This World does not
 * record any of those for a generated donor, and they are never invented, so
 * the donor keeps their total at or under the threshold — the one path the
 * pack itself makes recordable without them. The total is counted across all
 * of this donor's recorded gifts to the committee (the conservative reading).
 * When nothing more fits, or the threshold is not established on this date,
 * nothing is collected and the outcome says exactly why.
 */
function planKentuckyGift(
  world: World,
  campaign: CampaignRecord,
  donorPersonId: EntityId,
  drawn: MoneyAmount,
  pack: CampaignComplianceRulePack,
): FundraiserPlan {
  const donorName = personName(world.people[donorPersonId]!);
  const threshold = pack.itemizationThresholdMinorUnits;
  const given = givenByDonorMinorUnits(world, campaign, donorPersonId);
  const missingFacts =
    "the game does not record this donor's address, employer or occupation";
  let amount = drawn;
  let capNote = "";
  if (
    threshold.state === "KNOWN" &&
    given + drawn.minorUnits > threshold.value
  ) {
    const room = threshold.value - given;
    const limit = formatMoney({
      minorUnits: threshold.value,
      currency: drawn.currency,
    });
    if (room <= 0) {
      return {
        amount: drawn,
        allowed: false,
        note: `${donorName} has already given ${limit}, the most Kentucky lets a committee record without itemizing (${threshold.source.legalLocator}), and ${missingFacts}, so nothing more was collected.`,
        decisionTag: "compliance:refused",
      };
    }
    amount = { minorUnits: room, currency: drawn.currency };
    capNote = ` The gift was kept to ${formatMoney(amount)} so ${donorName}'s total stays within ${limit}, because ${missingFacts} and Kentucky requires them above that amount (${threshold.source.legalLocator}).`;
  }
  const assessment = assessKentuckyCampaignContribution({
    onDate: world.currentDate,
    contributorKind: "individual",
    // Assessed on the donor's running total, not on this gift alone.
    amountMinorUnits: given + amount.minorUnits,
    currency: amount.currency,
    contributorName: donorName,
    contributorAddress: null,
    employer: null,
    occupation: null,
  });
  return assessment.acceptableForRecording
    ? {
        amount,
        allowed: true,
        note: `The Kentucky pack's recordability checks were satisfied; the gift needs no itemization.${capNote}`,
        decisionTag: "compliance:allowed",
      }
    : {
        amount,
        allowed: false,
        note: `The committee could not record the gift: ${assessment.refusals.join(" ")}${assessment.requiresItemization === true ? ` (${missingFacts}.)` : ""}`,
        decisionTag: "compliance:refused",
      };
}

/**
 * Records what happened at a completed party/campaign activity.
 *
 * Call it after the calendar activity itself has completed. `condensed`
 * produces exactly the outcome `attended` does; only the attendance field
 * differs. Returns the same world when the outcome is already recorded.
 */
export function recordCampaignLifeAttendance(
  world: World,
  personId: EntityId,
  scheduledActivityId: EntityId,
  attendance: CampaignLifeAttendance,
): World {
  if (attendance !== "attended" && attendance !== "condensed") {
    throw new Error("Attendance is either attended or condensed.");
  }
  const activity = world.history.scheduledActivities.find(
    (candidate) => candidate.id === scheduledActivityId,
  );
  const record = activity
    ? campaignLifeActivityRecords(world).find(
        (candidate) =>
          activity.kind !== "travel" &&
          activity.sourceEntityIds.includes(candidate.invitationEventId),
      )
    : undefined;
  if (!activity || !record) {
    throw new Error("That calendar entry is not a party or campaign activity.");
  }
  if (record.subjectPersonId !== personId || !controlled(world, personId)) {
    throw new Error("Only the person you are playing can record this.");
  }
  if (outcomeFor(world, record.id)) return world;
  const activityState = scheduledActivityState(world, activity.id);
  if (activityState.status !== "completed") {
    throw new Error("That activity has not happened yet.");
  }
  // The day the activity actually finished; a late recording still dates what
  // happened to that day, while money and support are recorded when recorded.
  const completedAt = makeIsoDate(activityState.recordedAt.date);
  const entry = campaignLifeCatalogEntry(record.form);
  const subject = world.people[personId]!;
  const host = world.people[record.hostPersonId]!;
  const hostOrganization = organizationRecord(
    world,
    record.hostOrganizationId,
  )!;
  const orgName = organizationName(world, record.hostOrganizationId);
  const keyBase = `${record.stableKey}:outcome`;
  const outcomeId = createStableId(
    "campaign-life-outcome",
    `${world.id}:${keyBase}`,
  );
  const jurisdictionId = activity.location.jurisdictionId;
  const homeJurisdictionId = jurisdictionId ?? subject.homeJurisdictionId;
  const orgKey = hostOrganization.stableKey;
  const minutes = simulationMinutesBetween(
    activityState.start,
    activityState.end,
  );
  const campaign =
    record.campaignId === null ? null : campaignById(world, record.campaignId);
  const openCampaign =
    campaign && campaignIsOpen(world, campaign) ? campaign : null;

  // Decide what the host decides before anything is written.
  const supportDecision: CampaignSupportDecision | null =
    record.form === "support-request" && openCampaign
      ? supportRequestDecision(world, record, `${keyBase}:decision`)
      : null;

  // Persistent contacts, created the first time they are needed.
  let next = world;
  const contactPersonIds: EntityId[] = [];
  // A persistent contact who has since died is never met again; the next
  // numbered person in that role is used instead.
  const addContact = (roleKey: string, first: number) => {
    let n = first;
    while (
      deceased(next, characterHistoryContextPersonId(next, `${roleKey}:${n}`))
    )
      n += 1;
    const ensured = ensureContactPerson(
      next,
      `${roleKey}:${n}`,
      homeJurisdictionId,
    );
    next = ensured.world;
    contactPersonIds.push(ensured.personId);
    return ensured.personId;
  };
  if (FIELD_FORMS.includes(record.form)) {
    const priorShifts = campaignLifeOutcomeRecords(world).filter((outcome) => {
      const prior = lifeActivityById(world, outcome.activityId)!;
      return (
        prior.hostOrganizationId === record.hostOrganizationId &&
        FIELD_FORMS.includes(prior.form)
      );
    }).length;
    const second =
      priorShifts >= LIFE.rosterThreshold &&
      new SeededRng(world.seed)
        .fork(`campaign-life-roster:${outcomeId}`)
        .integer(0, 2) === 1;
    addContact(`${orgKey}:campaign-life:volunteer`, second ? 2 : 1);
  } else if (record.form === "fundraiser") {
    addContact(`${orgKey}:campaign-life:donor`, 1);
  } else if (record.form === "town-hall") {
    // TODO(PRESS): a reporter covering the town hall belongs to PRESS's
    // persistent press people; none is invented here.
    addContact(`${orgKey}:campaign-life:community`, 1);
  }
  const contactNames = contactPersonIds.map((id) =>
    personName(next.people[id]!),
  );

  // What happened, said in advance of the writes that make it true.
  const guidance =
    record.form === "candidate-guidance"
      ? projectCampaignGuidance(world, personId)
      : null;
  const fundraiser =
    record.form === "fundraiser" && openCampaign
      ? planFundraiser(next, openCampaign, contactPersonIds[0]!, outcomeId)
      : null;
  let summary: string;
  switch (record.form) {
    case "organization-meeting":
      summary = `An organizing meeting of ${orgName} with ${personName(host)}.`;
      break;
    case "door-canvass":
    case "phone-shift":
      summary = `A ${entry.title.toLowerCase()} for ${orgName} with ${personName(host)} and ${contactNames[0]}.${openCampaign ? " The work was for the campaign." : ""}`;
      break;
    case "candidate-guidance":
      summary = `${personName(host)} went over what is known about running for office here. ${guidanceText(guidance!)}`;
      break;
    case "fundraiser":
      summary = !openCampaign
        ? `A small fundraiser with ${personName(host)} and ${contactNames[0]}. The campaign was no longer running, so nothing was collected.`
        : fundraiser!.allowed
          ? `A small fundraiser with ${personName(host)}. ${contactNames[0]} gave ${formatMoney(fundraiser!.amount)} to the campaign committee. ${fundraiser!.note}`
          : `A small fundraiser with ${personName(host)} and ${contactNames[0]}. ${fundraiser!.note}`;
      break;
    case "support-request":
      summary = !openCampaign
        ? `A conversation with ${personName(host)} about support. The campaign was no longer running, so nothing was asked.`
        : `You asked ${personName(host)} for ${orgName}'s support.`;
      break;
    case "town-hall":
      summary = `A community town hall hosted by ${orgName}, where you spoke with ${personName(host)} and ${contactNames[0]}.`;
      break;
  }

  next = recordWorldEvent(next, {
    stableKey: `${keyBase}:attended`,
    type: CAMPAIGN_LIFE_ATTENDED_EVENT,
    occurredAt: completedAt,
    recordedAt: world.currentDate,
    jurisdictionId,
    involvedEntityIds: [
      personId,
      record.hostPersonId,
      record.hostOrganizationId,
      activity.id,
      ...contactPersonIds,
      ...(openCampaign ? [openCampaign.id] : []),
    ],
    participants: [
      { personId, role: "presence:participant", detail: "Took part" },
      {
        personId: record.hostPersonId,
        role: "presence:participant",
        detail: "Hosted",
      },
      ...contactPersonIds.map((id) => ({
        personId: id,
        role: "presence:participant" as const,
        detail: "Was there",
      })),
    ],
    personFactConstraints: [],
    visibility: record.form === "town-hall" ? "public" : "limited",
    tags: [
      CAMPAIGN_LIFE_CATALOG_VERSION,
      `form:${record.form}`,
      `invitation:${record.invitationEventId}`,
      `organization:${record.hostOrganizationId}`,
      ...(fundraiser ? [fundraiser.decisionTag] : []),
    ],
    summary,
    context: {
      location: {
        jurisdictionId,
        label: activity.location.label,
        setting: entry.presence === "remote" ? "from home" : "community room",
      },
      socialContext:
        "Taking part is not joining, endorsing, registering or voting.",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const outcomeEvent = next.history.events.at(-1)!;

  // Field work for a running campaign moves canonical support.
  let supportStateIds: readonly EntityId[] = [];
  if (FIELD_FORMS.includes(record.form) && openCampaign) {
    const workers = 2 + contactPersonIds.length;
    const swing = new SeededRng(world.seed)
      .fork(`campaign-life-field:${outcomeId}`)
      .integer(60, 141);
    const shift = recordSupportShift(next, openCampaign, {
      stableKeyBase: keyBase,
      gainerPersonId: openCampaign.candidatePersonId,
      gainBasisPoints: Math.floor(
        ((minutes * workers * 3) / 2) * (swing / 100),
      ),
      sourceEntityIds: [outcomeEvent.id],
    });
    next = shift.world;
    supportStateIds = shift.stateIds;
  }

  let guidanceKnowledgeId: EntityId | null = null;
  if (guidance) {
    next = recordEventKnowledge(next, {
      stableKey: `${keyBase}:guidance`,
      personId,
      eventId: outcomeEvent.id,
      learnedAt: completedAt,
      believedSummary: guidanceText(guidance),
      accuracy: "accurate",
      confidence: "high",
      source: {
        kind: "told-by",
        sourcePersonId: record.hostPersonId,
        claimId: null,
      },
    });
    guidanceKnowledgeId = next.history.knowledge.at(-1)!.id;
  }

  let resourceFlowId: EntityId | null = null;
  let raisedAmount: MoneyAmount | null = null;
  if (fundraiser?.allowed && openCampaign) {
    next = createResourceFlow(next, {
      stableKey: `${keyBase}:contribution`,
      source: { kind: "person", personId: contactPersonIds[0]! },
      recipient: positionOwnerEndpoint({
        kind: "organization",
        organizationId: openCampaign.organizationId,
      }),
      startsAt: next.currentDate,
      initialStatus: "active",
      amount: fundraiser.amount,
      cadenceKind: "schedule:one-time",
      basisKind: "custom:campaign-contribution",
      basisReference: { kind: "general" },
      restrictionKind: "purpose:campaign",
      jurisdictionId: openCampaign.jurisdictionId,
      provenance: { kind: "simulated-event", eventId: outcomeEvent.id },
    });
    resourceFlowId = next.history.resourceFlows.at(-1)!.id;
    next = recordResourceTransferOutcome(next, {
      stableKey: `${keyBase}:contribution:transfer`,
      resourceFlowId,
      periodStartsAt: next.currentDate,
      periodEndsAt: next.currentDate,
      occurredAt: next.currentDate,
      status: "completed",
      attemptedAmount: fundraiser.amount,
      transferredAmount: fundraiser.amount,
      reasonKind: null,
      note: "A gift at a small fundraiser, received by the campaign committee.",
      provenance: { kind: "simulated-event", eventId: outcomeEvent.id },
    });
    raisedAmount = fundraiser.amount;
  }

  let recordedDecision: CampaignLifeOutcomeRecord["supportDecision"] = null;
  if (supportDecision) {
    const said =
      supportDecision === "granted"
        ? "said the chapter would back the campaign"
        : supportDecision === "declined"
          ? "said the chapter would not back the campaign"
          : "said the chapter would take it up later";
    next = recordWorldEvent(next, {
      stableKey: `${keyBase}:support-decision`,
      type: CAMPAIGN_SUPPORT_REQUEST_DECIDED_EVENT,
      occurredAt: completedAt,
      recordedAt: world.currentDate,
      jurisdictionId,
      involvedEntityIds: [
        record.hostPersonId,
        personId,
        record.hostOrganizationId,
      ],
      participants: [
        {
          personId: record.hostPersonId,
          role: "agency:decided",
          detail: `Decided for ${orgName}`,
        },
        { personId, role: "focus:asked-for-support", detail: "Asked" },
      ],
      personFactConstraints: [],
      visibility: "limited",
      tags: [
        CAMPAIGN_LIFE_CATALOG_VERSION,
        `decision:${supportDecision}`,
        `invitation:${record.invitationEventId}`,
      ],
      summary: `${personName(host)} ${said}. Nothing about the ballot, the filing or the campaign changed.`,
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: "Back the campaign, decline, or take it up later",
        motivation: null,
        immediateReaction: null,
      },
    });
    recordedDecision = {
      decidedByPersonId: record.hostPersonId,
      organizationId: record.hostOrganizationId,
      decision: supportDecision,
    };
  }

  // PEOPLE contract: only the people actually met, one interaction each.
  const earlierMet = new Set(
    campaignLifeOutcomeRecords(world).flatMap((outcome) => {
      const prior = lifeActivityById(world, outcome.activityId)!;
      return prior.subjectPersonId === personId
        ? [prior.hostPersonId, ...outcome.contactPersonIds]
        : [];
    }),
  );
  const relationshipInteractionIds: EntityId[] = [];
  for (const otherId of [record.hostPersonId, ...contactPersonIds]) {
    const other = next.people[otherId]!;
    const pair = [personId, otherId].sort();
    const knownBefore = next.history.relationshipInteractions.some(
      (interaction) =>
        interaction.personIds[0] === pair[0] &&
        interaction.personIds[1] === pair[1],
    );
    next = recordRelationshipInteraction(next, {
      stableKey: `${keyBase}:contact:${otherId}`,
      personIds: [personId, otherId],
      eventId: outcomeEvent.id,
      occurredAt: completedAt,
      kind: CAMPAIGN_LIFE_CONTACT_KIND,
      change: knownBefore ? "maintained" : "formed",
      significance: "minor",
      summary: `Met ${personName(other)} at a ${entry.title.toLowerCase()}.`,
      tags: [CAMPAIGN_LIFE_CONTACT_TAG],
    });
    relationshipInteractionIds.push(
      next.history.relationshipInteractions.at(-1)!.id,
    );
    if (earlierMet.has(otherId)) {
      next = recordRelationshipInteraction(next, {
        stableKey: `${keyBase}:recurring:${otherId}`,
        personIds: [personId, otherId],
        eventId: outcomeEvent.id,
        occurredAt: completedAt,
        kind: CAMPAIGN_LIFE_RECURRING_CONTACT_KIND,
        change: "strengthened",
        significance: "minor",
        summary: `Worked alongside ${personName(other)} again.`,
        tags: [CAMPAIGN_LIFE_CONTACT_TAG],
      });
      relationshipInteractionIds.push(
        next.history.relationshipInteractions.at(-1)!.id,
      );
    }
  }

  const outcome: CampaignLifeOutcomeRecord = {
    id: outcomeId,
    stableKey: keyBase,
    sequence: next.history.nextSequence,
    activityId: record.id,
    scheduledActivityId: activity.id,
    completedAt,
    attendance,
    outcomeEventId: outcomeEvent.id,
    contactPersonIds,
    relationshipInteractionIds,
    resourceFlowId,
    raisedAmount,
    supportStateIds: [...supportStateIds],
    supportDecision: recordedDecision,
    guidanceKnowledgeId,
  };
  next = {
    ...next,
    history: {
      ...next.history,
      nextSequence: next.history.nextSequence + 1,
      campaignLifeOutcomes: [
        ...(next.history.campaignLifeOutcomes ?? []),
        outcome,
      ],
    },
  };
  next = ensureCampaignLifeOutreach(next, personId, record.hostOrganizationId);
  assertWorldIntegrity(next);
  return next;
}

/* -------------------------------------------------------------------------- */
/* Organizer outreach                                                         */
/* -------------------------------------------------------------------------- */

function outreachPrefix(
  world: World,
  chapter: HomePartyChapter,
  subjectPersonId: EntityId,
): string {
  const key = organizationRecord(world, chapter.organizationId)!.stableKey;
  return `${key}:campaign-life:outreach:${subjectPersonId}:`;
}

/**
 * Makes sure a chapter organizer will think about this person again. Only an
 * action calls this; reading never schedules anything. Returns the same world
 * when an outreach is already pending or the chapter has no organizer.
 */
export function ensureCampaignLifeOutreach(
  world: World,
  subjectPersonId: EntityId,
  hostOrganizationId: EntityId,
): World {
  const chapter = chapterFor(world, hostOrganizationId);
  if (!chapter?.organizerPersonId || !world.people[subjectPersonId])
    return world;
  const prefix = outreachPrefix(world, chapter, subjectPersonId);
  const items = world.history.futureDueItems.filter((item) =>
    item.stableKey.startsWith(prefix),
  );
  const pending = items.some(
    (item) =>
      world.history.futureDueItemStates
        .filter((state) => state.dueItemId === item.id)
        .at(-1)?.status === "scheduled",
  );
  if (pending) return world;
  const n =
    Math.max(
      0,
      ...items.map((item) => Number(item.stableKey.slice(prefix.length))),
    ) + 1;
  const next = scheduleFutureDueItem(world, {
    stableKey: `${prefix}${n}`,
    dueAt: addDays(
      world.currentDate,
      new SeededRng(world.seed)
        .fork(`${prefix}${n}:first`)
        .integer(LIFE.firstOutreachDays[0], LIFE.firstOutreachDays[1] + 1),
    ),
    transitionKey: CAMPAIGN_LIFE_OUTREACH_KEY,
    entityIds: [
      chapter.organizerPersonId,
      subjectPersonId,
      chapter.organizationId,
    ].sort(),
    jurisdictionId: chapter.jurisdictionId,
    provenance: {
      kind: "simulated",
      sourceEntityIds: [chapter.organizerPersonId],
    },
  });
  assertWorldIntegrity(next);
  return next;
}

const FORM_OPTION_TEXT: Readonly<Record<CampaignLifeForm, string>> = {
  "organization-meeting": "Ask them to an organizing meeting.",
  "door-canvass": "Ask them to knock doors for an evening.",
  "phone-shift": "Ask them to make calls for an evening.",
  "candidate-guidance": "Offer to talk through running for office.",
  fundraiser: "Offer to hold a small fundraiser for their campaign.",
  "support-request": "Invite them to ask the chapter for its support.",
  "town-hall": "Ask them to the chapter's community town hall.",
};

/**
 * A chapter organizer's own consideration of what, if anything, to offer this
 * person next. No monthly quota: the organizer simply thinks about it again
 * some days later, whatever was chosen.
 */
export function campaignLifeOutreachTransitionHandler(
  world: World,
  dueItem: FutureDueItem,
): FutureTransitionHandlerResult {
  if (dueItem.transitionKey !== CAMPAIGN_LIFE_OUTREACH_KEY) {
    throw new Error(
      "The campaign outreach handler received another transition.",
    );
  }
  const blocked = (reason: string): FutureTransitionHandlerResult => ({
    world,
    status: "blocked",
    reasonKey: `campaign:${reason}`,
    context: "Diagnostic: the organizer or the subject cannot continue.",
    outcomeEventId: null,
  });
  const chapter = homePartyChapters(world).find((candidate) =>
    dueItem.entityIds.includes(candidate.organizationId),
  );
  const hostId =
    chapter?.organizerPersonId &&
    dueItem.entityIds.includes(chapter.organizerPersonId)
      ? chapter.organizerPersonId
      : null;
  const subjectId =
    dueItem.entityIds.find(
      (id) => id !== hostId && world.people[id] !== undefined,
    ) ?? null;
  if (!chapter || !hostId || !subjectId) return blocked("organizer-absent");
  if (deceased(world, hostId) || deceased(world, subjectId))
    return blocked("actor-lost-standing");

  const prefix = dueItem.stableKey.slice(
    0,
    dueItem.stableKey.lastIndexOf(":") + 1,
  );
  const n = Number(dueItem.stableKey.slice(prefix.length)) + 1;
  const rng = new SeededRng(world.seed).fork(
    `campaign-life-outreach:${dueItem.stableKey}`,
  );
  const reschedule = (next: World, days: number): World =>
    scheduleFutureDueItem(next, {
      stableKey: `${prefix}${n}`,
      dueAt: addDays(world.currentDate, days),
      transitionKey: CAMPAIGN_LIFE_OUTREACH_KEY,
      entityIds: [...dueItem.entityIds],
      jurisdictionId: chapter.jurisdictionId,
      provenance: { kind: "simulated", sourceEntityIds: [hostId] },
    });
  const nextGap = () =>
    rng
      .fork("next")
      .integer(LIFE.nextOutreachDays[0], LIFE.nextOutreachDays[1] + 1);
  const deferred = (
    reason: string,
    days: number,
  ): FutureTransitionHandlerResult => ({
    world: reschedule(world, days),
    status: "resolved",
    reasonKey: `campaign:${reason}`,
    context: null,
    outcomeEventId: null,
  });

  const subject = world.people[subjectId]!;
  if (world.control.kind !== "person" || world.control.personId !== subjectId)
    return deferred("subject-not-in-play", LIFE.deferDays);
  if (ageOnDate(subject.birthDate, world.currentDate) < LIFE.minimumAge)
    return deferred("subject-not-adult", LIFE.deferDays);
  const fromHost = campaignLifeActivityRecords(world).filter(
    (record) =>
      record.subjectPersonId === subjectId && record.hostPersonId === hostId,
  );
  if (fromHost.some((record) => offerIsOpen(world, record)))
    return deferred("offer-already-open", LIFE.deferDays);

  const campaign = openCampaignFor(world, subjectId);
  const attendedCount = campaignLifeOutcomeRecords(world).filter(
    (outcome) =>
      lifeActivityById(world, outcome.activityId)!.subjectPersonId ===
      subjectId,
  ).length;
  const forms: CampaignLifeForm[] = [
    "door-canvass",
    "phone-shift",
    "town-hall",
  ];
  if (campaign) forms.push("fundraiser", "support-request");
  if (!campaign && attendedCount >= 2) forms.push("candidate-guidance");
  const options: DecisionOption[] = [
    ...forms.map((form) => ({
      key: form,
      label: CAMPAIGN_LIFE_CATALOG[form].title,
      description: FORM_OPTION_TEXT[form],
    })),
    { key: "not-now", label: "Not now", description: "Leave it for now." },
  ];

  // Only what the organizer was part of counts, and only recently.
  const considerations: DecisionConsideration[] = [];
  const recentFrom = addDays(world.currentDate, -LIFE.memoryDays);
  for (const record of fromHost) {
    if (record.createdAt < recentFrom) continue;
    const outcome = outcomeFor(world, record.id);
    if (outcome && forms.includes(record.form)) {
      considerations.push({
        stableKey: `${dueItem.stableKey}:came:${outcome.id}`,
        optionKey: record.form,
        sourceType: "social:relationship",
        direction: "supports",
        importance: "slight",
        confidence: "high",
        explanation: "They came the last time this was offered.",
        sourceRefs: [
          { kind: "historical-event", eventId: outcome.outcomeEventId },
        ],
      });
    } else if (!outcome) {
      considerations.push({
        stableKey: `${dueItem.stableKey}:unanswered:${record.id}`,
        optionKey: "not-now",
        sourceType: "social:relationship",
        direction: "supports",
        importance: "slight",
        confidence: "medium",
        explanation: "They did not come after an earlier offer.",
        sourceRefs: [
          { kind: "historical-event", eventId: record.invitationEventId },
        ],
      });
    }
  }
  if (campaign) {
    considerations.push({
      stableKey: `${dueItem.stableKey}:running`,
      optionKey: "door-canvass",
      sourceType: "context:campaign",
      direction: "supports",
      importance: "slight",
      confidence: "high",
      explanation: "They are running, and doors are where a campaign starts.",
      sourceRefs: [],
    });
  }
  const evaluation = evaluateDecision(world, {
    stableKey: `${dueItem.stableKey}:decision`,
    decisionType: "campaign.organizer-outreach",
    actorPersonId: hostId,
    cutoff: {
      asOfDate: world.currentDate,
      historySequenceExclusive: world.history.nextSequence,
    },
    subject: {
      kind: "context:life",
      key: "campaign-life-outreach",
      entityId: null,
    },
    options,
    constraints: [],
    considerations,
    perceptionIds: [],
    randomness: "close-choices",
    retention: "ephemeral",
  });
  const chosen = evaluation.selectedOptionKey;
  if (!chosen || chosen === "not-now")
    return deferred("organizer-chose-not-now", nextGap());
  const form = chosen as CampaignLifeForm;
  const entry = CAMPAIGN_LIFE_CATALOG[form];
  const campaignId =
    form === "fundraiser" ||
    form === "support-request" ||
    FIELD_FORMS.includes(form)
      ? (campaign?.id ?? null)
      : null;
  const startMinute =
    entry.presence === "remote"
      ? LIFE.phoneStartMinute
      : LIFE.inPersonStartMinute;
  for (let days = LIFE.offerDays[0]; days <= LIFE.offerDays[1]; days += 1) {
    const date = addDays(world.currentDate, days);
    const start = momentAt(world, date, startMinute);
    try {
      const offered = offerCampaignLifeActivity(world, {
        form,
        hostOrganizationId: chapter.organizationId,
        hostPersonId: hostId,
        subjectPersonId: subjectId,
        campaignId,
        origin: "host-outreach",
        start,
        stableKey: `${dueItem.stableKey}:offer`,
      });
      return {
        world: reschedule(
          offered,
          daysBetween(world.currentDate, date) + nextGap(),
        ),
        status: "resolved",
        reasonKey: "campaign:offered",
        context: null,
        outcomeEventId: offered.history.events.find(
          (event) => event.stableKey === `${dueItem.stableKey}:offer:offered`,
        )!.id,
      };
    } catch {
      // A busy evening for either person: try the next one.
    }
  }
  return deferred("no-free-evening", LIFE.deferDays);
}

/* -------------------------------------------------------------------------- */
/* Projection                                                                 */
/* -------------------------------------------------------------------------- */

export type CampaignLifeActivityState =
  "offered" | "accepted" | "declined" | "expired" | "completed";

export interface CampaignLifeActivityView {
  readonly lifeActivityId: EntityId;
  readonly form: CampaignLifeForm;
  readonly family: CampaignLifeFamily;
  readonly title: string;
  readonly hostPersonId: EntityId;
  readonly hostOrganizationId: EntityId;
  readonly campaignId: EntityId | null;
  readonly origin: CampaignLifeActivityRecord["origin"];
  readonly state: CampaignLifeActivityState;
  /** The calendar hold that currently stands for this activity. */
  readonly scheduledActivityId: EntityId;
  readonly start: SimulationMoment;
  readonly end: SimulationMoment;
  readonly presence: CampaignLifeCatalogEntry["presence"];
  readonly journeyMinutes: number | null;
  readonly travelCostDisclosure: string | null;
  readonly outcome: {
    readonly attendance: CampaignLifeAttendance;
    readonly summary: string;
    readonly contactPersonIds: readonly EntityId[];
    readonly raisedAmount: MoneyAmount | null;
    readonly supportDecision: CampaignSupportDecision | null;
  } | null;
}

/**
 * Whether the player actually refused this, as against time having passed over
 * it. A hold the clock ran past used to be indistinguishable from one they
 * turned down, and counting the first as the second told the player they had
 * declined something they were never shown. A record too old to tell apart
 * reads as neither.
 */
function declinedHold(world: World, holdIds: readonly EntityId[]): boolean {
  return wasRefused(world, holdIds);
}

/** This person's party and campaign activities, oldest first. Pure. */
export function projectCampaignLifeActivities(
  world: World,
  personId: EntityId,
): readonly CampaignLifeActivityView[] {
  return campaignLifeActivityRecords(world)
    .filter((record) => record.subjectPersonId === personId)
    .map((record) => {
      const entry = campaignLifeCatalogEntry(record.form);
      const hold = currentHold(world, record);
      const holdState = scheduledActivityState(world, hold.id);
      const outcome = outcomeFor(world, record.id);
      const holds = holdsFor(world, record).map((activity) => activity.id);
      // A hold that has completed but whose outcome is not yet recorded is
      // still "completed" (with outcome null), never "expired".
      const state: CampaignLifeActivityState =
        outcome || holdState.status === "completed"
          ? "completed"
          : declinedHold(world, holds)
            ? "declined"
            : holdState.status === "scheduled" &&
                compareSimulationMoments(holdState.end, world.currentMoment) > 0
              ? hold.kind === "confirmed"
                ? "accepted"
                : "offered"
              : "expired";
      const outcomeEvent = outcome
        ? world.history.events.find(
            (event) => event.id === outcome.outcomeEventId,
          )
        : undefined;
      return {
        lifeActivityId: record.id,
        form: record.form,
        family: entry.family,
        title: hold.title,
        hostPersonId: record.hostPersonId,
        hostOrganizationId: record.hostOrganizationId,
        campaignId: record.campaignId,
        origin: record.origin,
        state,
        scheduledActivityId: hold.id,
        start: holdState.start,
        end: holdState.end,
        presence: entry.presence,
        journeyMinutes: entry.journeyKey === null ? null : entry.journeyMinutes,
        travelCostDisclosure:
          entry.journeyKey === null
            ? null
            : CAMPAIGN_LIFE_TRAVEL_COST_DISCLOSURE,
        outcome: outcome
          ? {
              attendance: outcome.attendance,
              summary: outcomeEvent?.summary ?? "",
              contactPersonIds: outcome.contactPersonIds,
              raisedAmount: outcome.raisedAmount,
              supportDecision: outcome.supportDecision?.decision ?? null,
            }
          : null,
      };
    });
}

/** The life activity a calendar entry belongs to, for presentation routing. */
export function campaignLifeActivityForScheduledActivity(
  world: World,
  scheduledActivityId: EntityId,
): CampaignLifeActivityRecord | null {
  const activity = world.history.scheduledActivities.find(
    (candidate) => candidate.id === scheduledActivityId,
  );
  if (!activity || activity.kind === "travel") return null;
  return (
    campaignLifeActivityRecords(world).find((record) =>
      activity.sourceEntityIds.includes(record.invitationEventId),
    ) ?? null
  );
}
