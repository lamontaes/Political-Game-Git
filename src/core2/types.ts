import type { SnapshotPart } from "./snapshot";
import type { HistorySource } from "./past-history";
import type { GroupQuartersType } from "./group-quarters-types";
import type { PurchaseTaxInput } from "./modules/purchase-tax";
import type { MarketEntry } from "./modules/residents";
import type { ResidentsInput } from "./residents";
import type { Accounts } from "./accounts";
import type {
  ModuleStateDefinition,
  ModuleStateStore,
  ModuleStateSnapshot,
} from "./module-state";
import type { ModuleCalendar, ModuleCalendarWork } from "./module-calendar";
/** P8 prototype boundary. No game screen or old-core clock imports this API. */
import type { CashActSelection } from "./act-cash";
import type {
  WorkPayrollJournalReceipt,
  WorkPayrollJobReceipt,
  WorkPayrollCashSourceState,
} from "./work-payroll-cash";
import type {
  WorkPayrollCalendarInput,
  WorkPayrollLedger,
  WorkEarnedPayPeriod,
} from "./work-pay-period";
import type { WorkCashSourceState } from "./work-cash";
import type { Parameter } from "./parameters";
import type { EventAppraisal } from "./emotion";
import type { BusinessBooksData } from "./business-books";
import type {
  CashAccountSnapshot,
  CashJournalInput,
  CashJournalProjection,
  CashJournalSourceRef,
} from "./journal";
import type {
  CashJournalRuntime,
  CashJournalSourceSlot,
  CashJournalSourceCompletion,
} from "./journal-state";
import type {
  BusinessBooksInput,
  CreditFacilityInput,
  CreditReceipt,
  EmployerClosure,
  FinanceConditionInput,
  FinanceContractInput,
  FinanceInput,
  FinancePolicyData,
  FinanceReceipt,
  FinanceRuntime,
} from "./finance-types";
export type PersonId = string;
export type PlaceId = string;
export type IsoDate = string;
export type Tier = string;
export type NeedKind = string;
export type GoalKind = string;

export interface Source {
  tag: "SOURCED" | "ESTIMATED";
  citation: string;
  asOf: IsoDate;
  estimatedFrom?: string;
  /** External-data vintage of an opening generation prior, not its publication date or actor knowledge. */
  generationPriorVintage?: string;
}

export interface Affect {
  at: IsoDate;
  mood: number;
  stress: number;
  moodBaseline: number;
  stressBaseline: number;
  /**
   * The part of `stress` that a hardship (a layoff, an eviction, a missed
   * payment: `hardshipEventKinds` in content.json) put there and has not let
   * go of, decaying to nothing at the stress half-life. Absent when none. The
   * coping decisions read it (`hardshipStress` in trait-decisions.ts), so
   * stress that came from elsewhere (a cause shared, an illness) is not read
   * as a reason to claim, borrow or leave.
   */
  hardship?: number;
}

export interface Drive {
  id: string;
  sourceEventId: string;
  topic: string;
  desiredChange: string;
  strength: number;
  kind?: string;
}

export interface Goal {
  id: string;
  kind: GoalKind;
  urgency: number;
  sourceDriveId?: string;
  targetId?: string;
}

export interface PersonInput {
  id: PersonId;
  givenName: string;
  familyName: string;
  birthDate: IsoDate;
  placeId: PlaceId;
  countyId?: PlaceId;
  householdId: string;
  tier: Tier;
  /** v13: an explicit developmental capability, independent of observation/cadence. */
  discretionaryEligibleV1?: boolean;
  traits: Readonly<Record<string, number>>;
  traitSources?: Readonly<Record<string, Source>>;
  /** One complete generated upbringing Source shared by the person's recorded traits. */
  sharedTraitSource?: Source;
  liquidMinor: number;
  livingCostDailyMinor: number;
  source: Source;
  familyIds: readonly PersonId[];
  knownIds: readonly PersonId[];
  knownIdSources?: Readonly<
    Record<PersonId, { sourceFactId: string; learnedAt: IsoDate }>
  >;
  jobId?: string;
  said?: readonly string[];
  looks?: Readonly<Record<string, string>>;
  pastFacts?: readonly {
    id: string;
    date: IsoDate;
    kind: string;
    summary: string;
    source: Source;
    facts?: Readonly<Record<string, string>>;
  }[];
}

export interface PersonState extends Omit<
  PersonInput,
  "traits" | "familyIds" | "knownIds"
> {
  traits: Record<string, number>;
  familyIds: Set<PersonId>;
  knownIds: Set<PersonId>;
  lastActDate: IsoDate;
  affect: Affect;
  needs: Record<NeedKind, number>;
  goals: Map<string, Goal>;
  drives: Map<string, Drive>;
  lastChoice?: string;
  lastReason?: string;
  lastContactDate: IsoDate;
  alive: boolean;
  actCount: number;
  actsByKind: Map<string, number>;
}

export interface JobInput {
  id: string;
  personId: PersonId;
  organizationId: string;
  title: string;
  wageDailyMinor: number;
  hoursDaily: number;
  source: Source;
  occupationClassification?: string;
  /** Opening hourly SOC proxy; preserves existing calendar-average job fields. */
  hourlyMinor?: number;
  /** Historical jobs remain after the actual employment relationship ends. */
  endsAt?: IsoDate;
}

export interface PublicPayAuthorityInput {
  id: string;
  ownerId: string;
  governmentKey: string;
  jurisdictionId: string;
  workCommitmentIds: readonly string[];
  basisRecordIds: readonly string[];
  source: Source;
}

/** The work owner records this occurrence from actual attendance and pay terms. */
export interface PublicWorkPayDue {
  kind: string;
  id: string;
  date: IsoDate;
  authorityId: string;
  ownerId: string;
  organizationId: string;
  commitmentId: string;
  jobId: string;
  personId: string;
  amountMinor: number;
  source: Source;
}

export interface OrganizationInput {
  /** An outside payer records actual due flows; it holds no modeled opening cash. */
  outsideFlow?: Source;
  publicPayAuthority?: PublicPayAuthorityInput;
  id: string;
  placeId: PlaceId;
  name: string;
  kind: string;
  topic?: string;
  liquidMinor: number;
  source: Source;
  classification?: string;
  governmentFacts?: Readonly<Record<string, string>>;
}

export interface PublicOrganization {
  id: string;
  placeId: PlaceId;
  name: string;
  kind: string;
  source: Source;
  affordances?: readonly string[];
  facts?: Readonly<Record<string, string>>;
  staff?: readonly {
    personId: PersonId;
    jobId: string;
    title: string;
    source: Source;
  }[];
}

export {
  GROUP_QUARTERS_TYPES,
  type GroupQuartersType,
} from "./group-quarters-types";

export interface HouseholdInput {
  id: string;
  placeId: PlaceId;
  memberIds: readonly PersonId[];
  source: Source;
  /**
   * Real households this one record stands for, where it differs from its
   * place's weight (a county's circle kin stand for themselves; its sample
   * stands for the rest).
   */
  weight?: number;
  /** The day the household moved into its place (years in place, from the opening's mover rates). */
  since?: IsoDate;
  /**
   * Workers of a sampled household outside the town: the county employer
   * (a sector group of the county's recorded employment) each works at.
   * Registered stopgap SG-LIVES-county-sample-employers.
   */
  employment?: readonly {
    personId: PersonId;
    employerId: string;
    sector: string;
  }[];
  /**
   * A group-quarters room (a dormitory double, a cell, a barracks room, a
   * nursing-home room): its type. Absent for a household.
   */
  quarters?: GroupQuartersType;
}

/** P15: why a closeness changed, the cause and the record behind it. */
export interface RelationshipReason {
  cause: string;
  sourceId?: string;
  /**
   * The change happened without the two being together (a veto of the
   * other's bill, an answer to the whip, a promise settled by a roll call):
   * the tie moves, but the day they were last together stays as it was.
   */
  apart?: boolean;
}

/** Latest committed tie change; scores exist only when supplied by the actual choice. */
export interface RelationshipChangeEvidence {
  version: "core2-relationship-change-v1";
  date: IsoDate;
  actorId: PersonId;
  otherId: PersonId;
  kind: Relationship["kind"];
  requestedKind: Relationship["kind"];
  requestedChange: number;
  created: boolean;
  before: Readonly<{ level: number; lastContactDate?: IsoDate }>;
  after: Readonly<{ level: number; lastContactDate: IsoDate }>;
  cause: "chosen-act" | "recorded-relationship-update";
  actionId?: string;
  /** Existing endpoints. Provider source IDs remain in their original decision terms. */
  sourceRecordRefs: readonly Readonly<{ kind: "person"; id: PersonId }>[];
  /** Full only under the existing chooser trace policy; quiet choices retain the compact pair. */
  decision?: Readonly<DecisionResult>;
  /** P15: the cause and record of the change (a visit, a meeting), for the "why" view. */
  reason?: Readonly<RelationshipReason>;
}

