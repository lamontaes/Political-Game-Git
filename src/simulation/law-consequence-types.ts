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

/** Existing bespoke stamp labels awaiting migration; new kinds use LawConsequenceKind. */
export type LegacyEffectKind =
  | "business-compliance-cost"
  | "cannabis-selective-tax-revenue"
  | "congress-voting-seat-tenure"
  | "election.state-legislative-candidacy-intent"
  | "eviction-counsel-representation"
  | "federal-income-tax-withholding"
  | "government-outlay-change"
  | "government-program-payment"
  | "health-coverage"
  | "housing-permit-units"
  | "inclusionary-affordable-rent"
  | "justice.held-before-trial"
  | "justice.released-before-trial"
  | "law.pay-compensation"
  | "local.officeholder-retired"
  | "local.wards-drawn"
  | "minimum-custody-months"
  | "minimum-wage-compensation"
  | "paid-leave-benefit"
  | "paid-leave-budget-cost"
  | "public-program-appropriation"
  | "rent-stabilization-renewal"
  | "state-revenue-loss"
  | "state-spending"
  | "tax-assessment"
  | "tax-collection"
  | "tax-policy"
  | "teacher-pay"
  | "work-compensation-payment";

/** Units are checked by the evaluator before a handler can write a record. */
export const LAW_AMOUNT_UNITS = [
  "minor",
  "minor/hour",
  "minor/container",
  "minor/tonne-co2-equivalent",
  "hours",
  "share-of-federal-poverty-level",
  "share-of-local-poverty-level",
  "people",
  "count",
  "ratio",
  "basis-points",
  "dollars/year",
  "years",
  "months",
  "days",
  "containers",
  "tonnes-co2-equivalent",
  "fluid-ounces",
  "litres",
] as const;
export type LawAmountUnit = (typeof LAW_AMOUNT_UNITS)[number];

/**
 * Additional applicability dimensions for a sourced scalar law amount.
 * Missing scope on legacy source rows means unknown and cannot match a
 * modeled peer. These fields describe the rule's subject/base; geography and
 * affected people remain on the provision's applicationScope.
 */
export type LawTermScope =
  | { readonly kind: "statewide" }
  | {
      readonly kind: "consumer-credit";
      readonly lenderClass: string;
      readonly productClass: string;
      readonly rateBasis: string;
      readonly includedChargeKeys: readonly string[];
      readonly exceptionSetKey: string;
    }
  | {
      readonly kind: "vehicle-mileage";
      readonly vehicleClass: string;
      readonly programKey: string;
      readonly participationRuleKey: string;
      readonly capRuleKey: string | null;
    }
  | {
      readonly kind: "retail-sales-tax";
      readonly taxableBaseKey: string;
      readonly purchaserClass: string;
    };

/** Canonical structural key; absent, malformed or extended scopes stay unknown. */
export function lawTermScopeKey(
  scope: LawTermScope | undefined,
): string | null {
  if (!scope || typeof scope !== "object") return null;
  const exactKeys: Readonly<Record<LawTermScope["kind"], readonly string[]>> = {
    statewide: ["kind"],
    "consumer-credit": [
      "kind",
      "lenderClass",
      "productClass",
      "rateBasis",
      "includedChargeKeys",
      "exceptionSetKey",
    ],
    "vehicle-mileage": [
      "kind",
      "vehicleClass",
      "programKey",
      "participationRuleKey",
      "capRuleKey",
    ],
    "retail-sales-tax": ["kind", "taxableBaseKey", "purchaserClass"],
  };
  const expected = exactKeys[scope.kind];
  if (!expected) return null;
  const actual = Object.keys(scope).sort();
  if (JSON.stringify(actual) !== JSON.stringify([...expected].sort()))
    return null;
  const nonempty = (value: unknown): value is string =>
    typeof value === "string" && value.trim().length > 0;
  switch (scope.kind) {
    case "statewide":
      return JSON.stringify([scope.kind]);
    case "consumer-credit": {
      if (
        !nonempty(scope.lenderClass) ||
        !nonempty(scope.productClass) ||
        !nonempty(scope.rateBasis) ||
        !nonempty(scope.exceptionSetKey) ||
        !Array.isArray(scope.includedChargeKeys) ||
        scope.includedChargeKeys.some((key) => !nonempty(key)) ||
        new Set(scope.includedChargeKeys).size !==
          scope.includedChargeKeys.length
      )
        return null;
      return JSON.stringify([
        scope.kind,
        scope.lenderClass,
        scope.productClass,
        scope.rateBasis,
        [...scope.includedChargeKeys].sort(),
        scope.exceptionSetKey,
      ]);
    }
    case "vehicle-mileage":
      return nonempty(scope.vehicleClass) &&
        nonempty(scope.programKey) &&
        nonempty(scope.participationRuleKey) &&
        (scope.capRuleKey === null || nonempty(scope.capRuleKey))
        ? JSON.stringify([
            scope.kind,
            scope.vehicleClass,
            scope.programKey,
            scope.participationRuleKey,
            scope.capRuleKey,
          ])
        : null;
    case "retail-sales-tax":
      return nonempty(scope.taxableBaseKey) && nonempty(scope.purchaserClass)
        ? JSON.stringify([
            scope.kind,
            scope.taxableBaseKey,
            scope.purchaserClass,
          ])
        : null;
  }
}

