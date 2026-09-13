/** Browser-safe projection contract. Source records describe rules, never appointments. */
export const CIVIL_PERSONNEL_FIELDS = [
  "classificationDistinction",
  "appointmentProtection",
  "removalProtection",
  "appealBody",
  "localCivilServiceMandate",
  "bargainingCoverage",
  "bargainingScope",
  "managementRights",
  "impasseRule",
  "strikeRestriction",
] as const;
export type CivilPersonnelField = (typeof CIVIL_PERSONNEL_FIELDS)[number];
export interface PersonnelCitation {
  readonly artifactId: string;
  readonly sha256: string;
  readonly citation: string;
  readonly url: string;
}
export const PERSONNEL_ATTRIBUTE_KEYS = [
  "coveredService",
  "outsideCoveredService",
  "rule",
  "probationaryRule",
  "standard",
  "requiredProcedure",
  "bodies",
  "reviewScope",
  "regime",
  "appliesTo",
  "exclusions",
  "mandatorySubjects",
  "excludedSubjects",
  "reservedSubjects",
  "limitation",
  "mechanisms",
  "bindingFor",
  "conditions",
] as const;
export interface PersonnelObservedAttribute {
  readonly key: (typeof PERSONNEL_ATTRIBUTE_KEYS)[number];
  readonly value: string | readonly string[] | null;
}
export type PersonnelRuleObservation =
  | {
      readonly state: "known";
      readonly observedOn: string;
      readonly attributes: readonly PersonnelObservedAttribute[];
      readonly citations: readonly PersonnelCitation[];
    }
  | { readonly state: "unknown"; readonly reason: string };
export interface PersonnelProfileObservation {
  readonly jurisdictionKey: string;
  readonly jurisdictionName: string;
  readonly employerLevel: "state" | "federal";
  readonly fields: Readonly<
    Record<CivilPersonnelField, PersonnelRuleObservation>
  >;
}
export interface PersonnelSourceProjection {
  readonly schemaVersion: 2;
  readonly corpusSha256: string;
  readonly compilerVersion: string;
  readonly profiles: readonly PersonnelProfileObservation[];
  readonly procedures: readonly PersonnelProcedure[];
}

/**
 * Reviewed operative transcriptions from the same locked enacted text. A
 * procedure carries only what its excerpts literally say; everything it leaves
 * to a plan, rule, agreement or undefined office stays a named gap.
 */
export const PERSONNEL_PROCEDURE_KEYS = [
  "mn-just-cause",
  "mn-just-cause-grounds",
  "mn-agreement-procedures",
  "mn-discipline-notice",
  "mn-notice-plan-content",
  "mn-commissioner-settlement",
  "mn-probationary-grievance",
  "mn-arbitration",
  "mn-reinstatement",
  "mn-probation",
  "mn-unclassified-offices",
  "ak-hearing",
  "ak-board-remedy",
  "ak-partially-exempt",
  "ak-exempt",
  "ak-governor-office-exempt",
  "ak-probation",
  "ak-discipline-rules",
  "ak-merit",
] as const;
export type PersonnelProcedureKey = (typeof PERSONNEL_PROCEDURE_KEYS)[number];

/** Numbers and closed lists a procedure fixes, each bound to literal text. */
export type PersonnelProcedureTerm = number | readonly string[];

export interface PersonnelProcedure {
  readonly key: PersonnelProcedureKey;
  readonly jurisdictionKey: "US-MN" | "US-AK";
  /** Current publisher text; it applies only on or after this date. */
  readonly validity: {
    readonly state: "CURRENT_OBSERVATION";
    readonly observedOn: string;
  };
  readonly statement: string;
  readonly citation: PersonnelCitation;
  readonly excerpts: readonly string[];
  readonly terms: Readonly<Record<string, PersonnelProcedureTerm>>;
}

/** Explicit class assertions from employment data; titles and friendship are not classes. */
export interface PersonnelClassContext {
  readonly jurisdictionKey: string;
  readonly employerLevel: "federal" | "state" | "local";
  readonly civilClass:
    | "competitive"
    | "excepted"
    | "senior-executive"
    | "classified"
    | "exempt"
    | "partially-exempt"
    | "unclassified"
    | "noncovered"
    | "unknown";
  readonly tenure: "probationary" | "permanent" | "unknown";
  readonly bargainingCoverage: "covered" | "excluded" | "unknown";
  readonly collectiveAgreement: "covered" | "not-covered" | "unknown";
}

export type PersonnelAction =
  | "prepare-recruitment"
  | "prepare-personnel-review"
  | "appoint"
  | "reinstate"
  | "complete-probation"
  | "discipline"
  | "remove"
  | "file-review"
  | "decide-settlement"
  | "decide-review";
export interface PersonnelActionAssessment {
  readonly action: PersonnelAction;
  readonly status: "available" | "blocked";
  readonly missing: readonly string[];
  /** Canonical facts the writer still checks; never a grant by itself. */
  readonly requires: readonly string[];
}
