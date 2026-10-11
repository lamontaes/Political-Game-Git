import type { TOWN_JOB_SOC as nativeSoc } from "../../simulation/living-world/town-job-soc";
/** Retained complete BLS area/occupation/source-floor selection and wage interpolation. */
import type { EntityId } from "../../simulation/types";
import type { lifePlaceByJurisdictionId as nativePlace } from "../../simulation/life-places";
import type * as source from "../../simulation/living-world/town-pay.generated";
export interface WageSourceFacts {
  readonly places: ReadonlyMap<EntityId, ReturnType<typeof nativePlace>>;
  readonly counties: ReadonlyMap<string, readonly string[]>;
  readonly countyAreas: typeof source.TOWN_PAY_COUNTY_AREAS;
  readonly occupations: typeof nativeSoc;
  readonly percentiles: typeof source.TOWN_PAY_PERCENTILES;
  readonly minimumWages: typeof source.TOWN_MINIMUM_WAGES;
  readonly federalMinimum: typeof source.FEDERAL_MINIMUM_HOURLY;
}
const readers = new WeakMap<WageSourceFacts, ReturnType<typeof compile>>();
function reader(facts: WageSourceFacts) {
  let read = readers.get(facts);
  if (!read) {
    read = compile(facts);
    readers.set(facts, read);
  }
  return read;
}
export function townJobRate(
  facts: WageSourceFacts,
  occupation: string | null,
  id: EntityId | null,
  percentile: number,
  minimum?: number | null,
) {
  return reader(facts).rate(occupation, id, percentile, minimum);
}
export function townMinimumHourly(facts: WageSourceFacts, id: EntityId | null) {
  return reader(facts).minimum(id);
}
export function stateMedianAnnualWage(
  facts: WageSourceFacts,
  occupation: string,
  id: EntityId | null,
) {
  return reader(facts).state(occupation, id);
}
export function nationalMedianAnnualWage(
  facts: WageSourceFacts,
  occupation: string,
) {
  return reader(facts).national(occupation);
}
function compile(facts: WageSourceFacts) {
  const TOWN_PAY_COUNTY_AREAS = facts.countyAreas,
    TOWN_JOB_SOC = facts.occupations,
    TOWN_PAY_PERCENTILES = facts.percentiles,
    TOWN_MINIMUM_WAGES = facts.minimumWages,
    FEDERAL_MINIMUM_HOURLY = facts.federalMinimum;
  // stopgapId: "economy.local-minimum-wages"
  function startingMinimumHourly(
    jurisdictionId: EntityId | null,
  ): number | null {
    const place = jurisdictionId ? facts.places.get(jurisdictionId) : null;
    return startingStateMinimumHourly(place?.stateJurisdictionKey ?? null);
  }
  function startingStateMinimumHourly(stateKey: string | null): number | null {
    if (!stateKey || !(stateKey in TOWN_MINIMUM_WAGES))
      return FEDERAL_MINIMUM_HOURLY;
    const state = TOWN_MINIMUM_WAGES[stateKey];
    if (state === null || state === undefined) return null;
    return Math.max(FEDERAL_MINIMUM_HOURLY, state);
  }
  const HOURS_PER_YEAR = 2080;
  const PERCENTILE_POINTS = [10, 25, 50, 75, 90] as const;
  type Cells = readonly (number | null)[];
  let wagesBySoc: ReadonlyMap<string, ReadonlyMap<string, Cells>> | null = null;
  function wageTable(): ReadonlyMap<string, ReadonlyMap<string, Cells>> {
    if (wagesBySoc) return wagesBySoc;
    const parsed = new Map<string, Map<string, Cells>>();
    for (const entry of TOWN_PAY_PERCENTILES.split(";")) {
      const [soc, areas] = entry.split("=") as [string, string];
      const byArea = new Map<string, Cells>();
      for (const cell of areas.split(",")) {
        const [area, values] = cell.split(":") as [string, string];
        byArea.set(
          area,
          values
            .split("/")
            .map((value) => (value === "" ? null : Number(value))),
        );
      }
      parsed.set(soc, byArea);
    }
    return (wagesBySoc = parsed);
  }
  let areaByCounty: ReadonlyMap<string, string> | null = null;
  function countyArea(countyFips: string): string | undefined {
    if (!areaByCounty)
      areaByCounty = new Map(
        TOWN_PAY_COUNTY_AREAS.split(";").map(
          (pair) => pair.split(":") as [string, string],
        ),
      );
    return areaByCounty.get(countyFips);
  }
  const TERRITORY_FIPS: Readonly<Record<string, string>> = {
    "US-AS": "60",
    "US-GU": "66",
    "US-MP": "69",
    "US-PR": "72",
    "US-VI": "78",
  };
  const NOT_IN_OEWS = new Set(["60", "69"]);
  function townPayAreas(jurisdictionId: EntityId | null): string[] {
    const place = jurisdictionId ? facts.places.get(jurisdictionId) : null;
    if (!place) return [];
    const geoid =
      place.sourceGeoid && /^\d{7}$/.test(place.sourceGeoid)
        ? place.sourceGeoid
        : null;
    const countyGeoid =
      place.scope === "county" &&
      place.sourceGeoid &&
      /^\d{5}$/.test(place.sourceGeoid)
        ? place.sourceGeoid
        : null;
    const stateFips =
      (geoid ?? countyGeoid)?.slice(0, 2) ??
      TERRITORY_FIPS[place.stateJurisdictionKey ?? ""] ??
      null;
    if (!stateFips || NOT_IN_OEWS.has(stateFips)) return [];
    const areas: string[] = [];
    const county =
      countyGeoid ?? (geoid ? (facts.counties.get(geoid) ?? [])[0] : undefined);
    const area = county ? countyArea(county) : undefined;
    if (area) areas.push(area);
    areas.push(`S${stateFips}`, "US");
    return areas;
  }
  function interpolate(cells: Cells, percentile: number): number | null {
    for (let i = 0; i + 1 < PERCENTILE_POINTS.length; i += 1) {
      const low = PERCENTILE_POINTS[i]!;
      const high = PERCENTILE_POINTS[i + 1]!;
      if (percentile < low || percentile > high) continue;
      const a = cells[i];
      const b = cells[i + 1];
      if (a === null || a === undefined || b === null || b === undefined)
        return null;
      return a + ((b - a) * (percentile - low)) / (high - low);
    }
    return null;
  }
  function townMinimumHourly(jurisdictionId: EntityId | null): number | null {
    return startingMinimumHourly(jurisdictionId);
  }
  function stateMedianAnnualWage(
    occupation: string,
    jurisdictionId: EntityId | null,
  ): number | null {
    const soc = TOWN_JOB_SOC[occupation];
    const byArea = soc ? wageTable().get(soc) : undefined;
    if (!byArea) return null;
    for (const area of townPayAreas(jurisdictionId)) {
      if (area !== "US" && !area.startsWith("S")) continue;
      const median = byArea.get(area)?.[PERCENTILE_POINTS.indexOf(50)];
      if (median !== null && median !== undefined) return median;
    }
    return null;
  }
  function nationalMedianAnnualWage(occupation: string): number | null {
    const soc = TOWN_JOB_SOC[occupation];
    const median = soc
      ? wageTable().get(soc)?.get("US")?.[PERCENTILE_POINTS.indexOf(50)]
      : undefined;
    return median ?? null;
  }
  interface TownJobRate {
    readonly soc: string;
    readonly area: string;
    readonly percentile: number;
    readonly hourlyMinor: number;
    readonly floored: boolean;
  }
  function townJobRate(
    occupation: string | null,
    jurisdictionId: EntityId | null,
    percentile: number,
    minimum: number | null = townMinimumHourly(jurisdictionId),
  ): TownJobRate | null {
    const soc = occupation ? TOWN_JOB_SOC[occupation] : undefined;
    const byArea = soc ? wageTable().get(soc) : undefined;
    if (!soc || !byArea) return null;
    if (minimum === null) return null;
    for (const area of townPayAreas(jurisdictionId)) {
      const cells = byArea.get(area);
      const annual = cells ? interpolate(cells, percentile) : null;
      if (annual === null) continue;
      const hourly = annual / HOURS_PER_YEAR;
      return {
        soc,
        area,
        percentile,
        hourlyMinor: Math.round(Math.max(hourly, minimum) * 100),
        floored: hourly < minimum,
      };
    }
    return null;
  }
  return {
    rate: townJobRate,
    minimum: townMinimumHourly,
    state: stateMedianAnnualWage,
    national: nationalMedianAnnualWage,
  };
}
