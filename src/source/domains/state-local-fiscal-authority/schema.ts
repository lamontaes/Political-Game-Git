/**
 * What each fiscal field is allowed to hold, and at which level of government.
 *
 * Two constraints live here, and both are the kind that a wide interface of
 * optional fields cannot express.
 *
 * A field has a *value kind*. `NOMINAL_MILLAGE_CAP_MILLS` is mills, not
 * percent, and `LINE_ITEM_VETO_AVAILABLE` is a boolean, not the string "yes".
 * 92N's local matrix reports millage caps and levy growth caps side by side in
 * the same column — "R: 10-mill unvoted limitation", "L: 2.5% levy growth cap"
 * — and a compiler that accepted either into either would let a ten-mill cap
 * arrive as ten percent.
 *
 * A field has a *level*. A statewide property tax millage is not a fact about
 * municipalities, and a local option sales tax ceiling is not a fact about the
 * state. Declaring this makes a misfiled row a parse defect rather than a
 * plausible-looking record that no reader would question.
 *
 * The enumerations are closed and are the research's own vocabulary. A value
 * outside the set is refused rather than carried as text, because the whole
 * point of a closed set is that a consumer can exhaust it.
 */

import type {
  FiscalLegalArtifactKind,
  FiscalRuleField,
  TaxInstrument,
} from "./types";

/** How a field's value is read out of the matrix, and checked. */
export type FiscalValueKind =
  "BOOLEAN" | "PERCENT" | "MILLS" | "MONEY" | "ENUM" | "TEXT";

/** Which levels of government a field can be a fact about. */
export type FieldLevelScope = "STATE" | "LOCAL" | "ANY";

export interface FiscalFieldSchema {
  readonly kind: FiscalValueKind;
  readonly scope: FieldLevelScope;
  /** The closed vocabulary, for an `ENUM` field. */
  readonly enumValues?: readonly string[];
}

/** Exact positive legal-artifact vocabulary accepted at the matrix boundary. */
export const FISCAL_LEGAL_ARTIFACT_KINDS: readonly FiscalLegalArtifactKind[] = [
  "STATE_CONSTITUTION",
  "ENACTED_STATUTE",
  "BALLOT_MEASURE",
  "APPELLATE_DECISION",
  "ADMINISTRATIVE_CODE",
];

export const FISCAL_AUTHORITY_LINEAGE = "FIRST_PARTY_LEGAL_ARTIFACT" as const;

const VOTE_THRESHOLDS = [
  "SIMPLE_MAJORITY",
  "THREE_FIFTHS",
  "TWO_THIRDS",
  "THREE_FOURTHS",
] as const;

const ELECTED_BODY_HURDLES = [
  "SIMPLE_MAJORITY_ELECTED",
  "THREE_FIFTHS_ELECTED",
  "TWO_THIRDS_ELECTED",
  "TWO_THIRDS_PRESENT",
  "THREE_FOURTHS_ELECTED",
  "THREE_FOURTHS_JOINT",
] as const;

/**
 * Voter approval hurdles, which are not the same vocabulary as legislative
 * ones: 55% and 60% are real electoral thresholds (California's Proposition 39
 * school bonds, Washington and Oklahoma local bonds, as 92N reports them) and
 * have no legislative counterpart.
 */
const VOTER_HURDLES = [
  "SIMPLE_MAJORITY",
  "FIFTY_FIVE_PERCENT",
  "SIXTY_PERCENT",
  "THREE_FIFTHS",
  "TWO_THIRDS",
  "NONE_COUNCIL_VOTE",
] as const;

export const FISCAL_FIELD_SCHEMA: Readonly<
  Record<FiscalRuleField, FiscalFieldSchema>
