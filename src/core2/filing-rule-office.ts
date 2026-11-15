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

/**
 * The county a rule-given office points to for a town (its five-digit code),
 * or null where the game has none: a state legislative district (the game
 * holds congressional lines only), a town on two congressional districts, or a
 * town with no county on the map.
 */
export function ruleOfficeCounty(
  note: string,
  family: string,
  townPlaceKey: string,
): string | null {
  if (/most populous county in the district/i.test(note)) {
    if (family !== "usHouse") return null;
    const fips = townPlaceKey.slice(0, 2);
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
): string | null {
  const county = ruleOfficeCounty(note, family, townPlaceKey);
  const name = county ? placeRow(`county:${county}`)?.name : null;
  if (!name) return null;
  return /most populous/i.test(note)
    ? `${name} board of elections`
    : `${name} general registrar`;
}