export interface Relationship {
  id: string;
  actorId: PersonId;
  otherId: PersonId;
  kind: "family" | "coworker" | "contact" | "group";
  level: number;
  /** The day the level was last set: closeness fades from here. */
  lastContactDate: IsoDate;
  /**
   * When the last change came apart (`RelationshipReason.apart`): the day the
   * two were last together, or null when they never were. Absent, they were
   * together on `lastContactDate`. Read through `lastMetOnRow`.
   */
  lastMetDate?: IsoDate | null;
  /**
   * Hours of strain the row's own time did not cover, as of its last contact
   * (a quarrel or a broken word between people whose tie is mostly time
   * another engine reads, such as shared sittings); taken off those hours
   * when closeness is read (closeness.ts, `tieAfter`). Absent when nothing is owed.
   */
  owedHours?: number;
  promise?: string;
  latestChange?: Readonly<RelationshipChangeEvidence>;
}

/** P15 part 5: a real shared moment where two people first meet. */
export interface Encounter {
  /** Where they met: the host's home (household ID) or the group's place. */
  placeId: string;
  /** The record of the moment (a visit, a membership). */
  sourceId: string;
  cause: string;
  /** Hours spent together, the first tie's time together. */
  hours: number;
}

export interface ActionDefinition {
  id: string;
  actKinds: readonly string[];
  goalKinds: readonly GoalKind[];
  need: NeedKind;
  effortParameter: string;
  effectParameter: string;
  targetKind: string;
  effect: string;
  emotion?: {
    moodMultiplierParameter: string;
    stressMultiplierParameter: string;
  };
  stopgapId?: string;
  prerequisites?: readonly { operation: string; argument?: string }[];
  reasonBindings?: readonly ReasonBinding[];
}

/** A content row names the mechanism and the tagged weight used by the chooser. */
export interface ReasonBinding {
  id: string;
  provider: string;
  weightParameter: string;
  arguments?: Readonly<Record<string, string>>;
  stopgapId?: string;
}

export interface ReasonValue {
  value: number;
  sourceIds?: readonly string[];
}

export interface WeightedReason extends ReasonBinding, ReasonValue {
  contribution: number;
}

export type ReasonProvider = (
  api: CoreAPI,
  actor: Readonly<PersonState>,
  offer: Readonly<ActOffer>,
  binding: Readonly<ReasonBinding>,
  context?: Readonly<DecisionContext>,
) => ReasonValue | undefined;

export type CoreEventListener = (
  api: CoreAPI,
  event: CoreEventInput,
  learnedBy: readonly PersonId[],
) => void;

/** Module-owned indexed lookup; public journal callers supply only a source reference. */
export type ModuleCashJournalSourceProvider = (
  api: CoreAPI,
  reference: Readonly<CashJournalSourceRef>,
) => CashJournalSourceSlot | undefined;

/** One learned person's actual appraisal, after its affect was applied once. */
export type CoreEventAppraisalListener = (
  api: CoreAPI,
  event: Readonly<CoreEventInput>,
  appraisal: Readonly<EventAppraisal>,
) => void;

export type RelationshipMeasureChange =
  | { measure: "level"; before: number; after: number }
  | { measure: "lastContactDate"; before?: IsoDate; after: IsoDate };

export interface RelationshipChangeNotice {
  date: IsoDate;
  relationshipId: string;
  /** Endpoints of the actual API call, not sorted or inferred participants. */
  actorId: PersonId;
  otherId: PersonId;
  kind: Relationship["kind"];
  /** Existing relationships retain their stored kind under the current writer. */
  requestedKind: Relationship["kind"];
  created: boolean;
  changes: readonly RelationshipMeasureChange[];
  /** P15: the saved reason for this change, when the writer recorded one. */
  reason?: RelationshipReason;
}

export type CoreRelationshipListener = (
  api: CoreAPI,
  notice: Readonly<RelationshipChangeNotice>,
) => void;

/**
 * Scratch shared by the offer providers of one availableActs call (one
 * person on one date), so a list two act rows both read is worked out once.
 * Each module keys its own entries; nothing in it outlives the call.
 */
export type OfferRound = Map<string, unknown>;

/**
 * Set on a round that only predicts the day's act (the drives engine's "why"
 * before the act): a provider reads as usual but keeps nothing it would hold
 * past the call, so a prediction made with bookkeeping on and skipped in play
 * changes no later choice (core-bookkeeping-changes-the-played-year).
 */
export const OFFER_ROUND_PREDICTION = "core2-offer-round-prediction";

export interface ActOffer {
  definition: ActionDefinition;
  targetId: string;
  driveId?: string;
  availableHours: number;
  /** Per-offer actual commitment duration, not a universal activity mean. */
  effortHours?: number;
  reasonBindings?: readonly ReasonBinding[];
}

export interface DecisionReason {
  need: number;
  goal: number;
  drive: number;
  trait: number;
  emotion: number;
  effort: number;
  module?: number;
}

export interface DecisionContext {
  affect?: Affect;
  needValues?: Readonly<Record<string, number>>;
  goalUrgencies?: Readonly<Record<string, number>>;
  goalRows?: readonly Goal[];
}

/** Small original-score evidence. It is not a copied actor/offer/config graph or payment authority. */
export interface CompactChoiceScoreV1 {
  /** Position in the actual original offered list, including differently qualified offers. */
  offerIndex: number;
  actionId: string;
  targetId: string;
  availableHours: number;
  effortHours: number;
  driveId?: string;
  score: number;
  contributions: Readonly<DecisionReason>;
  reasonTerms?: readonly Readonly<{
    bindingId: string;
    provider: string;
    weightParameter: string;
    value: number;
    contribution: number;
    sourceIds?: readonly string[];
  }>[];
}
export interface CompactChoiceTraceV1 {
  version: "core2-compact-choice-v1";
  actorId: PersonId;
  date: IsoDate;
  selection: "utility-max" | "controlled-answer";
  chosen: Readonly<CompactChoiceScoreV1>;
  runnerUp?: Readonly<CompactChoiceScoreV1>;
  runnerUpStatus: "saved" | "no-distinct-alternative";
  /** Actual saved actor; base need/goal/trait/emotion/time values are the saved contributions above. */
  sourceRecordRefs: readonly Readonly<{ kind: string; id: string }>[];
}

/** One latest ordinary discretionary selection per outsider, not a full act trace. */
export interface CompactActSelectionV1 {
  id: string;
  actorId: PersonId;
  date: IsoDate;
  actionId: string;
  targetId: string;
  reasonKey: string;
  compactChoice: Readonly<CompactChoiceTraceV1>;
}

export interface DecisionResult {
  /** Captured from the original evaluation. No query or writer may score again. */
  compactChoice?: Readonly<CompactChoiceTraceV1>;
  /** Root-issued client answer identity; retained with the original saved controlled trace. */
  controlledChoice?: { readonly pauseId: string; readonly offerId: string };
  actorId: PersonId;
  date: IsoDate;
  selected?: ActOffer;
  reasonKey: string;
  selectedReasons?: DecisionReason;
  selectedReasonTerms?: readonly WeightedReason[];
  scores?: readonly {
    actionId: string;
    targetId: string;
    score: number;
    reasons: DecisionReason;
    reasonTerms?: readonly WeightedReason[];
  }[];
}

export interface CoreEventInput {
  id: string;
  date: IsoDate;
  kind: string;
  personIds: readonly PersonId[];
  placeId: PlaceId;
  source: Source;
  topic?: string;
  desiredChange?: string;
  moodImpulse?: number;
  stressImpulse?: number;
  facts?: Readonly<Record<string, string>>;
  publicRecord?: boolean;
  news?: boolean;
  witnessIds?: readonly PersonId[];
}

export interface LogRecord extends CoreEventInput {
  visibility?: "circle" | "public" | "news" | "observer";
  actorId?: PersonId;
  actionId?: string;
  targetId?: string;
  driveId?: string;
  reasonKey?: string;
  decision?: DecisionResult;
}

