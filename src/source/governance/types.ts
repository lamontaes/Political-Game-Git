/**
 * Jurisdiction governance profile types.
 *
 * A jurisdiction profile records what the LAW says about a jurisdiction: its
 * executive, legislative and judicial structure, its offices, its elections.
 * Each substantive value is a `SourcedValue<T>` carrying its own constitutional
 * or statutory citation, so an unresearched field stays UNKNOWN instead of
 * defaulting to a plausible-looking structure.
 *
 * This is the layer the government-universe layer deliberately does not reach
 * into: the Census establishes that a government exists, not what powers it has.
 */

import type {
  SourceEntityId,
  SourceIsoDate,
  SourcedValue,
} from "../sourced-value.js";

export type {
  ConflictingSourceClaim,
  ConflictingValue,
  HistoricalValue,
  KnownValue,
  NotApplicableValue,
  ProvenanceRecord,
  SourceClassification,
  SourcedValue,
  UnknownValue,
  ValueState,
} from "../sourced-value.js";

/**
 * Local aliases keep the rest of this file reading as it did under PR #41,
 * while the underlying types now come from the shared source contract rather
 * than from simulation's branded gameplay identifiers.
 */
type EntityId = SourceEntityId;
type IsoDate = SourceIsoDate;

export type { SourceEntityId as EntityId, SourceIsoDate as IsoDate };

/**
 * Jurisdiction Types
 */
export type JurisdictionType =
  | "FEDERAL"
  | "STATE"
  | "TERRITORY"
  | "TRIBAL"
  | "COUNTY_EQUIVALENT"
  | "MUNICIPALITY"
  | "TOWNSHIP"
  | "SPECIAL_DISTRICT";

/**
 * Census / FIPS Identifiers
 */
/**
 * Census identifiers for a jurisdiction.
 *
 * `censusGovId` is the join key to the government-universe layer: the same
 * 14-digit Census Government ID that `src/source/government-universe` parses.
 * Holding it here is what lets a governance profile be matched to an
 * enumerated government unit without either layer guessing about the other —
 * the universe says the entity exists, this profile says how it is governed.
 *
 * Note that Census STATE codes (01-51, alphabetical) and state FIPS codes are
 * different numbering systems; `fipsStateCode` is the FIPS one.
 */
export interface CensusFipsIdentifiers {
  readonly fipsStateCode?: string;
  readonly fipsCountyCode?: string;
  readonly fipsPlaceCode?: string;
  readonly censusGnisId?: string;
  readonly censusGeoId?: string;
  /** 14-digit Census Government ID, the join key to the government-universe layer. */
  readonly censusGovId?: string;
}

/**
 * Jurisdiction Identity Component
 */
export interface JurisdictionProfileIdentity {
  readonly jurisdictionId: EntityId;
  readonly officialName: SourcedValue<string>;
  readonly jurisdictionType: SourcedValue<JurisdictionType>;
  readonly postalAbbreviation: SourcedValue<string>;
  readonly censusFips: SourcedValue<CensusFipsIdentifiers>;
  readonly parentJurisdictionId: SourcedValue<EntityId | null>;
  readonly effectiveDate: SourcedValue<IsoDate>;
  readonly vintageDate: SourcedValue<IsoDate>;
}

/**
 * Executive Structure Component
 */
export type ExecutiveModel =
  | "SINGLE_EXECUTIVE"
  | "PLURAL_EXECUTIVE"
  | "COUNCIL_MANAGER"
  | "COMMISSION_EXECUTIVE"
  | "COLLEGIATE_EXECUTIVE";

export interface ExecutiveStructure {
  readonly model: ExecutiveModel;
  readonly headOfGovernmentTitle: string;
  readonly headOfStateTitle?: string;
  readonly isPluralExecutive: boolean;
  readonly executiveBoardOrCabinetTitle?: string;
  readonly summaryDescription: string;
}

/**
 * Legislative Chamber Structure Component
 */
