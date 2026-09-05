/**
 * The three district products this domain retrieves.
 *
 * Each is a separate zip with a separate text member and a separate digest.
 * #67's provenance.json already separated container from member hash, which is
 * the shape the core now requires of every domain.
 */

import type { AcquisitionPlan, AcquisitionRequest } from "../../core/index";

const GAZETTEER_BASE =
  "https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2025_Gazetteer";

export const CONGRESSIONAL_ARTIFACT = "census-gazetteer-2025-119cds-zip";
export const STATE_LOWER_ARTIFACT = "census-gazetteer-2025-sldl-zip";
export const STATE_UPPER_ARTIFACT = "census-gazetteer-2025-sldu-zip";

export const CONGRESSIONAL_MEMBER = "2025_Gaz_119CDs_national.txt";
export const STATE_LOWER_MEMBER = "2025_Gaz_sldl_national.txt";
export const STATE_UPPER_MEMBER = "2025_Gaz_sldu_national.txt";

function districtRequest(
  artifactId: string,
  file: string,
  member: string,
  schema: string,
): AcquisitionRequest {
  return {
    artifactId,
    provider: "U.S. Census Bureau, Geography Division",
    url: `${GAZETTEER_BASE}/${file}`,
    method: "bulk-download",
    mediaType: "application/zip",
    containerMemberPath: member,
    publisher: {
      statedVintage: "2025",
      releaseDate: null,
      schemaVersion: schema,
      documentationUrl:
        "https://www.census.gov/geographies/reference-files/time-series/geo/gazetteer-files.html",
    },
    rights: {
      status: "public-domain-us-government",
      declaredLicense: null,
      attributionRequired: false,
    },
    storage: "committed",
    localPath: `data/source/political-districts/raw/${file}`,
  };
}

export const politicalDistrictsAcquisition: AcquisitionPlan = {
  domain: "political-districts",
  requests: [
    districtRequest(
      CONGRESSIONAL_ARTIFACT,
      "2025_Gaz_119CDs_national.zip",
      CONGRESSIONAL_MEMBER,
      "2025 Gazetteer 119th Congressional Districts national file layout",
    ),
    districtRequest(
      STATE_LOWER_ARTIFACT,
      "2025_Gaz_sldl_national.zip",
      STATE_LOWER_MEMBER,
      "2025 Gazetteer state legislative districts (lower) national file layout",
    ),
    districtRequest(
      STATE_UPPER_ARTIFACT,
      "2025_Gaz_sldu_national.zip",
      STATE_UPPER_MEMBER,
      "2025 Gazetteer state legislative districts (upper) national file layout",
    ),
  ],
};
