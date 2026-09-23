import type {
  EntityId,
  IsoDate,
  LifeRecordProvenance,
  MoneyAmount,
  OccupationClassification,
} from "./types";

/**
 * How an offer quotes its pay: by the hour, as an annual salary, or by the
 * shift where that employer really pays by the shift (owner, 9/22).
 */
export type JobPayBasis = "hourly" | "annual-salary" | "per-shift";

export interface JobPayTerms {
  readonly basis: JobPayBasis;
  /** The rate in its own terms: per hour, per year or per shift. */
  readonly amount: MoneyAmount;
}

/**
 * One opening at an employer, as the world wrote it on the day it opened.
 *
 * Every fact a listing shows is here and nothing else is: a field the world
 * does not know is null and the listing leaves it out. The recruitment window
 * is drawn once, when the opening is written, so rereading or reloading can
 * never move it.
 */
export interface JobOpeningRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly organizationId: EntityId;
  /** Where the work is done: the employer's own jurisdiction. */
  readonly jurisdictionId: EntityId;
  readonly title: string;
  readonly occupationClassification: OccupationClassification | null;
  readonly pay: JobPayTerms;
  readonly weeklyHours: {
    readonly minimumHours: number;
    readonly maximumHours: number;
  };
  /** A posted schedule, when the employer states one. */
  readonly schedule: string | null;
  /** Qualifications the employer states, when it states any. */
  readonly qualifications: string | null;
  /** The earliest start the employer states, when it states one. */
  readonly earliestStartAt: IsoDate | null;
  readonly opensAt: IsoDate;
  /** The last day applications are taken. */
  readonly closesAt: IsoDate;
  readonly provenance: LifeRecordProvenance;
}

export type JobApplicationRoute = "applied" | "introduced";

/** A person's application, written when they apply or are put forward. */
export interface JobApplicationRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly openingId: EntityId;
  readonly personId: EntityId;
  readonly route: JobApplicationRoute;
  /** Who put the applicant forward, on the introduced route. */
  readonly introducerPersonId: EntityId | null;
  readonly submittedAt: IsoDate;
  /** The day the employer answers, drawn once at submission. */
  readonly decisionAt: IsoDate;
}

/**
 * What happened next, appended in order. The latest step is the
 * application's state; nothing earlier is rewritten.
 *
 * `offer-lapsed` (an offer nobody answered) and `withdrawn` (an accepted
 * offer taken back after a missed start) are different facts on purpose, as
 * are `declined` (the employer said no) and `refused` (the applicant did).
 */
export type JobApplicationStepKind =
  | "declined"
  | "offered"
  | "accepted"
  | "refused"
  | "offer-lapsed"
  | "followed-up"
  | "withdrawn"
  | "started";

export interface JobApplicationStepRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly applicationId: EntityId;
  readonly kind: JobApplicationStepKind;
  readonly occurredAt: IsoDate;
  /** The employer's reason, for a decline or a withdrawal. */
  readonly reason: string | null;
  /** On an offer: the last day to answer. */
  readonly replyBy: IsoDate | null;
  /** On an offer or a follow-up: the day work is expected to start. */
  readonly startAt: IsoDate | null;
  /** On an offer: the hours agreed for an hourly job. */
  readonly agreedWeeklyHours: number | null;
  /** On a start: the work relationship it began. */
  readonly workRelationshipId: EntityId | null;
  /** The world event the applicant learned this from. */
  readonly eventId: EntityId | null;
}