export type ChamberType =
  | "SENATE"
  | "HOUSE_OF_REPRESENTATIVES"
  | "ASSEMBLY"
  | "STATE_SENATE"
  | "CITY_COUNCIL"
  | "COUNTY_BOARD"
  | "COMMISSION"
  | "UNAMENDED_UNICAMERAL";

export interface LegislativeChamber {
  readonly chamberId: string;
  readonly chamberName: string;
  readonly chamberType: ChamberType;
  readonly totalSeats: number;
  readonly apportionmentMethod: string;
}

export type LegislativeStructureModel =
  "BICAMERAL" | "UNICAMERAL" | "COMMISSION" | "TOWN_MEETING";

export interface LegislativeStructure {
  readonly model: LegislativeStructureModel;
  readonly officialBodyName: string;
  readonly chambers: readonly LegislativeChamber[];
  readonly summaryDescription: string;
}

/**
 * Judicial Structural Summary Component
 */
export type JudicialCourtTier =
  | "COURT_OF_LAST_RESORT"
  | "INTERMEDIATE_APPELLATE"
  | "GENERAL_JURISDICTION_TRIAL"
  | "LIMITED_JURISDICTION_TRIAL";

export interface JudicialCourtLevel {
  readonly tier: JudicialCourtTier;
  readonly name: string;
  readonly selectionMethod: string;
}

export interface JudicialStructuralSummary {
  readonly highCourtName: string;
  readonly tierLevels: readonly JudicialCourtLevel[];
  readonly summaryDescription: string;
}

/**
 * Constitutional / Statutory Office Types
 */
export interface InstitutionalOfficeType {
  readonly officeTypeId: string;
  readonly title: string;
  readonly branch: "EXECUTIVE" | "LEGISLATIVE" | "JUDICIAL" | "INDEPENDENT";
  readonly isConstitutional: boolean;
  readonly summaryDescription: string;
}

export interface JurisdictionProfileInstitutions {
  readonly executiveStructure: SourcedValue<ExecutiveStructure>;
  readonly legislativeChamberStructure: SourcedValue<LegislativeStructure>;
  readonly judicialStructuralSummary: SourcedValue<JudicialStructuralSummary>;
  readonly constitutionalStatutoryOfficeTypes: SourcedValue<
    readonly InstitutionalOfficeType[]
  >;
}

/**
 * Offices Component
 */
export type OfficeSelectionMethod =
  | "PARTISAN_ELECTION"
  | "NONPARTISAN_ELECTION"
  | "GUBERNATORIAL_APPOINTMENT"
  | "LEGISLATIVE_APPOINTMENT"
  | "JUDICIAL_SELECTION_MERIT"
  | "BOARD_APPOINTMENT"
  | "EX_OFFICIO";

export interface TermLimitsRule {
  readonly exists: boolean;
  readonly maxTerms?: number;
  readonly maxConsecutiveYears?: number;
  readonly lifetimeLimit?: boolean;
  readonly ruleDescription?: string;
}

export interface StaggerRule {
  readonly isStaggered: boolean;
  readonly staggerDescription?: string;
  readonly classCount?: number;
}

export interface EligibilityRuleReference {
  readonly minimumAgeYears?: number;
  readonly residencyRequirementYears?: number;
  readonly citizenshipRequired?: boolean;
  readonly registeredVoterRequired?: boolean;
  readonly legalCitation: string;
  readonly summaryDescription: string;
}

export interface JurisdictionOfficeProfile {
  readonly officeId: string;
  readonly officeType: SourcedValue<string>;
  readonly selectionMethod: SourcedValue<OfficeSelectionMethod>;
  readonly termLengthYears: SourcedValue<number>;
  readonly termLimits: SourcedValue<TermLimitsRule>;
  readonly staggerRules: SourcedValue<StaggerRule>;
  readonly eligibilityRules: SourcedValue<readonly EligibilityRuleReference[]>;
}

