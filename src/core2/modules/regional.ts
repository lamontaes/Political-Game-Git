/**
 * State and metro economies on the national module: about 130 regions, each
 * state's one or two largest metros and the rest of the state, stepped after
 * each national month. A town's conditions combine the nation with its region.
 */
import { countyPopulationSharesForPlace } from "../reference/government-units";
import { corePlaceByJurisdictionId } from "../place-lookup";
import regionalParameters from "../data/regional/parameters.json" with { type: "json" };
import type { MacroMonth } from "../macro-model";
import type { Parameter } from "../parameters";
import {
  COUNTY_REGION,
  REGIONS,
  REGION_SOURCE,
  openingRegionMonths,
  stepRegionMonth,
  type RegionMonth,
} from "../regional-model";
import type { EntityId } from "../kernel/brands";
import type { CoreAPI, CoreModule, CoreState } from "../types";
import { countedStateGrowth } from "./counted-moves";

export const REGIONAL_MODULE_ID = "regional";
export const REGIONAL_PARAMETERS = regionalParameters as unknown as Readonly<
  Record<string, Parameter>
>;
const REGION_BY_ID = new Map(REGIONS.map((row) => [row.id, row]));

function store(api: CoreAPI) {
  return api.moduleState(REGIONAL_MODULE_ID);
}

export function regionalRegistered(api: CoreAPI): boolean {
  return (api.state as CoreState).modules.has(REGIONAL_MODULE_ID);
}

/** A place's region from its county; a place with no county row takes its state's remaining region. */
export function regionOfPlace(placeId: string): string | undefined {
  const place = corePlaceByJurisdictionId(placeId as EntityId);
  if (!place) return undefined;
  const geoid = place.sourceGeoid ?? "";
  let county: string | undefined;
  if (geoid.length === "SSCCC".length) county = geoid;
  else if (geoid.length === "SSPPPPP".length) {
    const shares = countyPopulationSharesForPlace(geoid);
    county = [...shares].sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0]?.[0];
  }
  if (county && COUNTY_REGION[county]) return COUNTY_REGION[county];
  const usps = place.stateJurisdictionKey?.slice("US-".length);
  return REGIONS.find((row) => row.stateUsps === usps && row.kind !== "metro")
    ?.id;
}

/** The month a year before `month` (YYYY-MM): months after it are kept in full. */
function yearBefore(month: string): string {
  return `${Number(month.slice(0, 4)) - 1}${month.slice(4)}`;
}

export function openRegional(
  api: CoreAPI,
  national: Readonly<MacroMonth>,
  placeIds: readonly string[],
  history: readonly Readonly<MacroMonth>[] = [],
  /** A custom world's national unemployment against the real opening month, in points: every region opens shifted by it. */
  unemploymentShiftPts = 0,
): void {
  const p = (key: string) => api.parameter(key);
  // The coarse years' real regional months (M1-14), then the opening month
  // the regions step from. Retention (MEMORY-FLAT): the year before the
  // opening in full, and only each year's December before that.
  const kept = yearBefore(national.month);
  for (const month of history)
    if (
      month.month !== national.month &&
      (month.month > kept || month.month.endsWith("-12"))
    )
      for (const row of openingRegionMonths(month, p))
        store(api)
          .table("months")
          .put({ ...row });
  for (const row of openingRegionMonths(national, p))
    store(api)
      .table("months")
      .put({
        ...row,
        unemploymentPct: Math.max(
          p("zero"),
          row.unemploymentPct + unemploymentShiftPts,
        ),
      });
  for (const placeId of placeIds) {
    const regionId = regionOfPlace(placeId);
    if (regionId) store(api).table("places").put({ id: placeId, regionId });
  }
}

