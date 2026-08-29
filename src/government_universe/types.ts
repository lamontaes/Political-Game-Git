/**
 * Authoritative Type Definitions for U.S. Government-Universe Source Layer
 *
 * Source: U.S. Census Bureau Census of Governments, Government Units Survey (GUS),
 * and 2022 Census of Governments: Individual State Descriptions (G22-CG-ISD).
 */

export type GovernmentClass =
  | "county"
  | "municipal"
  | "township"
  | "special_district"
  | "school_district"
  | "state"
  | "federal";

export type GovernmentFunctionCategory =
  | "general_government"
  | "education_elementary_secondary"
  | "education_higher"
  | "fire_protection"
  | "water_supply"
  | "sewerage"
  | "drainage_flood_control"
  | "housing_community_development"
  | "natural_resources_conservation"
  | "soil_water_conservation"
  | "libraries"
  | "cemeteries"
  | "health_hospitals"
  | "parks_recreation"
  | "highways_roads"
  | "mass_transit"
  | "airports_ports"
  | "electric_gas_utilities"
  | "solid_waste_management"
  | "multi_function"
  | "other_single_function";

export type GovernmentActiveStatus = "active" | "inactive" | "unknown";

export type SelectionMethod = "elected" | "appointed" | "mixed" | "unknown";

export interface CountyAssociation {
  readonly countyName: string;
  readonly countyFips: string;
  readonly fipsCountyCode: string;
}

export interface PlaceAssociation {
  readonly placeName: string;
  readonly placeFips?: string;
}

export interface GeographicIdentifiers {
  readonly fipsState: string;
  readonly fipsCounty?: string;
  readonly fipsPlace?: string;
  readonly censusStateCode: string;
  readonly censusTypeCode: string;
  readonly censusCountyCode: string;
  readonly censusUnitId: string;
  readonly geoid?: string;
  readonly gnisId?: string;
  readonly areaSquareMiles?: number;
  readonly populationEstimate?: number;
}

export interface ProvenanceMetadata {
  readonly sourceAgency: string;
  readonly productTitle: string;
  readonly sourceUrl: string;
  readonly retrievalDate: string;
  readonly contentHash: string;
  readonly license: string;
  readonly notes?: string;
}

/**
 * Normalized Source Record for a Governmental Unit.
 */
export interface GovernmentSourceRecord {
  readonly stableSourceId: string;
  readonly censusGovId: string;
  readonly officialName: string;
  readonly state: string;
  readonly stateFips: string;
  readonly countyAssociation?: CountyAssociation;
  readonly placeAssociation?: PlaceAssociation;
  readonly governmentType: GovernmentClass;
  readonly governmentSubtype?: string;
  readonly functionCategory?: GovernmentFunctionCategory;
  readonly functionCode?: string;
  readonly activeStatus: GovernmentActiveStatus;
  readonly geographicIdentifiers: GeographicIdentifiers;
  readonly sourceVintage: string;
  readonly sourceProvenance: ProvenanceMetadata;
}

/**
 * Structural definition of an authorized government class within a state.
 */
export interface AuthorizedClassDescription {
  readonly class: GovernmentClass;
  readonly subtypeKey: string;
  readonly legalNamePattern: string;
  readonly stateLegalBasis: string;
  readonly governingBodyTitle: string;
  readonly selectionMethod: SelectionMethod;
  readonly censusIndependenceCriteriaMet: boolean;
  readonly dependentVariantNotes?: string;
  readonly statutoryReferences?: string[];
}

/**
 * Qualitative state authority record derived from Census Individual State Descriptions.
 * Searchable reference index, NOT an LLM-written legal engine.
 */
export interface GovernmentTypeAuthorityRecord {
  readonly authorityId: string;
  readonly state: string;
  readonly stateName: string;
  readonly sourceDescription: string;
  readonly authorizedClasses: readonly AuthorizedClassDescription[];
  readonly censusClassificationNotes: string;
  readonly sourceCitation: {
    readonly publication: string;
    readonly reportNumber: string;
    readonly pageRange: string;
    readonly url: string;
  };
  readonly unprovidedPowersStrictlyUnknown: true;
}

/**
 * State-level summary of governmental entities.
 */
export interface StateGovernmentSummary {
  readonly state: string;
  readonly stateName: string;
  readonly stateFips: string;
  readonly totalGovernments: number;
  readonly countyGovernments: number;
  readonly municipalGovernments: number;
  readonly townshipGovernments: number;
  readonly specialDistrictGovernments: number;
  readonly independentSchoolDistricts: number;
  readonly stateGovernment: number;
  readonly dependentSchoolSystems: {
    readonly total: number;
    readonly countyDependent: number;
    readonly municipalDependent: number;
    readonly townshipDependent: number;
    readonly stateDependent: number;
  };
}