/** Exact scopes only; a legacy term with no scope never matches a donor. */
export function lawTermScopesMatch(
  target: LawTermScope | undefined,
  donor: LawTermScope | undefined,
): boolean {
  const targetKey = lawTermScopeKey(target);
  return targetKey !== null && targetKey === lawTermScopeKey(donor);
}

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

/** One adopted rental rule; formula and coverage cannot come from different sections. */
export interface RentalPriceRule {
  readonly cap: LawAmountExpression;
  readonly coverage: {
    readonly minimumBuildingAgeYears?: number;
    readonly exemptions: readonly (
      "affordable-program-adjustment" | "separate-property-with-notice"
    )[];
    readonly dwellingClassifications?: readonly string[];
    readonly maximumFacilitySpaces?: number;
    readonly noticeDays?: number;
  };
  readonly from?: string;
  readonly through?: string;
  /** Published statutory index observation, not the world's modeled inflation. */
  readonly index?: {
    readonly changeRatio: number;
    readonly publishedAt: string;
    readonly from: string;
    readonly through: string;
    readonly source: string;
  };
}

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
  /** Binding to an already saved statutory levy; never an assessment formula. */
  attributes?: {
    level: LawInForce["level"];
    taxKey: string;
    authority?: string;
  };
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

/** Actual adopted annual office-pay authority, distinct from hourly floors. */
export interface SavedAnnualOfficePayAuthority {
  kind: "enacted-annual-office-pay-rule";
  ruleChangeProvisionId: EntityId;
  enactmentId: EntityId;
  measureId: EntityId;
  officeKey: string;
  stateUsps: string;
  field:
    | "pay.governor.annualDollars"
    | "pay.stateLegislator.annualDollars"
    | "pay.trialJudge.annualDollars";
  operativeAt: IsoDate;
  applicability: RuleChangeApplicability;
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
/** Actual adopted typed levy, without fabricating a catalog question. */
export interface ResolvedTypedTaxConsequence extends Omit<
  ResolvedLawConsequence,
  "law" | "questionKey"
> {
  authority: {
    kind: "enacted-typed-tax-policy";
    measureId: EntityId;
    proposalId: EntityId;
    policyId: EntityId;
    enactmentId: EntityId;
    levyProvisionId: EntityId;
  };
}
export interface ResolvedSavedRuleConsequence extends Omit<
  ResolvedLawConsequence,
  "law" | "questionKey"
> {
  authority:
    | ResolvedSavedHourlyPayConsequence["authority"]
    | SavedAnnualOfficePayAuthority;
}
export type ResolvedSavedLawConsequence =
  | ResolvedStandingServiceConsequence
  | ResolvedTypedTaxConsequence
  | ResolvedSavedRuleConsequence;
export type ResolvedAnyLawConsequence =
  ResolvedLawConsequence | ResolvedSavedLawConsequence;

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
  resolveSavedRules?: Extract<T, ResolvedSavedLawConsequence> extends never
    ? never
    : (
        world: World,
        context: LawConsequenceContext,
      ) => readonly Extract<T, ResolvedSavedLawConsequence>[];
  apply(world: World, resolved: T): World;
}

export type AnyLawConsequenceKindRegistration =
  LawConsequenceKindRegistration<ResolvedAnyLawConsequence>;
