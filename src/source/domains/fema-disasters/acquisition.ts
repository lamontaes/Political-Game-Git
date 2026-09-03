/**
 * What the FEMA domain retrieves, and why exactly this.
 *
 * 30C found that a third of #66's pinned records were fabricated: disaster
 * numbers belonging to other states were relabelled, a federal "Border
 * Emergency" that has never existed was invented, programme flags were flipped
 * and incident types were rewritten. The corpus cannot simply be corrected by
 * hand, because hand-authoring is what produced it.
 *
 * So the slice is defined by a rule rather than by an editor: **every
 * declaration record whose disaster number was named either by PR #66 or by the
 * audit that rejected it**. That set is enumerable, the query string *is* the
 * predicate, and the result contains the disproof of each fabrication — the
 * corpus itself shows that 3591 is California, 4765 is Rhode Island, 5480 is
 * Montana and 4830 is Georgia.
 *
 * A second, tiny artifact records the size of the universe the slice is drawn
 * from, so the corpus can state what fraction of the declarations it holds
 * without anybody having to take its word for it.
 */

import type { AcquisitionPlan } from "../../core/index";

/**
 * The disaster numbers in the slice.
 *
 *  - 1603, 4085, 4332, 4586, 4673, 4724, 5488: historical landmarks #66
 *    carried, whose real records this corpus now holds.
 *  - 3591, 4765, 4830, 5480: numbers #66 attached to fabricated declarations.
 *    Their authentic records are the standing disproof.
 *  - 4781, 4827: the authentic Texas and North Carolina declarations #66's
 *    fabrications displaced.
 */
export const AUDIT_SLICE_DISASTER_NUMBERS: readonly number[] = [
  1603, 3591, 4085, 4332, 4586, 4673, 4724, 4765, 4781, 4827, 4830, 5480, 5488,
];

export const OPENFEMA_ENTITY = "DisasterDeclarationsSummaries";
export const OPENFEMA_VERSION = "v2";
const OPENFEMA_BASE = `https://www.fema.gov/api/open/${OPENFEMA_VERSION}/${OPENFEMA_ENTITY}`;

export const DECLARATIONS_ARTIFACT = "openfema-disaster-declarations-audit-slice";
export const UNIVERSE_ARTIFACT = "openfema-disaster-declarations-universe-count";

/** The OData filter that is this slice's selection predicate. */
export const AUDIT_SLICE_FILTER = `disasterNumber in (${AUDIT_SLICE_DISASTER_NUMBERS.join(",")})`;

export const DECLARATIONS_QUERY_URL =
  `${OPENFEMA_BASE}?$filter=${encodeURIComponent(AUDIT_SLICE_FILTER)}` +
  `&$orderby=id&$top=10000&$format=json`;

export const UNIVERSE_QUERY_URL =
  `${OPENFEMA_BASE}?$inlinecount=allpages&$top=1&$select=disasterNumber&$format=json`;

export const femaDisastersAcquisition: AcquisitionPlan = {
  domain: "fema-disasters",
  requests: [
    {
      artifactId: DECLARATIONS_ARTIFACT,
      provider: "Federal Emergency Management Agency (OpenFEMA)",
      url: DECLARATIONS_QUERY_URL,
      method: "api-query",
      requestIdentity: {
        apiVersion: OPENFEMA_VERSION,
        parameters: {
          entity: OPENFEMA_ENTITY,
          $filter: AUDIT_SLICE_FILTER,
          $orderby: "id",
          $top: "10000",
          $format: "json",
        },
      },
      mediaType: "application/json",
      publisher: {
        statedVintage: null,
        releaseDate: null,
        schemaVersion: "OpenFEMA DisasterDeclarationsSummaries v2",
        documentationUrl:
          "https://www.fema.gov/openfema-data-page/disaster-declarations-summaries-v2",
      },
      rights: {
        status: "public-domain-us-government",
        declaredLicense: "U.S. Government Work (17 U.S.C. § 105)",
        attributionRequired: false,
      },
      storage: "committed",
      localPath: "data/source/fema-disasters/raw/declarations-audit-slice.json",
    },
    {
      artifactId: UNIVERSE_ARTIFACT,
      provider: "Federal Emergency Management Agency (OpenFEMA)",
      url: UNIVERSE_QUERY_URL,
      method: "api-query",
      requestIdentity: {
        apiVersion: OPENFEMA_VERSION,
        parameters: {
          entity: OPENFEMA_ENTITY,
          $inlinecount: "allpages",
          $top: "1",
          $select: "disasterNumber",
          $format: "json",
        },
      },
      mediaType: "application/json",
      publisher: {
        statedVintage: null,
        releaseDate: null,
        schemaVersion: "OpenFEMA DisasterDeclarationsSummaries v2",
        documentationUrl:
          "https://www.fema.gov/openfema-data-page/disaster-declarations-summaries-v2",
      },
      rights: {
        status: "public-domain-us-government",
        declaredLicense: "U.S. Government Work (17 U.S.C. § 105)",
        attributionRequired: false,
      },
      storage: "committed",
      localPath: "data/source/fema-disasters/raw/universe-count.json",
    },
  ],
};
