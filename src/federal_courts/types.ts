/**
 * Type definitions for the U.S. Federal Courts and Judicial Geography Corpus.
 * Strictly source-backed by 28 U.S.C. Chapter 3, Chapter 5, Chapter 6 (§ 151),
 * § 1295, organic territorial acts, and Administrative Office of the U.S. Courts.
 */

export type ConstitutionalBasis = "ARTICLE_III" | "ARTICLE_I_ORGANIC_ACT";

export interface CourtDivision {
  division_id: string;
  name: string;
  primary_courthouse_city: string;
  primary_courthouse_name: string;
}

export interface FederalBankruptcyCourt {
  bankruptcy_court_id: string;
  name: string;
  short_name: string;
  parent_district_id: string;
  statutory_citation: string;
}

export interface FederalCircuit {
  circuit_id: string;
  name: string;
  short_name: string;
  circuit_number: number | null;
  is_specialized_nationwide: boolean;
  headquarters_city: string;
  headquarters_courthouse: string;
  state_or_territory_codes: string[];
  statutory_citation: string;
}

export interface FederalDistrict {
  district_id: string;
  name: string;
  short_name: string;
  parent_circuit_id: string;
  state_or_territory_codes: string[];
  fips_codes: string[];
  constitutional_basis: ConstitutionalBasis;
  bankruptcy_court: FederalBankruptcyCourt;
  divisions: CourtDivision[];
  statutory_citation: string;
}

export interface FederalCourtsCorpusProvenance {
  source_manifest_id: string;
  circuits_count: number;
  districts_count: number;
  bankruptcy_courts_count: number;
  article_iii_districts_count: number;
  territorial_districts_count: number;
  disclaimer: string;
}

export interface FederalCourtsCorpus {
  dataset_id: string;
  schema_version: string;
  compiled_at: string;
  circuits: FederalCircuit[];
  districts: FederalDistrict[];
  provenance: FederalCourtsCorpusProvenance;
}

export interface DistrictResolution {
  district: FederalDistrict;
  parent_circuit: FederalCircuit;
  bankruptcy_court: FederalBankruptcyCourt;
}

export interface CircuitResolution {
  circuit: FederalCircuit;
  underlying_districts: FederalDistrict[];
}
