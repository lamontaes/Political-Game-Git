/**
 * Types and contracts for the Official FEMA Disaster Declarations Corpus Sidecar.
 *
 * This corpus provides truthful historical evidence of disaster declarations published by OpenFEMA.
 * It strictly excludes gameplay mechanics, event arrival rates, casualty predictions, or risk/probability scores.
 */

export type DeclarationType = "DR" | "EM" | "FM";

export type DesignatedAreaType =
  "county" | "tribal" | "statewide" | "other" | null;

export interface DisasterDeclarationRecord {
  /** Stable unique composite identifier for this declaration area record (e.g. "DR-4765-TX:Harris (County)") */
  declarationId: string;
  /** Official FEMA declaration string (e.g. "DR-4765-TX") */
  femaDeclarationString: string;
  /** Numerical disaster number assigned by FEMA (e.g. 4765) */
  disasterNumber: number;
  /** Two-letter USPS state or territory postal abbreviation (e.g. "TX") */
  state: string;
  /** Official FEMA declaration type code ("DR" | "EM" | "FM") */
  declarationType: DeclarationType;
  /** Declaration date in ISO format (e.g. "2024-05-17T00:00:00.000Z") */
  declarationDate: string;
  /** Federal fiscal year in which disaster was declared */
  fyDeclared: number;
  /** Official incident type name (e.g. "Hurricane", "Severe Storm", "Flood", "Fire") */
  incidentType: string;
  /** Official declaration title published by FEMA */
  declarationTitle: string;
  /** Incident start timestamp (ISO date string or null if missing in source) */
  incidentBeginDate: string | null;
  /** Incident end timestamp (ISO date string or null if ongoing/unreported) */
  incidentEndDate: string | null;
  /** Designated area name (e.g. "Harris (County)", "Statewide", "Cherokee Nation") */
  designatedArea: string | null;
  /** Area type classification derived from source ("county" | "tribal" | "statewide" | "other" | null) */
  designatedAreaType: DesignatedAreaType;
  /** 2-digit FIPS state code (e.g. "48") or null if missing */
  fipsStateCode: string | null;
  /** 3-digit FIPS county code (e.g. "201") or null if missing */
  fipsCountyCode: string | null;
  /** OpenFEMA place code or null if missing */
  placeCode: string | null;
  /** Individual and Households Program declared flag (boolean or null if missing; missing != false) */
  ihProgramDeclared: boolean | null;
  /** Individual Assistance Program declared flag (boolean or null if missing; missing != false) */
  iaProgramDeclared: boolean | null;
  /** Public Assistance Program declared flag (boolean or null if missing; missing != false) */
  paProgramDeclared: boolean | null;
  /** Hazard Mitigation Grant Program declared flag (boolean or null if missing; missing != false) */
  hmProgramDeclared: boolean | null;
  /** OpenFEMA last record refresh/amendment timestamp or null */
  lastRefresh: string | null;
  /** Physical hazard classification (derived from incidentType, e.g. "Hurricane", "Flood") */
  underlying_physical_hazard: string;
  /** Administrative response category (derived from declarationType, e.g. "Major Disaster Declaration (DR)") */
  administrative_declaration_or_response: string;
}

export interface FemaCorpusProvenance {
  /** Official OpenFEMA API endpoint URL or raw source artifact origin */
  officialEndpointUrl: string;
  /** Source dataset name and version description */
  queryOrVersion: string;
  /** Timestamp when source data was retrieved/snapshot */
  retrievalTimestamp: string;
  /** SHA-256 hash of the raw source JSON/CSV file */
  rawSourceSha256: string;
  /** Version of the compiler producing this dataset */
  compilerVersion: string;
  /** Number of records in the compiled corpus */
  recordCount: number;
  /** Min and max declaration dates covered by the corpus */
  dateRange: {
    minDate: string;
    maxDate: string;
  };
  /** Public domain / rights notice for OpenFEMA data */
  license: string;
}

export interface FemaCorpusDataset {
  /** Schema identifier and version for the compiled sidecar format */
  schemaVersion: string;
  /** Build timestamp of compiled output */
  compiledAt: string;
  /** Complete provenance metadata */
  provenance: FemaCorpusProvenance;
  /** Array of disaster declaration records sorted deterministically */
  records: DisasterDeclarationRecord[];
}

/** Mappings from declarationType abbreviation to human-readable administrative declaration category */
export const DECLARATION_TYPE_MAP: Record<DeclarationType, string> = {
  DR: "Major Disaster Declaration (DR)",
  EM: "Emergency Declaration (EM)",
  FM: "Fire Management Assistance (FM)",
};

/**
 * Builds a deterministic stable declaration ID for a declaration record.
 */
export function buildDeclarationId(
  disasterNumber: number,
  state: string,
  designatedArea: string | null,
  fipsCountyCode: string | null,
): string {
  const cleanArea = designatedArea
    ? designatedArea.trim()
    : fipsCountyCode
      ? `fips-${fipsCountyCode}`
      : "statewide";
  return `fema-disaster:${disasterNumber}:${state.toUpperCase()}:${cleanArea.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}