> = {
  INDIVIDUAL_INCOME_TAX_STRUCTURE: {
    kind: "ENUM",
    scope: "STATE",
    enumValues: ["GRADUATED", "FLAT"],
  },
  CORPORATE_TAX_BASE: {
    kind: "ENUM",
    scope: "STATE",
    enumValues: ["INCOME", "GROSS_RECEIPTS", "FRANCHISE_MARGIN"],
  },
  STATEWIDE_PROPERTY_TAX_MILLAGE: { kind: "MILLS", scope: "STATE" },

  GOVERNOR_PROPOSES_BALANCED: { kind: "BOOLEAN", scope: "STATE" },
  LEGISLATURE_ENACTS_BALANCED: { kind: "BOOLEAN", scope: "STATE" },
  GOVERNOR_SIGNS_BALANCED: { kind: "BOOLEAN", scope: "STATE" },
  DEFICIT_CARRYOVER_PROHIBITED: { kind: "BOOLEAN", scope: "STATE" },

  EXECUTIVE_BUDGET_MANDATE_TYPE: {
    kind: "ENUM",
    scope: "STATE",
    enumValues: ["CONSTITUTIONAL", "STATUTORY"],
  },
  EXECUTIVE_BUDGET_SUBMISSION_DEADLINE: { kind: "TEXT", scope: "STATE" },
  LEGISLATIVE_AMENDMENT_CONSTRAINT: {
    kind: "ENUM",
    scope: "STATE",
    enumValues: [
      "UNRESTRICTED",
      "CANNOT_INCREASE_EXECUTIVE_LINES",
      "LEGISLATIVE_BUDGET_BOARD_DOMINANT",
    ],
  },
  LINE_ITEM_VETO_AVAILABLE: { kind: "BOOLEAN", scope: "STATE" },
  LINE_ITEM_VETO_OVERRIDE_HURDLE: {
    kind: "ENUM",
    scope: "STATE",
    enumValues: ELECTED_BODY_HURDLES,
  },
  BINDING_REVENUE_ESTIMATE_BODY: { kind: "TEXT", scope: "STATE" },

  TAX_INCREASE_VOTE_REQUIREMENT: {
    kind: "ENUM",
    scope: "ANY",
    enumValues: [...VOTE_THRESHOLDS, "VOTER_APPROVAL_REQUIRED"],
  },
  APPROPRIATION_VOTE_REQUIREMENT: {
    kind: "ENUM",
    scope: "STATE",
    enumValues: VOTE_THRESHOLDS,
  },
  REVENUE_OR_SPENDING_GROWTH_LIMIT: { kind: "TEXT", scope: "ANY" },

  GO_DEBT_AUTHORIZATION_RULE: {
    kind: "ENUM",
    scope: "ANY",
    enumValues: [
      "MANDATORY_VOTER_REFERENDUM",
      "LEGISLATIVE_SUPERMAJORITY",
      "DEBT_SERVICE_RATIO_CAP",
      "CONSTITUTIONAL_DOLLAR_CAP",
      "PROHIBITED",
    ],
  },
  GO_DEBT_REFERENDUM_THRESHOLD: {
    kind: "ENUM",
    scope: "ANY",
    enumValues: VOTER_HURDLES,
  },
  GO_DEBT_LEGISLATIVE_SUPERMAJORITY: {
    kind: "ENUM",
    scope: "STATE",
    enumValues: VOTE_THRESHOLDS,
  },
  GO_DEBT_CONSTITUTIONAL_DOLLAR_CAP: { kind: "MONEY", scope: "STATE" },
  DEBT_SERVICE_RATIO_CAP_PERCENT: { kind: "PERCENT", scope: "STATE" },
  DEBT_CEILING_PERCENT_OF_ASSESSED_VALUE: { kind: "PERCENT", scope: "LOCAL" },
  STATE_ADMINISTRATIVE_DEBT_APPROVAL_REQUIRED: {
    kind: "BOOLEAN",
    scope: "LOCAL",
  },
  LOCAL_GO_BOND_VOTER_HURDLE: {
    kind: "ENUM",
    scope: "LOCAL",
    enumValues: VOTER_HURDLES,
  },

  RESERVE_FUND_NAME: { kind: "TEXT", scope: "STATE" },
  RESERVE_MANDATORY_DEPOSIT_RULE: { kind: "BOOLEAN", scope: "STATE" },
  RESERVE_DEPOSIT_FORMULA: { kind: "TEXT", scope: "STATE" },
  RESERVE_CAP_PERCENT_OF_GENERAL_FUND: { kind: "PERCENT", scope: "STATE" },
  RESERVE_WITHDRAWAL_VOTE: {
    kind: "ENUM",
    scope: "STATE",
    enumValues: ELECTED_BODY_HURDLES,
  },
  RESERVE_WITHDRAWAL_EMERGENCY_DECLARATION_REQUIRED: {
    kind: "BOOLEAN",
    scope: "STATE",
  },

  DILLONS_RULE_STATUS: {
    kind: "ENUM",
    scope: "STATE",
    enumValues: [
      "STRICT_DILLONS_RULE",
      "CONSTITUTIONAL_HOME_RULE",
      "STATUTORY_HOME_RULE",
    ],
  },
  FISCAL_HOME_RULE_SCOPE: {
    kind: "ENUM",
    scope: "LOCAL",
    enumValues: [
      "PREEMPTED_BY_STATE",
      "BROAD_LOCAL_TAXING_POWER",
      "ZERO_LOCAL_DISCRETION",
    ],
  },

  PROPERTY_ASSESSING_ENTITY: {
    kind: "ENUM",
    scope: "LOCAL",
    enumValues: [
      "COUNTY_ASSESSOR",
      "MUNICIPAL_ASSESSOR",
      "STATE_CENTRALIZED",
      "CONSOLIDATED_DISTRICT",
    ],
  },
  MILLAGE_RATE_SETTING_BODY: { kind: "TEXT", scope: "LOCAL" },
  ASSESSMENT_GROWTH_CAP_PERCENT: { kind: "PERCENT", scope: "LOCAL" },
  NOMINAL_MILLAGE_CAP_MILLS: { kind: "MILLS", scope: "LOCAL" },
  LEVY_REVENUE_GROWTH_CAP_PERCENT: { kind: "PERCENT", scope: "LOCAL" },
  ROLLBACK_ON_REASSESSMENT_MANDATED: { kind: "BOOLEAN", scope: "LOCAL" },
  RATE_PROTEST_PETITION_THRESHOLD: { kind: "TEXT", scope: "LOCAL" },

  LOCAL_OPTION_SALES_TAX_MAX_RATE_PERCENT: { kind: "PERCENT", scope: "LOCAL" },
  LOCAL_OPTION_SALES_TAX_VOTER_REFERENDUM_REQUIRED: {
    kind: "BOOLEAN",
    scope: "LOCAL",
  },
  LOCAL_OPTION_SALES_TAX_EARMARK: { kind: "TEXT", scope: "LOCAL" },
  LOCAL_INCOME_TAX_TYPE: {
    kind: "ENUM",
    scope: "LOCAL",
    enumValues: [
      "WAGE_NET_PROFITS_OCCUPATIONAL",
      "EARNED_INCOME_TAX",
      "COUNTY_PIGGYBACK",
      "PAYROLL_TAX",
      "HEAD_TAX",
    ],
  },
  LOCAL_INCOME_TAX_MAX_RATE_PERCENT: { kind: "PERCENT", scope: "LOCAL" },
  LOCAL_INCOME_TAX_VOTER_REFERENDUM_REQUIRED: {
    kind: "BOOLEAN",
    scope: "LOCAL",
  },
};

