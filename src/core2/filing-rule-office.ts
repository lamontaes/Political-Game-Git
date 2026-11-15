/**
 * A filing office the research gives as a rule, not a name: "Board of
 * elections of the most populous county in the district" (Ohio's U.S. House
 * races) and "General registrar of the city or county where the town lies"
 * (Virginia's town races). The rule is resolved to the body it points to, from
 * the place map, the 2026 congressional district lines and the county
 * populations, before anyone is cast at the office or any line names it
 * (Words lead, second reader, Nov 15: South Vienna, Ohio).
 */
import budgetBases from "../../data/research/money/public-budget-bases.json" with { type: "json" };
import districtLines from "../../data/research/district-lines-2026/lines-2026.json" with { type: "json" };
import acsPlaces from "../../data/research/money/place-population-acs-2024.json" with { type: "json" };
import { placeDistrictMembershipCatalog } from "../districts/place-membership";
import { placeDistrictPopulations } from "../districts/place-population-share";
import { placeCounty, placeRow } from "./place-map";

const COUNTY_POPULATION = (
  budgetBases as unknown as { countyPopulation2024: Record<string, number> }
).countyPopulation2024;

interface StateLines {
  readonly counties: Record<string, string | readonly string[]>;
  readonly places: Record<string, string | readonly string[]>;
}
const LINES = (
  districtLines as unknown as { states: Record<string, StateLines> }
).states;

/** Whether an office is given as a rule (the most populous county, the county where the town lies), not as a name. */
export function describesByRule(office: string): boolean {
  return /\b(?:most populous|largest|county seat|in the district|where the town lies)\b/i.test(
    office,
  );
}

const inDistrict = (
  value: string | readonly string[] | undefined,
  district: string,
): boolean =>
  value === undefined
    ? false
    : typeof value === "string"
      ? value === district
      : value.includes(district);

const PLACE_COUNTIES = (
  acsPlaces as unknown as {
    placeCounties: Record<string, readonly (readonly [string, number])[]>;
  }
).placeCounties;

/** A state legislative district named as the records name it: the chamber and its three-digit code. */
export interface StateDistrict {
  readonly chamber: "lower" | "upper";
  readonly code: string;
}

/**
 * The most populous county of a state legislative district, ESTIMATED from the
 * Census place-to-district relationship (the places wholly in the district, and
 * a split place's recorded population in it) and each place's population by
 * county (ACS 2024); the unincorporated remainder is not counted, which is the
 * estimate's spread. Null where no place of the state falls in the district.
 */
const districtCounty = (() => {
  const cache = new Map<string, string | null>();
  return (fips: string, district: StateDistrict): string | null => {
    const chamber = `state-${district.chamber}` as const;
    const geoid = `${fips}${district.code}`;
    const key = `${geoid}:${chamber}`;
    if (cache.has(key)) return cache.get(key)!;
    const catalog = placeDistrictMembershipCatalog();
    const totals = new Map<string, number>();
    const add = (place: string, share: number) => {
      for (const [county, population] of PLACE_COUNTIES[place] ?? [])
        totals.set(county, (totals.get(county) ?? 0) + population * share);
    };
    const suffix = `:${chamber}`;
    for (const [place, home] of Object.entries(catalog.wholePlaceByKey))
      if (home === geoid && place.endsWith(suffix) && place.startsWith(fips))
        add(place.slice(0, -suffix.length), 1);
    for (const place of Object.keys(catalog.splitDistrictsByKey)) {
      if (!place.endsWith(suffix) || !place.startsWith(fips)) continue;
      const geoidOfPlace = place.slice(0, -suffix.length);
      const parts = placeDistrictPopulations(geoidOfPlace, chamber);
      const total = Object.values(parts).reduce((a, b) => a + b, 0);
      if (total > 0 && parts[geoid]) add(geoidOfPlace, parts[geoid] / total);
    }
    const best =
      [...totals.entries()].sort(
        (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
      )[0]?.[0] ?? null;
    cache.set(key, best);
    return best;
  };
})();

/**
 * The county a rule-given office points to for a town (its five-digit code),
 * or null where the game has none: a town on two congressional districts, a
 * state district with no place in the Census relationship, or a town with no
 * county on the map. The state legislative district's county is an estimate
 * (`districtCounty`).
 */
export function ruleOfficeCounty(
  note: string,
  family: string,
  townPlaceKey: string,
  district?: StateDistrict,
): string | null {
  if (/most populous county in the district/i.test(note)) {
    const fips = townPlaceKey.slice(0, 2);
    if (family === "stateLegislative")
      return district ? districtCounty(fips, district) : null;
    if (family !== "usHouse") return null;
    const lines = LINES[fips];
    const home = lines?.places[townPlaceKey.slice(2)];
    if (!lines || typeof home !== "string") return null;
    return (
      Object.entries(lines.counties)
        .filter(([, value]) => inDistrict(value, home))
        .map(([code]) => `${fips}${code}`)
        .sort(
          (a, b) =>
            (COUNTY_POPULATION[b] ?? 0) - (COUNTY_POPULATION[a] ?? 0) ||
            a.localeCompare(b),
        )[0] ?? null
    );
  }
  if (/where the town lies/i.test(note)) {
    const id = placeCounty(townPlaceKey)?.id;
    return id ? id.slice("county:".length) : null;
  }
  return null;
}

/** The body a rule-given office points to for a town, said as a person says it, or null where the game has no such body. */
export function ruleOfficeBody(
  note: string,
  family: string,
  townPlaceKey: string,
  district?: StateDistrict,
): string | null {
  const county = ruleOfficeCounty(note, family, townPlaceKey, district);
  const name = county ? placeRow(`county:${county}`)?.name : null;
  if (!name) return null;
  return /most populous/i.test(note)
    ? `${name} board of elections`
    : `${name} general registrar`;
}
