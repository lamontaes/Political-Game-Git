/**
 * What a town job pays: the occupation's wage in its area from the BLS May
 * 2025 OEWS tables (the metro or nonmetro area the town's county is in, else
 * the state, else the nation), where a worker sits in that distribution by
 * tenure, the minimum-wage floor and the hours a role is paid for. The
 * opening's jobs read it to set their pay; the old world's paydays read it too
 * until they are ported.
 */
import { corePlaceByJurisdictionId } from "./place-lookup";
import { countyGeoidsForPlace } from "./reference/government-units";
import { TOWN_JOB_SOC } from "./reference/town-job-soc";
import {
  FEDERAL_MINIMUM_HOURLY,
  TOWN_MINIMUM_WAGES,
  TOWN_PAY_COUNTY_AREAS,
  TOWN_PAY_PERCENTILES,
} from "./reference/town-pay.generated";

import type { EntityId } from "./kernel/brands";
import { parameter as p } from "./parameters";
import { worldLevel, worldOffsetShare } from "./world-draw";

export const HOURS_PER_YEAR = 2_080;

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
        values.split("/").map((value) => (value === "" ? null : Number(value))),
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

/** The wage areas a job in this place is paid by, most local first. */
export function townPayAreas(jurisdictionId: EntityId | null): string[] {
  const place = jurisdictionId
    ? corePlaceByJurisdictionId(jurisdictionId)
    : null;
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
  // BLS publishes no wages for American Samoa or the Northern Mariana
  // Islands: pay there is UNKNOWN, not the nation's.
  if (!stateFips || NOT_IN_OEWS.has(stateFips)) return [];
  const areas: string[] = [];
  const county =
    countyGeoid ?? (geoid ? countyGeoidsForPlace(geoid)[0] : undefined);
  const area = county ? countyArea(county) : undefined;
  if (area) areas.push(area);
  areas.push(`S${stateFips}`, "US");
  return areas;
}

/**
 * GAME ASSUMPTION, labeled: where a worker sits in their occupation's wage
 * distribution. A new hire starts at the starting percentile and moves toward
 * the ending one over the tenure years at the employer. With a world's seed
 * (play), the two percentiles and the years are this world's own, drawn around
 * the assumed ones (owner, Oct 27: realistic, not real); without it, the
 * assumed rule (calibration). Recorded credentials select actual paid peers
 * for an observed hourly mean, never a fixed degree premium.
 */
export function townPayPercentile(tenureYears: number, seed?: string): number {
  const at = (key: string, row: string) =>
    seed === undefined
      ? p(row)
      : p(row) +
        worldOffsetShare(
          seed,
          `pay-tenure:${key}`,
          "jobsWorldTenurePercentileSpreadPoints",
        );
  const start = at("start", "townPayStartPercentile");
  const end = at("end", "townPayEndPercentile");
  const years =
    seed === undefined
      ? p("townPayTenureYears")
      : worldLevel(
          p("townPayTenureYears"),
          seed,
          "pay-tenure:years",
          "jobsWorldTenureYearsSpreadShare",
        );
  return start + (end - start) * Math.min(1, Math.max(0, tenureYears) / years);
}

/** A published wage in an area, as this world pays it when a seed is given. */
function worldWage(
  annual: number,
  seed: string | undefined,
  soc: string,
  area: string,
): number {
  return seed === undefined
    ? annual
    : worldLevel(annual, seed, `pay:${soc}:${area}`, "jobsWorldPaySpreadShare");
}

/** The annual wage at `percentile` in the cells, or null when BLS withheld it. */
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

/**
 * The median annual wage for `occupation` in the state or territory where
 * `jurisdictionId` is, from the same BLS tables; the nation's when the state's
 * is withheld; null where BLS publishes none.
 */
export function stateMedianAnnualWage(
  occupation: string,
  jurisdictionId: EntityId | null,
  seed?: string,
): number | null {
  const soc = TOWN_JOB_SOC[occupation];
  const byArea = soc ? wageTable().get(soc) : undefined;
  if (!byArea) return null;
  for (const area of townPayAreas(jurisdictionId)) {
    if (area !== "US" && !area.startsWith("S")) continue;
    const median = byArea.get(area)?.[PERCENTILE_POINTS.indexOf(50)];
    if (median !== null && median !== undefined)
      return worldWage(median, seed, soc!, area);
  }
  return null;
}

/**
 * The national median annual wage for `occupation` (BLS OEWS, May 2025), or
 * null where BLS publishes none: the average an estimate starts from where a
 * place has no published wage.
 */
export function nationalMedianAnnualWage(
  occupation: string,
  seed?: string,
): number | null {
  const soc = TOWN_JOB_SOC[occupation];
  const median = soc
    ? wageTable().get(soc)?.get("US")?.[PERCENTILE_POINTS.indexOf(50)]
    : undefined;
  return median === null || median === undefined
    ? null
    : worldWage(median, seed, soc!, "US");
}

export interface TownJobRate {
  readonly soc: string;
  readonly area: string;
  readonly percentile: number;
  /** Cents an hour, after the minimum-wage floor. */
  readonly hourlyMinor: number;
  readonly floored: boolean;
}

/**
 * What a job classified as `occupation` in `jurisdictionId` pays an hour for
 * a worker at `percentile`; null when no published wage covers it.
 */
export function townJobRate(
  occupation: string | null,
  jurisdictionId: EntityId | null,
  percentile: number,
  minimum: number | null = startingMinimumHourly(jurisdictionId),
  seed?: string,
): TownJobRate | null {
  const soc = occupation ? TOWN_JOB_SOC[occupation] : undefined;
  const byArea = soc ? wageTable().get(soc) : undefined;
  if (!soc || !byArea) return null;
  if (minimum === null) return null;
  for (const area of townPayAreas(jurisdictionId)) {
    const cells = byArea.get(area);
    const annual = cells ? interpolate(cells, percentile) : null;
    if (annual === null) continue;
    const hourly = worldWage(annual, seed, soc, area) / HOURS_PER_YEAR;
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

/** The federal minimum wage, or the state's when it is higher; null where the state's is unknown. */
export function startingStateMinimumHourly(
  stateKey: string | null,
): number | null {
  if (!stateKey || !(stateKey in TOWN_MINIMUM_WAGES))
    return FEDERAL_MINIMUM_HOURLY;
  const state = (TOWN_MINIMUM_WAGES as Record<string, number | null>)[stateKey];
  if (state === null || state === undefined) return null;
  return Math.max(FEDERAL_MINIMUM_HOURLY, state);
}

/** The minimum wage on file where a job is: the state's basic rate, or the federal one. */
export function startingMinimumHourly(
  jurisdictionId: EntityId | null,
): number | null {
  const place = jurisdictionId
    ? corePlaceByJurisdictionId(jurisdictionId)
    : null;
  return startingStateMinimumHourly(place?.stateJurisdictionKey ?? null);
}

/** The hours a week a town job is paid for. */
export function weeklyHoursOf(role: {
  readonly timeDemand: {
    readonly expectedWeekly: {
      readonly minimumHours: number;
      readonly maximumHours: number;
    };
  };
}): number {
  const { minimumHours, maximumHours } = role.timeDemand.expectedWeekly;
  return (minimumHours + maximumHours) / 2;
}
