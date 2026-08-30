import type { EntityId, IsoDate } from "./types";

/**
 * Empirical / legal / source classification categories for provenance.
 */
export type SourceClassification =
  | "CONSTITUTIONAL_PROVISION"
  | "STATUTORY_CODE"
  | "ADMINISTRATIVE_RULE"
  | "JUDICIAL_OPINION"
  | "OFFICIAL_ELECTION_AUTHORITY"
  | "CENSUS_FEDERAL_RECORD"
  | "EMPIRICAL_ACADEMIC"
  | "HISTORICAL_ARCHIVAL";

/**
 * Provenance metadata attached to substantive value records.
 */
export interface ProvenanceRecord {
  readonly sourceId: string;
  readonly authoritativeUrl: string;
  readonly publisher: string;
  readonly effectiveDate: IsoDate;
  readonly locator: string;
  readonly sourceClassification: SourceClassification;
  readonly retrievedAt?: IsoDate;
  readonly notes?: string;
}

/**
 * Value status discriminator.
 */
export type ValueState =
  "KNOWN" | "UNKNOWN" | "NOT_APPLICABLE" | "CONFLICTING" | "HISTORICAL";

export interface KnownValue<T> {
  readonly state: "KNOWN";
  readonly value: T;
  readonly provenance: ProvenanceRecord;
}

export interface UnknownValue {
  readonly state: "UNKNOWN";
  readonly reason?: string;
}

export interface NotApplicableValue {
  readonly state: "NOT_APPLICABLE";
  readonly reason: string;
}

export interface ConflictingSourceClaim<T> {
  readonly claim: T;
  readonly provenance: ProvenanceRecord;
}

export interface ConflictingValue<T> {
  readonly state: "CONFLICTING";
  readonly claims: readonly ConflictingSourceClaim<T>[];
  readonly conflictNotes?: string;
}

export interface HistoricalValue<T> {
  readonly state: "HISTORICAL";
  readonly value: T;
  readonly effectiveStart: IsoDate;
  readonly effectiveEnd: IsoDate;
  readonly provenance: ProvenanceRecord;
  readonly supersedingReason?: string;
}

/**
 * SourcedValue wrapper strictly distinguishing KNOWN, UNKNOWN, NOT_APPLICABLE, CONFLICTING, HISTORICAL.
 * UNKNOWN is explicitly represented as an object with state "UNKNOWN", preventing implicit coercion to false or 0.
 */
export type SourcedValue<T> =
  | KnownValue<T>
  | UnknownValue
  | NotApplicableValue
  | ConflictingValue<T>
  | HistoricalValue<T>;

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
export interface CensusFipsIdentifiers {
  readonly fipsStateCode?: string;
  readonly fipsCountyCode?: string;
  readonly fipsPlaceCode?: string;
  readonly censusGnisId?: string;
  readonly censusGeoId?: string;
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
