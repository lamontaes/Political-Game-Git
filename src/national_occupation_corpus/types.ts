/**
 * Source Schema & Types for National Occupation / Career Source Corpus
 *
 * Grounded in:
 * - U.S. Bureau of Labor Statistics Occupational Employment and Wage Statistics (OEWS)
 * - Official Standard Occupational Classification (SOC) 2018 Taxonomy
 * - U.S. Department of Labor O*NET Occupational Information Network
 */

export type SocCode = string; // e.g. "11-1021" (6-digit detailed SOC 2018)
export type SocMajorGroupCode = string; // e.g. "11-0000"
export type SocMinorGroupCode = string; // e.g. "11-1000"
export type SocBroadGroupCode = string; // e.g. "11-1020"
export type OnetSocCode = string; // e.g. "23-1011.00" (8-character O*NET-SOC 2019)

export type GeographicLevel = "national" | "state" | "msa";

export type WageUnit = "hourly" | "annual" | "mixed";

export type DataSuppressionReason =
  "suppressed" | "unavailable" | "above_limit";

export type WorkRelationshipKind =
  "employment" | "independent" | "volunteer" | "training" | "service";

export interface SocTaxonomyRecord {
  readonly socCode: SocCode;
  readonly socMajorGroup: SocMajorGroupCode;
  readonly socMinorGroup: SocMinorGroupCode;
  readonly socBroadGroup: SocBroadGroupCode;
  readonly title: string;
  readonly description: string;
  /**
   * Derived occupation family grouping for Game convenience.
   * Derived from SOC Major Group title. Not an official raw BLS field.
   */
  readonly derivedOccupationFamily: string;
  readonly isOfficialSocRecord: boolean;
}

export interface OnetSocCrosswalk {
  readonly onetSocCode: OnetSocCode;
  readonly soc2018Code: SocCode;
  readonly onetTitle: string;
  readonly onetVersion: string; // e.g. "28.1" or "2019"
}

export interface WagePercentiles {
  /** 10th percentile wage */
  readonly pct10: number | null;
  /** 25th percentile wage */
  readonly pct25: number | null;
  /** 50th percentile (median) wage */
  readonly pct50: number | null;
  /** 75th percentile wage */
  readonly pct75: number | null;
  /** 90th percentile wage */
  readonly pct90: number | null;
  readonly suppressionReason?: DataSuppressionReason | null;
}

export interface WageDistribution {
  /** Mean wage */
  readonly mean: number | null;
  readonly meanWageRse: number | null; // Relative standard error for mean wage (%)
  readonly percentiles: WagePercentiles;
  /** Annual mean wage in dollars */
  readonly annualMean: number | null;
  readonly annualPercentiles: WagePercentiles;
  readonly wageUnit: WageUnit;
}

export interface EmploymentMetrics {
  /** Total estimated employment count (null if suppressed/uncollected) */
  readonly totalEmployment: number | null;
  /** Relative standard error for total employment (%) */
  readonly employmentRse: number | null;
  /** Jobs per 1,000 jobs in the area */
  readonly employmentPerThousand: number | null;
  /** Location quotient relative to national average */
  readonly locationQuotient: number | null;
  readonly suppressionReason?: DataSuppressionReason | null;
}

export interface GeographicScope {
  readonly level: GeographicLevel;
  readonly statePostal: string | null; // e.g., "KY", "TX", "CA", "NY"
  readonly stateFips: string | null; // e.g., "21", "48", "06", "36"
  readonly areaCode: string; // e.g., "0000000" for National, "30460" for Lexington MSA, "12420" for Austin MSA
  readonly areaName: string; // e.g., "U.S.", "Kentucky", "Lexington-Fayette, KY MSA", "Austin-Round Rock-San Marcos, TX MSA"
}

export interface IndustryScope {
  readonly naicsCode: string | null; // e.g., "000000" for cross-industry, "541100" for Legal Services
  readonly naicsTitle: string | null;
  readonly sector: string | null;
}

export interface SkillScore {
  readonly name: string;
  readonly score: number; // 0-100 score or importance rating
}

export interface WorkTaskSkillMetadata {
  readonly onetSocCode: OnetSocCode;
  readonly soc2018Code: SocCode;
  readonly keyTasks: readonly string[];
  readonly requiredSkills: readonly SkillScore[];
  readonly workActivities: readonly string[];
  readonly typicalEducation: string;
  readonly workExperience: string;
  readonly onTheJobTraining: string;
  readonly attribution: {
    readonly license: "CC BY 4.0";
    readonly provider: "U.S. Department of Labor / Employment and Training Administration (USDOL/ETA)";
    readonly datasetVersion: string; // e.g. "O*NET 28.1 Database"
    readonly notice: "This material includes information from the O*NET 28.1 Database by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA), used under the CC BY 4.0 license.";
  };
}

export interface SourceProvenance {
  readonly datasetName: "BLS OEWS" | "O*NET OnLine" | "SOC Taxonomy";
  readonly vintage: string; // e.g., "2023-May", "O*NET 28.1"
  readonly releaseYear: number;
  readonly authority:
    "Bureau of Labor Statistics" | "U.S. Department of Labor / O*NET";
  readonly accessUrl: string;
  readonly license: string;
  readonly rawFilename?: string;
  readonly sha256?: string;
  readonly retrievalTimestamp?: string;
  readonly rowLocator?: string;
  readonly isSyntheticTestData?: boolean;
}

export interface NormalizedOccupationRecord {
  /** Stable composite identity key */
  readonly id: string;
  readonly soc: SocTaxonomyRecord;
  readonly onetCrosswalk?: OnetSocCrosswalk | null;
  readonly geography: GeographicScope;
  readonly industry: IndustryScope;
  readonly employment: EmploymentMetrics;
  readonly wages: WageDistribution;
  readonly metadata: WorkTaskSkillMetadata | null;
  readonly provenance: SourceProvenance;
}

/**
 * Interface contract allowing later simulation consumers to combine:
 * occupation + employer + geography + work relationship + compensation + schedule/history.
 */
export interface OccupationConsumerCompositionContract {
  readonly occupationRecordId: string;
  readonly socCode: SocCode;
  readonly onetSocCode?: OnetSocCode;
  readonly employerEntityId?: string;
  readonly geographyAreaCode: string;
  readonly workRelationshipType: WorkRelationshipKind;
  readonly compensationArrangement: {
    readonly baseWage: number;
    readonly wageUnit: "hourly" | "annual";
    readonly percentileTier:
      "pct10" | "pct25" | "pct50" | "pct75" | "pct90" | "custom";
  };
  readonly scheduleHistoryRef?: string;
}

export interface NationalOccupationCorpusManifest {
  readonly corpusId: string;
  readonly version: string;
  readonly compiledAt: string;
  readonly recordCount: number;
  readonly socOccupationCount: number;
  readonly geographicCoverage: readonly string[];
  readonly wagePercentileCoverageRatio: number;
  readonly files: readonly {
    readonly path: string;
    readonly recordCount: number;
    readonly sha256: string;
  }[];
}
