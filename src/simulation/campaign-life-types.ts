import type { EntityId, IsoDate, MoneyAmount } from "./types";

/**
 * CRUNCH46 CAMPAIGN — party and campaign life at moderate depth.
 *
 * These records sit beside the accepted campaign family rather than replacing
 * it. The contest, the committee, its money, the hours and canonical support
 * all stay where `campaigns.ts` already keeps them; what is new here is:
 *
 * - party/campaign activity instances hosted by persistent people (an
 *   organization meeting, a canvass or phone shift, candidate guidance, a
 *   fundraiser or support request, a town hall);
 * - the weekly plan a candidate commits, with or without staff;
 * - opponent campaigns that act on their own at weekly boundaries.
 *
 * Every family is an optional history array so older saves stay readable, and
 * every record keys its randomness by its own identity.
 */

/** Versioned authored catalog id; game defaults, not empirical requirements. */
export const CAMPAIGN_LIFE_CATALOG_VERSION = "crunch46-campaign-life-v1";

/** The five connected activity families CRUNCH46 section 09 names. */
export type CampaignLifeFamily =
  | "organization-meeting"
  | "volunteer-shift"
  | "candidate-guidance"
  | "support-and-fundraising"
  | "community-event";

/** Concrete forms. Canvass/phone and fundraiser/support are alternative forms. */
export type CampaignLifeForm =
  | "organization-meeting"
  | "door-canvass"
  | "phone-shift"
  | "candidate-guidance"
  | "fundraiser"
  | "support-request"
  | "town-hall";

export const CAMPAIGN_LIFE_FORMS: readonly CampaignLifeForm[] = [
  "organization-meeting",
  "door-canvass",
  "phone-shift",
  "candidate-guidance",
  "fundraiser",
  "support-request",
  "town-hall",
];

export interface CampaignLifeCatalogEntry {
  readonly form: CampaignLifeForm;
  readonly family: CampaignLifeFamily;
  readonly title: string;
  /**
   * Authored default length for generic content only. An actual scheduled
   * activity's own start/end always overrides it.
   */
  readonly defaultMinutes: number;
  /** "remote" forms need no journey; "in-person" forms disclose travel. */
  readonly presence: "in-person" | "remote";
  /** Location key used on the calendar; must be a registered scene venue. */
  readonly locationKey: string;
  readonly locationLabel: string;
  /** Journey key for in-person forms, null for remote ones. */
  readonly journeyKey: string | null;
  readonly journeyMinutes: number;
  /** "authored" marks every timing value here as a game default. */
  readonly basis: "authored";
}

export type CampaignLifeAttendance = "attended" | "condensed";

/**
 * One offered or requested party/campaign activity. The calendar holds live in
 * `scheduledActivities` with `sourceEntityIds` naming `invitationEventId`, the
 * same pattern the ALIVE43 chapter meeting uses, so PEOPLE's home-evening scene
 * binds them without a second surface.
 */
export interface CampaignLifeActivityRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly catalogVersion: string;
  readonly form: CampaignLifeForm;
  /** Chapter or campaign committee hosting it. */
  readonly hostOrganizationId: EntityId;
  /** The persistent person who organized it (organizer, volunteer lead...). */
  readonly hostPersonId: EntityId;
  /** The controlled person it was offered to or requested by. */
  readonly subjectPersonId: EntityId;
  /** The campaign the work serves, or null for party/community work. */
  readonly campaignId: EntityId | null;
  /** Who started it: the host's own outreach, or the subject's request. */
  readonly origin: "host-outreach" | "subject-request";
  readonly invitationEventId: EntityId;
  /** The first calendar hold written for it (tentative or confirmed). */
  readonly scheduledActivityId: EntityId;
  readonly createdAt: IsoDate;
}

export type CampaignSupportDecision = "granted" | "declined" | "deferred";

export interface CampaignLifeOutcomeRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly activityId: EntityId;
  /** The calendar activity that actually completed. */
  readonly scheduledActivityId: EntityId;
  readonly completedAt: IsoDate;
  readonly attendance: CampaignLifeAttendance;
  readonly outcomeEventId: EntityId;
  /** Persistent people actually met (volunteer partner, donor, reporter). */
  readonly contactPersonIds: readonly EntityId[];
  readonly relationshipInteractionIds: readonly EntityId[];
  /** Money that moved because of the activity (fundraiser proceeds). */
  readonly resourceFlowId: EntityId | null;
  readonly raisedAmount: MoneyAmount | null;
  /** Canonical support after field work for an active campaign, else empty. */
  readonly supportStateIds: readonly EntityId[];
  /** Support request: the deciding body's decision; null otherwise. */
  readonly supportDecision: {
    readonly decidedByPersonId: EntityId;
    readonly organizationId: EntityId;
    readonly decision: CampaignSupportDecision;
  } | null;
  /** Candidate guidance: what the subject now knows; null otherwise. */
  readonly guidanceKnowledgeId: EntityId | null;
}

