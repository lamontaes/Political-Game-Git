import declarations from "./data/disasters/declarations.json" with { type: "json" };
import assistance from "./data/disasters/assistance.json" with { type: "json" };
import households from "./data/disasters/households.json" with { type: "json" };
import shockData from "./data/disasters/regional-shock.json" with { type: "json" };
import history from "./data/climate/hazard-history.json" with { type: "json" };
import budgetBases from "../../data/research/money/public-budget-bases.json" with { type: "json" };
import { placeStateKey } from "./place-map";
import type { CoreAPI } from "./types";
import type { Hazard } from "./modules/climate";

/** The last day FEMA's record of real disasters covers: after it the climate's hazard levels make the weather. */
export const RECORD_END: string = history.recordEnd;
export const NATIONAL_EVENTS_MODULE_ID = "national-events";
/** The first year of FEMA's record the history is read from. */
const FIRST_YEAR = 2000;

type Row = [string, string, number, number, number];

export interface Recorded {
  readonly number: number;
  /** The county codes (FIPS) FEMA declared for it in the state. */
  readonly countyCodes: string[];
  readonly stateKey: string;
  readonly incidentType: string;
  readonly counties: number;
  /** The day of the month the incident began. */
  readonly day: number;
}

export interface NationalEventRow {
  readonly id: string;
  readonly kind: "disaster";
  /** The day it begins. */
  readonly date: string;
  readonly stateKey: string;
  readonly counties: number;
  readonly incidentType: string;
  /** FEMA's disaster number, the key to its detail (read on open). */
  readonly disasterNumber: number;
  /** The hazard level it came from (flood, storm or wildfire), for a disaster the climate made; absent for a recorded one. */
  readonly hazard?: Hazard;
}

let record: Map<string, Recorded[]> | undefined;
/** FEMA's disasters 2000-2024 by recorded year and month ("2011-04"), one entry per state a disaster reached. */
export function recordedHistory(): Map<string, Recorded[]> {
  if (record) return record;
  const found = new Map<
    string,
    {
      begins: string;
      type: number;
      state: string;
      counties: number;
      number: number;
      codes: string[];
    }
  >();
  const list = declarations.byCounty as unknown as Record<string, Row[]>;
  for (const [county, rows] of Object.entries(list)) {
    const state = placeStateKey(`county:${county}`);
    if (!state) continue;
    for (const row of rows) {
      const year = Number(row[0].slice(0, 4));
      if (year < FIRST_YEAR || row[0] > RECORD_END) continue;
      const key = `${state}|${row[4]}`;
      const one = found.get(key);
      if (one) {
        one.counties += 1;
        one.codes.push(county);
      } else
        found.set(key, {
          begins: row[0],
          type: row[2],
          state,
          counties: 1,
          number: row[4],
          codes: [county],
        });
    }
  }
  record = new Map();
  for (const key of [...found.keys()].sort()) {
    const one = found.get(key)!;
    const month = one.begins.slice(0, "YYYY-MM".length);
    const list = record.get(month) ?? [];
    list.push({
      number: one.number,
      countyCodes: one.codes,
      stateKey: one.state,
      incidentType: declarations.types[one.type] ?? "Other",
      counties: one.counties,
      day: Number(one.begins.slice(8, 10)),
    });
    record.set(month, list);
  }
  return record;
}

let byNumberState: Map<string, Recorded> | undefined;
export function recordedFor(
  stateKey: string,
  number: number,
): Recorded | undefined {
  if (!byNumberState) {
    byNumberState = new Map();
    for (const list of recordedHistory().values())
      for (const one of list)
        byNumberState.set(`${one.stateKey}|${one.number}`, one);
  }
  return byNumberState.get(`${stateKey}|${number}`);
}

const COUNTY_POPULATION = (
  budgetBases as unknown as { countyPopulation2024: Record<string, number> }
).countyPopulation2024;
export const STATE_POPULATION = (
  budgetBases as unknown as {
    places: Record<
      string,
      {
        population2024?: number;
        puertoRicoPopulation2025?: number;
        islandAreaPopulation2020?: number;
      }
    >;
  }
).places;

/** The federal aid (Public Assistance plus household aid) of a recorded disaster in a state, cents, and the struck counties' population. */
function aidAndPopulation(rec: Recorded): { aid: number; population: number } {
  const aid = assistance.byCountyDisaster as unknown as Record<
    string,
    { county: number; towns: Record<string, number> }
  >;
  const homes = households.byCountyDisaster as unknown as Record<
    string,
    Record<string, [number, number, number]>
  >;
  let cents = 0;
  let population = 0;
  for (const code of rec.countyCodes) {
    population += COUNTY_POPULATION[code] ?? 0;
    const key = `${code}|${rec.number}`;
    const a = aid[key];
    if (a)
      cents += a.county + Object.values(a.towns).reduce((n, v) => n + v, 0);
    for (const t of Object.values(homes[key] ?? {})) cents += t[0];
  }
  return { aid: cents, population };
}

let cutoffs: { low: number; high: number } | undefined;
/**
 * The aid per resident at the 90th and the 99th percentile of the disasters
 * in FEMA's record that have both aid and a population on record: the
 * research's ends of the ramp (below the 90th percentile the longer-run
 * response is slightly positive; the 99th percentile disaster takes about
 * 1.5 percent of the population).
 */
function aidCutoffs(): { low: number; high: number } {
  if (cutoffs) return cutoffs;
  const perResident: number[] = [];
  for (const list of recordedHistory().values())
    for (const rec of list) {
      const { aid, population } = aidAndPopulation(rec);
      if (aid > 0 && population > 0) perResident.push(aid / population);
    }
  perResident.sort((a, b) => a - b);
  const at = (q: number) =>
    perResident[
      Math.min(perResident.length - 1, Math.floor(q * perResident.length))
    ] ?? 0;
  return (cutoffs = { low: at(0.9), high: at(0.99) });
}

/**
 * The share of a state's jobs a disaster takes for its recovery, built when
 * the disaster is opened: the worst disaster's loss (jobsLossAtWorstShare),
 * scaled by where the aid FEMA put in per resident of the struck counties
 * stands on a straight ramp from the record's 90th to its 99th percentile,
 * and by the struck counties' share of the state. Zero below the 90th
 * percentile and where the counties have no population on record. The
 * regional economy reads it as a fading offset (`regionalShock`).
 */
export function disasterJobsLossShare(
  api: CoreAPI,
  eventId: string,
): { readonly stateKey: string; readonly share: number } | undefined {
  const row = api
    .moduleState(NATIONAL_EVENTS_MODULE_ID)
    .table("events")
    .get(eventId) as unknown as NationalEventRow | undefined;
  const rec = row ? recordedFor(row.stateKey, row.disasterNumber) : undefined;
  if (!row || !rec) return undefined;
  const { aid, population: struck } = aidAndPopulation(rec);
  const place = STATE_POPULATION[row.stateKey];
  const state =
    place?.population2024 ??
    place?.puertoRicoPopulation2025 ??
    place?.islandAreaPopulation2020 ??
    0;
  if (!struck || !state) return { stateKey: row.stateKey, share: 0 };
  const { low, high } = aidCutoffs();
  const severity =
    high > low
      ? Math.min(1, Math.max(0, (aid / struck - low) / (high - low)))
      : 0;
  return {
    stateKey: row.stateKey,
    share: shockData.jobsLossAtWorstShare.value * severity * (struck / state),
  };
}
