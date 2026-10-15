/**
 * Browser-safe whole-place district membership.
 *
 * Compiled from the locked 2024 SLDL/SLDU–2020 place relationship files and,
 * for the U.S. House, the locked 119th CD–2020 place relationship file.
 * U.S. House lines that changed for the 2026 elections sit in dated sets on
 * top of that baseline; see `congressionalLinesSetFor`.
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

/**
 * U.S. House lines that replace the baseline for some states from a date. The
 * set carries only the states it covers; every other state keeps the baseline.
 */
interface DatedCongressionalSet {
  readonly vintage: string;
  /** First game date (YYYY-MM-DD) the set is in force. */
  readonly effectiveFrom: string;
  readonly asOf: string;
  readonly stateFips: readonly string[];
  readonly wholePlace: Readonly<Record<string, string>>;
  readonly splitPlaceCandidates: Readonly<Record<string, readonly string[]>>;
}

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
    readonly dated: readonly DatedCongressionalSet[];
  };
}

// The generated file's dated sets each cover different states, so JSON typing
// alone does not overlap the interface; the checks below guard the shape.
const catalog = generated as unknown as GeneratedMembership;

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

for (const set of catalog.congressional.dated) {
  const states = new Set(set.stateFips);
  const outside = [
    ...Object.keys(set.wholePlace),
    ...Object.keys(set.splitPlaceCandidates),
  ].some((placeGeoid) => !states.has(placeGeoid.slice(0, 2)));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(set.effectiveFrom) || outside) {
    throw new Error(
      `Dated congressional place set ${set.vintage} has a malformed start date or a place outside its states.`,
    );
  }
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

/**
 * The relationship vintage a chamber's place join reads. For the U.S. House,
 * give the place and the game date so a state on dated lines names them.
 */
export function placeRelationVintageFor(
  chamber: DistrictChamber,
  placeGeoid?: string | null,
  asOf?: string | null,
): string {
  if (chamber !== "congressional") return SLD_PLACE_RELATION_VINTAGE;
  return placeGeoid
    ? congressionalRelationVintageFor(placeGeoid.slice(0, 2), asOf)
    : CD_PLACE_RELATION_VINTAGE;
}

/**
 * The latest set that covers a state and has started by a game date, or null.
 * Without a date, or before every set starts, the baseline lines apply.
 */
export function selectDatedSet<
  T extends {
    readonly effectiveFrom: string;
    readonly stateFips: readonly string[];
  },
>(sets: readonly T[], stateFips: string, asOf?: string | null): T | null {
  if (!asOf) return null;
  let found: T | null = null;
  for (const set of sets) {
    if (
      set.effectiveFrom <= asOf &&
      set.stateFips.includes(stateFips) &&
      (found === null || set.effectiveFrom >= found.effectiveFrom)
    )
      found = set;
  }
  return found;
}

/** The dated U.S. House set in force for a state on a game date, if any. */
export function congressionalLinesSetFor(
  stateFips: string,
  asOf?: string | null,
): DatedCongressionalSet | null {
  return selectDatedSet(catalog.congressional.dated, stateFips, asOf);
}

/** The relationship vintage the congressional join reads for a state on a date. */
export function congressionalRelationVintageFor(
  stateFips: string,
  asOf?: string | null,
): string {
  return (
    congressionalLinesSetFor(stateFips, asOf)?.vintage ??
    CD_PLACE_RELATION_VINTAGE
  );
}

/**
 * `asOf` is the game date (YYYY-MM-DD). Give it wherever the game has a date:
 * a state whose U.S. House lines changed answers from the lines in force then.
 */
export function placeDistrictJoin(
  placeGeoid: string,
  chamber: DistrictChamber,
  asOf?: string | null,
): PlaceDistrictJoin {
  if (chamber === "congressional") {
    const set = congressionalLinesSetFor(placeGeoid.slice(0, 2), asOf);
    const whole = (set ?? catalog.congressional).wholePlace;
    const split = (set ?? catalog.congressional).splitPlaceCandidates;
    const districtGeoid = whole[placeGeoid];
    if (districtGeoid) return { kind: "whole-place", districtGeoid };
    const candidates = split[placeGeoid];
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
