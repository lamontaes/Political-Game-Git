import type { AcquisitionPlan, AcquisitionRequest } from "../../core/index";
const request = (
  artifactId: string,
  url: string,
  file: string,
  vintage: string,
): AcquisitionRequest => ({
  artifactId,
  provider: "U.S. Department of Education, NCES",
  url,
  method: "bulk-download",
  mediaType: "application/zip",
  publisher: {
    statedVintage: vintage,
    releaseDate: null,
    schemaVersion: null,
    documentationUrl: url,
  },
  rights: {
    status: "public-domain-us-government",
    declaredLicense:
      "Federal NCES statistical directory product; no student records or reidentification.",
    attributionRequired: false,
  },
  storage: "committed",
  localPath: `data/source/education/raw/${file}`,
});
/**
 * Files too large to commit (the CCD school membership, the EDGE school
 * geocodes, the Census place boundaries). The lock pins their identity and the
 * bytes live in the ignored source cache; `npm run source:acquire` fills it.
 */
export const CCD_MEMBERSHIP_ARTIFACT = "ccd-2023-24-school-membership";
export const CCD_PRIOR_DIRECTORY_ARTIFACT = "ccd-2023-24-school-directory";
export const EDGE_GEOCODE_ARTIFACT = "nces-edge-geocode-publicsch-2425";
export const PLACE_BOUNDARY_ARTIFACT = "census-cb-2025-place-500k";

const cached = (
  artifactId: string,
  provider: string,
  url: string,
  vintage: string,
  documentationUrl: string,
  declaredLicense: string,
): AcquisitionRequest => ({
  artifactId,
  provider,
  url,
  method: "bulk-download",
  mediaType: "application/zip",
  publisher: {
    statedVintage: vintage,
    releaseDate: null,
    schemaVersion: null,
    documentationUrl,
  },
  rights: {
    status: "public-domain-us-government",
    declaredLicense,
    attributionRequired: false,
  },
  storage: "cached-not-committed",
  localPath: null,
  cachePath: `.source-cache/education/${artifactId}.zip`,
});

export const educationAcquisition: AcquisitionPlan = {
  domain: "education",
  requests: [
    cached(
      CCD_MEMBERSHIP_ARTIFACT,
      "U.S. Department of Education, NCES",
      "https://nces.ed.gov/ccd/data/zip/ccd_sch_052_2324_l_1a_073124.zip",
      "2023-24 school membership v1a (the 2024-25 membership is not yet published)",
      "https://nces.ed.gov/ccd/files.asp",
      "Federal NCES statistical product; school-level counts only, no student records.",
    ),
    cached(
      CCD_PRIOR_DIRECTORY_ARTIFACT,
      "U.S. Department of Education, NCES",
      "https://nces.ed.gov/ccd/data/zip/ccd_sch_029_2324_w_1a_073124.zip",
      "2023-24 school directory v1a (fills the states the 2024-25 preliminary directory lacks)",
      "https://nces.ed.gov/ccd/files.asp",
      "Federal NCES statistical directory product; no student records or reidentification.",
    ),
    cached(
      EDGE_GEOCODE_ARTIFACT,
      "U.S. Department of Education, NCES EDGE",
      "https://nces.ed.gov/programs/edge/data/EDGE_GEOCODE_PUBLICSCH_2425.zip",
      "2024-25 public school geocodes",
      "https://nces.ed.gov/programs/edge/Geographic/SchoolLocations",
      "Federal NCES EDGE geographic product; school locations only.",
    ),
    cached(
      PLACE_BOUNDARY_ARTIFACT,
      "U.S. Census Bureau, Geography Division",
      "https://www2.census.gov/geo/tiger/GENZ2025/shp/cb_2025_us_place_500k.zip",
      "2025 cartographic boundary files, places, 1:500,000",
      "https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.html",
      "Census Bureau cartographic boundary files; public domain.",
    ),
    request(
      "ccd-2024-25-preliminary",
      "https://ies.ed.gov/sites/default/files/data-asset/ccd-common-core-data/2025/08/2024-25-common-core-data-ccd-preliminary-directory-files/2025046%20Preliminary%20Data%20Release%20CCD%20Nonfiscal_0.zip",
      "ccd-2024-25.zip",
      "2024-25 preliminary directory v0a",
    ),
    ...[
      "HD2024",
      "IC2024",
      "HD2024_Dict",
      "IC2024_Dict",
      "HD2025",
      "IC2025",
      "HD2025_Dict",
      "IC2025_Dict",
    ].map((id) =>
      request(
        id,
        `https://nces.ed.gov/ipeds/complete-data-files/${id}.zip`,
        `${id}.zip`,
        id.includes("2025")
          ? "2025-26 provisional"
          : id.startsWith("IC")
            ? "2024-25; archive includes revised member, updated September 2026"
            : "2024-25 directory",
      ),
    ),
  ],
};
