/**
 * What happens in the rest of the country, as results (Nation, Nov 8, 2026).
 * On the sixth of each month the disasters FEMA's record says began in the
 * month before, in every state, are kept as one result row each (the
 * disaster, the state, how many counties) and emitted as a public record the
 * other engines read (`national.disaster`, placeId national:<state>). The
 * town's own disaster stays the disasters engine's (`hazard.disaster`);
 * nothing here pays anyone, and the damage, the households and the roll of
 * counties are read on open from the declarations record, never kept.
 * Nothing is rolled: a month with no declaration has no event, and a world
 * past the end of the records has no new disasters until the hazard model
 * that causes them is built (stopgap SG-NATION-disasters-from-records).
 */
import declarations from "../data/disasters/declarations.json" with { type: "json" };
import { addDays, makeIsoDate } from "../kernel/dates";
import { placeStateKey } from "../place-map";
import { registerModule } from "../state";
import type { CoreAPI, CoreModule, CoreState } from "../types";

export const NATIONAL_EVENTS_MODULE_ID = "national-events";
export const NATIONAL_DISASTER = "national.disaster";
const RUN_KIND = "national-events";

type Row = [string, string, number, number, number];

interface Declared {
  readonly number: number;
  readonly begins: string;
  readonly declared: string;
  readonly type: string;
  readonly title: string;
  /** Counties declared, by state. */
  readonly counties: Map<string, number>;
}

export interface NationalEventRow {
  readonly id: string;
  readonly kind: "disaster";
  readonly date: string;
  readonly begins: string;
  readonly stateKey: string;
  readonly counties: number;
  readonly sourceId: string;
  readonly disasterNumber: number;
  readonly incidentType: string;
}

const monthOf = (date: string) => date.slice(0, "YYYY-MM".length);

let index: Map<string, Declared[]> | undefined;
/** The declarations from the year 2025 on, by the day the incident began. */
function declaredByBegin(): Map<string, Declared[]> {
  if (index) return index;
  const byNumber = new Map<number, Declared>();
  const rows = declarations.byCounty as unknown as Record<string, Row[]>;
  for (const [county, list] of Object.entries(rows)) {
    const state = placeStateKey(`county:${county}`);
    if (!state) continue;
    for (const row of list) {
      if (row[0] < "2025-01-01") continue;
      let one = byNumber.get(row[4]);
      if (!one) {
        one = {
          number: row[4],
          begins: row[0],
          declared: row[1],
          type: declarations.types[row[2]!] ?? "",
          title: (declarations.titles as Record<string, string>)[row[4]] ?? "",
          counties: new Map(),
        };
        byNumber.set(row[4], one);
      }
      one.counties.set(state, (one.counties.get(state) ?? 0) + 1);
    }
  }
  index = new Map();
  for (const one of byNumber.values())
    index.set(one.begins, [...(index.get(one.begins) ?? []), one]);
  return index;
}

const table = (api: CoreAPI, name: string) =>
  api.moduleState(NATIONAL_EVENTS_MODULE_ID).table(name);

/** Every national event kept, newest last. */
export function nationalEvents(api: CoreAPI): readonly NationalEventRow[] {
  if (!(api.state as CoreState).modules.has(NATIONAL_EVENTS_MODULE_ID))
    return [];
  return (table(api, "events").rows() as unknown as NationalEventRow[])
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

function run(api: CoreAPI): void {
  const state = table(api, "state");
  const last = (
    state.get("national-events:state") as unknown as { lastRun: string }
  ).lastRun;
  const today = api.state.date;
  const byBegin = declaredByBegin();
  for (
    let day = addDays(makeIsoDate(last), 1);
    day <= makeIsoDate(today);
    day = addDays(day, 1)
  )
    for (const one of byBegin.get(day) ?? [])
      for (const [stateKey, counties] of [...one.counties].sort((a, b) =>
        a[0].localeCompare(b[0]),
      )) {
        const id = `national-event:disaster:${one.number}:${stateKey}`;
        const row: NationalEventRow = {
          id,
          kind: "disaster",
          date: today,
          begins: one.begins,
          stateKey,
          counties,
          sourceId: `fema:${one.number}`,
          disasterNumber: one.number,
          incidentType: one.type,
        };
        table(api, "events").put(row as unknown as { id: string });
        api.emit({
          id,
          date: today,
          kind: NATIONAL_DISASTER,
          personIds: [],
          placeId: `national:${stateKey}`,
          publicRecord: true,
          source: {
            tag: "SOURCED",
            asOf: today,
            citation: `FEMA disaster ${one.number} (${one.type}), incident beginning ${one.begins}.`,
          },
          facts: {
            disasterNumber: String(one.number),
            title: one.title,
            incidentType: one.type,
            stateKey,
            counties: String(counties),
          },
        });
      }
  state.put({ id: "national-events:state", lastRun: today });
}

function schedule(api: CoreAPI): void {
  const next =
    addDays(makeIsoDate(`${monthOf(api.state.date)}-01`), 32).slice(
      0,
      "YYYY-MM".length,
    ) + "-06";
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
    if (work.kind !== RUN_KIND) return;
    run(api);
    schedule(api);
  },
  onDay(api) {
    const state = table(api, "state");
    if (state.get("national-events:state")) return;
    state.put({ id: "national-events:state", lastRun: api.state.date });
    schedule(api);
  },
};

/** Install the engine in a world. */
export function openNationalEvents(core: CoreState): void {
  if (!core.modules.has(NATIONAL_EVENTS_MODULE_ID))
    registerModule(core, NATIONAL_EVENTS_MODULE);
}
