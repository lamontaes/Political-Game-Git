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
  readonly sourceYear: "2024-25";
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