/**
 * Rules whose meaning presupposes a permitted tax instrument at the same state
 * and government level. Multiple instruments are alternatives, not cumulative
 * requirements.
 */
export const FISCAL_RULE_DEPENDENCIES: Readonly<
  Partial<Record<FiscalRuleField, readonly TaxInstrument[]>>
> = {
  LOCAL_OPTION_SALES_TAX_MAX_RATE_PERCENT: ["GENERAL_SALES_TAX"],
  LOCAL_OPTION_SALES_TAX_VOTER_REFERENDUM_REQUIRED: ["GENERAL_SALES_TAX"],
  LOCAL_OPTION_SALES_TAX_EARMARK: ["GENERAL_SALES_TAX"],
  LOCAL_INCOME_TAX_TYPE: [
    "INDIVIDUAL_INCOME_TAX",
    "PAYROLL_OR_OCCUPATIONAL_TAX",
  ],
  LOCAL_INCOME_TAX_MAX_RATE_PERCENT: [
    "INDIVIDUAL_INCOME_TAX",
    "PAYROLL_OR_OCCUPATIONAL_TAX",
  ],
  LOCAL_INCOME_TAX_VOTER_REFERENDUM_REQUIRED: [
    "INDIVIDUAL_INCOME_TAX",
    "PAYROLL_OR_OCCUPATIONAL_TAX",
  ],
};

/** Every rule field, sorted, so error messages and tests are deterministic. */
export const FISCAL_RULE_FIELDS: readonly FiscalRuleField[] = Object.keys(
  FISCAL_FIELD_SCHEMA,
).sort() as FiscalRuleField[];

export const TAX_INSTRUMENTS: readonly TaxInstrument[] = [
  "CORPORATE_INCOME_TAX",
  "GENERAL_SALES_TAX",
  "GROSS_RECEIPTS_TAX",
  "INDIVIDUAL_INCOME_TAX",
  "PAYROLL_OR_OCCUPATIONAL_TAX",
  "PROPERTY_TAX",
  "SEVERANCE_TAX",
  "TRANSIENT_LODGING_TAX",
];

/**
 * The maximum a millage figure may plausibly be.
 *
 * The highest cap 92N reports is Alaska's 30 mills; the bound is set well above
 * that because the purpose is to catch a percentage that arrived in a millage
 * column, not to second-guess a state.
 */
export const MAX_PLAUSIBLE_MILLS = 200;
