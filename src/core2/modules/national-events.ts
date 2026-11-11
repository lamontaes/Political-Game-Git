/**
 * What happens in the rest of the country, as results (Nation, Nov 8, 2026).
 * Natural hazards come from real recorded history keyed by place and season,
 * as world generation and not dice (owner, Oct 9, 1:55 p.m.,
 * docs/design/list-pick-inventory.md; CTO, Nov 8, 12:21 on #7365). FEMA's
 * declarations are the record, through October 9, 2026 (owner, Oct 16: both
 * FEMA's records and the world's own conditions; after the records end the
 * game keeps making its own weather). While the world's dates fall inside the
 * record, a game month has the real disasters of that month on their real
 * days, in the state each reached, with the counties it declared. After it, a
 * month's disasters come from the climate's hazard levels (the effect map's
 * `stateHazardRate`: each state's recorded declarations by hazard and season,
 * moved only by the warming, which moves only with the carbon laws): each
 * state and hazard keeps its exposure, the expected disasters so far, and a
 * disaster happens the month it has built up a whole one. Nothing is drawn
 * and nothing is typed; the same laws give the same disasters, and a world
 * with other laws differs by its exposures. The disaster's detail is a
 * recorded disaster of that state and hazard taken in turn
 * (SG-NATION-hazard-replay). Each disaster is one
 * result row on its day and a public `national.disaster` record for
 * national:<state>. The town's own disaster stays the disasters engine's
 * (`hazard.disaster`). Damage, aid, a declaration, the counties and the
 * households are built on open from the engines that hold the housing stock,
 * building codes and budgets in force (stopgap
 * SG-NATION-disaster-damage-from-causes).
 */
import { NATIONAL_DISASTER } from "../national-disaster-event";
import declarations from "../data/disasters/declarations.json" with { type: "json" };
import assistance from "../data/disasters/assistance.json" with { type: "json" };
import households from "../data/disasters/households.json" with { type: "json" };
import shockData from "../data/disasters/regional-shock.json" with { type: "json" };
import budgetBases from "../../../data/research/money/public-budget-bases.json" with { type: "json" };
import { addDays, makeIsoDate } from "../kernel/dates";
import { placeStateKey } from "../place-map";
import { registerModule } from "../state";
import {
  hazardOfIncident,
  RECORD_END,
  stateHazardRate,
  type Hazard,
} from "./climate";
import type { CoreAPI, CoreModule, CoreState } from "../types";

export const NATIONAL_EVENTS_MODULE_ID = "national-events";
export { NATIONAL_DISASTER };
const RUN_KIND = "national-events";
const DUE_KIND = "national-event-due";
/** The first year of FEMA's record the history is read from. */
const FIRST_YEAR = 2000;

type Row = [string, string, number, number, number];

