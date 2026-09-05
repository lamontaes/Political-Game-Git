/**
 * What the counties domain retrieves, and from where.
 *
 * The zip is the artifact; the text file inside it is a distinct member with
 * its own digest, because a container and its contents are different bytes
 * (32A §6.1). #67 already recorded both and the core now requires it.
 */

import type { AcquisitionPlan } from "../../core/index";

export const COUNTIES_ZIP_URL =
  "https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2025_Gazetteer/2025_Gaz_counties_national.zip";

export const COUNTIES_ZIP_ARTIFACT = "census-gazetteer-2025-counties-zip";
export const COUNTIES_TXT_MEMBER = "2025_Gaz_counties_national.txt";

export const countiesAcquisition: AcquisitionPlan = {
  domain: "counties",
  requests: [
    {
      artifactId: COUNTIES_ZIP_ARTIFACT,
      provider: "U.S. Census Bureau, Geography Division",
      url: COUNTIES_ZIP_URL,
      method: "bulk-download",
      mediaType: "application/zip",
      containerMemberPath: COUNTIES_TXT_MEMBER,
      publisher: {
        statedVintage: "2025",
        releaseDate: null,
        schemaVersion: "2025 Gazetteer counties national file layout",
        documentationUrl:
          "https://www.census.gov/geographies/reference-files/time-series/geo/gazetteer-files.html",
      },
      rights: {
        status: "public-domain-us-government",
        declaredLicense: null,
        attributionRequired: false,
      },
      storage: "committed",
      localPath: "data/source/counties/raw/2025_Gaz_counties_national.zip",
    },
  ],
};
