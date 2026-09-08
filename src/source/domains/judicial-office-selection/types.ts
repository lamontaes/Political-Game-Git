/**
 * Judicial office identity, selection, vacancy filling, tenure, and renewal.
 *
 * This source-domain record says how an office is constituted and filled. It
 * does not model judging, case outcomes, or a person's fitness for office.
 */

import type { Evidence, Sourced } from "../../core/index";

export const STRUCTURAL_FAMILIES = [
  "pure_merit_selection",
  "gubernatorial_appointment_confirmation",
  "legislative_election",
  "nonpartisan_popular_election",
  "partisan_popular_election",
  "hybrid_bifurcated_system",
] as const;

export type JudicialStructuralFamily = (typeof STRUCTURAL_FAMILIES)[number];

export const JUDICIAL_OFFICE_FAMILIES = [
  "highest_court",
  "highest_court_civil",
  "highest_court_criminal",
  "intermediate_appellate",
  "general_trial",
  "chancery_equity",
] as const;

export type JudicialOfficeFamily = (typeof JUDICIAL_OFFICE_FAMILIES)[number];

export const ATOMIC_SELECTION_MECHANISMS = [
  "MERIT_COMMISSION_SHORTLIST",
  "EXECUTIVE_NOMINATION",
  "EXECUTIVE_APPOINTMENT",
  "LEGISLATIVE_CONFIRMATION",
  "COUNCIL_CONFIRMATION",
  "LEGISLATIVE_SCREENING",
  "LEGISLATIVE_ELECTION",
  "PARTY_CONVENTION_NOMINATION",
  "PARTISAN_PRIMARY",
  "PARTISAN_GENERAL_ELECTION",
  "NONPARTISAN_PRIMARY",
  "NONPARTISAN_GENERAL_ELECTION",
  "MAJORITY_RUNOFF_ELECTION",
  "RETENTION_ELECTION",
  "COMMISSION_RETENTION",
  "LEGISLATIVE_RETENTION",
  "EXECUTIVE_REAPPOINTMENT",
  "LEGISLATIVE_REAPPOINTMENT",
  "LEGISLATIVE_REELECTION",
  "JUDICIAL_ASSIGNMENT",
] as const;

export type AtomicSelectionMechanism =
  (typeof ATOMIC_SELECTION_MECHANISMS)[number];

export interface AtomicSelectionStage {
  /** One-based order within this path. */
  readonly order: number;
  readonly mechanism: AtomicSelectionMechanism;
  /** The actor 92L reports, or an explicit source-state absence. */
  readonly actor: Sourced<string>;
}

export interface AtomicSelectionPath {
  /** Stable within this record; `default` when the packet reports no branch. */
  readonly pathId: string;
  /** NOT_APPLICABLE for the default path; otherwise the reported branch scope. */
  readonly applicability: Sourced<string>;
  readonly stages: readonly AtomicSelectionStage[];
}

export interface JudicialSelectionPipeline {
  /** The 92L mechanism taxonomy, retained verbatim. */
  readonly reportedMechanismType: string;
  /** Atomic paths derived only from the packet's mechanism/actor fields. */
  readonly paths: readonly AtomicSelectionPath[];
  /** The packet's own ordered workflow keys, retained without reordering. */
  readonly reportedWorkflowStages: readonly string[];
  readonly ballotCharacteristics: {
    readonly partisanElection: boolean;
    readonly nonpartisanElection: boolean;
    readonly legislativeElection: boolean;
    readonly retentionElection: boolean;
  };
}

export interface JudicialVacancyPipeline {
  readonly reportedDescription: string;
  readonly stages: readonly AtomicSelectionStage[];
  readonly selfSuccessionPermitted: Sourced<boolean>;
  readonly interimTenureDuration: Sourced<string>;
  readonly nextElectionTiming: Sourced<string>;
  readonly reportedWorkflowStages: readonly string[];
}

export type JudicialTenureKind = "GOOD_BEHAVIOR" | "FIXED_TERM" | "ASSIGNMENT";

