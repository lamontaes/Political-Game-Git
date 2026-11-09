/**
 * The climate, through the effect map (Nation, Nov 9, 2026; owner: "do a very
 * basic weather thing that is with the effect map. so we can get some basic
 * climate change effect"). One national warming level and each hazard's level
 * (heat, flood, storm, wildfire, drought), as results, month by month.
 *
 * Emissions come from the simulated laws: the carbon price and the federal
 * power-plant carbon limit in force in every state (read as every state's law
 * is, `stateLawInForce`, against the day the world opened, lagged by the
 * links' own months), weighted by the state's people over the country's. The
 * country's energy CO2 moves by that index and the rest of the world's does
 * not: the rest of the world follows a published scenario path (the IEA's
 * stated-policies path, `worldFossilGt`), so the warming rises at about the real rate
 * with no law changing and the laws move only their own share. The CO2 adds to the warming at the transient climate response
 * (`emissions-to-warming`), and each hazard's level is one plus its link's
 * size times the warming since the world opened (`warming-to-<hazard>-hazard`).
 * The links name this module as the engine that carries them (they are not a
 * place's rate, so the web does not run them). Nothing here draws or limits a
 * level, and nothing moves it but the laws in force.
 *
 * The recorded history sets only where each county's hazard starts (the
 * disasters module's FEMA record); this module keeps what the warming does to
 * it. Disasters drawn from these levels are the next piece (stopgap
 * SG-NATION-climate-unread until a disaster reads a level).
 */
import emissions from "../data/climate/emissions.json" with { type: "json" };
import history from "../data/climate/hazard-history.json" with { type: "json" };
import lookup from "../data/places/place-lookup.json" with { type: "json" };
import { addDays, makeIsoDate } from "../kernel/dates";
import type { ModuleRow } from "../module-data";
import { registerModule } from "../state";
import type { CoreAPI, CoreModule, CoreState } from "../types";
import { stateLawInForce } from "./laws";
import { carriedLink, WEB_LINKS } from "./outcome-web";
import { residentsOf, STATES } from "./budgets";

export const CLIMATE_MODULE_ID = "climate";
const RUN_KIND = "climate-month";
export const HAZARDS = [
  "heat",
  "flood",
  "storm",
  "wildfire",
  "drought",
] as const;
export type Hazard = (typeof HAZARDS)[number];

const MONTHS_PER_YEAR = 12;
const DAYS_PER_MONTH = 30.44;

export interface ClimateMonth {
  readonly id: string;
  readonly month: string;
  /** The country's CO2 against the opening's, from the carbon laws in force (1 = unchanged). */
  readonly usIndex: number;
  /** Gigatons of CO2 the world emitted this month. */
  readonly worldGt: number;
  /** Gigatons emitted since the world opened. */
  readonly cumulativeGt: number;
  /** Degrees C of warming since the world opened. */
  readonly warmingC: number;
  /** Each hazard's level against the opening's (1 = the recorded history's own). */
  readonly hazard: Readonly<Record<Hazard, number>>;
}

const table = (api: CoreAPI, name: string) =>
  api.moduleState(CLIMATE_MODULE_ID).table(name);
const monthOf = (date: string) => date.slice(0, "YYYY-MM".length);

/** The weights of the country's states: each state's people over all of them. */
function stateWeights(): [string, number][] {
  const rows = Object.entries(STATES)
    .map(([key, base]) => [key, residentsOf(base)] as [string, number])
    .filter(([, people]) => people > 0)
    .sort((a, b) => a[0].localeCompare(b[0]));
  const total = rows.reduce((n, [, people]) => n + people, 0);
  return rows.map(([key, people]) => [key, people / total]);
}
let weights: [string, number][] | undefined;
/** The weights, built on first use (the state bases are not loaded yet when this file is, in some import orders). */
const weightsOf = () => (weights ??= stateWeights());

/** A law cause's change since the day the world opened, as of `lag` months before today (0 where unrecorded). */
function lawChange(
  api: CoreAPI,
  stateKey: string,
  from: string,
  lagMonths: number,
): number {
  const series = from.replace(/^law:/, "");
  const opened = api.state.startedAt;
  const lagged = addDays(
    makeIsoDate(api.state.date),
    -Math.round(lagMonths * DAYS_PER_MONTH),
  );
  const at = lagged > opened ? lagged : opened;
  const now = stateLawInForce(api, stateKey, series, at).value ?? 0;
  const start = stateLawInForce(api, stateKey, series, opened).value ?? 0;
  return now - start;
}

