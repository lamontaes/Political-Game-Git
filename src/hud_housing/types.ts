/**
 * Official HUD Housing Costs Reference Corpus Schemas & Types
 *
 * This module defines types for HUD Fair Market Rents (FMR), Income Limits,
 * area definitions (Metro, HMFA, Non-Metro County, NECTA), bedroom rent fields,
 * fiscal year vintages, status/exception flags, and provenance tracking.
 *
 * NOTE: These types strictly preserve missing/not-applicable values as null
 * or explicit status objects, rather than coercing missing data to zero or empty strings.
 * They represent official external HUD baseline references and MUST NOT infer individual household
 * rent, neighborhood quality, wealth class, housing availability, or homelessness probability.
 */

export type HUDAreaType = "METRO_MSA" | "HMFA" | "NONMETRO_COUNTY" | "NECTA";

export interface HUDAreaDefinition {
  /**
   * HUD area identifier code (e.g., "METRO41860M41860", "NCNTY48001N48001").
   */
  hud_area_code: string;

  /**
   * Official HUD area name (e.g., "San Francisco, CA HUD Metro FMR Area").
   */
  hud_area_name: string;

  /**
   * Type of HUD geography definition.
   */
  area_type: HUDAreaType;

  /**
   * List of 5-digit county FIPS codes covered by or associated with this HUD area.
   */
  associated_county_fips: string[];

  /**
   * 2-character USPS state abbreviation.
   */
  state_usps: string;
}

export interface BedroomRents {
  /** Efficiency / 0-Bedroom monthly rent ($) or null if unassigned/missing. */
  rent_0br: number | null;
  /** 1-Bedroom monthly rent ($) or null. */
  rent_1br: number | null;
  /** 2-Bedroom monthly rent ($) or null. */
  rent_2br: number | null;
  /** 3-Bedroom monthly rent ($) or null. */
  rent_3br: number | null;
  /** 4-Bedroom monthly rent ($) or null. */
  rent_4br: number | null;
}

export interface IncomeLimits {
  /** Area Median Family Income (MFI/AMI) ($) or null. */
  median_family_income: number | null;
  /** Extremely Low Income limit (30% MFI) for a 4-person family ($) or null. */
  extremely_low_30pct: number | null;
  /** Very Low Income limit (50% MFI) for a 4-person family ($) or null. */
  very_low_50pct: number | null;
  /** Low Income limit (80% MFI) for a 4-person family ($) or null. */
  low_income_80pct: number | null;
}

export interface HUDStatusFlags {
  /** True if Small Area Fair Market Rent (SAFMR) rules apply. */
  is_small_area_fmr: boolean;

  /** True if state non-metropolitan median income was used as floor. */
  is_state_nonmetro_median: boolean;

  /** True if hold-harmless provision was applied to prevent statutory decline. */
  has_hold_harmless_applied: boolean;

  /** Exception status string or null. */
  custom_exception_status: string | null;
}

export interface HUDRecordProvenance {
  source_name: string;
  source_url: string;
  retrieval_timestamp: string;
  vintage: string;
  sha256: string;
  locator: string;
}

export interface HUDFairMarketRentRecord {
  /**
   * Effective Fiscal Year (e.g., 2025, 2026).
   */
  fiscal_year: number;

  /**
   * Area definition details.
   */
  area: HUDAreaDefinition;

  /**
   * Bedroom-specific rent field values ($). Missing values MUST be explicit null.
   */
  rents: BedroomRents;

  /**
   * Area Income limits or null if unlinked.
   */
  income_limits: IncomeLimits | null;

  /**
   * Exception or status flags.
   */
  flags: HUDStatusFlags;

  /**
   * Raw source record provenance.
   */
  provenance: HUDRecordProvenance;
}

export interface HUDHousingCorpusManifest {
  corpus_name: string;
  schema_version: string;
  generated_at: string;
  record_count: number;
  fiscal_year_coverage: number[];
  sources: {
    source_name: string;
    source_url: string;
    retrieval_timestamp: string;
    sha256: string;
  }[];
  compiled_artifact: {
    path: string;
    sha256: string;
  };
}
