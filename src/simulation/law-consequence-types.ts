import type { RuleChangeApplicability } from "./enacted-rule-changes";
import type { LawInForce } from "./governing/law-in-force";
import type {
  EntityId,
  IsoDate,
  World,
  PublicProgramAppropriationRecord,
} from "./types";

export type LawConsequenceKind =
  | "pay"
  | "tax"
  | "price-cost"
  | "coverage-eligibility"
  | "right-permission"
  | "service-delivered"
  | "legal-outcome"
  | "institution-rule";

/** Units are checked by the evaluator before a handler can write a record. */
export type LawAmountUnit =
  | "minor"
  | "minor/hour"
  | "hours"
  | "people"
  | "count"
  | "ratio"
  | "years"
  | "months"
  | "days";
export type LawAmountExpression =
  | {
      op: "term" | "record" | "capacity" | "exposure";
      key: string;
      unit: LawAmountUnit;
    }
  | { op: "constant"; value: number; unit: LawAmountUnit; sourceIds: string[] }
  | { op: "sum" | "minimum" | "maximum"; operands: LawAmountExpression[] }
  | {
      op: "difference" | "product" | "ratio";
      left: LawAmountExpression;
      right: LawAmountExpression;
    };

/** Capability names must resolve through the engine registry, never object paths or eval. */
export interface LawConsequencePredicate {
  capability: string;
  parameters: Record<string, string | number | boolean>;
}
export interface LawConsequenceRow {
  id: string;
  kind: LawConsequenceKind;
  when:
    | "effective"
    | "payroll"
    | "assessment"
    | "renewal"
    | "service"
    | "case-stage"
    | "application"
    | "payment";
  who: { selector: string; predicates: LawConsequencePredicate[] };
  what: string;
  amount?: LawAmountExpression;
  decision?: {
    op: "term" | "record";
    key: string;
    type: "boolean" | "decision";
  };
  conditions: LawConsequencePredicate[];
  lag: { days: number; sourceIds: string[] };
  onRepeal:
    "end-future-eligibility" | "recompute-prospective" | "preserve-completed";
  evidence: {
    sourceIds: string[];
    population: string;
    scope: string;
    why: string;
    uncertainty: string;
  };
  onward?: LawConsequenceRow[];
}
export interface LawConsequenceContext {
  completedShift?: { eventId: EntityId; termsId: EntityId };
  onDate: IsoDate;
  activity: LawConsequenceRow["when"];
  activityId: EntityId;
  subjectIds: EntityId[];
  origin?: LawInForce["origin"];
  standingAppropriationId?: EntityId;
  governingLawId?: EntityId;
  questionKey?: string;
}

/** The engine resolves legal authority and actual job records before invoking pay. */
export interface ResolvedLawPayConsequence {
  rowId: string;
  questionKey: string;
  jurisdictionId: EntityId;
  law: LawInForce;
  personId: EntityId;
  workId: EntityId;
  payFlowId: EntityId;
  activityId: EntityId;
  effectiveAt: IsoDate;
  amount: { value: number; unit: "minor/hour"; currency: "USD" };
  sourceRecordIds: EntityId[];
  action: "raise-hourly-floor";
}

/** Exact completed-work identity retained by an earned assessment. */
export interface ResolvedHourlyLawPayConsequence extends ResolvedLawPayConsequence {
  completedShift?: { eventId: EntityId; termsId: EntityId };
}

/** Saved hourly-rule authority, without a synthetic policy question. */
export interface ResolvedSavedHourlyPayConsequence extends Omit<
  ResolvedHourlyLawPayConsequence,
  "law" | "questionKey" | "action"
> {
  action: "raise-saved-rule-hourly-floor";
  authority: {
    kind: "enacted-hourly-pay-rule";
    ruleChangeProvisionId: EntityId;
    enactmentId: EntityId;
    measureId: EntityId;
    officeKey: string;
    stateUsps: string;
    field: "labor.minimumWage.hourlyCents";
    operativeAt: IsoDate;
    applicability: RuleChangeApplicability;
  };
}

/** Nonnumeric legal decisions are not encoded as invented zero-dollar amounts. */
export type ResolvedLawValue =
  | { type: "amount"; value: number; unit: LawAmountUnit; currency?: string }
  | { type: "boolean"; value: boolean }
  | { type: "decision"; value: string };
export interface ResolvedLawConsequence {
  completedShift?: { eventId: EntityId; termsId: EntityId };
  row: LawConsequenceRow;
  law: LawInForce;
  questionKey: string;
  jurisdictionId: EntityId;
  subject: {
    kind: "person" | "household" | "organization" | "place";
    id: EntityId;
  };
  activityId: EntityId;
  effectiveAt: IsoDate;
  sourceRecordIds: EntityId[];
  value: ResolvedLawValue;
}
/** Actual sourced appropriation already saved by the common program writer. */
export interface StandingProgramAuthority {
  kind: "standing-program-appropriation";
  appropriationId: EntityId;
  programKey: string;
  jurisdictionId: EntityId;
  accountOrganizationId: EntityId;
  publicGovernmentIdentity: PublicProgramAppropriationRecord["publicGovernmentIdentity"];
  availableFrom: IsoDate;
  availableThrough: IsoDate;
  sourceBasis: PublicProgramAppropriationRecord["basis"];
}
export interface ResolvedStandingServiceConsequence extends Omit<
  ResolvedLawConsequence,
  "law" | "questionKey"
> {
  authority: StandingProgramAuthority;
}
export interface ResolvedSavedRuleConsequence extends Omit<
  ResolvedLawConsequence,
  "law" | "questionKey"
> {
  authority: ResolvedSavedHourlyPayConsequence["authority"];
}
export type ResolvedSavedAuthorityConsequence =
  ResolvedSavedRuleConsequence | ResolvedStandingServiceConsequence;
export type ResolvedAnyLawConsequence =
  ResolvedLawConsequence | ResolvedSavedAuthorityConsequence;

export type LawConsequenceHandler = (
  world: World,
  resolved: ResolvedLawConsequence,
) => World;
export interface LawConsequenceKindRegistration<
  T extends ResolvedAnyLawConsequence = ResolvedLawConsequence,
> {
  kind: LawConsequenceKind;
  owner: string;
  selectors: readonly string[];
  actions: readonly string[];
  predicates: readonly string[];
  units: readonly LawAmountUnit[];
  resolve: (
    world: World,
    row: LawConsequenceRow,
    context: LawConsequenceContext,
  ) => readonly ResolvedLawConsequence[];
  resolveSavedRules?: Extract<
    T,
    ResolvedSavedAuthorityConsequence
  > extends never
    ? never
    : (
        world: World,
        context: LawConsequenceContext,
      ) => readonly Extract<T, ResolvedSavedAuthorityConsequence>[];
  apply(world: World, resolved: T): World;
}

export type AnyLawConsequenceKindRegistration =
  LawConsequenceKindRegistration<ResolvedAnyLawConsequence>;
