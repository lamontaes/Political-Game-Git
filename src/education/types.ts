/**
 * Authoritative U.S. Education Institution Source Corpus Types
 * Sourced from NCES Common Core of Data (CCD) and NCES IPEDS.
 */

export type InstitutionKind =
  "public-elementary-secondary" | "public-district" | "postsecondary";

export type InstitutionLevel =
  | "elementary"
  | "middle"
  | "high"
  | "combined"
  | "district"
  | "postsecondary-4yr"
  | "postsecondary-2yr"
  | "postsecondary-less-than-2yr";

export interface InstitutionLocation {
  readonly address: string | null;
  readonly city: string;
  readonly state: string;
  readonly zip: string | null;
  readonly fipsCounty: string | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
}

export type OperatingStatusKind =
  "open" | "closed" | "changed" | "active" | "inactive";

export interface OperatingVintageStatus {
  readonly vintageYear: number;
  readonly effectiveDateStart: string; // ISO date YYYY-MM-DD or YYYY
  readonly effectiveDateEnd: string | null; // ISO date YYYY-MM-DD or YYYY, null if currently active
  readonly status: OperatingStatusKind;
  readonly nameAtVintage: string;
}

export interface EducationSourceProvenance {
  readonly sourceName: "NCES CCD" | "NCES IPEDS";
  readonly datasetName: string; // e.g., "NCES CCD Public Elementary/Secondary School Universe Survey"
  readonly vintage: string; // e.g., "2022-2023", "2023-2024"
  readonly officialIdName: "NCESSCH" | "LEAID" | "UNITID";
  readonly sourceUrl: string;
  readonly retrievedAt: string; // ISO date format YYYY-MM-DD
}

export interface SchoolDistrictRecord {
  readonly officialId: string; // 7-digit NCES LEAID (e.g., "2101860")
  readonly stableId: string; // "nces-lea:2101860"
  readonly name: string;
  readonly kind: "public-district";
  readonly level: "district";
  readonly location: InstitutionLocation;
  readonly vintages: readonly OperatingVintageStatus[];
  readonly provenance: EducationSourceProvenance;
}

export interface PublicSchoolRecord {
  readonly officialId: string; // 12-digit NCES NCESSCH (e.g., "210186000787")
  readonly stableId: string; // "nces-sch:210186000787"
  readonly name: string;
  readonly kind: "public-elementary-secondary";
  readonly level: "elementary" | "middle" | "high" | "combined";
  readonly parentDistrictId: string; // Reference to SchoolDistrictRecord stableId (e.g. "nces-lea:2101860")
  readonly location: InstitutionLocation;
  readonly vintages: readonly OperatingVintageStatus[];
  readonly provenance: EducationSourceProvenance;
}

export interface PostsecondaryRecord {
  readonly officialId: string; // 6-digit NCES IPEDS UNITID (e.g., "157085")
  readonly stableId: string; // "ipeds-unit:157085"
  readonly name: string;
  readonly kind: "postsecondary";
  readonly level:
    "postsecondary-4yr" | "postsecondary-2yr" | "postsecondary-less-than-2yr";
  readonly control: "public" | "private-nonprofit" | "private-forprofit";
  readonly location: InstitutionLocation;
  readonly vintages: readonly OperatingVintageStatus[];
  readonly provenance: EducationSourceProvenance;
}

export type EducationInstitutionRecord =
  PublicSchoolRecord | PostsecondaryRecord;

export interface EducationCorpusSnapshot {
  readonly version: "1.0.0";
  readonly generatedAt: string; // ISO Date YYYY-MM-DD
  readonly counts: {
    readonly publicDistricts: number;
    readonly publicSchools: number;
    readonly postsecondaryInstitutions: number;
    readonly total: number;
  };
  readonly stableIdStrategy: {
    readonly publicSchoolPrefix: "nces-sch:";
    readonly districtPrefix: "nces-lea:";
    readonly postsecondaryPrefix: "ipeds-unit:";
  };
  readonly districts: readonly SchoolDistrictRecord[];
  readonly institutions: readonly EducationInstitutionRecord[];
}

export interface QueryEducationFilter {
  readonly nameQuery?: string;
  readonly state?: string;
  readonly city?: string;
  readonly kind?: InstitutionKind;
  readonly level?: InstitutionLevel;
  readonly effectiveYear?: number;
  readonly parentDistrictId?: string;
}
