import type { RuleChangeProvisionRecord, RuleChangeApplicability } from "./enacted-rule-changes";
import type { LawInForce } from "./governing/law-in-force";
import type { EntityId, IsoDate, World } from "./types";

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
  onDate: IsoDate;
  activity: LawConsequenceRow["when"];
  activityId: EntityId;
  subjectIds: EntityId[];
  /** Opening applies only law already in force; activities may resolve either origin. */
  origin?: LawInForce["origin"];
  governingLawId?: EntityId;
  questionKey?: string;
}

/** The engine resolves legal authority and actual job records before invoking pay. */
export interface ResolvedHourlyLawPayConsequence {
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

/** Actual saved office rule authority; this is not a policy question. */
export interface ResolvedAnnualOfficePayConsequence {
  rowId: string;
  jurisdictionId: EntityId;
  personId: EntityId;
  workId: EntityId;
  payFlowId: EntityId;
  activityId: EntityId;
  effectiveAt: IsoDate;
  amount: { value: number; unit: "minor"; currency: "USD" };
  sourceRecordIds: EntityId[];
  action: "set-annual-office-salary";
  authority: {
    kind: "enacted-office-rule";
    ruleChangeProvisionId: EntityId;
    enactmentId: EntityId;
    measureId: EntityId;
    officeKey: string;
    stateUsps: string;
    field: RuleChangeProvisionRecord["field"];
    operativeAt: IsoDate;
    applicability: RuleChangeApplicability;
  };
}

/** Both actions use the existing pay writer and actual recorded pay cadence. */
export type ResolvedLawPayConsequence =
  | ResolvedHourlyLawPayConsequence
  | ResolvedAnnualOfficePayConsequence;

/** Nonnumeric legal decisions are not encoded as invented zero-dollar amounts. */
export type ResolvedLawValue =
  | { type: "amount"; value: number; unit: LawAmountUnit; currency?: string }
  | { type: "boolean"; value: boolean }
  | { type: "decision"; value: string };
export interface ResolvedLawConsequence {
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
export type LawConsequenceHandler = (
  world: World,
  resolved: ResolvedLawConsequence,
) => World;
export interface LawConsequenceKindRegistration {
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
  apply: LawConsequenceHandler;
}
