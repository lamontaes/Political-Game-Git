/**
 * Browser-safe whole-place district membership.
 *
 * Compiled from the locked 2024 SLDL/SLDU–2020 place relationship files and,
 * for the U.S. House, the locked 119th CD–2020 place relationship file.
 * Split places are named so they are not mistaken for missing data; a split
 * congressional place names the districts it intersects, and only those. This
 * is not a boundary file and not a Gazetteer interior-point assignment.
 */

import generated from "./place-membership.generated.json" with { type: "json" };
import type { DistrictChamber } from "./types";
import { DISTRICT_IDENTITY_VINTAGE } from "./types";

export const SLD_PLACE_RELATION_VINTAGE =
  "census-rel-2024-sld-place20" as const;
/** 119th Congress districts against 2020 places: a baseline, not permanent truth. */
export const CD_PLACE_RELATION_VINTAGE =
  "census-rel-2020-cd119-place20" as const;

interface GeneratedMembership {
  readonly relationVintage: string;
  readonly identityVintage: string;
  readonly asOf: string;
  readonly compilerVersion: string;
  readonly wholePlaceCount: number;
  readonly splitPlaceCount: number;
  readonly wholePlaceByKey: Readonly<Record<string, string>>;
  readonly splitPlaceChambers: Readonly<Record<string, readonly string[]>>;
  readonly splitDistrictsByKey: Readonly<Record<string, readonly string[]>>;
  readonly congressional: {
    readonly relationVintage: string;
    readonly asOf: string;
    readonly compilerVersion: string;
    readonly wholePlaceCount: number;
    readonly splitPlaceCount: number;
    readonly wholePlace: Readonly<Record<string, string>>;
    readonly splitPlaceCandidates: Readonly<Record<string, readonly string[]>>;
  };
}

const catalog = generated as GeneratedMembership;

if (catalog.relationVintage !== SLD_PLACE_RELATION_VINTAGE) {
  throw new Error(
    "Place-district membership catalog vintage does not match the accepted relationship vintage.",
  );
}
if (catalog.identityVintage !== DISTRICT_IDENTITY_VINTAGE) {
  throw new Error(
    "Place-district membership catalog identity vintage does not match the Gazetteer vintage.",
  );
}
if (catalog.congressional.relationVintage !== CD_PLACE_RELATION_VINTAGE) {
  throw new Error(
    "Congressional place membership vintage does not match the accepted 119th CD–place relationship vintage.",
  );
}
if (
  Object.keys(catalog.wholePlaceByKey).length !== catalog.wholePlaceCount ||
  Object.keys(catalog.splitPlaceChambers).length !== catalog.splitPlaceCount ||
  Object.keys(catalog.congressional.wholePlace).length !==
    catalog.congressional.wholePlaceCount ||
  Object.keys(catalog.congressional.splitPlaceCandidates).length !==
    catalog.congressional.splitPlaceCount
) {
  throw new Error(
    "Place-district membership catalog counts do not match their maps.",
  );
}

export function placeDistrictMembershipCatalog(): GeneratedMembership {
  return catalog;
}

export type PlaceDistrictJoin =
  | { readonly kind: "whole-place"; readonly districtGeoid: string }
  | {
      readonly kind: "split";
      /**
       * The districts the relationship file says the place intersects, sorted;
       * never the whole state's districts. Empty when a state chamber's
       * catalog carries no list for the place.
       */
      readonly candidateDistrictGeoids?: readonly string[];
    }
  | { readonly kind: "unknown" };

/** The relationship vintage a chamber's place join reads. */
export function placeRelationVintageFor(chamber: DistrictChamber): string {
  return chamber === "congressional"
    ? CD_PLACE_RELATION_VINTAGE
    : SLD_PLACE_RELATION_VINTAGE;
}

export function placeDistrictJoin(
  placeGeoid: string,
  chamber: DistrictChamber,
): PlaceDistrictJoin {
  if (chamber === "congressional") {
    const districtGeoid = catalog.congressional.wholePlace[placeGeoid];
    if (districtGeoid) return { kind: "whole-place", districtGeoid };
    const candidates = catalog.congressional.splitPlaceCandidates[placeGeoid];
    if (candidates)
      return { kind: "split", candidateDistrictGeoids: [...candidates] };
    return { kind: "unknown" };
  }
  const key = `${placeGeoid}:${chamber}`;
  const districtGeoid = catalog.wholePlaceByKey[key];
  if (districtGeoid) return { kind: "whole-place", districtGeoid };
  const splitChambers = catalog.splitPlaceChambers[placeGeoid];
  if (splitChambers?.includes(chamber)) {
    return {
      kind: "split",
      candidateDistrictGeoids: [...(catalog.splitDistrictsByKey[key] ?? [])],
    };
  }
  return { kind: "unknown" };
}