interface Recorded {
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
function recordedHistory(): Map<string, Recorded[]> {
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

const monthOf = (date: string) => date.slice(0, "YYYY-MM".length);
/** The month after the one a date falls in. */
const monthAfter = (date: string) =>
  addDays(makeIsoDate(`${monthOf(date)}-01`), 32).slice(0, "YYYY-MM".length);
/** What a national disaster did, read from FEMA's record when someone opens it (never kept). */
export interface NationalDisasterDetail {
  readonly disasterNumber: number;
  readonly title: string;
  readonly incidentType: string;
  /** The FEMA county codes declared in the state. */
  readonly counties: readonly string[];
  /** Federal Public Assistance obligated to the counties' governments and towns, cents. */
  readonly publicAssistanceMinor: number;
  /** Individuals and Households Program assistance approved for the households, cents. */
  readonly householdAssistanceMinor: number;
  /** Homes FEMA inspected as damaged. */
  readonly homesDamaged: number;
}

let byNumberState: Map<string, Recorded> | undefined;
function recordedFor(stateKey: string, number: number): Recorded | undefined {
  if (!byNumberState) {
    byNumberState = new Map();
    for (const list of recordedHistory().values())
      for (const one of list)
        byNumberState.set(`${one.stateKey}|${one.number}`, one);
  }
  return byNumberState.get(`${stateKey}|${number}`);
}

/**
 * The detail of a national disaster, built on open from FEMA's record: the
 * counties it declared and, summed over them, the federal aid obligated and
 * the household aid and damaged homes FEMA recorded. Nothing here is kept,
 * and nothing is paid (stopgap SG-NATION-disaster-damage-from-causes: for a
 * disaster past the record the damage should come from the housing stock,
 * building codes and budgets in force).
 */
export function nationalDisasterDetail(
  api: CoreAPI,
  eventId: string,
): NationalDisasterDetail | undefined {
  if (!(api.state as CoreState).modules.has(NATIONAL_EVENTS_MODULE_ID))
    return undefined;
  const row = api
    .moduleState(NATIONAL_EVENTS_MODULE_ID)
    .table("events")
    .get(eventId) as unknown as NationalEventRow | undefined;
  if (!row) return undefined;
  const recorded = recordedFor(row.stateKey, row.disasterNumber);
  const counties = recorded?.countyCodes ?? [];
  const aid = assistance.byCountyDisaster as unknown as Record<
    string,
    { county: number; towns: Record<string, number> }
  >;
  const homes = households.byCountyDisaster as unknown as Record<
    string,
    Record<string, [number, number, number]>
  >;
  let publicAssistanceMinor = 0;
  let householdAssistanceMinor = 0;
  let homesDamaged = 0;
  for (const code of counties) {
    const key = `${code}|${row.disasterNumber}`;
    const a = aid[key];
    if (a)
      publicAssistanceMinor +=
        a.county + Object.values(a.towns).reduce((n, v) => n + v, 0);
    for (const t of Object.values(homes[key] ?? {})) {
      householdAssistanceMinor += t[0];
      homesDamaged += t[2];
    }
  }
  return {
    disasterNumber: row.disasterNumber,
    title:
      (declarations.titles as Record<string, string>)[row.disasterNumber] ?? "",
    incidentType: row.incidentType,
    counties,
    publicAssistanceMinor,
    householdAssistanceMinor,
    homesDamaged,
  };
}

const COUNTY_POPULATION = (
  budgetBases as unknown as { countyPopulation2024: Record<string, number> }
).countyPopulation2024;
const STATE_POPULATION = (
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

const table = (api: CoreAPI, name: string) =>
  api.moduleState(NATIONAL_EVENTS_MODULE_ID).table(name);

/** Every national event kept, oldest first. */
export function nationalEvents(api: CoreAPI): readonly NationalEventRow[] {
  if (!(api.state as CoreState).modules.has(NATIONAL_EVENTS_MODULE_ID))
    return [];
  return (table(api, "events").rows() as unknown as NationalEventRow[])
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

let templateLists: Map<string, Recorded[]> | undefined;
/** FEMA's recorded disasters of a state and hazard, oldest first: the detail a generated disaster takes in turn. */
function templatesFor(stateKey: string, hazard: Hazard): Recorded[] {
  if (!templateLists) {
    templateLists = new Map();
    for (const month of [...recordedHistory().keys()].sort())
      for (const one of recordedHistory().get(month)!) {
        const kind = hazardOfIncident(one.incidentType);
        if (!kind) continue;
        const key = `${one.stateKey}|${kind}`;
        templateLists.set(key, [...(templateLists.get(key) ?? []), one]);
      }
  }
  return templateLists.get(`${stateKey}|${hazard}`) ?? [];
}

/** The hazards a generated disaster comes from (heat and drought have no recorded history yet). */
const GENERATED_HAZARDS: readonly Hazard[] = ["flood", "storm", "wildfire"];

interface Exposure {
  readonly id: string;
  readonly stateKey: string;
  readonly hazard: Hazard;
  /** Disasters expected so far, summed month by month from the climate's rates. */
  readonly expected: number;
  /** Disasters that have happened of them. */
  readonly fired: number;
}

const lastDayOf = (month: string) =>
  Number(
    addDays(
      addDays(makeIsoDate(`${month}-01`), 32),
      -Number(addDays(makeIsoDate(`${month}-01`), 32).slice(8, 10)),
    ).slice(8, 10),
  );

/** One disaster is a result row on its day, and happens (is emitted) that day. */
function putEvent(api: CoreAPI, row: NationalEventRow, citation: string): void {
  table(api, "events").put(row as unknown as { id: string });
  api.moduleCalendar(NATIONAL_EVENTS_MODULE_ID).schedule({
    key: `${DUE_KIND}:${row.id}`,
    date: row.date,
    kind: DUE_KIND,
    source: { tag: "SOURCED", asOf: api.state.date, citation },
    sourceRecordIds: [row.id],
  });
}

/** The month's calendar: inside the record FEMA's real disasters, after it the disasters the climate's hazard levels give. */
function generateMonth(api: CoreAPI, month: string): void {
  const today = api.state.date;
  const last = lastDayOf(month);
  if (`${month}-01` > RECORD_END) return generateFromLevels(api, month, last);
  (recordedHistory().get(month) ?? []).forEach((one, n) => {
    // A recorded day the game month lacks (February 29, the 31st) is its last.
    const date = `${month}-${String(Math.min(one.day, last)).padStart(2, "0")}`;
    if (date > RECORD_END) return;
    // Only a day still ahead is scheduled (a day gone is the world's past).
    if (date <= today) return;
    putEvent(
      api,
      {
        id: `national-event:disaster:${month}:${one.stateKey}:${one.incidentType}:${n}`,
        kind: "disaster",
        date,
        stateKey: one.stateKey,
        counties: one.counties,
        incidentType: one.incidentType,
        disasterNumber: one.number,
      },
      "FEMA's declarations, the real disaster on its real date (owner, Oct 16, 2026).",
    );
  });
}

/**
 * After the record: each state's exposure to each hazard grows by the
 * disasters its counties' recorded declarations give this month, moved by the
 * climate's level for the hazard (`stateHazardRate`, counties declared per
 * disaster at the state's recorded mean). A disaster happens the month the
 * exposure first holds one more whole disaster than have happened.
 */
function generateFromLevels(api: CoreAPI, month: string, last: number): void {
  const today = api.state.date;
  const exposures = table(api, "exposure");
  const monthNumber = Number(month.slice(5, 7));
  const states = [...new Set(Object.keys(STATE_POPULATION))].sort();
  for (const stateKey of states)
    for (const hazard of GENERATED_HAZARDS) {
      const list = templatesFor(stateKey, hazard);
      if (!list.length) continue;
      const perDisaster =
        list.reduce((n, one) => n + one.counties, 0) / list.length;
      const rate =
        stateHazardRate(
          api,
          stateKey.slice("US-".length),
          hazard,
          monthNumber,
        ) / perDisaster;
      const id = `exposure:${stateKey}:${hazard}`;
      const row = (exposures.get(id) as unknown as Exposure | undefined) ?? {
        id,
        stateKey,
        hazard,
        expected: 0,
        fired: 0,
      };
      const expected = row.expected + rate;
      const due = Math.floor(expected) - row.fired;
      for (let i = 0; i < due; i++) {
        const k = row.fired + i;
        const one = list[k % list.length]!;
        const date = `${month}-${String(Math.min(one.day, last)).padStart(2, "0")}`;
        if (date <= today) continue;
        putEvent(
          api,
          {
            id: `national-event:disaster:${month}:${stateKey}:${hazard}:${k}`,
            kind: "disaster",
            date,
            stateKey,
            counties: one.counties,
            incidentType: one.incidentType,
            disasterNumber: one.number,
            hazard,
          },
          `The climate's ${hazard} level in ${stateKey}: exposure ${expected.toFixed(3)} disasters, ${row.fired + due} have happened (detail: FEMA's recorded disaster ${one.number}).`,
        );
      }
      exposures.put({
        ...row,
        expected,
        fired: row.fired + Math.max(0, due),
      } as unknown as { id: string });
    }
}

function emitDue(api: CoreAPI, id: string): void {
  const row = table(api, "events").get(id) as unknown as
    NationalEventRow | undefined;
  if (!row) return;
  const today = api.state.date;
  api.emit({
    id: row.id,
    date: today,
    kind: NATIONAL_DISASTER,
    personIds: [],
    placeId: `national:${row.stateKey}`,
    publicRecord: true,
    // The national press reports it (the wire reads it at the nation level).
    news: true,
    source: {
      tag: "SOURCED",
      asOf: today,
      citation: row.hazard
        ? `The climate's ${row.hazard} level: a ${row.incidentType} disaster in ${row.stateKey}.`
        : `FEMA's declarations: a recorded ${row.incidentType} disaster in ${row.stateKey} (owner, Oct 16, 2026).`,
    },
    facts: {
      stateKey: row.stateKey,
      incidentType: row.incidentType,
      counties: String(row.counties),
      disasterNumber: String(row.disasterNumber),
      ...(row.hazard ? { hazard: row.hazard } : {}),
    },
  });
}

function schedule(api: CoreAPI): void {
  const next =
    addDays(makeIsoDate(`${monthOf(api.state.date)}-01`), 32).slice(
      0,
      "YYYY-MM".length,
    ) + "-20";
  api.moduleCalendar(NATIONAL_EVENTS_MODULE_ID).schedule({
    key: `${RUN_KIND}:${next}`,
    date: next,
    kind: RUN_KIND,
    source: {
      tag: "SOURCED",
      asOf: api.state.date,
      citation: "FEMA's disaster declarations record.",
    },
    sourceRecordIds: ["national-events:state"],
  });
}

export const NATIONAL_EVENTS_MODULE: CoreModule = {
  id: NATIONAL_EVENTS_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      state: {},
      events: { indexes: { byState: { fields: ["stateKey"] } } },
      exposure: {},
    },
  },
  onCalendarWork(api, work) {
    if (work.kind === DUE_KIND) return emitDue(api, work.sourceRecordIds[0]!);
    if (work.kind !== RUN_KIND) return;
    // On the twentieth, the month after this one is generated (all of it ahead).
    generateMonth(api, monthAfter(api.state.date));
    schedule(api);
  },
  onDay(api) {
    const state = table(api, "state");
    if (!state.get("national-events:state")) {
      state.put({ id: "national-events:state", openedAt: api.state.date });
      generateMonth(api, monthOf(api.state.date));
      generateMonth(api, monthAfter(api.state.date));
      schedule(api);
    }
  },
};

/** Install the engine in a world. */
export function openNationalEvents(core: CoreState): void {
  if (!core.modules.has(NATIONAL_EVENTS_MODULE_ID))
    registerModule(core, NATIONAL_EVENTS_MODULE);
}
