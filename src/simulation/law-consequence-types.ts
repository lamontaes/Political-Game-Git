import type { LawInForce } from "./governing/law-in-force";
import type { EntityId, IsoDate } from "./types";

export type LawConsequenceKind =
  | "pay" | "tax" | "price-cost" | "coverage-eligibility"
  | "right-permission" | "service-delivered" | "legal-outcome" | "institution-rule";

/** Units are checked by the evaluator before a handler can write a record. */
export type LawAmountUnit = "minor" | "minor/hour" | "hours" | "people" | "count" | "ratio";
export type LawAmountExpression =
  | { op: "term" | "record" | "capacity" | "exposure"; key: string; unit: LawAmountUnit }
  | { op: "constant"; value: number; unit: LawAmountUnit; sourceIds: string[] }
  | { op: "sum" | "minimum" | "maximum"; operands: LawAmountExpression[] }
  | { op: "difference" | "product" | "ratio"; left: LawAmountExpression; right: LawAmountExpression };

/** Capability names must resolve through the engine registry, never object paths or eval. */
export interface LawConsequencePredicate {
  capability: string;
  parameters: Record<string, string | number | boolean>;
}
export interface LawConsequenceRow {
  id: string;
  kind: LawConsequenceKind;
  when: "effective" | "payroll" | "assessment" | "renewal" | "service";
  who: { selector: string; predicates: LawConsequencePredicate[] };
  what: string;
  amount: LawAmountExpression;
  conditions: LawConsequencePredicate[];
  lag: { days: number; sourceIds: string[] };
  onRepeal: "end-future-eligibility" | "recompute-prospective" | "preserve-completed";
  evidence: { sourceIds: string[]; population: string; scope: string; why: string; uncertainty: string };
  onward?: LawConsequenceRow[];
}
export interface LawConsequenceContext {
  onDate: IsoDate;
  activity: LawConsequenceRow["when"];
  activityId: EntityId;
  subjectIds: EntityId[];
  governingLawId?: EntityId;
}

/** The engine resolves legal authority and actual job records before invoking pay. */
export interface ResolvedLawPayConsequence {
  rowId: string;
  law: LawInForce;
  personId: EntityId;
  workId: EntityId;
  payFlowId: EntityId;
  activityId: EntityId;
  effectiveAt: IsoDate;
  amount: { value: number; unit: "minor/hour" };
  sourceRecordIds: EntityId[];
  action: "raise-hourly-floor";
}