export interface ActCounter {
  month: string;
  actorId: PersonId;
  actionId: string;
  count: number;
  needContribution: number;
  goalContribution: number;
  driveContribution: number;
}

export interface WorkScheduleSlot {
  offsetDays: number;
  startMinute: number;
  minutes: number;
}
export interface WorkCommitmentInput {
  /** Actual separately admitted employer pay calendar; attendance recurrence is not payday evidence. */
  payrollCalendarId?: string;
  publicPayAuthorityId?: string;
  id: string;
  jobId: string;
  personId: PersonId;
  organizationId: string;
  startsAt: IsoDate;
  /** When the person first held this job, where that is earlier than this commitment: a counted worker filled in keeps the tenure their records gave them, while work and pay run from `startsAt`. */
  heldSince?: IsoDate;
  endsAt?: IsoDate;
  anchorDate: IsoDate;
  periodDays: number;
  slots: readonly WorkScheduleSlot[];
  expectedWeeklyMinutes: number;
  scheduleTemplateJobId?: string;
  hourlyMinor: number;
  scheduleSource: Source;
  paySource: Source;
}
/** One dated calendar segment result, not a completed whole shift count. */
export interface WorkResult {
  id: string;
  commitmentId: string;
  jobId: string;
  personId: PersonId;
  organizationId: string;
  date: IsoDate;
  plannedMinutes: number;
  attendedMinutes: number;
  absentMinutes: number;
  requestedMinor: number;
  paidMinor: number;
  shortfallMinor: number;
  payerCashBeforeMinor: number;
  payerCashAfterMinor: number;
  payeeCashBeforeMinor: number;
  payeeCashAfterMinor: number;
  /** Actual returned committed act/counter ID; quiet actors need not have a durable act trace. */
  sourceActId: string;
  jobSource: Source;
  paySource: Source;
  employerOpeningFundsSource: Source;
  publicPayDue?: PublicWorkPayDue;
  payRemainderMinor: number;
  reasonKey: string;
  decision?: DecisionResult;
  source: Source;
}
export type WorkResultInput = Omit<
  WorkResult,
  | "paidMinor"
  | "shortfallMinor"
  | "payerCashBeforeMinor"
  | "payerCashAfterMinor"
  | "payeeCashBeforeMinor"
  | "payeeCashAfterMinor"
  | "sourceActId"
  | "jobSource"
  | "paySource"
  | "employerOpeningFundsSource"
  | "publicPayDue"
>;

/** Actual attendance/earned pay; no cash due, shortfall or balances are asserted here. */
export type WorkAttendanceInput = Omit<WorkResultInput, "requestedMinor"> & {
  earnedMinor: number;
};
export interface WorkAttendanceResult extends WorkAttendanceInput {
  compactChoice?: Readonly<CompactChoiceTraceV1>;
  sourceActId: string;
  payrollCalendarId: string;
  earnedPayPeriodId: string;
}

export interface WorkRollup {
  weekStartedAt: IsoDate;
  jobId: string;
  personId: PersonId;
  /** Dated segment/diary participation units, not completed shifts. */
  plannedDays: number;
  workedDays: number;
  missedDays: number;
  plannedMinutes: number;
  attendedMinutes: number;
  requestedMinor: number;
  paidMinor: number;
  latestReasonKey: string;
}
export interface WorkTotals {
  /** Requested is cumulative earned pay; actual due/paid/arrears live separately. */
  earnedMinor?: number;
  accruedMinor?: number;
  dueRecognizedMinor?: number;
  arrearsMinor?: number;
  plannedMinutes: number;
  attendedMinutes: number;
  requestedMinor: number;
  paidMinor: number;
  workedDays: number;
  missedDays: number;
}
export interface ActivityTimeTotal {
  ageReferenceId: string;
  category: string;
  minutes: number;
  source: Source;
}
export interface WorkRuntime {
  /** Dated pay changes by job (rerateJob), newest last. */
  payChanges: Map<
    string,
    readonly { date: IsoDate; hourlyMinor: number; source: Source }[]
  >;
  /** A named worker's gross pay by quarter, the current one and the last five completed, oldest first (pay-by-quarter.ts). */
  payByQuarter: Map<
    PersonId,
    readonly { readonly quarter: string; readonly grossMinor: number }[]
  >;
  /** A counted group's pay for one worker of it, by quarter, per group and employer: "<group id>|<employer id>". */
  countedPayByQuarter: Map<
    string,
    readonly {
      readonly quarter: string;
      readonly perWorkerGrossMinor: number;
    }[]
  >;
  /** Dated changes to a job's hours by job (rehourJob), newest last. */
  hourChanges: Map<
    string,
    readonly { date: IsoDate; hoursDaily: number; source: Source }[]
  >;
  payrollCalendars: Map<string, WorkPayrollCalendarInput>;
  payrollCalendarByCommitment: Map<string, string>;
  payrollCalendarByJob: Map<string, string>;
  payrollLedgerByCommitment: Map<string, WorkPayrollLedger>;
  earnedPayPeriods: Map<string, WorkEarnedPayPeriod>;
  earnedPayPeriodByCommitmentIndex: Map<string, Map<number, string>>;
  payrollPeriodsByDue: Map<IsoDate, Set<string>>;
  payrollArrearsByDue: Map<IsoDate, Set<string>>;
  payrollCashSources: Map<string, WorkPayrollCashSourceState>;
  latestPayrollByJob: Map<string, WorkPayrollJobReceipt>;
  detailedPayroll: Map<string, WorkPayrollJournalReceipt>;
  /** Current attendance ID to actual job; focused history remains in detailedAttendance. */
  currentAttendanceJobByRecordId: Map<string, string>;
  lastAttendanceByJob: Map<string, WorkAttendanceResult>;
  detailedAttendance: Map<string, WorkAttendanceResult>;
  /** Only current or player-visible canonical cash sources and selected acts. */
  cashActSelections: Map<string, CashActSelection>;
  cashSources: Map<string, WorkCashSourceState>;
  commitments: Map<string, WorkCommitmentInput>;
  commitmentsByPerson: Map<PersonId, Set<string>>;
  /** Period then residue indexes only jobs with an intersecting date segment. */
  byPeriodResidue: Map<number, Map<number, Set<string>>>;
  plannedByCommitmentResidue: Map<string, Map<number, number>>;
  lastResultByJob: Map<string, WorkResult>;
  totalsByJob: Map<string, WorkTotals>;
  rollups: Map<string, WorkRollup>;
  rollupsByWeek: Map<IsoDate, Set<string>>;
  detailedResults: Map<string, WorkResult>;
  timeByPerson: Map<
    PersonId,
    { date: IsoDate; workMinutes: number; discretionaryMinutes: number }
  >;
  primaryTimeTotals: Map<string, ActivityTimeTotal>;
}
export interface WorkData {
  version: string;
  journalSourceKinds: {
    result: string;
    commitment: string;
    publicPayDue: string;
    publicPayAuthority: string;
    payroll: string;
    payrollCalendar: string;
    earnedPayPeriod: string;
    publicPayrollGroupDue: string;
  };
  payrollGroupReceiptIdPrefix: string;
  payrollGroupReceiptCitation: string;
  payrollGroupAttributionRule: "arrears-then-newly-due-commitment-id";
  payrollGroupAttributionCitation: string;
  publicPayrollGroupDueIdPrefix: string;
  publicPayrollGroupDueCitation: string;
  payrollCashModuleId: string;
  payrollReceiptIdPrefix: string;
  payrollReceiptCitation: string;
  publicPayrollPayDueCitation: string;
  payrollDispatchCitation: string;
  payrollDeceasedHoldCitation: string;
  payrollGroupHoldCitation: string;
  payrollDispatchOrderRule: string;
  publicPayDueIdPrefix: string;
  publicPayDueCitation: string;
  stopgapId: string;
  fallbackPatternId: string;
  patterns: readonly {
    id: string;
    periodDaysParameter: string;
    anchorOperation: string;
    slots: readonly { offsetParameter: string; startMinuteParameter: string }[];
    source: Source;
    stopgapId?: string;
  }[];
  classificationPatterns: readonly { prefix: string; patternId: string }[];
  attendanceAction: ActionDefinition;
  absenceAction: ActionDefinition;
  sleepReserveParameter: string;
  commitmentUrgencyParameter: string;
  routineRetentionWeeksParameter: string;
  discretionaryDurationParameters?: Readonly<Record<string, string>>;
  activityAgeRows: readonly {
    id: string;
    minimumAgeParameter: string;
    maximumAgeParameter?: string;
  }[];
  primaryActivityCrosswalk: readonly {
    effect: string;
    category: string;
    atusRelation: string;
  }[];
  gaps: readonly string[];
}

