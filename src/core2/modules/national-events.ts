/**
 * What happens in the rest of the country, as results (Nation, Nov 8, 2026).
 * Natural hazards come from real recorded history keyed by place and season,
 * as world generation and not dice (owner, Oct 9, 1:55 p.m.,
 * docs/design/list-pick-inventory.md; CTO, Nov 8, 12:21 on #7365). FEMA's
 * declarations for 2000 through 2024 are the record: each disaster in it has
 * the state it reached, its kind, the day it began and how many counties it
 * declared. A world takes its calendar from that record once, when it is
 * made: its seed fixes one starting shift into the record's 25 years, and a
 * game year then has the disasters of the recorded year that many years on
 * (cycling when the record runs out), in the same state, month and day.
 * Nothing is drawn after that and nothing in play can change it: the
 * calendar is a pure function of the world seed, the month and the record. It
 * is read a month at a time (on the 20th before the month) so a world that
 * runs a hundred years does not generate them up front. Each disaster is one
 * result row on its day and a public `national.disaster` record for
 * national:<state>. The town's own disaster stays the disasters engine's
 * (`hazard.disaster`). Damage, aid, a declaration, the counties and the
 * households are built on open from the engines that hold the housing stock,
 * building codes and budgets in force (stopgap
 * SG-NATION-disaster-damage-from-causes).
 */
import declarations from "../data/disasters/declarations.json" with { type: "json" };
import { addDays, makeIsoDate } from "../kernel/dates";
import { placeStateKey } from "../place-map";
import { seededUnit } from "../seeded";
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

interface Recorded {
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
}

const YEARS = LAST_YEAR - FIRST_YEAR + 1;

let record: Map<string, Recorded[]> | undefined;
/** FEMA's disasters 2000-2024 by recorded year and month ("2011-04"), one entry per state a disaster reached. */
function recordedHistory(): Map<string, Recorded[]> {
  if (record) return record;
  const found = new Map<
    string,
    { begins: string; type: number; state: string; counties: number }
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
      else
        found.set(key, {
          begins: row[0],
          type: row[2],
          state,
          counties: 1,
        });
    }
  }
  record = new Map();
  for (const key of [...found.keys()].sort()) {
    const one = found.get(key)!;
    const month = one.begins.slice(0, "YYYY-MM".length);
    const list = record.get(month) ?? [];
    list.push({
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
 * The recorded year a game month takes its disasters from: the world's one
 * seeded starting shift into the record, then a year on for each game year.
 */
function recordedYearFor(api: CoreAPI, year: number): number {
  const shift = Math.trunc(
    seededUnit(api.state.seed, "hazard-history-shift") * YEARS,
  );
  const opened = Number(api.state.startedAt.slice(0, 4));
  return FIRST_YEAR + ((year - opened + shift + YEARS * 1000) % YEARS);
}

/** The month's calendar: the recorded disasters of the matching recorded year, month and state. */
function generateMonth(api: CoreAPI, month: string): void {
  const today = api.state.date;
  const events = table(api, "events");
  const year = Number(month.slice(0, 4));
  const from = `${recordedYearFor(api, year)}${month.slice(4)}`;
  const last = Number(
    addDays(
      addDays(makeIsoDate(`${month}-01`), 32),
      -Number(addDays(makeIsoDate(`${month}-01`), 32).slice(8, 10)),
    ).slice(8, 10),
  );
  (recordedHistory().get(from) ?? []).forEach((one, n) => {
    // A recorded day the game month lacks (February 29, the 31st) is its last.
    const date = `${month}-${String(Math.min(one.day, last)).padStart(2, "0")}`;
    // Only a day still ahead is scheduled (a day gone is the world's past).
    if (date <= today) return;
    const id = `national-event:disaster:${month}:${one.stateKey}:${one.incidentType}:${n}`;
    events.put({
      id,
      kind: "disaster",
      date,
      stateKey: one.stateKey,
      counties: one.counties,
      incidentType: one.incidentType,
    } as unknown as { id: string });
    // The day it begins, it happens.
    api.moduleCalendar(NATIONAL_EVENTS_MODULE_ID).schedule({
      key: `${DUE_KIND}:${id}`,
      date,
      kind: DUE_KIND,
      source: {
        tag: "SOURCED",
        asOf: today,
        citation: `FEMA's declarations ${FIRST_YEAR}-${LAST_YEAR}, the recorded year ${from} (owner, Oct 9, 2026).`,
      },
      sourceRecordIds: [id],
    });
  });
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
      citation: `FEMA's declarations ${FIRST_YEAR}-${LAST_YEAR}: a recorded ${row.incidentType} disaster in ${row.stateKey} on this season's day (owner, Oct 9, 2026).`,
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
