/** Compact, admitted runtime projection of 92L judicial selection research. */

import { JUDICIAL_SELECTION_PROFILES } from "./generated/selection-profiles";

export interface ReportedField<T> {
  readonly state: string;
  readonly value?: T;
  readonly reason?: string;
  readonly scopeSearched?: string;
}

export interface SelectionStageProfile {
  readonly order: number;
  readonly mechanism: string;
  readonly actor: ReportedField<string>;
}

export interface SelectionPathProfile {
  readonly pathId: string;
  readonly applicability: ReportedField<string>;
  readonly stages: readonly SelectionStageProfile[];
}

export interface JudicialSelectionProfile {
  readonly recordId: string;
  readonly jurisdictionId: string;
  readonly jurisdictionName: string;
  readonly officeFamily: string;
  readonly officeExists: ReportedField<boolean>;
  readonly courtName: ReportedField<string>;
  readonly geography: ReportedField<{
    readonly scope: string;
    readonly districtType: string;
    readonly notes: string;
  }>;
  readonly initialSelection: ReportedField<{
    readonly reportedMechanismType: string;
    readonly paths: readonly SelectionPathProfile[];
    readonly reportedWorkflowStages: readonly string[];
    readonly ballotCharacteristics: {
      readonly partisanElection: boolean;
      readonly nonpartisanElection: boolean;
      readonly legislativeElection: boolean;
      readonly retentionElection: boolean;
    };
  }>;
  readonly interimVacancy: ReportedField<{
    readonly reportedDescription: string;
    readonly stages: readonly SelectionStageProfile[];
    readonly selfSuccessionPermitted: ReportedField<boolean>;
    readonly interimTenureDuration: ReportedField<string>;
    readonly nextElectionTiming: ReportedField<string>;
    readonly reportedWorkflowStages: readonly string[];
  }>;
  readonly tenure: ReportedField<{
    readonly kind: "GOOD_BEHAVIOR" | "FIXED_TERM" | "ASSIGNMENT";
    readonly termLengthYears: ReportedField<number>;
  }>;
  readonly renewal: ReportedField<{
    readonly reportedMechanism: string;
    readonly paths: readonly SelectionPathProfile[];
    readonly threshold: ReportedField<string>;
    readonly confirmationActor: ReportedField<string>;
  }>;
  readonly mandatoryRetirement: ReportedField<{
    readonly established: boolean;
    readonly age: ReportedField<number>;
    readonly triggerPoint: ReportedField<string>;
    readonly seniorStatusAvailable: ReportedField<boolean>;
  }>;
  readonly qualifications: Readonly<
    Record<string, ReportedField<string | number | boolean>>
  >;
  readonly reportedAuthority: {
    readonly constitutionalAuthority: string;
    readonly statutoryAuthority: string;
    readonly courtRulesOrNotes: string;
    readonly researchRetrievalDate: string;
    readonly researchEpistemicStatus: "KNOWN" | "UNKNOWN" | "NOT_APPLICABLE";
  };
  /** 92L is retrieved research synthesis; cited primary authorities were not retrieved. */
  readonly evidenceTier: "RESEARCH_SYNTHESIS";
  readonly primaryAuthorityStatus: "CITATIONS_REPORTED_NOT_RETRIEVED";
}

const BY_RECORD_ID = new Map(
  JUDICIAL_SELECTION_PROFILES.map((profile) => [profile.recordId, profile]),
);

export function judicialSelectionProfile(
  recordId: string,
): JudicialSelectionProfile | null {
  return BY_RECORD_ID.get(recordId) ?? null;
}

export function judicialSelectionProfilesForJurisdiction(
  jurisdictionId: string,
): readonly JudicialSelectionProfile[] {
  return JUDICIAL_SELECTION_PROFILES.filter(
    (profile) => profile.jurisdictionId === jurisdictionId,
  );
}
