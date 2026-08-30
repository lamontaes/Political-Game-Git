/**
 * Authoritative U.S. Education Institution Source Corpus Types
 * Sourced reproducibly from NCES Common Core of Data (CCD) and NCES IPEDS raw zip archives.
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
  readonly state: string; // 2-letter state postal abbreviation (e.g. "KY")
  readonly zip: string | null;
  /** 2-digit state FIPS code (e.g. "21" for KY) where represented */
  readonly fipsState: string | null;
  /** 5-digit state+county GEOID/FIPS code (e.g. "21067" for Fayette County, KY) or null if unknown/unsupplied */
  readonly countyGeoid: string | null;
  /** Official county name (e.g. "Fayette County") or null if unknown/unsupplied */
  readonly countyName: string | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
}

export type OperatingStatusKind =
  "open" | "closed" | "changed" | "active" | "inactive";

export interface OperatingVintageStatus {
  readonly vintageYear: number;
  /** ISO date YYYY-MM-DD for known vintage window start, or null if historical opening/founding date is unknown/unsupported by NCES */
  readonly effectiveDateStart: string | null;
  /** ISO date YYYY-MM-DD or null if currently active/open */
  readonly effectiveDateEnd: string | null;
  readonly status: OperatingStatusKind;
  readonly nameAtVintage: string;
}

export interface SourceRowLocator {
  readonly sourceZipFilename: string; // e.g. "ccd_sch_029_2223_w_0a_051023.zip"
  readonly sourceZipSha256: string; // Exact SHA-256 hash of downloaded zip bytes
  readonly csvFilename: string; // e.g. "ccd_sch_029_2223_w_0a_051023.csv"
  readonly sourceRowIndex: number; // 2-indexed header-relative CSV line number
  readonly sourceKeyColumn: "NCESSCH" | "LEAID" | "UNITID";
  readonly sourceKeyValue: string;
}

export type ArtifactReleaseStatus = "preliminary-directory" | "final-release";

export interface EducationSourceProvenance {
  readonly sourceName: "NCES CCD" | "NCES IPEDS";
  readonly datasetName: string; // e.g., "NCES CCD Public Elementary/Secondary School Universe Survey Directory 2022-2023 (v.0a)"
  readonly vintage: string; // e.g., "2022-2023", "2022"
  readonly releaseStatus: ArtifactReleaseStatus;
  readonly officialIdName: "NCESSCH" | "LEAID" | "UNITID";
  readonly sourceUrl: string; // Direct download ZIP URL
  readonly retrievedAt: string; // ISO date format YYYY-MM-DD (e.g., "2026-08-30")
  readonly rowLocator: SourceRowLocator;
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
  readonly officialId: string; // 12-digit NCES NCESSCH (e.g., "210186000367")
  readonly stableId: string; // "nces-sch:210186000367"
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

export interface RawArtifactManifestEntry {
  readonly filename: string;
  readonly url: string;
  readonly sha256: string;
  readonly byteSize: number;
  readonly retrievedAt: string;
  readonly datasetName: string;
  readonly releaseStatus: ArtifactReleaseStatus;
}

export interface EducationCorpusSnapshot {
  readonly version: "1.0.0";
  readonly corpusScope: "historical-2022-snapshot";
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
  readonly rawArtifacts: readonly RawArtifactManifestEntry[];
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