export interface CoreInput {
  /** Explicit exact-version module snapshots; absent tables start empty. */
  moduleState?: readonly ModuleStateSnapshot[];
  seed: string;
  startedAt: IsoDate;
  people: readonly PersonInput[];
  households: readonly HouseholdInput[];
  jobs: readonly JobInput[];
  workCommitments?: readonly WorkCommitmentInput[];
  workPayrollCalendars?: readonly WorkPayrollCalendarInput[];
  finance?: FinanceInput;
  organizations: readonly OrganizationInput[];
  publicOrganizations?: readonly PublicOrganization[];
  playerId?: PersonId;
  focusPersonIds: readonly PersonId[];
  /** Explicit full-detail places, including the county-daily pre-run. */
  focusPlaceIds: readonly PlaceId[];
  /** Visible public records can be retained without making every resident daily. */
  visiblePlaceIds?: readonly PlaceId[];
  calendarDates: readonly IsoDate[];
  gaps: readonly string[];
  familyLinks?: readonly {
    id: string;
    kind: "parent-child" | "partner";
    personIds: readonly [PersonId, PersonId];
  }[];
  husks?: readonly HuskInput[];
  placeMetadata?: Readonly<Record<string, string>>;
  /** Two-level population: the wider population's records and money flows. */
  residents?: ResidentsInput;
}

export interface HuskInput {
  id: PersonId;
  givenName: string;
  familyName: string;
  placeId: PlaceId;
  countyId?: PlaceId;
  looks: Readonly<Record<string, string>>;
  said: readonly string[];
  birthDate?: IsoDate;
  /** Set for a person who died before day one: a named record, never filled in. */
  diedOn?: IsoDate;
  familyIds?: readonly PersonId[];
  source: Source;
}

export interface Membership {
  id: string;
  personId: PersonId;
  organizationId: string;
  joinedAt: IsoDate;
  sourceDriveId?: string;
  status: "requested" | "confirmed";
}

export interface CoreState {
  schemaVersion: string;
  apiVersion: string;
  seed: string;
  startedAt: IsoDate;
  date: IsoDate;
  people: Map<PersonId, PersonState>;
  husks: Map<PersonId, HuskInput>;
  households: Map<string, HouseholdInput>;
  jobs: Map<string, JobInput>;
  work: WorkRuntime;
  finance: FinanceRuntime;
  cashJournal: CashJournalRuntime;
  organizations: Map<string, OrganizationInput>;
  publicOrganizations: Map<string, PublicOrganization>;
  publicOrganizationsByPlace: Map<PlaceId, Set<string>>;
  relationships: Map<string, Relationship>;
  familyLinks: Map<string, NonNullable<CoreInput["familyLinks"]>[number]>;
  memberships: Map<string, Membership>;
  peopleByPlace: Map<PlaceId, Set<PersonId>>;
  peopleByTier: Map<Tier, Set<PersonId>>;
  organizationsByPlaceKind: Map<string, Set<string>>;
  relationshipsByPerson: Map<PersonId, Set<string>>;
  membershipsByPerson: Map<PersonId, Set<string>>;
  pendingCallbacks: Map<string, CoreEventInput>;
  durableLog: Map<string, LogRecord>;
  quietChoices: Map<string, Readonly<CompactActSelectionV1>>;
  quietChoiceByPerson: Map<PersonId, string>;
  logByPerson: Map<PersonId, Set<string>>;
  logByKind: Map<string, Set<string>>;
  latestPublicViews: Map<
    string,
    { personId: PersonId; topic: string; view: string; reasonKey: string }
  >;
  actCounters: Map<string, ActCounter>;
  actCountersByMonth: Map<string, Set<string>>;
  actsByMonthKind: Map<string, number>;
  organizedTopicsByPerson: Map<PersonId, Set<string>>;
  eventIds: Set<string>;
  calendarDates: Set<IsoDate>;
  focusPersonIds: Set<PersonId>;
  focusPlaceIds: Set<PlaceId>;
  visiblePlaceIds: Set<PlaceId>;
  playerId?: PersonId;
  observer: boolean;
  sequence: number;
  gaps: Set<string>;
  placeMetadata: Readonly<Record<string, string>>;
  stopgapHits: Set<string>;
  knowledgeByPerson: Map<PersonId, Map<string, KnownFact>>;
  data: CoreData;
  modules: Map<string, CoreModule>;
  reasonProviders: Map<string, ReasonProvider>;
  eventSubscribers: Map<string, CoreEventListener>;
  eventSubscribersByKind: Map<string, Set<string>>;
  eventAppraisalSubscribers: Map<string, CoreEventAppraisalListener>;
  eventAppraisalSubscribersByKind: Map<string, Set<string>>;
  relationshipSubscribers: Map<string, CoreRelationshipListener>;
  relationshipSubscribersByKind: Map<string, Set<string>>;
}

export interface KnownFact {
  key: string;
  value: string;
  learnedAt: IsoDate;
  sourceId: string;
  access: "self" | "perceived" | "told" | "public";
}

export interface NeedDefinition {
  id: string;
  evaluator: string;
  goalKind: string;
  parameters: Readonly<Record<string, string>>;
  stopgapId?: string;
}

export interface TierDefinition {
  id: string;
  cadence: string;
  intervalParameter?: string;
}

export interface CoreData {
  version: string;
  workCashModuleId: string;
  cashActSourceKind: string;
  work?: WorkData;
  businessBooks?: BusinessBooksData;
  finance?: FinancePolicyData;
  parameters: Readonly<Record<string, Parameter>>;
  needs: readonly NeedDefinition[];
  actions: readonly ActionDefinition[];
  tiers: readonly TierDefinition[];
  /** v12: capability exclusions before discretionary offer providers, including focused actors. */
  discretionaryIneligibleTiersV1?: readonly string[];
  actKinds: readonly string[];
  traitPulls: Readonly<
    Record<
      string,
      {
        high?: { toward?: readonly string[]; away?: readonly string[] };
        low?: { toward?: readonly string[]; away?: readonly string[] };
      }
    >
  >;
  situations: readonly {
    id: string;
    requiredFields: readonly string[];
    goalKind: string;
    driveKind: string;
    conditions?: readonly { field: string; operation: string }[];
    stopgapId?: string;
  }[];
  appraisalTraits: readonly {
    traitId: string;
    weightParameter: string;
    oneSided: boolean;
    stopgapId?: string;
  }[];
}

/** One paid sale, for modules' onSalesReceipt (e.g. sales tax). */
export interface SalesReceiptNotice {
  id: string;
  date: IsoDate;
  sellerId: string;
  buyerIds: readonly string[];
  kind: string;
  paidMinor: number;
  placeId: PlaceId;
  /** True when the buyers are the counted wider population. */
  counted: boolean;
}

/** One payday of the counted workers an employer pays (the residents' merged wage flow), for modules' onCountedWages. */
export interface CountedWagesNotice {
  /** The flow's payday id: the flow and the date. */
  id: string;
  date: IsoDate;
  employerId: string;
  placeId: PlaceId;
  /** The wages paid to the counted workers this payday, before any withholding. */
  paidMinor: number;
  /** The counted workers (people) the flow pays. */
  workers: number;
  periodDays: number;
}

/** Where the views engine's life term reads health plans from (the coverage engine's readers). */
export interface PlanReaders {
  /** A full person's current plan ("employer", "medicare" or "none"); undefined where the engine keeps none for them, null without the coverage engine. */
  readonly fullPlan: (
    core: CoreState,
    householdId: string,
    personId: string,
  ) => string | undefined | null;
  /** How many of a counted household's people under Medicare age its plan covers, or null where the coverage engine keeps no counted plans in the household's place. */
  readonly countedCovered: (
    core: CoreState,
    householdId: string,
    placeId: string,
  ) => number | null;
}

/** Holders an engine keeps as names on its record and nothing more (another state's officials nobody has opened). */
export interface UnbuiltHolders {
  /** A number that changes whenever a holder may have joined, compared each day. */
  readonly marker: (core: CoreState) => number;
  /** Every holder held this way now, by person id. */
  readonly ids: (core: CoreState) => Iterable<PersonId>;
  /** Whether this engine holds `personId` this way (in office or not). */
  readonly holds: (core: CoreState, personId: PersonId) => boolean;
  /** Their death, for the engine to write what it leaves; `deathRecordId` is the death's own record, where one was written. */
  readonly died: (
    core: CoreState,
    personId: PersonId,
    deathRecordId?: string,
  ) => void;
}

