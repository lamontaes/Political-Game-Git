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
import type {
  LegacyWorkCashInput,
  LegacyWorkCashResult,
  WorkCashSourceState,
} from "./work-cash";
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
  /** The labor union local whose member the holder of this job is (recorded at the opening). */
  unionLocalId?: string;
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

export interface HouseholdInput {
  id: string;
  placeId: PlaceId;
  memberIds: readonly PersonId[];
  source: Source;
}

/** P15: why a closeness changed, the cause and the record behind it. */
export interface RelationshipReason {
  cause: string;
  sourceId?: string;
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
  lastContactDate: IsoDate;
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
/** Actual legacy discretionary paid-work completions; separate from scheduled job totals.
 * Shortfall is a cumulative unretried remainder, never a scheduled arrears stock.
 */
export interface LegacyDiscretionaryWageTotals {
  earnedMinor: number;
  paidMinor: number;
  shortfallMinor: number;
  completedReceiptCount: number;
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
  latestLegacyCashResultByPerson: Map<PersonId, LegacyWorkCashResult>;
  /** Cumulative actual conserving legacy completions, including zero-line completion. */
  legacyDiscretionaryWages: LegacyDiscretionaryWageTotals;
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
  discretionaryExclusions: readonly string[];
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
  priorFactsSource?: readonly {
    personId: PersonId;
    field: string;
    status: "filled" | "preserved" | "unresolved";
    factIds: readonly string[];
    source?: Source;
    reason: string;
  }[];
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
  logByPlace: Map<PlaceId, Set<string>>;
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
  legacyWorkJournalSourceKind: string;
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

export interface CoreModule {
  id: string;
  state?: ModuleStateDefinition;
  /** Dated institutional work, before day hooks; emits/effects use the canonical API. */
  onCalendarWork?: (api: CoreAPI, work: Readonly<ModuleCalendarWork>) => void;
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
  endJob(jobId: string, sourceId: string): void;
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
  settleLegacyWorkResult(input: LegacyWorkCashInput): LegacyWorkCashResult;
  recordActivityTime(
    personId: PersonId,
    category: string,
    minutes: number,
    source: Source,
  ): void;
  recordDiscretionaryTime(personId: PersonId, minutes: number): void;
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
      >
    >,
  ): void;
  /**
   * The new game's chosen identity for the controlled player, on the day the
   * world opens: name, birth date and look fields (gender, appearance). Only
   * the controlled player, only before any day has passed; the birth date
   * may not be in the future. The life's generated past is not rewritten.
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
   * leave it for `householdId`, a new household at the new place. None may
   * still hold a job here.
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
   * ends. A household left with no member keeps its record and ends its own
   * obligations; an owned home is for the caller to sell first. All movers
   * must be living full people at the same place.
   */
  changeHouseholdV1(input: {
    personIds: readonly PersonId[];
    householdId: string;
    source: Source;
  }): void;
  /** New hourly pay from today for a full or counted worker (e.g. a wage law). */
  rerateJob(jobId: string, hourlyMinor: number, source: Source): void;
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
