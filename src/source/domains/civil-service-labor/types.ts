import type { Evidence, Sourced } from "../../core/index";

export type JurisdictionLevel = "federal" | "state";

export interface ClassificationDistinction {
  readonly coveredService: string;
  readonly outsideCoveredService: readonly string[];
}

export interface AppointmentProtection {
  readonly rule: string;
  readonly probationaryRule: string | null;
}

export interface RemovalProtection {
  readonly standard: string;
  readonly requiredProcedure: readonly string[];
}

export interface AppealBody {
  readonly bodies: readonly string[];
  readonly reviewScope: string;
}

export interface LocalCivilServiceMandate {
  readonly regime:
    | "statewide-mandate"
    | "local-option"
    | "occupation-specific"
    | "no-rule-established";
  readonly appliesTo: string;
}

export interface CivilServiceProfile {
  readonly recordId: string;
  readonly jurisdictionKey: string;
  readonly jurisdictionName: string;
  readonly jurisdictionLevel: JurisdictionLevel;
  readonly classificationDistinction: Sourced<ClassificationDistinction>;
  readonly appointmentProtection: Sourced<AppointmentProtection>;
  readonly removalProtection: Sourced<RemovalProtection>;
  readonly appealBody: Sourced<AppealBody>;
  readonly localCivilServiceMandate: Sourced<LocalCivilServiceMandate>;
}

export interface BargainingCoverage {
  readonly regime:
    "broad-duty" | "sector-specific" | "local-option" | "prohibited";
  readonly appliesTo: string;
  readonly exclusions: readonly string[];
}

export interface BargainingScope {
  readonly mandatorySubjects: readonly string[];
  readonly excludedSubjects: readonly string[];
}

export interface ManagementRights {
  readonly reservedSubjects: readonly string[];
  readonly limitation: string | null;
}

export interface ImpasseRule {
  readonly mechanisms: readonly string[];
  readonly bindingFor: string | null;
}

export interface StrikeRestriction {
  readonly rule: "prohibited" | "tiered" | "limited";
  readonly appliesTo: string;
  readonly conditions: readonly string[];
}

export interface LaborBargainingProfile {
  readonly recordId: string;
  readonly jurisdictionKey: string;
  readonly jurisdictionName: string;
  readonly jurisdictionLevel: JurisdictionLevel;
  readonly bargainingCoverage: Sourced<BargainingCoverage>;
  readonly bargainingScope: Sourced<BargainingScope>;
  readonly managementRights: Sourced<ManagementRights>;
  readonly impasseRule: Sourced<ImpasseRule>;
  readonly strikeRestriction: Sourced<StrikeRestriction>;
}

export interface CivilServiceLaborRecord {
  readonly recordId: string;
  readonly jurisdictionKey: string;
  readonly jurisdictionName: string;
  readonly jurisdictionLevel: JurisdictionLevel;
  readonly civilService: CivilServiceProfile;
  readonly laborBargaining: LaborBargainingProfile;
}

export function recordEvidence(
  record: CivilServiceLaborRecord,
): readonly Evidence[] {
  const values: readonly Sourced<unknown>[] = [
    record.civilService.classificationDistinction,
    record.civilService.appointmentProtection,
    record.civilService.removalProtection,
    record.civilService.appealBody,
    record.civilService.localCivilServiceMandate,
    record.laborBargaining.bargainingCoverage,
    record.laborBargaining.bargainingScope,
    record.laborBargaining.managementRights,
    record.laborBargaining.impasseRule,
    record.laborBargaining.strikeRestriction,
  ];
  return values.flatMap((value) => {
    if (value.state === "UNKNOWN") return value.investigated;
    if (value.state === "CONFLICTING") {
      return value.claims.flatMap((claim) => claim.evidence);
    }
    return value.evidence;
  });
}
