/**
 * The Census 119th Congressional District to 2020 Place relationship file.
 *
 * The publisher's intersection table, delivered into this repository as a
 * committed file (see the lock's `deliveryNote`). It is the 119th Congress /
 * 2020 place baseline, not permanent truth: a redistricting or a new place
 * vintage is a new artifact, not an edit to this one.
 */

import type { AcquisitionPlan } from "../../core/index";

export const CD_PLACE_ARTIFACT = "census-rel-2020-cd119-place20-national";
export const CD_PLACE_FILE = "tab20_cd11920_place20_natl.txt";

export const cdPlaceRelationsAcquisition: AcquisitionPlan = {
  domain: "cd-place-relations",
  requests: [
    {
      artifactId: CD_PLACE_ARTIFACT,
      provider: "U.S. Census Bureau, Geography Division",
      url: `https://www2.census.gov/geo/docs/maps-data/data/rel2020/cd-sld/${CD_PLACE_FILE}`,
      method: "bulk-download",
      mediaType: "text/plain; charset=utf-8",
      publisher: {
        statedVintage: "119th-CD / 2020-place",
        releaseDate: null,
        schemaVersion:
          "119th Congressional District to 2020 Place national relationship file layout",
        documentationUrl:
          "https://www.census.gov/geographies/reference-files/time-series/geo/relationship-files.2020.html",
      },
      rights: {
        status: "public-domain-us-government",
        declaredLicense: null,
        attributionRequired: false,
      },
      storage: "committed",
      localPath: `data/source/cd-place-relations/raw/${CD_PLACE_FILE}`,
    },
  ],
};
