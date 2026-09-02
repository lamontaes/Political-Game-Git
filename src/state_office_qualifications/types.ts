/**
 * State Office Qualifications Types & Interfaces
 * Bounded official-source qualifications corpus for 50 US states.
 */

export type StateCode =
  | "AL"
  | "AK"
  | "AZ"
  | "AR"
  | "CA"
  | "CO"
  | "CT"
  | "DE"
  | "FL"
  | "GA"
  | "HI"
  | "ID"
  | "IL"
  | "IN"
  | "IA"
  | "KS"
  | "KY"
  | "LA"
  | "ME"
  | "MD"
  | "MA"
  | "MI"
  | "MN"
  | "MS"
  | "MO"
  | "MT"
  | "NE"
  | "NV"
  | "NH"
  | "NJ"
  | "NM"
  | "NY"
  | "NC"
  | "ND"
  | "OH"
  | "OK"
  | "OR"
  | "PA"
  | "RI"
  | "SC"
  | "SD"
  | "TN"
  | "TX"
  | "UT"
  | "VT"
  | "VA"
  | "WA"
  | "WV"
  | "WI"
  | "WY";

export type OfficeFamilyId =
  | "STATE_LOWER_CHAMBER"
  | "STATE_UPPER_CHAMBER"
  | "NEBRASKA_UNICAMERAL"
  | "GOVERNOR"
  | "LIEUTENANT_GOVERNOR"
  | "ATTORNEY_GENERAL"
  | "SECRETARY_OF_STATE"
  | "STATE_TREASURER"
  | "STATE_AUDITOR"
  | "STATE_COMPTROLLER"
  | "AGRICULTURE_COMMISSIONER";

export type SelectionType =
  | "ELECTED_GENERAL"
  | "ELECTED_LEGISLATURE"
  | "APPOINTED_GOVERNOR"
  | "APPOINTED_COURT"
  | "EX_OFFICIO"
  | "OFFICE_DOES_NOT_EXIST";

export type SourcedValueStatus =
  | "KNOWN"
  | "UNKNOWN"
  | "NOT_APPLICABLE"
  | "NO_REQUIREMENT_FOUND"
  | "CONFLICTING_SOURCES";

export interface SourceCitation {
  citation: string;
  url?: string;
  articleSection?: string;
  statuteRef?: string;
  page?: number | string;
  retrievalDate: string;
  sourceVintage?: string;
  fileHashSha256?: string;
}

export interface SourcedQualificationValue<T> {
  status: SourcedValueStatus;
  value: T | null;
  rawText?: string;
  citations: SourceCitation[];
  notes?: string;
}

export interface OfficeQualificationFacts {
  officeFamilyId: OfficeFamilyId;
  officeTitle: string;
  selectionType: SelectionType;
  minimumAge: SourcedQualificationValue<number>;
  usCitizenshipYears: SourcedQualificationValue<number | string>;
  stateResidencyYears: SourcedQualificationValue<number | string>;
  districtResidencyYears: SourcedQualificationValue<number | string>;
  voterElectorRequirement: SourcedQualificationValue<boolean>;
  termLengthYears: SourcedQualificationValue<number>;
  termLimits: SourcedQualificationValue<string>;
  otherConstitutionalText?: SourcedQualificationValue<string>;
  normalizationReviewRequired: boolean;
  normalizationNotes?: string;
}

export interface StateOfficeQualificationRecord {
  stateCode: StateCode;
  stateName: string;
  lastUpdated: string;
  offices: Record<string, OfficeQualificationFacts>;
}

export interface CompiledQualificationsCorpus {
  version: string;
  generatedAt: string;
  totalStates: number;
  totalOfficeRecords: number;
  states: Record<string, StateOfficeQualificationRecord>;
}

export interface CoverageMatrixEntry {
  stateCode: StateCode;
  officeFamilyId: OfficeFamilyId;
  selectionType: SelectionType;
  ageStatus: SourcedValueStatus;
  citizenshipStatus: SourcedValueStatus;
  residencyStatus: SourcedValueStatus;
  normalizationReviewRequired: boolean;
}

export interface ProvenanceSummary {
  generatedAt: string;
  totalCitations: number;
  sourcesByVintage: Record<string, number>;
  statesCovered: number;
  unresolvedCount: number;
}

export interface UnresolvedItem {
  stateCode: StateCode;
  officeFamilyId: OfficeFamilyId;
  field: string;
  reason: string;
  citationText?: string;
}
