export type PumsRecordType = "H" | "P";

export interface SourceArtifactMetadata {
  id: string;
  url: string;
  description: string;
  sha256: string;
  size_bytes: number;
  internal_csv_filename: string;
}

export interface PumsAcquisitionManifest {
  title: string;
  vintage: string;
  dataset_type: string;
  retrieval_timestamp: string;
  deidentification_statement: string;
  unresolved_behavioral_research_statement: string;
  source_artifacts: SourceArtifactMetadata[];
}

export interface PumsValueCodeDefinition {
  code: string;
  label: string;
  is_missing_or_not_applicable: boolean;
}

export interface PumsVariableDefinition {
  name: string;
  record_type: PumsRecordType;
  data_type: "C" | "N"; // Character or Numeric according to Census dictionary
  length: number;
  description: string;
  values: PumsValueCodeDefinition[];
}

export interface PumsDataDictionary {
  vintage: string;
  variables: Record<string, PumsVariableDefinition>;
}

export interface ParsedPumsRow {
  RT: PumsRecordType;
  SERIALNO: string;
  PUMA: string;
  STATE: string;
  [key: string]: string | number | null;
}

export interface PumsHousingRecord extends ParsedPumsRow {
  RT: "H";
  WGTP: number;
}

export interface PumsPersonRecord extends ParsedPumsRow {
  RT: "P";
  SPORDER: number;
  PWGTP: number;
}

export interface PumsHouseholdCluster {
  housing: PumsHousingRecord;
  persons: PumsPersonRecord[];
}

export interface QASliceArtifact {
  manifest_title: string;
  vintage: string;
  extraction_date: string;
  selection_rule: string;
  households: PumsHouseholdCluster[];
  summary: {
    total_housing_units: number;
    total_persons: number;
    preserved_missing_codes_count: number;
    missing_code_examples: Record<string, string>;
  };
}
