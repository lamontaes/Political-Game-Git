/**
 * State and metro economies on the national module: about 130 regions, each
 * state's one or two largest metros and the rest of the state, stepped after
 * each national month. A town's conditions combine the nation with its region.
 */
import { placeCountyPopulationShares } from "../place-map";
import {
  corePlaceByJurisdictionId,
  corePlaceStateIdentities,
} from "../place-lookup";
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
  type RegionRow,
} from "../regional-model";
import type { EntityId } from "../kernel/brands";
import severityData from "../data/disasters/severity.json" with { type: "json" };
import type { CoreAPI, CoreEventInput, CoreModule, CoreState } from "../types";
import { disasterJobsLossShare } from "./national-events";
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
    const shares = placeCountyPopulationShares(geoid);
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
): void {
  const p = (key: string) => api.parameter(key);
  const { startedAt, seed } = api.state;
  // The coarse years' real regional months (M1-14), then the opening month
  // the regions step from. Retention (MEMORY-FLAT): the year before the
  // opening in full, and only each year's December before that.
  const kept = yearBefore(national.month);
  for (const month of history)
    if (
      month.month !== national.month &&
      (month.month > kept || month.month.endsWith("-12"))
    )
      for (const row of openingRegionMonths(month, startedAt, seed, p))
        store(api)
          .table("months")
          .put({ ...row });
  for (const row of openingRegionMonths(national, startedAt, seed, p))
    store(api)
      .table("months")
      .put({ ...row });
  for (const placeId of placeIds) {
    const regionId = regionOfPlace(placeId);
    if (regionId) store(api).table("places").put({ id: placeId, regionId });
  }
}

/** A disaster's toll on a state's jobs: a share of them lost at its start, fading to nothing over the recovery. */
export interface RegionalShock {
  readonly id: string;
  /** The state's two-letter code. */
  readonly stateUsps: string;
  /** The first month stepped under the loss (a month after the stored ones). */
  readonly startMonth: string;
  /** The share of the state's jobs lost at the start (0.01 is one percent). */
  readonly jobsLossShare: number;
  /** Months over which the loss fades linearly to nothing. */
  readonly durationMonths: number;
  /** The record the loss was sized from. */
  readonly sourceId: string;
}

const monthIndex = (month: string) => {
  const [y, m] = month.split("-").map(Number) as [number, number];
  return y * 12 + (m - 1);
};

const monthAfterDate = (date: string) => {
  const index = monthIndex(date.slice(0, "YYYY-MM".length)) + 1;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
};

/**
 * Record a shock on a state's regions. It is a dated, fading offset the
 * monthly step reads (`jobsFactor`): the stored months are never edited, so
 * the model's pull back to the nation's trend does not undo it, and the
 * recovery is the offset ending, not the row being rewritten.
 */
export function regionalShock(api: CoreAPI, shock: RegionalShock): void {
  store(api)
    .table("shocks")
    .put({ ...shock } as unknown as { id: string });
}

/** The factor on a state's jobs in a month: each shock's loss, faded linearly to nothing. */
function jobsFactor(
  shocks: readonly RegionalShock[],
  stateUsps: string,
  month: string,
): number {
  let factor = 1;
  for (const shock of shocks) {
    if (shock.stateUsps !== stateUsps) continue;
    const age = monthIndex(month) - monthIndex(shock.startMonth);
    if (age < 0 || age >= shock.durationMonths) continue;
    factor *= 1 - shock.jobsLossShare * (1 - age / shock.durationMonths);
  }
  return factor;
}

export function stepRegional(
  api: CoreAPI,
  before: Readonly<MacroMonth>,
  now: Readonly<MacroMonth>,
): void {
  const p = (key: string) => api.parameter(key);
  const months = store(api).table("months");
  const stepped: RegionMonth[] = [];
  const shocks = store(api)
    .table("shocks")
    .rows() as unknown as RegionalShock[];
  for (const region of REGIONS) {
    const stored = months.get(
      `${region.id}:${before.month}`,
    ) as unknown as RegionMonth;
    // The stored month carries last month's shock; the step runs on the
    // month the model would have without it, and this month's shock is put on.
    const previous = shocks.length
      ? {
          ...stored,
          jobsThousands:
            stored.jobsThousands /
            jobsFactor(shocks, region.stateUsps, before.month),
        }
      : stored;
    const row = stepRegionMonth(previous, region, before, now, p);
    if (shocks.length)
      row.jobsThousands *= jobsFactor(shocks, region.stateUsps, now.month);
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

/**
 * The area a region's figures cover, as people say it: a metro by its first
 * city ("the Dallas area"), the rest of a state by the metros it leaves out
 * ("Texas outside the Dallas and Houston areas"), else the state or
 * territory itself.
 */
export function regionName(regionId: string): string | undefined {
  const region = REGION_BY_ID.get(regionId);
  if (!region) return undefined;
  if (region.kind === "metro") return `the ${firstCity(region)} area`;
  const state =
    corePlaceStateIdentities().find((row) => row.usps === region.stateUsps)
      ?.name ?? region.stateUsps;
  const metros = REGIONS.filter(
    (row) => row.stateUsps === region.stateUsps && row.kind === "metro",
  ).map(firstCity);
  if (!metros.length) return state;
  const last = metros.pop()!;
  const listed = metros.length ? `${metros.join(", ")} and ${last}` : last;
  return `${state} outside the ${listed} area${metros.length ? "s" : ""}`;
}

/**
 * The state's name when a region is the state outside its metro areas, so a
 * line can say "outside Kentucky's largest cities" rather than put the
 * state's name where a reader looks for their town; undefined for a metro.
 */
export function regionOutsideState(regionId: string): string | undefined {
  const region = REGION_BY_ID.get(regionId);
  if (!region || region.kind === "metro") return undefined;
  // A state or territory with no metro area is the whole of itself.
  if (
    !REGIONS.some(
      (row) => row.stateUsps === region.stateUsps && row.kind === "metro",
    )
  )
    return undefined;
  return (
    corePlaceStateIdentities().find((row) => row.usps === region.stateUsps)
      ?.name ?? undefined
  );
}

/** A metro's first-named city: "Dallas" in "Dallas-Fort Worth-Arlington, TX". */
function firstCity(region: RegionRow): string {
  return (region.title ?? region.id).split(",")[0]!.split(/[-/]/)[0]!.trim();
}

export const REGIONAL_MODULE: CoreModule = {
  id: REGIONAL_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      months: { indexes: { byMonth: { fields: ["month"] } } },
      places: {},
      shocks: {},
    },
  },
  // A disaster elsewhere takes jobs from the struck state for its recovery.
  eventKinds: ["national.disaster"],
  onEvent(api, event) {
    disasterToll(api, event);
  },
};

/**
 * A national disaster's toll on the struck state's jobs, sized from FEMA's
 * record when the disaster is opened (`disasterJobsLossShare`) and put on the
 * state's regions as a shock that fades over the disaster research's effect
 * years (severity.json).
 */
function disasterToll(api: CoreAPI, event: Readonly<CoreEventInput>): void {
  const loss = disasterJobsLossShare(api, event.id);
  if (!loss || loss.share <= 0) return;
  regionalShock(api, {
    id: `shock:${event.id}`,
    stateUsps: loss.stateKey.slice("US-".length),
    // From the month after the disaster: the months already stored are
    // unshocked, and every month stepped from then on is built under it.
    startMonth: monthAfterDate(event.date),
    jobsLossShare: loss.share,
    durationMonths: severityData.effectYears.value * 12,
    sourceId: event.id,
  });
}
