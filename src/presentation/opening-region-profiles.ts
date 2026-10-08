import { researchRuleTable } from "../simulation/research-rule-tables";
import {
  PLACE_COUNTY_RELATIONS_META,
  PLACE_COUNTY_RELATIONS_ROWS,
} from "../simulation/place-county-relations.generated";
import type { OpeningRegionType } from "./opening-regional-plate";

/** Authored surrounding-region illustration, not a uniform biome or home claim.
 * Primary evidence and precise limits: docs/reference/regional-opening/PROFILES.md. */
interface RegionalProfile {
  readonly id: string;
  readonly stateKey: string;
  readonly counties: readonly string[];
  readonly regionType: OpeningRegionType;
  /** Heterogeneous counties require independently reviewed places for this scene. */
  readonly places?: readonly string[];
}
const profiles: readonly RegionalProfile[] = researchRuleTable(
  "openingRegionProfiles",
) as readonly RegionalProfile[];

export const OPENING_REGION_GEOGRAPHY_AS_OF =
  PLACE_COUNTY_RELATIONS_META.geographyAsOf;
let countyParts: ReadonlyMap<string, readonly string[]> | undefined;
function loadCountyParts() {
  if (countyParts) return countyParts;
  const result = new Map<string, string[]>();
  for (const [place, county] of JSON.parse(PLACE_COUNTY_RELATIONS_ROWS) as [
    string,
    string,
    number,
  ][]) {
    const counties = result.get(place) ?? [];
    if (!counties.includes(county)) counties.push(county);
    result.set(place, counties);
  }
  countyParts = result;
  return countyParts;
}

/** All recorded parts must be compatible. No majority, centroid or government fallback. */
export function openingRegionTypesForCountyParts(
  placeGeoid: string,
  stateKey: string,
  counties: readonly string[],
): readonly OpeningRegionType[] {
  if (counties.length === 0) return [];
  return [
    ...new Set(
      profiles
        .filter(
          (profile) =>
            profile.stateKey === stateKey &&
            (!profile.places || profile.places.includes(placeGeoid)) &&
            counties.every((county) => profile.counties.includes(county)),
        )
        .map((profile) => profile.regionType),
    ),
  ];
}

export function openingRegionTypesForCountyProfile(
  placeGeoid: string,
  stateKey: string,
): readonly OpeningRegionType[] {
  return openingRegionTypesForCountyParts(
    placeGeoid,
    stateKey,
    loadCountyParts().get(placeGeoid) ?? [],
  );
}