export interface JurisdictionProfileOffices {
  readonly offices: readonly JurisdictionOfficeProfile[];
}

/**
 * Election Structure Component
 */
export type OrdinaryCycleCadence =
  | "EVEN_YEAR_BIENNIAL"
  | "ODD_YEAR_BIENNIAL"
  | "QUADRENNIAL_PRESIDENTIAL_ALIGNED"
  | "QUADRENNIAL_GUBERNATORIAL_OFF_YEAR"
  | "ANNUAL"
  | "CONTINUOUS_STAGGERED";

export type ElectionTypeClassification =
  | "CLOSED_PRIMARY"
  | "OPEN_PRIMARY"
  | "SEMI_CLOSED_PRIMARY"
  | "TOP_TWO_PRIMARY"
  | "RANKED_CHOICE"
  | "GENERAL_PLURALITY"
  | "GENERAL_MAJORITY_RUNOFF"
  | "NONPARTISAN_GENERAL";

export interface StructuralTimingRule {
  readonly eventType: "PRIMARY" | "GENERAL" | "RUNOFF" | "SPECIAL";
  readonly timingFormula: string;
  readonly month: number;
}

export interface ElectionRuleSourceReference {
  readonly citation: string;
  readonly summary: string;
}

export interface JurisdictionElectionStructure {
  readonly ordinaryCycleCadence: SourcedValue<OrdinaryCycleCadence>;
  readonly primaryElectionType: SourcedValue<ElectionTypeClassification>;
  readonly generalElectionType: SourcedValue<ElectionTypeClassification>;
  readonly structuralTimingRules: SourcedValue<readonly StructuralTimingRule[]>;
  readonly ruleSourceReferences: SourcedValue<
    readonly ElectionRuleSourceReference[]
  >;
}

/**
 * Local Government Structure Component
 */
export type CountyEquivalentModel =
  | "TRADITIONAL_COUNTY"
  | "CONSOLIDATED_CITY_COUNTY"
  | "INDEPENDENT_CITY"
  | "BOROUGH"
  | "PARISH"
  | "CENSUS_AREA"
  | "NOT_APPLICABLE";

export type HomeRuleConceptModel =
  | "FULL_HOME_RULE"
  | "LIMITED_HOME_RULE"
  | "DILLONS_RULE_STRICT"
  | "CHARTER_BASED"
  | "CONSTITUTIONAL_GRANT";

export interface MunicipalClassificationRule {
  readonly className: string;
  readonly populationThresholdMin?: number;
  readonly populationThresholdMax?: number;
  readonly governanceModelDescription: string;
}

export interface TownshipStructureSummary {
  readonly existsInState: boolean;
  readonly townshipPowersDescription?: string;
  readonly isOrganized: boolean;
}

export interface JurisdictionLocalGovStructure {
  readonly countyModel: SourcedValue<CountyEquivalentModel>;
  readonly municipalClassifications: SourcedValue<
    readonly MunicipalClassificationRule[]
  >;
  readonly townshipStructure: SourcedValue<TownshipStructureSummary>;
  readonly homeRuleConcepts: SourcedValue<HomeRuleConceptModel>;
  readonly stateSpecificClassifications: SourcedValue<readonly string[]>;
}

/**
 * Root Jurisdiction Profile Schema
 */
export interface JurisdictionProfile {
  readonly schemaVersion: "1.0.0";
  readonly profileId: string;
  readonly isSynthetic: boolean;
  readonly identity: JurisdictionProfileIdentity;
  readonly institutions: JurisdictionProfileInstitutions;
  readonly offices: JurisdictionProfileOffices;
  readonly electionStructure: JurisdictionElectionStructure;
  readonly localGovernmentStructure: JurisdictionLocalGovStructure;
  readonly metadata: {
    readonly createdAt: IsoDate;
    readonly lastUpdatedAt: IsoDate;
    readonly authorOrWorkerId: string;
    readonly notes?: string;
  };
}
