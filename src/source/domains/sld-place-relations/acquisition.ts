/**
 * 2024 State Legislative District to 2020 Place relationship files.
 *
 * These are the publisher's intersection tables. They are not Gazetteer
 * interior points and they are not a nearest-district assignment. A place that
 * the file splits across districts stays split.
 */

import type { AcquisitionPlan } from "../../core/index";

const REL_BASE =
  "https://www2.census.gov/geo/docs/maps-data/data/rel2020/cd-sld";

export const SLDL_PLACE_ARTIFACT = "census-rel-2024-sldl-place20-national";
export const SLDU_PLACE_ARTIFACT = "census-rel-2024-sldu-place20-national";
export const SLDL_PLACE_FILE = "tab20_sldl202420_place20_natl.txt";
export const SLDU_PLACE_FILE = "tab20_sldu202420_place20_natl.txt";

function relationRequest(
  artifactId: string,
  file: string,
  schema: string,
): AcquisitionPlan["requests"][number] {
  return {
    artifactId,
    provider: "U.S. Census Bureau, Geography Division",
    url: `${REL_BASE}/${file}`,
    method: "bulk-download",
    mediaType: "text/plain; charset=utf-8",
    publisher: {
      statedVintage: "2024-SLD / 2020-place",
      releaseDate: null,
      schemaVersion: schema,
      documentationUrl:
        "https://www.census.gov/geographies/reference-files/time-series/geo/relationship-files.2020.html",
    },
    rights: {
      status: "public-domain-us-government",
      declaredLicense: null,
      attributionRequired: false,
    },
    storage: "committed",
    localPath: `data/source/sld-place-relations/raw/${file}`,
  };
}

export const sldPlaceRelationsAcquisition: AcquisitionPlan = {
  domain: "sld-place-relations",
  requests: [
    relationRequest(
      SLDL_PLACE_ARTIFACT,
      SLDL_PLACE_FILE,
      "2024 SLDL to 2020 Place national relationship file layout",
    ),
    relationRequest(
      SLDU_PLACE_ARTIFACT,
      SLDU_PLACE_FILE,
      "2024 SLDU to 2020 Place national relationship file layout",
    ),
  ],
};