/** The three substantive weekly plan emphases. */
export type CampaignPlanEmphasis = "field" | "communications" | "relationships";

/** Advertising channel. Reach is not modeled; capacity is an authored limit. */
export type CampaignAdChannel = "digital" | "radio" | "print" | "mail";

export interface CampaignWeeklyAllocation {
  /** Field shifts (door canvass or phone) booked this week. */
  readonly fieldShifts: number;
  /** Fundraising call sessions booked this week. */
  readonly fundraisingSessions: number;
  /** Advertising sessions (buys) booked this week; each spends `advertising`. */
  readonly advertisingBuys: number;
}

export interface CampaignWeeklyAdvertising {
  readonly channel: CampaignAdChannel;
  readonly geographyKey: string;
  readonly geographyLabel: string;
  readonly geographyKind: "jurisdiction" | "district";
  /** Per-buy amount; total spend is amount × allocation.advertisingBuys. */
  readonly amount: MoneyAmount;
}

export type CampaignWeeklyRefusal =
  | "insufficient-funds"
  | "no-free-time"
  | "election-passed"
  | "channel-capacity"
  | "empty-plan";

export interface CampaignWeeklyPlanRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly catalogVersion: string;
  readonly campaignId: EntityId;
  readonly weekStart: IsoDate;
  readonly weekEnd: IsoDate;
  /** Staff member whose proposals were shown, or null for the no-staff route. */
  readonly proposerPersonId: EntityId | null;
  /** The emphases actually offered (at most three). */
  readonly offeredEmphases: readonly CampaignPlanEmphasis[];
  readonly chosenEmphasis: CampaignPlanEmphasis;
  readonly allocation: CampaignWeeklyAllocation;
  readonly advertising: CampaignWeeklyAdvertising | null;
  readonly status: "committed" | "refused";
  readonly refusal: CampaignWeeklyRefusal | null;
  /** Treasury balance the decision was made against. */
  readonly treasuryAtDecision: MoneyAmount;
  /** Campaign actions this plan scheduled; empty when refused. */
  readonly scheduledActionIds: readonly EntityId[];
  readonly createdAt: IsoDate;
}

/**
 * An opponent's own campaign in a contest the World represents. Created the
 * first time the opponent needs to act, not in bulk.
 */
export interface CampaignOpponentRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly contestId: EntityId;
  readonly candidatePersonId: EntityId;
  /** The player's campaign in the same contest, whose support scopes it shares. */
  readonly rivalCampaignId: EntityId;
  readonly committeeOrganizationId: EntityId;
  readonly donorPoolOrganizationId: EntityId;
  readonly vendorOrganizationId: EntityId;
  readonly treasuryPositionId: EntityId;
  /** Persistent opponent staff/field lead, materialized when it first acts. */
  readonly fieldLeadPersonId: EntityId;
  /** Seeded, private, persistent goals; never projected to the player. */
  readonly emphasis: CampaignPlanEmphasis;
  readonly createdAt: IsoDate;
}

export type CampaignOpponentStepKind =
  "field-event" | "fundraising" | "messaging" | "support-request";

export interface CampaignOpponentStepRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly opponentId: EntityId;
  readonly weekStart: IsoDate;
  readonly kind: CampaignOpponentStepKind;
  /** The world event describing what they did (public or limited). */
  readonly outcomeEventId: EntityId;
  readonly resourceFlowId: EntityId | null;
  readonly amount: MoneyAmount | null;
  readonly supportStateIds: readonly EntityId[];
  readonly supportDecision: {
    readonly decidedByPersonId: EntityId;
    readonly organizationId: EntityId;
    readonly decision: CampaignSupportDecision;
  } | null;
  readonly createdAt: IsoDate;
}

/** Transition keys (GOVERNING contract: "namespace:name"). */
export const CAMPAIGN_WEEKLY_EVALUATION_KEY = "campaign:weekly-evaluation";
export const CAMPAIGN_LIFE_OUTREACH_KEY = "campaign:organizer-outreach";
