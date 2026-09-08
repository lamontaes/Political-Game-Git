/**
 * State and local fiscal authority.
 *
 * What the law lets a government *do* about money: which tax instruments it may
 * levy at all, what a balanced-budget mandate binds and at which stage, how
 * general obligation debt is authorized, what a reserve fund's deposit and
 * withdrawal rules are, and — at the local level — which of the three tax and
 * expenditure limitation mechanics the state has clamped onto the property tax.
 *
 * Three separations run through these types, and each one exists because
 * collapsing it is how a fiscal model starts lying.
 *
 * **Authority is not observation.** A state that collects no local sales tax
 * revenue and a state that forbids one are not the same state. The government
 * finances domain carries observed dollars; this domain carries legal power,
 * and nothing here may be derived from a revenue line being zero. That is the
 * boundary 92N states in its own header, and `validate.ts` enforces it.
 *
 * **Absence is not prohibition.** Local governments have no inherent taxing
 * power, so "no local income tax" resolves into at least three different legal
 * facts: a constitutional bar, a statutory preemption, and an enabling chapter
 * that was read and simply grants nothing. `TaxAuthorizationStatus` keeps them
 * apart, and a record that has not been researched at all carries no
 * authorization value at all — it is `UNKNOWN`, which is not a fourth kind of
 * "no".
 *
 * **A summary is not a field.** 92N's schema carries a `stageClassification`
 * beside the four balanced-budget booleans it summarizes. Stored, that number
 * can contradict the booleans underneath it, and a reader has no way to tell
 * which is the fact. So it is not stored: `classify.ts` derives it, and refuses
 * to derive it at all when any of the four inputs is unresolved.
 *
 * Identity is not authority either (D-074). Whether a county government exists
 * in Connecticut, or a school district in Hawaii, is a `government-units` fact.
 * This domain only ever says what a level of government may do about money
 * where it exists; a fiscal field asked of a level that does not exist is
 * `NOT_APPLICABLE` with a reason, never a silent absence.
 */

import type { Evidence, Sourced } from "../../core/index";

/**
 * The level of government a fiscal fact is about.
 *
 * These are levels, not jurisdictions. A record says what municipalities in a
 * state may do, which is the granularity 92N's local matrix actually reports;
 * naming a particular city would claim a charter this domain has not read.
 */
export type FiscalLevel =
  | "STATE"
  | "COUNTY"
  | "MUNICIPALITY"
  | "CONSOLIDATED_CITY_COUNTY"
  | "SCHOOL_DISTRICT"
  | "SPECIAL_DISTRICT";

/** Every level that is not the state itself. */
export const LOCAL_LEVELS: readonly FiscalLevel[] = [
  "COUNTY",
  "MUNICIPALITY",
  "CONSOLIDATED_CITY_COUNTY",
  "SCHOOL_DISTRICT",
  "SPECIAL_DISTRICT",
];

/** The tax instruments whose availability the research establishes. */
export type TaxInstrument =
  | "INDIVIDUAL_INCOME_TAX"
  | "CORPORATE_INCOME_TAX"
  | "GROSS_RECEIPTS_TAX"
  | "GENERAL_SALES_TAX"
  | "PROPERTY_TAX"
  | "SEVERANCE_TAX"
  | "PAYROLL_OR_OCCUPATIONAL_TAX"
  | "TRANSIENT_LODGING_TAX";

/**
 * Why a government may or may not levy an instrument.
 *
 * There is deliberately no status meaning "levies it". Whether a tax is
 * actually imposed, and at what rate, is an observation; this enum answers only
 * whether the law permits it. A downstream consumer that wants both asks two
 * domains and keeps the answers apart.
 *
 * The three negatives are distinct legal facts, not synonyms:
 * `CONSTITUTIONALLY_PROHIBITED` is a bar in the constitution (Fla. Const.
 * Art. VII, § 5 on personal income tax, as 92N reports it),
 * `STATUTORILY_PREEMPTED` is an affirmative statutory bar, and
 * `NO_ENABLING_AUTHORITY` is the Dillon's Rule case — the enabling chapter was
 * read and grants nothing. Only the third one is about silence, and it is a
 * claim about a scope somebody searched rather than a gap in the corpus.
 */
export type TaxAuthorizationStatus =
  | "AUTHORIZED"
  | "AUTHORIZED_WITH_VOTER_APPROVAL"
  | "AUTHORIZED_LIMITED_CLASS"
  | "CONSTITUTIONALLY_PROHIBITED"
  | "STATUTORILY_PREEMPTED"
  | "NO_ENABLING_AUTHORITY";