export function stepRegional(
  api: CoreAPI,
  before: Readonly<MacroMonth>,
  now: Readonly<MacroMonth>,
): void {
  const p = (key: string) => api.parameter(key);
  const months = store(api).table("months");
  const stepped: RegionMonth[] = [];
  for (const region of REGIONS) {
    const previous = months.get(
      `${region.id}:${before.month}`,
    ) as unknown as RegionMonth;
    const row = stepRegionMonth(previous, region, before, now, p);
    // Where counted people move from causes, a region's people follow its
    // state's counts (one model, two tiers) instead of its own unemployment term.
    const growth = countedStateGrowth(api.state as CoreState, region.stateUsps);
    if (growth !== undefined) row.population = previous.population * growth;
    stepped.push(row);
    months.put({ ...row });
  }
  // Retention (MEMORY-FLAT): the last twelve months in full; before them,
  // each year's December and the opening month (pay and jobs are read
  // against it).
  const gone = yearBefore(now.month);
  const opening = (
    api.moduleState("macro").table("state").get("macro:state") as
      { openingMonth?: string } | undefined
  )?.openingMonth;
  if (!gone.endsWith("-12") && gone !== opening)
    for (const row of months.query("byMonth", [gone])) months.remove(row.id);
  // Each state's monthly jobs report is a public record other engines (the news) can read.
  for (const fips of new Set(stepped.map((row) => row.stateFips))) {
    const rows = stepped.filter((row) => row.stateFips === fips);
    const people = rows.reduce((sum, row) => sum + row.population, 0) || 1;
    const usps = REGION_BY_ID.get(rows[0]!.regionId)!.stateUsps;
    api.emit({
      id: `event:economy.state-jobs-report:${usps}:${now.month}`,
      date: api.state.date,
      kind: "economy.state-jobs-report",
      personIds: [],
      placeId: `state:${usps}`,
      source: {
        tag: "ESTIMATED",
        asOf: api.state.date,
        citation: REGION_SOURCE.citation,
        estimatedFrom: `The state's regions in ${now.month}, moved with the nation by their industries.`,
      },
      publicRecord: true,
      facts: {
        month: now.month,
        state: usps,
        unemploymentPct: (
          rows.reduce(
            (sum, row) => sum + row.unemploymentPct * row.population,
            0,
          ) / people
        ).toFixed(1),
        jobsThousands: rows
          .reduce((sum, row) => sum + row.jobsThousands, 0)
          .toFixed(1),
        nationUnemploymentPct: now.unemploymentPct.toFixed(1),
      },
    });
  }
}

/** The region's month for a place, or undefined when the place has no region. */
export function regionalMonth(
  api: CoreAPI,
  placeId: string,
  month: string,
): RegionMonth | undefined {
  const place = store(api).table("places").get(placeId) as
    { regionId: string } | undefined;
  if (!place) return undefined;
  return store(api)
    .table("months")
    .get(`${place.regionId}:${month}`) as unknown as RegionMonth | undefined;
}

/** How a place's pay, demand and price level moved relative to the nation since the opening. */
export function regionalFactors(
  api: CoreAPI,
  placeId: string,
  opening: Readonly<MacroMonth>,
  now: Readonly<MacroMonth>,
): { wage: number; demand: number; price: number } {
  const one = api.parameter("one");
  const first = regionalMonth(api, placeId, opening.month),
    latest = regionalMonth(api, placeId, now.month);
  if (!first || !latest) return { wage: one, demand: one, price: one };
  return {
    // The region's price level against the nation's, since the opening.
    price: latest.priceLevelPct / first.priceLevelPct,
    wage:
      latest.hourlyEarnings /
      first.hourlyEarnings /
      (now.hourlyEarnings / opening.hourlyEarnings),
    demand:
      latest.jobsThousands /
      first.jobsThousands /
      (now.payrollJobsThousands / opening.payrollJobsThousands),
  };
}

/** The level a new hire's pay offer and a rent read: the region's latest month. */
export function regionalLevel(
  api: CoreAPI,
  placeId: string,
): RegionMonth | undefined {
  const state = api.moduleState("macro").table("state").get("macro:state") as
    { latestMonth: string } | undefined;
  return state ? regionalMonth(api, placeId, state.latestMonth) : undefined;
}

export function regionName(regionId: string): string | undefined {
  return REGION_BY_ID.get(regionId)?.title;
}

export const REGIONAL_MODULE: CoreModule = {
  id: REGIONAL_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      months: { indexes: { byMonth: { fields: ["month"] } } },
      places: {},
    },
  },
};
