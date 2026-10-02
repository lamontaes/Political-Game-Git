import type { AcademicYear } from "./vintage";
/** Raw locked IPEDS fields: a government level is not an exact owner identity. */
export interface EducationDirectorySource {
  readonly control: string;
  readonly controlAffiliation: string;
  readonly primaryPublicControl: string;
  readonly secondaryPublicControl: string;
  readonly calendarSystem: string;
  readonly controllingSystemName: string;
  readonly controllingSystemId: string;
  readonly latitude: number | null;
  readonly longitude: number | null;
}
/** Browser-safe source projection; never a student, admission or tuition record. */
export interface EducationCapability {
  readonly code: string;
  readonly label: string;
  readonly kind: "grade" | "award" | "noncredit";
  readonly state: "offered" | "not-offered" | "not-applicable" | "unknown";
  readonly raw: string;
}
export interface EducationInstitution {
  readonly id: string;
  readonly officialId: string;
  readonly kind: "school" | "district" | "postsecondary";
  readonly name: string;
  readonly city: string;
  readonly state: string;
  readonly stateFips: string | null;
  readonly countyGeoid: string | null;
  readonly parentDistrictId: string | null;
  /** Absent on legacy catalogs; sourceYear/evidence date and identify these fields. */
  readonly directorySource?: EducationDirectorySource;
  /** The directory vintage this row came from, e.g. `2025-26`. */
  readonly sourceYear: AcademicYear;
  readonly release: string;
  readonly statusCode: string;
  readonly statusLabel: string;
  readonly statusEffectiveDate: string | null;
  readonly foundingDate: null;
  readonly capabilities: readonly EducationCapability[];
  readonly openAdmissionPolicy: "reported-yes" | "reported-no" | "unknown";
  readonly evidence: readonly {
    artifactId: string;
    sha256: string;
    member: string;
    row: number;
  }[];
}