/** Who a record says a person knows, and when two of them shared time. */
export interface KnownThrough {
  /** The kind of tie the reader's hours fade as. */
  readonly kind: string;
  /** Everyone the record says this person knows, nearest first by the record's own order. */
  readonly knownTo: (core: object, id: PersonId) => readonly PersonId[];
  /** The first and the last day the two shared time in the record, and the record; null when they have not. */
  readonly together: (
    core: object,
    a: PersonId,
    b: PersonId,
  ) => { first: IsoDate; last: IsoDate; sourceId: string } | null;
}

/** A member seated on a body, and the day their unbroken service in the seat began. */
export interface SittingSeat {
  readonly personId: string;
  readonly since: string;
}

/** One sitting day of a body (a town meeting, or a legislature's floor week and its floor days). */
export interface SittingDay {
  readonly date: string;
  readonly days: number;
}

/** What the engine that keeps the bodies' calendars and seats says. */
export interface SittingCalendar {
  /** True for the bodies this engine keeps. */
  readonly owns: (api: CoreAPI, officeId: string) => boolean;
  /** The members seated on the body today. */
  readonly seats: (api: CoreAPI, officeId: string) => readonly SittingSeat[];
  /** The bodies a person sits on today. */
  readonly bodiesOf: (api: CoreAPI, personId: string) => readonly string[];
  /** The body's sittings on or after `from` and before `to`, from its own calendar. */
  readonly sittings: (
    api: CoreAPI,
    officeId: string,
    from: string,
    to: string,
  ) => readonly SittingDay[];
  /** The hours of one sitting day of the body its members spend in contact, before they are split among the colleagues each knows there. */
  readonly contactHoursPerDay: (api: CoreAPI, officeId: string) => number;
  /** The sitting days a person stayed away from, by body, as their own record keeps them. */
  readonly absences?: (
    api: CoreAPI,
    personId: string,
  ) => ReadonlyMap<string, readonly string[]>;
}

/** The property tax terms of one place. */
export interface PropertyTaxTerms {
  /** Annual tax as a share of assessed value. */
  readonly rate: number;
  /** The most assessed value may rise in a year, as a share; none when uncapped. */
  readonly assessmentCapShare?: number;
  readonly assessmentLawRowId?: string;
  /** Who's paid; the place's outside account when not given. */
  readonly payeeId?: string;
  /** The law row the rate comes from; named on any arrears it leaves. */
  readonly lawRowId?: string;
  readonly source: Source;
}

/**
 * A provider of who succeeds an office's holder, as a `CoreModule` field: the
 * input's `previous` is the offices engine's own term row (`unknown` here, so
 * types.ts imports no engine), and the method form lets a provider declare
 * its own narrower type for it.
 */
export type SuccessorProviderOf = {
  bivarianceHack(
    api: CoreAPI,
    input: { readonly seatId: string; readonly previous: unknown },
  ): {
    readonly personId: string;
    readonly party: string | null;
    readonly reached: string;
    readonly then?: () => void;
  } | null;
}["bivarianceHack"];

export interface CoreModule {
  id: string;
  state?: ModuleStateDefinition;
  /**
   * The world's data as this engine needs it (the acts grief bears on carry
   * their reason when the people engine is loaded). Run in install order,
   * each on what the one before returned, before the core is made.
   */
  dataFor?: (data: CoreData) => CoreData;
  /**
   * The opening input as this engine needs it (the work engine's recorded
   * commitments and pay calendars), run in install order before the core is
   * made, with the world's data. `afterOpen` runs once the core exists and
   * every engine's `onOpen` has run.
   */
  prepareOpening?: (
    input: CoreInput,
    context: { readonly data: CoreData },
  ) => {
    readonly input: CoreInput;
    readonly afterOpen?: (core: CoreState) => void;
  };
  /** Once the core is made, in install order: this engine's part of opening the world (the opening ties, the counted residents admitted). */
  onOpen?: (core: CoreState, input: CoreInput) => void;
  /**
   * Fields other engines read off the modules installed in a world, in install
   * order (`fieldsOf` in module-fields.ts), in place of a list the engines
   * fill as their files load. A field is the engine's own answer to the
   * question the reader asks; the reader never imports the engine. Where a
   * field takes an engine's own record type it is typed as a method with the
   * wider `unknown` or `object`, so the engine's narrower argument type fits.
   */