/** The authorization statuses that permit the instrument in some form. */
export const PERMISSIVE_AUTHORIZATIONS: readonly TaxAuthorizationStatus[] = [
  "AUTHORIZED",
  "AUTHORIZED_WITH_VOTER_APPROVAL",
  "AUTHORIZED_LIMITED_CLASS",
];

/** The authorization statuses that bar it. */
export const BARRING_AUTHORIZATIONS: readonly TaxAuthorizationStatus[] = [
  "CONSTITUTIONALLY_PROHIBITED",
  "STATUTORILY_PREEMPTED",
  "NO_ENABLING_AUTHORITY",
];

/**
 * The fiscal rules this domain models, grouped by what they govern.
 *
 * Every one of these appears as a normalized field in 92N — in its state
 * matrix, its local matrix, or the two TypeScript interfaces of its section 6.
 * Nothing here is a field the research does not carry, and nothing here is a
 * derived summary of other fields.
 */
export type FiscalRuleField =
  // Tax structure. Availability lives in the instrument records; these say what
  // shape an available tax takes.
  | "INDIVIDUAL_INCOME_TAX_STRUCTURE"
  | "CORPORATE_TAX_BASE"
  | "STATEWIDE_PROPERTY_TAX_MILLAGE"
  // The four-stage balanced-budget taxonomy, as four separate facts.
  | "GOVERNOR_PROPOSES_BALANCED"
  | "LEGISLATURE_ENACTS_BALANCED"
  | "GOVERNOR_SIGNS_BALANCED"
  | "DEFICIT_CARRYOVER_PROHIBITED"
  // Executive budget primacy and the legislature's room to move.
  | "EXECUTIVE_BUDGET_MANDATE_TYPE"
  | "EXECUTIVE_BUDGET_SUBMISSION_DEADLINE"
  | "LEGISLATIVE_AMENDMENT_CONSTRAINT"
  | "LINE_ITEM_VETO_AVAILABLE"
  | "LINE_ITEM_VETO_OVERRIDE_HURDLE"
  | "BINDING_REVENUE_ESTIMATE_BODY"
  // Revenue authority: what it takes to raise a tax or pass an appropriation.
  | "TAX_INCREASE_VOTE_REQUIREMENT"
  | "APPROPRIATION_VOTE_REQUIREMENT"
  | "REVENUE_OR_SPENDING_GROWTH_LIMIT"
  // Borrowing and debt.
  | "GO_DEBT_AUTHORIZATION_RULE"
  | "GO_DEBT_REFERENDUM_THRESHOLD"
  | "GO_DEBT_LEGISLATIVE_SUPERMAJORITY"
  | "GO_DEBT_CONSTITUTIONAL_DOLLAR_CAP"
  | "DEBT_SERVICE_RATIO_CAP_PERCENT"
  | "DEBT_CEILING_PERCENT_OF_ASSESSED_VALUE"
  | "STATE_ADMINISTRATIVE_DEBT_APPROVAL_REQUIRED"
  | "LOCAL_GO_BOND_VOTER_HURDLE"
  // Budget stabilization reserves.
  | "RESERVE_FUND_NAME"
  | "RESERVE_MANDATORY_DEPOSIT_RULE"
  | "RESERVE_DEPOSIT_FORMULA"
  | "RESERVE_CAP_PERCENT_OF_GENERAL_FUND"
  | "RESERVE_WITHDRAWAL_VOTE"
  | "RESERVE_WITHDRAWAL_EMERGENCY_DECLARATION_REQUIRED"
  // The state-local fiscal relationship.
  | "DILLONS_RULE_STATUS"
  | "FISCAL_HOME_RULE_SCOPE"
  // The local fiscal triad: assessment caps, rate caps, levy growth caps.
  | "PROPERTY_ASSESSING_ENTITY"
  | "MILLAGE_RATE_SETTING_BODY"
  | "ASSESSMENT_GROWTH_CAP_PERCENT"
  | "NOMINAL_MILLAGE_CAP_MILLS"
  | "LEVY_REVENUE_GROWTH_CAP_PERCENT"
  | "ROLLBACK_ON_REASSESSMENT_MANDATED"
  | "RATE_PROTEST_PETITION_THRESHOLD"
  // Local option taxes, where a state grants them at all.
  | "LOCAL_OPTION_SALES_TAX_MAX_RATE_PERCENT"
  | "LOCAL_OPTION_SALES_TAX_VOTER_REFERENDUM_REQUIRED"
  | "LOCAL_OPTION_SALES_TAX_EARMARK"
  | "LOCAL_INCOME_TAX_TYPE"
  | "LOCAL_INCOME_TAX_MAX_RATE_PERCENT"
  | "LOCAL_INCOME_TAX_VOTER_REFERENDUM_REQUIRED";

