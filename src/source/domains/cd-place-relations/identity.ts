/**
 * Official identifiers used as oracles against the congressional relationship
 * compiler: Census place GEOIDs and the district GEOIDs the file publishes for
 * them, read from the publisher file, not from compiler output.
 */

import type { CongressionalPlaceMembershipKind } from "./types";

export const PLACE_GEOID_PATTERN = /^\d{7}$/;
/** State FIPS plus a two-character district: 01–53, 00 at large, 98 delegate, ZZ residual. */
export const CONGRESSIONAL_GEOID_PATTERN = /^\d{2}(\d{2}|ZZ)$/;

export function isPlaceGeoid(value: string): boolean {
  return PLACE_GEOID_PATTERN.test(value);
}

export function isCongressionalGeoid(value: string): boolean {
  return CONGRESSIONAL_GEOID_PATTERN.test(value);
}

export function isUnassignedResidualGeoid(geoid: string): boolean {
  return geoid.slice(2) === "ZZ";
}

export interface CongressionalPlaceVector {
  readonly placeGeoid: string;
  readonly membership: CongressionalPlaceMembershipKind;
  readonly districtGeoid: string | null;
  readonly intersectingDistrictGeoids: readonly string[];
  readonly note: string;
}

export const ELKO_NV_PLACE_GEOID = "3222500";
export const LEWISTON_ME_PLACE_GEOID = "2338740";
export const PEORIA_IL_PLACE_GEOID = "1759000";
export const SAN_ANTONIO_TX_PLACE_GEOID = "4865000";

export const OFFICIAL_CONGRESSIONAL_PLACE_VECTORS: readonly CongressionalPlaceVector[] =
  [
    {
      placeGeoid: ELKO_NV_PLACE_GEOID,
      membership: "whole-place",
      districtGeoid: "3202",
      intersectingDistrictGeoids: ["3202"],
      note: "Elko city, Nevada is listed only with Nevada's 2nd district.",
    },
    {
      placeGeoid: LEWISTON_ME_PLACE_GEOID,
      membership: "whole-place",
      districtGeoid: "2302",
      intersectingDistrictGeoids: ["2302"],
      note: "Lewiston city, Maine is listed only with Maine's 2nd district.",
    },
    {
      placeGeoid: PEORIA_IL_PLACE_GEOID,
      membership: "split",
      districtGeoid: null,
      intersectingDistrictGeoids: ["1716", "1717"],
      note: "Peoria city, Illinois is split between the 16th and 17th districts.",
    },
    {
      placeGeoid: SAN_ANTONIO_TX_PLACE_GEOID,
      membership: "split",
      districtGeoid: null,
      intersectingDistrictGeoids: ["4820", "4821", "4823", "4828", "4835"],
      note: "San Antonio city, Texas is split across five districts, none of them the 1st.",
    },
  ];