  /**
   * The outlet that sells ad time and its followers (the press engine's), read
   * by the campaign engine's ad audience in place of a global the press sets
   * when it opens; null where the world has none. World's request, Nov 27.
   */
  adOutlet?(api: CoreAPI): {
    organizationId: string;
    followerIds: readonly string[];
    countedFollowers: number;
  } | null;
  /**
   * The engine's own opening records, run once by the world builder right
   * after it installs the engine into a world (the builder holds the list of
   * engines and the stage each opens in; an engine does not install itself).
   */
  worldOpen?: (core: CoreState) => void;
  /**
   * Runtime state this engine keeps outside its tables and the core's records
   * (a WeakMap keyed by the world, say), by part id: saved with the world and
   * put back by `restoreWorld`. Read off the installed modules, so an engine
   * whose module is installed after a restore does not get its part back;
   * parts of engines installed on first use stay registered by id.
   */
  snapshotParts?: Readonly<Record<string, SnapshotPart>>;
  /**
   * A runtime kept in a WeakMap keyed by the world, saved as one part by id;
   * with `rebuild`, a save that holds no such part gets one built from its
   * records. Same reading as `snapshotParts`.
   */
  worldMapParts?: Readonly<
    Record<
      string,
      {
        readonly map: WeakMap<CoreState, unknown>;
        readonly rebuild?: (core: CoreState) => unknown;
      }
    >
  >;
  /**
   * Caches this engine keeps keyed by the world and built from the world's
   * records: a restore refills the same world in place, so each is cleared at
   * the end of every restore and built again on first read. A function, read
   * at restore time, so the file that holds the caches need not have loaded
   * when the module object is made.
   */
  derivedCaches?: () => readonly WeakMap<CoreState, unknown>[];
  /** A counted person's record by id, or nothing; the shared chooser asks every installed engine (`countedPersonOf`). */
  countedPerson?: (
    core: CoreState,
    personId: PersonId,
  ) => PersonInput | undefined;
  /** A full person's health plan, and how many of a counted household's people a plan covers; the views engine's life term reads them. */
  planReaders?: PlanReaders;
  /** The person an engine builds for a husk it holds the record of, or nothing. */
  huskPromoter?: (
    core: CoreState,
    personId: PersonId,
  ) => PersonState | undefined;
  /** Who a husk is (birth date, place, traits) where this engine holds its record, so the health engine can book its illness and death. */
  huskIdentity?: (
    core: CoreState,
    personId: PersonId,
  ) =>
    | {
        birthDate: string;
        placeId: string;
        traits: Readonly<Record<string, number>>;
      }
    | undefined;
  /** What a husk is paid in a year, in minor units, where this engine knows it. */
  huskIncome?: (core: CoreState, personId: PersonId) => number | undefined;
  /** Holders this engine keeps as names on its record and nothing more; the health engine books their illness and death without building them. */
  unbuiltHolders?: UnbuiltHolders;
  /** Hours two people have spent together that no relationship row keeps, and who this record says a person knows (the closeness reader adds the hours). */
  sharedHours?: {
    readonly hours: (core: object, a: PersonId, b: PersonId) => number;
    readonly known?: KnownThrough;
  };
  /** The bodies' calendars, seats and absences this engine keeps (the sittings two members of a body have shared). */
  sittingCalendar?: SittingCalendar;
  /** What the views engine tells every engine when a person's stance on a topic moves (interest-group membership follows the view). */
  stanceListener?: (api: CoreAPI, personId: PersonId, topic: string) => void;
  /** The property tax terms of a place, as the budgets engine keeps them. */
  propertyTax?: (api: CoreAPI, placeId: string) => PropertyTaxTerms | undefined;
  /** What the moves engine does when a household with returned members leaves a place. */
  returnedMembersLeave?: (
    api: CoreAPI,
    people: readonly PersonState[],
    fromPlace: string,
    toUsps: string,
  ) => void;
  /** What the welfare line pays one household a year (the Census counts public assistance in income). */
  assistanceReader?: (core: CoreState, householdId: string) => number;
  /** Run the moment a person hears a story (the price engine ties a price change to the law the story names). Method form: the engine's `Story` type fits `unknown`. */
  onStoryHeard?(api: CoreAPI, personId: PersonId, story: unknown): void;
  /**
   * Economy's twelve (Nov 27). A government's row, a budget row and the like
   * are the engine's own record types, so the signatures take `unknown` and
   * the carrier and the reader cast; no engine type is named here. The
   * reader asks every installed carrier in install order, or the first
   * where the list says a slot takes one answer.
   */
  /** Law-reach's standing line laws, run at the budget's close. */
  standingLineLaws?: (api: CoreAPI) => void;
  /** A monthly benefit program the law reach pays; every carrier runs. */
  monthlyProgram?: (api: CoreAPI, source: Source) => void;
  /** The body's vote on a government's budget for a fiscal year: the budget row, or null; the first carrier answers. */
  budgetVote?(api: CoreAPI, gov: unknown, fiscalYear: number): unknown;
  /** The body's hearing on a budget; the first carrier runs. */
  budgetHearing?(api: CoreAPI, gov: unknown, fiscalYear: number): void;
  /** Whether the budget's vote is still waiting on its body; the first carrier answers. */
  budgetVoteWaits?(api: CoreAPI, gov: unknown, fiscalYear: number): boolean;
  /** What the law reach pays on each spending line of a government, by line; every carrier adds. */
  linePayments?(api: CoreAPI, gov: unknown): Record<string, number>;
  /** What the law reach adds to named spending lines of a government; every carrier adds. */
  lineAdditions?: {
    readonly keys: readonly string[];
    additions(api: CoreAPI, gov: unknown): readonly unknown[];
  };
  /** What of a government's revenue passes through to other lines, by line. */
  budgetPassThrough?(
    api: CoreAPI,
    gov: unknown,
    revenueMinor: Readonly<Record<string, number>>,
  ): Readonly<Record<string, number>>;
  /** A fiscal rule the law reach reviews at the treasury's close. */
  treasuryRule?: (api: CoreAPI) => void;
  /** How a government's body chooses among bids, and a record of each payment (the contracts module's); the first carrier answers. */
  contractAwarder?: {
    award(
      api: CoreAPI,
      input: unknown,
    ): { readonly id: string; readonly organizationId: string } | null;
    paid(
      api: CoreAPI,
      awardId: string,
      payment: { readonly id: string; readonly amountMinor: number },
    ): void;
  };
  /** The hours an office keeps in a day, by office, with the record they come from; every carrier is summed. */
  officeTime?(api: CoreAPI): ReadonlyMap<string, unknown>;
  /** Every state's people and this month's movers, as the economy engine reads them. */
  countryFlows?(api: CoreAPI): {
    readonly states: readonly unknown[];
    readonly flows: readonly unknown[];
  };
  /**
   * Lawmaking's fifteen (Nov 27). Bill rows and actions are the legislature's
   * own, so they are `unknown` here.
   */
  /** What other engines add to a member's reasons, do before a bill's votes or after, and do when the executive acts on a bill. */
  legislatureHooks?: {
    positionTerm?(api: CoreAPI, bill: unknown, memberId: string): number;
    beforeVote?: {
      readonly name: string;
      readonly run: (api: CoreAPI, billId: string) => void;
      /** The hook casts a member's vote: it runs only where the bill is voted, never at a hearing. */
      readonly castsVote?: boolean;
    };
    afterVote?: (api: CoreAPI, billId: string) => void;
    onDesk?(api: CoreAPI, action: unknown): void;
  };
  /** Whether a bill is held up in committee today. */
  committeeWait?(api: CoreAPI, bill: unknown): boolean;
  /** The meetings engine: puts a budget on its body's agenda for its vote day, and says whether a meeting today votes it. */
  budgetMeeting?: {
    readonly place: (api: CoreAPI, billId: string, date: string) => void;
    readonly votes: (api: CoreAPI, billId: string) => boolean;
  };
  /** The bills a meeting's agenda holds on a date. */
  meetingAgendaReader?(api: CoreAPI, date: string): readonly string[];
  /** Who testifies on a question: the people its records show are concerned with it. */
  hearingWitnesses?(
    api: CoreAPI,
    bill: unknown,
    question: string,
  ): readonly unknown[];
  /** The leadership engine seats a chamber's committees and their chairs. */
  committeeRoster?(
    api: CoreAPI,
    chamber: string,
    committee: string,
  ): { memberIds: readonly string[]; chairId: string } | null;
  /** The floor day the world's legislating gives a bill, or null. */
  floorCalendarer?(api: CoreAPI, billId: string): string | null;
  /** A body's next sitting after a date, or null. */
  sittingReader?(
    api: CoreAPI,
    bodyOfficeId: string,
    after?: string,
  ): unknown | null;
  /** The date a bill's floor vote is set for, or null. */
  floorDateReader?(api: CoreAPI, billId: string): string | null;
  /** The bills the floor takes up in the week of a date. */
  weeklyFloorReader?(api: CoreAPI, date: string): readonly string[];
  /** Called as each member's filed change becomes a bill in their chamber. */
  billIntroduced?(api: CoreAPI, billId: string): void;
  /** Whether a body meets today, and what it does with an agenda filed for a meeting. */
  meetingHold?: {
    hold(api: CoreAPI, officeId: string): boolean;
    filed(
      api: CoreAPI,
      officeId: string,
      meetingDate: string,
      billIds: readonly string[],
    ): void;
  };
  /** Whether the House leader's refusal keeps a bill from the floor. */
  leaderRefusalReader?(api: CoreAPI, billId: string): boolean;
  /** Why an official has no say over what is asked for (a bill, say), or null; every carrier is asked. */
  bribeScope?(
    api: CoreAPI,
    subjectId: string,
    officialId: string,
  ): string | null;
  /** What a policy does once it is law: one handler per policy key, called when the law in force on that key may have changed. */
  policyHandlers?: Readonly<
    Record<string, (api: CoreAPI, change: unknown) => void>
  >;
  /**
   * Offices' five, proposed by Core from the signatures of the register
   * functions they replace, because Offices has not posted its own (Nov 27):
   * rename any of them until a registry moves onto it. Terms, seats and
   * vacancies are the offices engine's own rows, so they are `unknown`.
   */
  /** Who succeeds an office kind's holder, by office kind: the person, their party and how they were reached, or null. */
  successorProviders?: Readonly<Record<string, SuccessorProviderOf>>;
  /** Offers a vacant seat to the person this engine answers for (the player, the elections engine); true when taken. */
  vacancyOffer?(
    api: CoreAPI,
    input: {
      readonly office: unknown;
      readonly seat: unknown;
      readonly vacancyId: string;
      readonly reached: string;
    },
  ): boolean;
  /** Opens a real race for a seat awaiting a special election; true when this engine took the seat. */
  specialElections?(api: CoreAPI, race: unknown): boolean;
  /** The moments a level adds to what may stop the player. */
  stopKinds?: readonly { readonly kind: string; readonly byDefault: boolean }[];
  /**
   * What a level of the office day does on the first of each month, after the
   * stipends. The office day runs it for every module that carries it, in
   * install order.
   */
  onMonth?: (api: CoreAPI) => void;
  /**
   * How much of the seat's scheduled work has come due for a holder, from
   * nothing to one; null where the person holds no seat of this level. The
   * "duty" need reads the largest across the modules that carry it, so the
   * seat's work ranks beside the person's other needs from their own record.
   */
  duty?: (api: CoreAPI, personId: string) => number | null;
  /** Picks one of the candidates for a central bank board vacancy and gives its reasons; nothing when no one is confirmed. */
  boardAppointer?(
    api: CoreAPI,
    vacancy: unknown,
    candidates: readonly unknown[],
    sitting: readonly unknown[],
  ): { index: number; reasons: Readonly<Record<string, number>> } | undefined;
  /**
   * What the voting engine gives the campaign, candidacy and elections engines
   * it cannot import (they are read by it): the candidate a resident would vote
   * for now (`doorChoice`: a candidate id, null for nobody, undefined where the
   * world counts no ballots), whether a person is on the count's roll today
   * (`petitionRoll`), how it finishes the field of a race whose filing closed
   * before the record began (`closedContestWeighed`), and the ward a ward seat
   * represents and the ward a person lives in (`wardResidency`). Each reader
   * asks the installed engines in install order. Method signatures, so the
   * engine's own narrower argument types (a door visit, a contest) fit.
   */
  doorChoice?(
    api: CoreAPI,
    voterId: string,
    contestId: string,
    visit?: unknown,
  ): string | null | undefined;
  petitionRoll?(api: CoreAPI, personId: string): boolean;
  closedContestWeighed?(api: CoreAPI, contest: { readonly id: string }): void;
  wardResidency?(
    api: CoreAPI,
    contest: { readonly id: string },
    person: Readonly<PersonState>,
  ): { readonly seatWard: number; readonly homeWard: number } | null;
  /** Dated institutional work, before day hooks; emits/effects use the canonical API. */
  onCalendarWork?: (api: CoreAPI, work: Readonly<ModuleCalendarWork>) => void;
  /**
   * The module's table of what it did, read as history by the one reader
   * (src/core2/past-history.ts): who it names, when, and the records that
   * caused it. The person's life is the one source with `life` set.
   */
  history?: HistorySource;
  reasonProviders?: Readonly<Record<string, ReasonProvider>>;
  /** Open named kinds resolve actual canonical payment/reclassification records. */
  journalSourceProviders?: Readonly<
    Record<string, ModuleCashJournalSourceProvider>
  >;
  /** Explicit '*' subscribes to every kind; no implicit broadcast subscription. */
  eventKinds?: readonly string[];
  /** Chronological indexed commitments precede remaining-time discretionary acts. */
  onWorkResult?: (api: CoreAPI, receipt: Readonly<WorkResult>) => void;
  /** Attendance/earned accrual is not a paid/unpaid cash event. */
  onWorkAttendance?: (
    api: CoreAPI,
    receipt: Readonly<WorkAttendanceResult>,
  ) => void;
  /** Actual completed payday cash/unpaid result; never attendance/accrual alone. */
  onWorkPayroll?: (
    api: CoreAPI,
    receipt: Readonly<WorkPayrollJournalReceipt>,
  ) => void;
  /** End-of-day settlement/closure observes all chronological work receipts. */
  onAfterDay?: (api: CoreAPI) => void;
  /**
   * Results mode (advanceCore with `results: true`, for time nobody watches)
   * skips every module's onDay and the people due; on the first day of each
   * month it calls this instead, and the engine brings its own daily work up
   * to date with its own functions, so day-by-day play resumes after the skip.
   */
  onResultsMonth?: (api: CoreAPI) => void;
  /**
   * Results mode, every skipped day: an engine whose work is due on exact
   * days it keeps in its own queues (who weighs and files for a race on the
   * day filing opens) runs only what has come due, as the module calendar
   * does for dated work. Not a day's work: no person acts.
   */
  onResultsDay?: (api: CoreAPI) => void;
  /** A household's people have just been filled in from the counts (or returned to them and filled in again): its engines move what they kept on the counted household to the full one. */
  onFillIn?: (
    api: CoreAPI,
    filled: {
      readonly householdId: string;
      readonly memberIds: readonly string[];
    },
  ) => void;
  /**
   * Called after every paid sale to a business (finance purchase contracts and
   * the residents' merged purchases), e.g. to remit sales tax from the seller.
   */
  onSalesReceipt?: (api: CoreAPI, sale: SalesReceiptNotice) => void;
  /**
   * Called after the counted workers of an employer are paid on a payday,
   * the counted side of onWorkPayroll (e.g. the employer's payroll tax share).
   */
  onCountedWages?: (api: CoreAPI, notice: CountedWagesNotice) => void;
  onDay?: (
    api: CoreAPI,
    decide: (
      personId: PersonId,
      offers: readonly ActOffer[],
      context?: DecisionContext,
    ) => DecisionResult,
    refresh: (
      actor: PersonState,
      needIds?: readonly string[],
    ) => DecisionContext | undefined,
  ) => { decisions: number; acts: number } | void;
  onEvent?: CoreEventListener;
  /** Optional learned-appraisal stream, indexed independently from old event listeners. */
  appraisalEventKinds?: readonly string[];
  onEventAppraisal?: CoreEventAppraisalListener;
  /** Explicit '*' observes all kinds; notices never create events or knowledge. */
  relationshipKinds?: readonly string[];
  onRelationshipChange?: CoreRelationshipListener;
  needEvaluators?: Readonly<
    Record<
      string,
      (
        api: CoreAPI,
        actor: Readonly<PersonState>,
        definition: NeedDefinition,
      ) => number
    >
  >;
  offerProviders?: Readonly<
    Record<
      string,
      (
        api: CoreAPI,
        actor: Readonly<PersonState>,
        action: ActionDefinition,
        round?: OfferRound,
      ) => readonly ActOffer[]
    >
  >;
  effectHandlers?: Readonly<
    Record<
      string,
      (
        api: CoreAPI,
        actorId: PersonId,
        offer: ActOffer,
        date: IsoDate,
        days: number,
        decision: DecisionResult,
      ) => void | {
        recordedActId: string;
        recordedActivity?: true;
        recordedLastActDate?: true;
      }
    >
  >;
  eligibilityRules?: Readonly<
    Record<
      string,
      (
        api: CoreAPI,
        actor: Readonly<PersonState>,
        offer: ActOffer,
        argument?: string,
      ) => boolean
    >
  >;
}

