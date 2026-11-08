/**
 * What happens in the rest of the country, as results (Nation, Nov 8, 2026).
 * Natural hazards are world generation, not dice (owner, Oct 9, 1:55 p.m.,
 * docs/design/list-pick-inventory.md: "Natural hazards (storms, floods,
 * wildfires) come from real recorded history keyed by place and season at
 * real rates"; CTO, Nov 8, 12:21 on #7365). On the first of each month the
 * world's hazard calendar for that month is generated for every state from
 * FEMA's declarations 2000-2024: for each kind of incident and month of the
 * year, the state's recorded yearly rate is the mean of a count drawn
 * once per (world seed, year, state, kind, month) from a seeded stream, the
 * way the world's people are seeded; nothing is drawn during play. Each
 * generated disaster is one result row on its start day and a public
 * `national.disaster` record for national:<state>. The town's own disaster
 * stays the disasters engine's (`hazard.disaster`). Damage, aid, a
 * declaration, the counties and the households are built on open from the
 * engines that hold the housing stock, building codes and budgets in force
 * (stopgap SG-NATION-disaster-damage-from-causes).
 */
import declarations from "../data/disasters/declarations.json" with { type: "json" };
import { addDays, makeIsoDate } from "../kernel/dates";
import { openUniform } from "../kernel/deterministic-math";
import { SeededRng } from "../kernel/rng";
import { placeStateKey } from "../place-map";
import { registerModule } from "../state";
import type { CoreAPI, CoreModule, CoreState } from "../types";

export const NATIONAL_EVENTS_MODULE_ID = "national-events";
export const NATIONAL_DISASTER = "national.disaster";
const RUN_KIND = "national-events";
const DUE_KIND = "national-event-due";
/** The years of FEMA's record the rates are read from: 2000 through 2024. */
const FIRST_YEAR = 2000;
const LAST_YEAR = 2024;

type Row = [string, string, number, number, number];

interface Rate {
  /** Distinct disasters of this kind in this state by month of the year, over the record's years. */
  readonly byMonth: number[];
  /** The mean counties a disaster of this kind declared in this state. */
  readonly meanCounties: number;
}

export interface NationalEventRow {
  readonly id: string;
  readonly kind: "disaster";
  /** The day it begins. */
  readonly date: string;
  readonly stateKey: string;
  readonly counties: number;
  readonly incidentType: string;
}

let rates: Map<string, Map<string, Rate>> | undefined;
/** Each state's recorded rate of each kind of incident, by month of the year. */
function recordedRates(): Map<string, Map<string, Rate>> {
  if (rates) return rates;
  const found = new Map<
    string,
    { begins: string; type: number; counties: number }
  >();
  const list = declarations.byCounty as unknown as Record<string, Row[]>;
  for (const [county, rows] of Object.entries(list)) {
    const state = placeStateKey(`county:${county}`);
    if (!state) continue;
    for (const row of rows) {
      const year = Number(row[0].slice(0, 4));
      if (year < FIRST_YEAR || year > LAST_YEAR) continue;
      const key = `${state}|${row[4]}`;
      const one = found.get(key);
      if (one) one.counties += 1;
      else found.set(key, { begins: row[0], type: row[2], counties: 1 });
    }
  }
  rates = new Map();
  const sums = new Map<string, { counties: number; events: number }>();
  for (const [key, one] of found) {
    const state = key.slice(0, key.indexOf("|"));
    const type = declarations.types[one.type] ?? "Other";
    const byType = rates.get(state) ?? new Map<string, Rate>();
    rates.set(state, byType);
    const rate = byType.get(type) ?? {
      byMonth: Array<number>(12).fill(0),
      meanCounties: 1,
    };
    byType.set(type, rate);
    rate.byMonth[Number(one.begins.slice(5, 7)) - 1]! += 1;
    const sum = sums.get(`${state}|${type}`) ?? { counties: 0, events: 0 };
    sum.counties += one.counties;
    sum.events += 1;
    sums.set(`${state}|${type}`, sum);
  }
  for (const [state, byType] of rates)
    for (const [type, rate] of byType) {
      const sum = sums.get(`${state}|${type}`)!;
      (rate as { meanCounties: number }).meanCounties = Math.max(
        1,
        Math.round(sum.counties / sum.events),
      );
    }
  return rates;
}

