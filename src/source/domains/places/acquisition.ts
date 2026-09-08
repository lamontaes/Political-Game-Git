/**
 * What the places domain retrieves.
 *
 * One artifact, the official 2025 Gazetteer national places zip, with its text
 * member hashed separately. #61's audited lineage is preserved here — the same
 * URL, the same product, the same 32,350-record universe — re-homed onto the
 * core contracts rather than merged with its branch's root-config cargo.
 */

import type { AcquisitionPlan } from "../../core/index";

export const PLACES_ZIP_URL =
  "https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2025_Gazetteer/2025_Gaz_place_national.zip";

export const PLACES_ZIP_ARTIFACT = "census-gazetteer-2025-places-zip";
export const PLACES_TXT_MEMBER = "2025_Gaz_place_national.txt";

export const placesAcquisition: AcquisitionPlan = {
  domain: "places",
  requests: [
    {
      artifactId: PLACES_ZIP_ARTIFACT,
      provider: "U.S. Census Bureau, Geography Division",
      url: PLACES_ZIP_URL,
      method: "bulk-download",
      mediaType: "application/zip",
      containerMemberPath: PLACES_TXT_MEMBER,
      publisher: {
        statedVintage: "2025",
        releaseDate: null,
        schemaVersion: "2025 Gazetteer places national file layout",
        documentationUrl:
          "https://www.census.gov/geographies/reference-files/time-series/geo/gazetteer-files.html",
      },
      rights: {
        status: "public-domain-us-government",
        declaredLicense: null,
        attributionRequired: false,
      },
      storage: "committed",
      localPath: "data/source/places/raw/2025_Gaz_place_national.zip",
    },
  ],
};
