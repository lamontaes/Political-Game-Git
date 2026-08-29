/**
 * National Names V2 Source Compiler — Data Contracts and Schemas
 *
 * Defines normalized source record schemas, provenance manifest contracts,
 * raw ingestion types, and cohort query models for Census 2020 and SSA data.
 */

export interface CensusFirstNameRecord {
  readonly male_count: number;
  readonly female_count: number;
  readonly total_count: number;
  readonly male_share: number;
  readonly female_share: number;
  readonly rank?: number;
  readonly proportion_per_100k?: number;
}

export interface SSAYearlyCounts {
  readonly male: number;
  readonly female: number;
}

export interface SSANationalRecord {
  readonly total_male: number;
  readonly total_female: number;
  readonly total: number;
  readonly male_share: number;
  readonly female_share: number;
  readonly first_year: number;
  readonly last_year: number;
  readonly peak_year: number;
  readonly yearly: Readonly<Record<string, SSAYearlyCounts>>;
}

export interface SSAGeographicSeries {
  readonly total_male: number;
  readonly total_female: number;
  readonly total: number;
  readonly yearly: Readonly<Record<string, SSAYearlyCounts>>;
}

export interface GivenNameSourceRecord {
  readonly key: string;
  readonly display_name: string;
  readonly census: CensusFirstNameRecord | null;
  readonly ssa_national: SSANationalRecord | null;
  readonly ssa_state: Readonly<Record<string, SSAGeographicSeries>>;
  readonly ssa_territory: Readonly<Record<string, SSAGeographicSeries>>;
  readonly provenance: readonly string[];
}

export interface CensusSurnameDemographicMetadata {
  readonly white_alone_count?: number;
  readonly black_alone_count?: number;
  readonly aian_alone_count?: number;
  readonly api_alone_count?: number;
  readonly two_or_more_races_count?: number;
  readonly hispanic_origin_count?: number;
}

export interface CensusSurnameRecord {
  readonly count: number;
  readonly rank: number;
  readonly proportion_per_100k: number;
  readonly cumulative_proportion: number;
  readonly demographic_metadata?: CensusSurnameDemographicMetadata;
}

export interface SurnameSourceRecord {
  readonly key: string;
  readonly display_name: string;
  readonly census: CensusSurnameRecord;
  readonly provenance: readonly string[];
}

export interface SourceMetadata {
  readonly agency: string;
  readonly dataset_title: string;
  readonly source_url: string;
  readonly publication_vintage: string;
  readonly retrieval_date: string;
  readonly raw_filename: string;
  readonly raw_sha256: string;
  readonly raw_bytes: number;
  readonly license: string;
  readonly notes: string;
}

export interface ShardMetadata {
  readonly file: string;
  readonly sha256: string;
  readonly record_count: number;
  readonly size_bytes: number;
}

export interface NamesSourceManifest {
  readonly schema_version: string;
  readonly compiler_version: string;
  readonly compiled_at: string;
  readonly sources: Readonly<Record<string, SourceMetadata>>;
  readonly summary: {
    readonly total_unique_given_names: number;
    readonly total_unique_surnames: number;
    readonly ssa_year_range: readonly [number, number];
    readonly ssa_states: readonly string[];
    readonly ssa_territories: readonly string[];
  };
  readonly given_name_shards: Readonly<Record<string, ShardMetadata>>;
  readonly surname_shards: Readonly<Record<string, ShardMetadata>>;
}

export interface NamesSummaryIndex {
  readonly schema_version: string;
  readonly compiler_version: string;
  readonly compiled_at: string;
  readonly total_unique_given_names: number;
  readonly total_unique_surnames: number;
  readonly ssa_year_range: readonly [number, number];
  readonly ssa_states: readonly string[];
  readonly ssa_territories: readonly string[];
  readonly given_name_shards: readonly string[];
  readonly surname_shards: readonly string[];
}

export interface CohortQueryOptions {
  readonly year: number;
  readonly jurisdiction?: string; // "US" (default national), 2-letter state (e.g. "KY", "CA"), or territory ("PR", "TR")
  readonly sex?: "M" | "F";
  readonly minCount?: number;
  readonly limit?: number;
}

export interface CohortQueryItem {
  readonly key: string;
  readonly display_name: string;
  readonly count: number;
  readonly male_count: number;
  readonly female_count: number;
  readonly male_share: number;
  readonly female_share: number;
  readonly rank: number;
}

export interface CohortQueryResult {
  readonly year: number;
  readonly jurisdiction: string;
  readonly total_birth_records_in_scope: number;
  readonly total_names_returned: number;
  readonly names: readonly CohortQueryItem[];
}
