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
  readonly schemaVersion: 1;
  readonly corpusSha256: string;
  readonly compilerVersion: string;
  readonly profiles: readonly PersonnelProfileObservation[];
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
  | "complete-probation"
  | "discipline"
  | "remove"
  | "file-review"
  | "decide-review";
export interface PersonnelActionAssessment {
  readonly action: PersonnelAction;
  readonly status: "available" | "blocked";
  readonly missing: readonly string[];
}