/** The two carbon laws' links: the researched size per law in force, the law and the months it takes. */
const CARBON_LINKS = [
  "carbon-price-to-emissions",
  "power-plant-carbon-to-emissions",
].map((key) => {
  const link = WEB_LINKS.find((row) => row.key === key);
  if (!link || link.size === null)
    throw new Error(`${key} has no researched size for the climate`);
  return { size: link.size, from: link.from, lagMonths: link.lagMonths };
});

/** The country's CO2 against the opening's: each carbon law's size per law, in each state, by people. */
function usIndex(api: CoreAPI): number {
  let index = 0;
  for (const [stateKey, weight] of weightsOf()) {
    let factor = 1;
    for (const link of CARBON_LINKS)
      factor *=
        1 + link.size * lawChange(api, stateKey, link.from, link.lagMonths);
    index += weight * factor;
  }
  return index;
}

/** The world's fossil CO2 in the year the date falls in: the scenario path, straight between its points and flat past the last. */
export function worldFossilGt(date: string): number {
  const points = emissions.worldFossilPath.points;
  const year = Number(date.slice(0, 4)) + (Number(date.slice(5, 7)) - 0.5) / 12;
  if (year <= points[0]!.year) return points[0]!.gtCo2;
  for (let i = 1; i < points.length; i++) {
    const [a, b] = [points[i - 1]!, points[i]!];
    if (year <= b.year)
      return (
        a.gtCo2 + ((b.gtCo2 - a.gtCo2) * (year - a.year)) / (b.year - a.year)
      );
  }
  return points[points.length - 1]!.gtCo2;
}

function writeMonth(api: CoreAPI, opening: boolean): void {
  const month = monthOf(api.state.date);
  const state = table(api, "state");
  const previous = state.get("climate:state") as
    { latestId: string } | undefined;
  const last = previous
    ? (table(api, "months").get(previous.latestId) as unknown as
        ClimateMonth | undefined)
    : undefined;
  const index = opening ? 1 : usIndex(api);
  // The world's fossil CO2 follows its published path; the country's share of it follows its laws.
  const fossil = worldFossilGt(api.state.date);
  const us = fossil * emissions.usShareOfFossil.value;
  const worldGt =
    (fossil - us + us * index + emissions.landUseCo2GtPerYear.value) /
    MONTHS_PER_YEAR;
  const cumulativeGt = (last?.cumulativeGt ?? 0) + (opening ? 0 : worldGt);
  const warmingC = carriedLink("emissions-to-warming").size! * cumulativeGt;
  const hazard = Object.fromEntries(
    HAZARDS.map((name) => [
      name,
      1 + carriedLink(`warming-to-${name}-hazard`).size! * warmingC,
    ]),
  ) as Record<Hazard, number>;
  const row: ClimateMonth = {
    id: `climate:${month}`,
    month,
    usIndex: index,
    worldGt,
    cumulativeGt,
    warmingC,
    hazard,
  };
  table(api, "months").put(row as unknown as ModuleRow);
  state.put({ id: "climate:state", latestId: row.id });
}

function schedule(api: CoreAPI): void {
  const next =
    addDays(makeIsoDate(`${monthOf(api.state.date)}-01`), 32).slice(
      0,
      "YYYY-MM".length,
    ) + "-09";
  api.moduleCalendar(CLIMATE_MODULE_ID).schedule({
    key: `${RUN_KIND}:${next}`,
    date: next,
    kind: RUN_KIND,
    source: {
      tag: "SOURCED",
      asOf: api.state.date,
      citation:
        "IPCC AR6 transient climate response; Global Carbon Budget 2024; the carbon laws in force.",
    },
    sourceRecordIds: ["climate:state"],
  });
}