/** The four stages of the balanced-budget taxonomy, in order. */
export type BalancedBudgetStage = 1 | 2 | 3 | 4;

/** Closed kinds of first-party legal artifact that may support this domain. */
export type FiscalLegalArtifactKind =
  | "STATE_CONSTITUTION"
  | "ENACTED_STATUTE"
  | "BALLOT_MEASURE"
  | "APPELLATE_DECISION"
  | "ADMINISTRATIVE_CODE";

/** The only admitted lineage for a legal-authority citation. */
export type FiscalAuthorityLineage = "FIRST_PARTY_LEGAL_ARTIFACT";

/**
 * Structured proof of the authority universe searched before asserting that no
 * enabling grant exists. Free prose is deliberately not part of this shape.
 */
export interface EnablingAuthoritySearchScope {
  readonly jurisdictionStateUsps: string;
  readonly level: FiscalLevel;
  readonly instrument: TaxInstrument;
  readonly authorityKinds: readonly FiscalLegalArtifactKind[];
  readonly evidenceArtifactIds: readonly string[];
}

/**
 * The legal authority a fiscal fact rests on, as the research recorded it.
 *
 * It travels beside the `Sourced` evidence rather than inside it, for the same
 * reason it does in the qualifications domain: the evidence says which artifact
 * this substrate read, and the citation says which provision that artifact
 * reports. A corpus must never be able to claim it read a state constitution it
 * never retrieved.
 */
export interface CitedFiscalAuthority {
  /** "State Constitution", "Enacted Statute", "Ballot Measure", verbatim. */
  readonly authorityType: string;
  /** Closed legal-artifact identity; observational products have no value here. */
  readonly artifactKind: FiscalLegalArtifactKind;
  /** Stable identity of the cited first-party legal artifact. */
  readonly artifactId: string;
  /** Positive provenance contract, not a publisher-name heuristic. */
  readonly lineage: FiscalAuthorityLineage;
  /** The article, section, chapter or measure number, verbatim. */
  readonly legalLocator: string;
  /** The publisher's URL for the authority, as the research recorded it. */
  readonly authorityUrl: string;
  /** When the provision took effect, as the research recorded it. */
  readonly effectiveDate: string;
  /** `DIRECT` where the text states it; `DERIVED` where a chain was walked. */
  readonly derivation: "DIRECT" | "DERIVED";
  /** The derivation chain, where one was walked. */
  readonly derivationChain: string | null;
  /** The research's own paraphrase of the provision. */
  readonly paraphrase: string;
}

/** What every fiscal record carries, whichever kind it is. */
interface FiscalRecordBase {
  readonly recordId: string;
  readonly stateUsps: string;
  readonly level: FiscalLevel;
  readonly citedAuthority: CitedFiscalAuthority;
  /** True where the research flagged the fact for normalization review. */
  readonly normalizationReviewRequired: boolean;
  readonly evidence: Evidence;
}

/**
 * Whether a level of government may levy an instrument at all.
 *
 * This is the record that must exist before any rate, cap or referendum rule
 * about that instrument means anything, and it is the one place the three ways
 * of saying "no" stay distinguishable.
 */
export interface TaxInstrumentAuthorityRecord extends FiscalRecordBase {
  readonly kind: "TAX_INSTRUMENT";
  readonly instrument: TaxInstrument;
  readonly authorization: Sourced<TaxAuthorizationStatus>;
  /** Present only for a KNOWN NO_ENABLING_AUTHORITY conclusion. */
  readonly searchedScope: EnablingAuthoritySearchScope | null;
}

/** One fiscal rule, in whichever state of resolution the research left it. */
export interface FiscalRuleRecord extends FiscalRecordBase {
  readonly kind: "FISCAL_RULE";
  readonly field: FiscalRuleField;
  readonly rule: Sourced<FiscalRuleValue>;
}

/**
 * What a rule's value may be.
 *
 * Booleans, numbers and closed enumerations are all carried as themselves. A
 * deadline formula and a petition threshold are prose in the research and stay
 * prose here; parsing "10% of presidential voters in 50 days" into a structure
 * would be inventing a rule shape the source does not have.
 */
export type FiscalRuleValue = string | number | boolean;

export type FiscalAuthorityRecord =
  TaxInstrumentAuthorityRecord | FiscalRuleRecord;

/** True for an instrument-availability record rather than a rule. */
export function isTaxInstrumentAuthority(
  record: FiscalAuthorityRecord,
): record is TaxInstrumentAuthorityRecord {
  return record.kind === "TAX_INSTRUMENT";
}

/** True for a rule record rather than an instrument availability. */
export function isFiscalRule(
  record: FiscalAuthorityRecord,
): record is FiscalRuleRecord {
  return record.kind === "FISCAL_RULE";
}