export interface JudicialTenure {
  readonly kind: JudicialTenureKind;
  /** NOT_APPLICABLE for good-behavior tenure; possibly unresolved for assignment. */
  readonly termLengthYears: Sourced<number>;
}

export interface JudicialRenewalPipeline {
  /** The 92L renewal taxonomy, retained verbatim. */
  readonly reportedMechanism: string;
  readonly paths: readonly AtomicSelectionPath[];
  /** Exact threshold token; never coerced into an invented percentage. */
  readonly threshold: Sourced<string>;
  readonly confirmationActor: Sourced<string>;
}

export interface JudicialGeography {
  readonly scope: string;
  readonly districtType: string;
  readonly notes: string;
}

export interface JudicialRetirementRule {
  readonly established: boolean;
  readonly age: Sourced<number>;
  readonly triggerPoint: Sourced<string>;
  readonly seniorStatusAvailable: Sourced<boolean>;
}

export interface JudicialQualifications {
  readonly minimumAge: Sourced<number>;
  readonly maximumAge: Sourced<number>;
  readonly stateCitizenshipYears: Sourced<number>;
  readonly stateResidencyYears: Sourced<number>;
  readonly legalPracticeYears: Sourced<number>;
  readonly barAdmissionRequirement: Sourced<string>;
  readonly qualifiedElector: Sourced<boolean>;
  readonly additionalRequirements: Sourced<string>;
}

/** Citations reported by 92L; they are not claims that this repo fetched them. */
export interface ReportedJudicialAuthority {
  readonly constitutionalAuthority: string;
  readonly statutoryAuthority: string;
  readonly courtRulesOrNotes: string;
  readonly researchRetrievalDate: string;
  readonly researchEpistemicStatus: "KNOWN" | "UNKNOWN" | "NOT_APPLICABLE";
}

export interface JudicialResearchProvenance {
  readonly packetId: "92L_NATIONAL_JUDICIAL_SELECTION_TENURE_COMPLETION";
  readonly driveFileId: "1zHRVfLrHcQuZnmSwpSKIavwuUEH_vIhs";
  readonly evidenceTier: "RESEARCH_SYNTHESIS";
  /** The packet was retrieved and locked; its reported legal authorities were not. */
  readonly packetStatus: "RETRIEVED_AND_LOCKED";
  readonly primaryAuthorityStatus: "CITATIONS_REPORTED_NOT_RETRIEVED";
  /** The checked-in transcription came from the packet-referenced companion. */
  readonly transcriptionStatus: "PACKET_REFERENCED_COMPANION";
}

export interface JudicialOfficeSelectionRecord {
  /** `<jurisdictionId>:<officeFamily>`, stable even when the office does not exist. */
  readonly recordId: string;
  readonly jurisdictionId: string;
  readonly jurisdictionName: string;
  readonly structuralFamily: JudicialStructuralFamily;
  readonly officeFamily: JudicialOfficeFamily;
  readonly officeExists: Sourced<boolean>;
  readonly courtName: Sourced<string>;
  readonly geography: Sourced<JudicialGeography>;
  readonly initialSelection: Sourced<JudicialSelectionPipeline>;
  readonly interimVacancy: Sourced<JudicialVacancyPipeline>;
  readonly tenure: Sourced<JudicialTenure>;
  readonly renewal: Sourced<JudicialRenewalPipeline>;
  readonly mandatoryRetirement: Sourced<JudicialRetirementRule>;
  readonly qualifications: JudicialQualifications;
  readonly reportedAuthority: ReportedJudicialAuthority;
  readonly researchProvenance: JudicialResearchProvenance;
  readonly evidence: Evidence;
}

/** Field-name fragments this domain must never acquire. */
export const FORBIDDEN_JUDICIAL_FIELD_FRAGMENTS = [
  "ideolog",
  "predictedRuling",
  "qualityScore",
  "suitabilityScore",
  "liberalScore",
  "conservativeScore",
] as const;
