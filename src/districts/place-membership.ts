/**
 * Browser-safe whole-place district membership.
 *
 * Compiled from the locked 2024 SLDL/SLDU–2020 place relationship files.
 * Split places are named so they are not mistaken for missing data. This is
 * not a boundary file and not a Gazetteer interior-point assignment.
 */

import generated from "./place-membership.generated.json" with { type: "json" };
import type { DistrictChamber } from "./types";
import { DISTRICT_IDENTITY_VINTAGE } from "./types";

export const SLD_PLACE_RELATION_VINTAGE =
  "census-rel-2024-sld-place20" as const;

interface GeneratedMembership {
  readonly relationVintage: string;
  readonly identityVintage: string;
  readonly asOf: string;
  readonly compilerVersion: string;
  readonly wholePlaceCount: number;
  readonly splitPlaceCount: number;
  readonly wholePlaceByKey: Readonly<Record<string, string>>;
  readonly splitPlaceChambers: Readonly<Record<string, readonly string[]>>;
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
if (
  Object.keys(catalog.wholePlaceByKey).length !== catalog.wholePlaceCount ||
  Object.keys(catalog.splitPlaceChambers).length !== catalog.splitPlaceCount
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
  | { readonly kind: "split" }
  | { readonly kind: "unknown" };

export function placeDistrictJoin(
  placeGeoid: string,
  chamber: DistrictChamber,
): PlaceDistrictJoin {
  if (chamber === "congressional") return { kind: "unknown" };
  const key = `${placeGeoid}:${chamber}`;
  const districtGeoid = catalog.wholePlaceByKey[key];
  if (districtGeoid) return { kind: "whole-place", districtGeoid };
  const splitChambers = catalog.splitPlaceChambers[placeGeoid];
  if (splitChambers?.includes(chamber)) return { kind: "split" };
  return { kind: "unknown" };
}