/** All engine changes enter through this versioned facade. */
export interface CoreAPI {
  moduleState(moduleId: string): ModuleStateStore;
  moduleCalendar(moduleId: string): ModuleCalendar;
  /** Named accounts, transfers and obligations through the one journal (M0-09). */
  accounts(): Accounts;
  version: string;
  readonly state: Readonly<CoreState>;
  parameter(key: string): number;
  observe(personId: PersonId, fact: KnownFact): void;
  knows(personId: PersonId, key: string): KnownFact | undefined;
  postJournal(input: CashJournalInput): CashJournalProjection;
  completeJournalSource(
    reference: CashJournalSourceRef,
  ): CashJournalSourceCompletion;
  registerCashAccount(input: CashAccountSnapshot): void;
  releaseJournalSource(reference: CashJournalSourceRef): void;
  addFinanceContract(input: FinanceContractInput): void;
  addFinanceCondition(input: FinanceConditionInput): void;
  addCreditFacility(input: CreditFacilityInput): void;
  /** Reduces recorded arrears by a payment already moved through the ledger. */
  reduceStandingArrears(contractId: string, paidMinor: number): void;
  /** A household filled in from the counts takes up the arrears its group had run up on the counted lease. */
  carryStandingArrears(
    contractId: string,
    owedMinor: number,
    since: string,
  ): void;
  /** A standing obligation's amount from its next due date. */
  setStandingContractAmount(contractId: string, amountMinor: number): void;
  /** A standing obligation stops billing today; its arrears stay owed. */
  endStandingContract(contractId: string): void;
  /** Makes an approved line the open business's credit for its bills and payroll. */
  attachBusinessCredit(organizationId: string, facilityId: string): void;
  /** Admits one job, its commitment and its payroll calendar mid-run. */
  startJob(
    job: JobInput,
    commitment: WorkCommitmentInput,
    calendar: WorkPayrollCalendarInput,
  ): void;
  /** A post paid a salary, not by the hour: the job with no shift hours (official-pay posts the pay). */
  startSalariedPost(job: JobInput): void;
  /** Ends one current job today; earned wages stay owed for the next payday. */
  /** `afterShift`: the holder already worked today; the job ends tomorrow, so today's shift stands and is paid. */
  endJob(jobId: string, sourceId: string, afterShift?: boolean): void;
  /** Accrues to today at the old rate, then applies the new annual rate from today on. */
  repriceCreditFacility(
    facilityId: string,
    annualInterestRate: number,
    source: Source,
  ): void;
  addBusinessBooks(input: BusinessBooksInput): void;
  settleFinanceContract(contractId: string): FinanceReceipt;
  retireFinanceBudget(contractId: string): void;
  /** Called after household bills and before any procurement in the dated batch. */
  prepareFinanceProcurement(contractIds: readonly string[]): void;
  drawCredit(
    facilityId: string,
    requestedMinor: number,
    reasonKey: string,
    sourceId: string,
  ): CreditReceipt;
  repayCredit(
    facilityId: string,
    requestedMinor: number,
    reasonKey: string,
    sourceId: string,
  ): CreditReceipt;
  /** An employer's credit line pays what its cash could not of a counted wage flow due today. */
  drawWageFlowCredit(
    facilityId: string,
    requestedMinor: number,
    flowId: string,
  ): CreditReceipt;
  reviewBusiness(organizationId: string): void;
  closeEmployer(
    organizationId: string,
    sourceReceiptId: string,
    reasonKey: string,
  ): EmployerClosure;
  /**
   * v20: an owner closes a solvent business by choice; its remaining cash
   * goes to the owner's account and its jobs, contracts and books end.
   */
  /**
   * v21: a sales tax in force on a place's sellers; each paid sale remits the
   * tax inside its price to the treasury (`modules/purchase-tax.ts`).
   */
  setPurchaseTax(input: PurchaseTaxInput): void;
  endPurchaseTax(id: string): void;
  closeBusinessByChoice(input: {
    organizationId: string;
    ownerAccountId: string;
    reasonKey: string;
    source: Source;
  }): EmployerClosure;
  finishFinanceDay(): void;
  addWorkCommitment(input: WorkCommitmentInput): void;
  addWorkPayrollCalendar(input: WorkPayrollCalendarInput): void;
  recordWorkAttendance(input: WorkAttendanceInput): WorkAttendanceResult;
  settleWorkPayroll(commitmentId: string): WorkPayrollJournalReceipt;
  settleWorkResult(input: WorkResultInput): WorkResult;
  recordActivityTime(
    personId: PersonId,
    category: string,
    minutes: number,
    source: Source,
  ): void;
  recordDiscretionaryTime(personId: PersonId, minutes: number): void;
  /**
   * Minutes an office took from a person's day (a sitting, a committee, a
   * day at a post), on the same clock as a shift's minutes, with no pay; the
   * day's remaining hours bound it. Returns the minutes recorded.
   */
  recordOfficeTime(personId: PersonId, minutes: number): number;
  relationship(
    actorId: PersonId,
    otherId: PersonId,
    kind: Relationship["kind"],
    change: number,
    decision?: DecisionResult,
    reason?: RelationshipReason,
  ): void;
  /**
   * P15 part 5: two people who did not know each other meet in a real shared
   * moment. Each enters the other's circle, learns the name and the dated
   * meeting, and their first tie holds the hours spent together. Returns
   * false when they already knew each other.
   */
  meet(actorId: PersonId, otherId: PersonId, encounter: Encounter): boolean;
  join(personId: PersonId, organizationId: string, driveId?: string): void;
  /** The person leaves the organization; nothing happens if they were not in it. */
  leave(personId: PersonId, organizationId: string): void;
  emit(event: CoreEventInput): void;
  /** External consumers can subscribe without owning or scanning world state. */
  subscribeEvents(
    subscriberId: string,
    kinds: readonly string[],
    listener: CoreEventListener,
  ): () => void;
  /** Model modules publish their already-applied result during the actual event dispatch. */
  publishEventAppraisal(appraisal: Readonly<EventAppraisal>): void;
  subscribeEventAppraisals(
    subscriberId: string,
    kinds: readonly string[],
    listener: CoreEventAppraisalListener,
  ): () => void;
  subscribeRelationshipChanges(
    subscriberId: string,
    kinds: readonly string[],
    listener: CoreRelationshipListener,
  ): () => void;
  validateAct(
    actorId: PersonId,
    offer: ActOffer,
    date: IsoDate,
    reason: DecisionResult,
  ): void;
  recordAct(
    actorId: PersonId,
    offer: ActOffer,
    date: IsoDate,
    reason: DecisionResult,
  ): string;
  stopgap(id: string): void;
  /** An explicitly undefined choice-eligibility flag restores the default rule. */
  updatePerson(
    personId: PersonId,
    changes: Partial<
      Pick<
        PersonState,
        | "affect"
        | "lastContactDate"
        | "lastChoice"
        | "lastReason"
        | "alive"
        | "jobId"
        | "tier"
        | "lastActDate"
        | "discretionaryEligibleV1"
        | "livingCostDailyMinor"
        | "traits"
      >
    >,
  ): void;
  /**
   * The new game's chosen identity for the controlled player, on the day the
   * world opens: name, birth date and look fields (gender, appearance). Only
   * the controlled player, only before any day has passed; the birth date
   * may not be in the future. The life's generated past is not rewritten. A
   * `looks.origin` other than the drawn one is taken by the household and
   * the kin who shared the drawn origin.
   */
  chooseIdentityV1(
    personId: PersonId,
    identity: {
      readonly givenName: string;
      readonly familyName: string;
      readonly birthDate: IsoDate;
      readonly looks: Readonly<Record<string, string>>;
    },
  ): void;
  /**
   * People leaving town for another place (moves): each takes the new place
   * and county and leaves the town's place index. When they are the whole
   * household, the household goes with them under its own id; otherwise they
   * leave it for `householdId`, a new household at the new place, and a
   * recorded income award of theirs is paid into it. None may still hold a
   * job here.
   */
  relocatePeopleV1(input: {
    personIds: readonly PersonId[];
    placeId: PlaceId;
    countyId?: PlaceId;
    householdId: string;
    source: Source;
  }): void;
  /**
   * People change household in the same town: they join `householdId` (an
   * existing household, or a new one made here at their place) and leave the
   * households they were in. Each moving household's share of the everyday
   * spending follows them, the home obligations they shared (the lease) are
   * paid by the household they now belong to, and one left with no payer
   * ends. A recorded income award (a pension, Social Security) is paid into
   * the household its person joins, as it is when people relocate. A
   * household left with no member keeps its record and ends its own
   * obligations; an owned home is for the caller to sell first. All movers
   * must be living full people at the same place.
   */
  changeHouseholdV1(input: {
    personIds: readonly PersonId[];
    householdId: string;
    source: Source;
  }): void;
  /**
   * Two living adults become partners (`together`), or stop being: a partner
   * link is added or ended, each person's relatives and past facts record it
   * with the date, and the event `family.partnered` or `family.separated` is
   * emitted for the engines (the births engine takes up a new couple). Where
   * the two live is the caller's business (`changeHouseholdV1`).
   */
  setPartnersV1(input: {
    personIds: readonly [PersonId, PersonId];
    together: boolean;
    source: Source;
    /** Who hears of it (relatives in the played town), on the emitted event. */
    witnessIds?: readonly PersonId[];
    /** Facts the event carries besides its link (a union's kind). */
    facts?: Readonly<Record<string, string>>;
  }): void;
  /**
   * An adult who comes to exist in play (a partner met by someone living
   * elsewhere): admitted with no cash and no job into a household that
   * already exists at their place. Their family and known people must
   * already be full people.
   */
  addPersonV1(input: PersonInput): PersonState;
  /** New hourly pay from today for a full or counted worker (e.g. a wage law). */
  rerateJob(jobId: string, hourlyMinor: number, source: Source): void;
  /** New daily hours for a job from today: its shifts shrink or grow in proportion, open pay periods keep what was earned, and the next payday pays the new hours. */
  rehourJob(jobId: string, hoursDaily: number, source: Source): void;
  /**
   * v19: a public pay authority draws its wages from a government's cash
   * (its treasury) on each payday; what the treasury can't cover, the
   * authority still pays and records as a shortfall.
   */
  fundPublicPay(authorityId: string, treasuryId: string, source: Source): void;
  /** v19: wages a funded authority's treasury couldn't cover, in total. */
  publicPayShortfallMinor(authorityId: string): number;
  /**
   * v18: a business founded mid-run takes its share of the counted
   * households' purchases (by capacity and price); returns each kind's yearly sales.
   */
  enterMarket(
    entry: MarketEntry,
  ): { financeKind: string; annualDemandMinor: number }[];
  addOrganization(input: OrganizationInput): void;
  /** v11: zero-stock newborn admission through the canonical person writer. */
  addBornPersonV1(
    input: PersonInput,
    parents: readonly [PersonId, PersonId],
    relations: readonly {
      otherId: PersonId;
      relation: string;
      inverse: string;
    }[],
  ): PersonState;
  lookupPublicOrganization(personId: PersonId, organizationId: string): void;
  updateNeeds(
    personId: PersonId,
    values: Readonly<Record<string, number>>,
  ): void;
  updateGoal(personId: PersonId, goal: Goal): void;
  updateDrive(personId: PersonId, drive: Drive): void;
  markOrganized(personId: PersonId, topic: string): void;
  requestCallback(event: CoreEventInput): void;
  /** Close an answered (or moot) callback; the approach gate reopens. */
  resolveCallback(callbackId: string): void;
}