export const CLIMATE_MODULE: CoreModule = {
  id: CLIMATE_MODULE_ID,
  state: { schemaVersion: 1, tables: { state: {}, months: {} } },
  onCalendarWork(api, work) {
    if (work.kind !== RUN_KIND) return;
    writeMonth(api, false);
    schedule(api);
  },
  onDay(api) {
    if (table(api, "state").get("climate:state")) return;
    api.stopgap("SG-NATION-climate-unread");
    writeMonth(api, true);
    schedule(api);
  },
};

/** The latest month the climate keeps. */
export function climateNow(api: CoreAPI): ClimateMonth | null {
  const state = table(api, "state").get("climate:state") as
    { latestId: string } | undefined;
  return state
    ? ((table(api, "months").get(state.latestId) as unknown as
        ClimateMonth | undefined) ?? null)
    : null;
}

/** Degrees C of warming since the world opened. */
export function warmingNow(api: CoreAPI): number {
  return climateNow(api)?.warmingC ?? 0;
}

/** A hazard's level against the recorded history's own (1 before the climate has a month). */
export function hazardFactor(api: CoreAPI, hazard: Hazard): number {
  return climateNow(api)?.hazard[hazard] ?? 1;
}

/** The season a calendar month (1 to 12) falls in: 0 winter (Dec to Feb), 1 spring, 2 summer, 3 fall. */
export function seasonOf(month: number): 0 | 1 | 2 | 3 {
  return ([0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 0] as const)[month - 1]!;
}

const COUNTY_CELLS = history.byCounty as unknown as Record<string, number[][]>;

/**
 * Declarations per month the county's recorded history shows for a hazard in a
 * calendar month's season (its season's count over the record's years, spread
 * over the season's three months); none where the county or the hazard has no
 * history.
 */
export function recordedHazardRate(
  countyGeoid: string,
  hazard: Hazard,
  month: number,
): number {
  const at = (history.hazards as readonly string[]).indexOf(hazard);
  const cell = COUNTY_CELLS[countyGeoid]?.[at];
  if (!cell) return 0;
  return cell[seasonOf(month)]! / history.years / 3;
}

/**
 * Declarations per month a county's hazard now gives in a calendar month: the
 * recorded history's rate times the climate's level for the hazard, which
 * moves only with the carbon laws in force.
 */
export function hazardRate(
  api: CoreAPI,
  countyGeoid: string,
  hazard: Hazard,
  month: number,
): number {
  return (
    recordedHazardRate(countyGeoid, hazard, month) * hazardFactor(api, hazard)
  );
}

/** The hazard a FEMA incident type belongs to (flood, storm or wildfire), or none. */
export function hazardOfIncident(incidentType: string): Hazard | undefined {
  return (history.hazardOfIncidentType as Record<string, Hazard | undefined>)[
    incidentType
  ];
}

let stateCells: Map<string, number[][]> | undefined;
/** The recorded history summed over a state's counties: hazard, then season, in declarations. */
function stateHistory(usps: string): number[][] | undefined {
  if (!stateCells) {
    stateCells = new Map();
    for (const [geoid, , rowState] of lookup.counties.rows as [
      string,
      string,
      string,
    ][]) {
      const cell = COUNTY_CELLS[geoid];
      if (!cell) continue;
      const sum =
        stateCells.get(rowState) ?? history.hazards.map(() => [0, 0, 0, 0]);
      cell.forEach((seasons, h) =>
        seasons.forEach((n, season) => (sum[h]![season]! += n)),
      );
      stateCells.set(rowState, sum);
    }
  }
  return stateCells.get(usps);
}

/**
 * County declarations per month a state's counties together give for a hazard
 * in a calendar month: the sum of their `hazardRate`s.
 */
export function stateHazardRate(
  api: CoreAPI,
  usps: string,
  hazard: Hazard,
  month: number,
): number {
  const at = (history.hazards as readonly string[]).indexOf(hazard);
  const cell = stateHistory(usps)?.[at];
  if (!cell) return 0;
  return (
    (cell[seasonOf(month)]! / history.years / 3) * hazardFactor(api, hazard)
  );
}

/** Install the engine in a world (after the laws and the outside budgets). */
export function openClimate(core: CoreState): void {
  if (!core.modules.has(CLIMATE_MODULE_ID))
    registerModule(core, CLIMATE_MODULE);
}