/**
 * National summary manifest.
 */
export interface NationalUniverseManifest {
  readonly schemaVersion: "1.0.0";
  readonly generatedAt: string;
  readonly sourceVintage: string;
  readonly totalGovernmentsNationally: number;
  readonly stateGovernmentsNationally: number;
  readonly localGovernmentsNationally: number;
  readonly byClass: {
    readonly county: number;
    readonly municipal: number;
    readonly township: number;
    readonly special_district: number;
    readonly school_district: number;
    readonly state: number;
    readonly federal: number;
  };
  readonly schoolSystems: {
    readonly independentSchoolDistricts: number;
    readonly dependentSchoolSystemsTotal: number;
    readonly countyDependent: number;
    readonly municipalDependent: number;
    readonly townshipDependent: number;
    readonly stateDependent: number;
    readonly allOperatingPublicSchoolSystems: number;
  };
  readonly sha256: string;
}

/**
 * State-level breakdown manifest.
 */
export interface StateUniverseManifest {
  readonly schemaVersion: "1.0.0";
  readonly generatedAt: string;
  readonly sourceVintage: string;
  readonly stateCount: number;
  readonly states: Record<string, StateGovernmentSummary>;
  readonly sha256: string;
}

/**
 * Special districts functional classification summary.
 */
export interface SpecialDistrictFunctionSummary {
  readonly functionCategory: GovernmentFunctionCategory;
  readonly functionCodePrefixes: string[];
  readonly description: string;
  readonly nationalCount: number;
  readonly isMultiFunction: boolean;
}

export interface FunctionalSpecialDistrictsManifest {
  readonly schemaVersion: "1.0.0";
  readonly generatedAt: string;
  readonly sourceVintage: string;
  readonly totalSpecialDistricts: number;
  readonly singleFunctionTotal: number;
  readonly multiFunctionTotal: number;
  readonly functions: SpecialDistrictFunctionSummary[];
  readonly sha256: string;
}

/**
 * School systems structure summary.
 */
export interface SchoolSystemStateDetail {
  readonly state: string;
  readonly stateName: string;
  readonly independentDistricts: number;
  readonly countyDependent: number;
  readonly municipalDependent: number;
  readonly townshipDependent: number;
  readonly stateDependent: number;
  readonly totalOperatingSystems: number;
  readonly primarySystemStructure: "independent" | "dependent" | "mixed";
}

export interface SchoolSystemsManifest {
  readonly schemaVersion: "1.0.0";
  readonly generatedAt: string;
  readonly sourceVintage: string;
  readonly nationalSummary: {
    readonly independentDistricts: number;
    readonly dependentSystems: number;
    readonly totalOperatingSystems: number;
    readonly independentPercentage: number;
  };
  readonly byState: Record<string, SchoolSystemStateDetail>;
  readonly sha256: string;
}

/**
 * Historical count series record across Census of Governments censuses.
 */
export interface HistoricalSeriesRecord {
  readonly year: number;
  readonly totalGovernments: number;
  readonly federalGovernment: number;
  readonly stateGovernments: number;
  readonly localGovernments: number;
  readonly countyGovernments: number;
  readonly municipalGovernments: number;
  readonly townshipGovernments: number;
  readonly specialDistrictGovernments: number;
  readonly schoolDistrictGovernments: number;
  readonly notes?: string;
}

export interface HistoricalCountSeriesManifest {
  readonly schemaVersion: "1.0.0";
  readonly generatedAt: string;
  readonly seriesTitle: string;
  readonly censusYears: HistoricalSeriesRecord[];
  readonly majorTrends: {
    readonly schoolDistrictConsolidation: string;
    readonly specialDistrictGrowth: string;
    readonly generalPurposeStability: string;
  };
  readonly sha256: string;
}

export interface TypeClassificationManifest {
  readonly schemaVersion: "1.0.0";
  readonly generatedAt: string;
  readonly classificationSystem: "U.S. Census Bureau Government Units Classification";
  readonly generalPurposeTypes: readonly GovernmentClass[];
  readonly specialPurposeTypes: readonly GovernmentClass[];
  readonly definitions: Record<
    GovernmentClass,
    {
      readonly title: string;
      readonly censusDefinition: string;
      readonly criteriaForIndependentStatus: readonly string[];
      readonly nationalCount2022: number;
    }
  >;
  readonly sha256: string;
}

export interface GovernmentSearchCriteria {
  readonly query?: string;
  readonly state?: string;
  readonly county?: string;
  readonly governmentType?: GovernmentClass;
  readonly functionCategory?: GovernmentFunctionCategory;
  readonly activeStatus?: GovernmentActiveStatus;
  readonly limit?: number;
  readonly offset?: number;
}
