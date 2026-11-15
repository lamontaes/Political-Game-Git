/**
 * A filing office the research gives as a rule, not a name: "Board of
 * elections of the most populous county in the district" (Ohio's U.S. House
 * races) and "General registrar of the city or county where the town lies"
 * (Virginia's town races). The rule is resolved to the body it points to only
 * where the game can know it: from the place map, the 2026 congressional
 * district lines and the county populations. Where it cannot (the game holds
 * no state-district-to-county relationship, and a county split between
 * districts has no recorded population inside one), the body is the office
 * named without a county, never a guessed one (Account lead, Nov 15).
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
 * or null where the game cannot know it: a state legislative district (the
 * game holds no district-to-county relationship), a town on two congressional
 * districts, a congressional district whose largest county is split with
 * another district (its population inside this one is not recorded, and could
 * be the largest), or a town with no county on the map.
 */
export function ruleOfficeCounty(
  note: string,
  family: string,
  townPlaceKey: string,
): string | null {
  if (/most populous county in the district/i.test(note)) {
    const fips = townPlaceKey.slice(0, 2);
    if (family !== "usHouse") return null;
    const lines = LINES[fips];
    const home = lines?.places[townPlaceKey.slice(2)];
    if (!lines || typeof home !== "string") return null;
    const population = (code: string) =>
      COUNTY_POPULATION[`${fips}${code}`] ?? 0;
    const whole = Object.entries(lines.counties)
      .filter(([, value]) => value === home)
      .map(([code]) => code)
      .sort((a, b) => population(b) - population(a) || a.localeCompare(b));
    const largestSplit = Math.max(
      0,
      ...Object.entries(lines.counties)
        .filter(
          ([, value]) => typeof value !== "string" && inDistrict(value, home),
        )
        .map(([code]) => population(code)),
    );
    // A split county's share inside the district is not recorded; it could be
    // as large as the county, so a whole county is named only if it is larger.
    return whole[0] !== undefined && population(whole[0]) > largestSplit
      ? `${fips}${whole[0]}`
      : null;
  }
  if (/where the town lies/i.test(note)) {
    const id = placeCounty(townPlaceKey)?.id;
    return id ? id.slice("county:".length) : null;
  }
  return null;
}

/**
 * The body a rule-given office points to for a town, said as a person says it.
 * Where the county cannot be known it is the office named without a county
 * ("board of elections", "general registrar"), read from the data's own words.
 */
export function ruleOfficeBody(
  note: string,
  family: string,
  townPlaceKey: string,
): string {
  const county = ruleOfficeCounty(note, family, townPlaceKey);
  const name = county ? placeRow(`county:${county}`)?.name : null;
  if (name)
    return /most populous/i.test(note)
      ? `${name} board of elections`
      : `${name} general registrar`;
  const plain = /^(.+?) of (?:the )?(?:most populous|largest|city or county)/i
    .exec(note)?.[1]
    ?.trim();
  return plain ? plain.charAt(0).toLowerCase() + plain.slice(1) : note;
}