/** The count a Poisson process of mean `mean` has at quantile `u` (inverse CDF). */
function poissonQuantile(mean: number, u: number): number {
  if (mean <= 0) return 0;
  let term = Math.exp(-mean);
  let total = term;
  let count = 0;
  while (u > total && count < 1000) {
    count += 1;
    term *= mean / count;
    total += term;
  }
  return count;
}

const monthOf = (date: string) => date.slice(0, "YYYY-MM".length);
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

/**
 * Generate the month's hazard calendar: for each state, kind and month, the
 * count comes from the state's recorded rate and a stream seeded by (world
 * seed, month, state, kind), and each disaster's day from the same stream.
 */
function generateMonth(api: CoreAPI, month: string): void {
  const monthIndex = Number(month.slice(5, 7)) - 1;
  const first = makeIsoDate(`${month}-01`);
  const days = Number(
    addDays(addDays(first, 32), -Number(addDays(first, 32).slice(8, 10))).slice(
      8,
      10,
    ),
  );
  const years = LAST_YEAR - FIRST_YEAR + 1;
  const events = table(api, "events");
  for (const [stateKey, byType] of [...recordedRates()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  ))
    for (const [type, rate] of [...byType].sort((a, b) =>
      a[0].localeCompare(b[0]),
    )) {
      const mean = rate.byMonth[monthIndex]! / years;
      if (mean <= 0) continue;
      const rng = new SeededRng(
        `${api.state.seed}|hazard|${month}|${stateKey}|${type}`,
      );
      const count = poissonQuantile(mean, openUniform(rng));
      for (let n = 0; n < count; n += 1) {
        const date = `${month}-${String(1 + Math.floor(openUniform(rng) * days)).padStart(2, "0")}`;
        const id = `national-event:disaster:${month}:${stateKey}:${type}:${n}`;
        // A day before the world opened is its past, not kept as an event.
        if (date < api.state.date) continue;
        events.put({
          id,
          kind: "disaster",
          date,
          stateKey,
          counties: rate.meanCounties,
          incidentType: type,
        } as unknown as { id: string });
        // The day it begins, it happens.
        api.moduleCalendar(NATIONAL_EVENTS_MODULE_ID).schedule({
          key: `${DUE_KIND}:${id}`,
          date,
          kind: DUE_KIND,
          source: {
            tag: "SOURCED",
            asOf: api.state.date,
            citation: `Generated from FEMA's declarations ${FIRST_YEAR}-${LAST_YEAR} (owner, Oct 9, 2026).`,
          },
          sourceRecordIds: [id],
        });
      }
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
    source: {
      tag: "SOURCED",
      asOf: today,
      citation: `Generated from FEMA's declarations ${FIRST_YEAR}-${LAST_YEAR}: ${row.stateKey}'s recorded rate of ${row.incidentType} disasters in this month (owner, Oct 9, 2026).`,
    },
    facts: {
      stateKey: row.stateKey,
      incidentType: row.incidentType,
      counties: String(row.counties),
    },
  });
}

function schedule(api: CoreAPI): void {
  const next =
    addDays(makeIsoDate(`${monthOf(api.state.date)}-01`), 32).slice(
      0,
      "YYYY-MM".length,
    ) + "-01";
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
    },
  },
  onCalendarWork(api, work) {
    if (work.kind === DUE_KIND) return emitDue(api, work.sourceRecordIds[0]!);
    if (work.kind !== RUN_KIND) return;
    generateMonth(api, monthOf(api.state.date));
    schedule(api);
  },
  onDay(api) {
    const state = table(api, "state");
    if (!state.get("national-events:state")) {
      state.put({ id: "national-events:state", openedAt: api.state.date });
      generateMonth(api, monthOf(api.state.date));
      schedule(api);
    }
  },
};

/** Install the engine in a world. */
export function openNationalEvents(core: CoreState): void {
  if (!core.modules.has(NATIONAL_EVENTS_MODULE_ID))
    registerModule(core, NATIONAL_EVENTS_MODULE);
}
