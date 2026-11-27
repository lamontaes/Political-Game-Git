/**
 * The town's community events (owner, Nov 10: "each town's own real
 * festivals... a few general events a year, the paper reports them and a
 * candidate can campaign at one"). The year's events for the town's place
 * type (`communityEventsFor`, the table in data/world/community-events.json)
 * are booked on the one calendar of dated entries the day each is due; when
 * its day arrives the entry writes one row, `community-event:<place>:<event>:<date>`,
 * with the event, the days it runs and the share of residents the table gives
 * for the place's type. Nobody's attendance is decided here.
 *
 * Each January 1st books that year's events (and today's year at open), and
 * drops the rows and the finished entries of the year before last. Nothing is
 * rolled: a date follows from the table's rule alone, so the same place has
 * the same year of events in every world (see SG-WORLD-community-event-saturday).
 *
 * The rows are history (`community-event`, by place): the one history reader
 * hands them to the Journal, the paper, the director and a person's card, each
 * with the record that made it (the table's row for the event).
 */
import { coreAPI, registerModule } from "../state";
import { moduleCalendar } from "../module-calendar";
import { addDays, makeIsoDate } from "../kernel/dates";
import {
  communityEventsFor,
  communityPlaceType,
  type CommunityEvent,
} from "../community-events-table";
import { placeJurisdictionId } from "../place-map";
import type { HistoryModule, HistoryRow, HistorySource } from "../past";
import type { ModuleRow } from "../module-data";
import type { CoreAPI, CoreModule, CoreState, IsoDate, Source } from "../types";

export const COMMUNITY_EVENTS_MODULE_ID = "core2-community-events-v1";
const BOOK_KIND = "community-events-book-year";
const EVENT_KIND = "community-event";
const SATURDAY = 6;

export interface CommunityEventRow {
  /** community-event:<place>:<event>:<date> */
  id: string;
  placeId: string;
  eventId: string;
  /** The first day. */
  date: string;
  /** The last day (the same day for a one-day event). */
  endsOn: string;
  days: number;
  /** The place type the table sized it for. */
  placeType: string;
  /** The table's share of the place's residents who come. */
  scale: number;
}

const table = (api: CoreAPI) =>
  api.moduleState(COMMUNITY_EVENTS_MODULE_ID).table("events");
const core = (api: CoreAPI) => api.state as CoreState;
const pad = (n: number) => String(n).padStart(2, "0");
const day = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const weekday = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();
const plus = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);

/** The first Saturday on or after a date, or the last one before the end when none is left. */
function saturdayFrom(date: string, end: string): string {
  let d = date;
  while (weekday(d) !== SATURDAY) d = plus(d, 1);
  if (d <= end) return d;
  d = end;
  while (weekday(d) !== SATURDAY) d = plus(d, -1);
  return d;
}

/** The start dates a table rule gives within one year. */
export function startDatesOf(
  rule: Readonly<Record<string, unknown>>,
  year: number,
): string[] {
  if (rule["kind"] === "fixed-date")
    return [day(year, rule["month"] as number, rule["day"] as number)];
  if (rule["kind"] === "monthly") {
    const week = rule["week"] as number;
    const out: string[] = [];
    for (let month = 1; month <= 12; month += 1) {
      let d = day(year, month, 1);
      while (weekday(d) !== SATURDAY) d = plus(d, 1);
      out.push(plus(d, 7 * (week - 1)));
    }
    return out;
  }
  const [fm, fd] = rule["from"] as [number, number];
  const [tm, td] = rule["to"] as [number, number];
  const from = day(year, fm, fd),
    to = day(year, tm, td);
  // A season that runs over New Year (school's fall and spring terms) is two stretches of the year.
  const stretches: [string, string][] =
    to < from
      ? [
          [day(year, 1, 1), to],
          [from, day(year, 12, 31)],
        ]
      : [[from, to]];
  return stretches.map(([a, b]) => {
    const mid = plus(
      a,
      Math.floor((Date.parse(b) - Date.parse(a)) / 2 / 86_400_000),
    );
    return saturdayFrom(mid, b);
  });
}

function bookYear(api: CoreAPI, year: number): void {
  const c = core(api);
  const placeKey = c.placeMetadata?.placeKey;
  const placeId = placeJurisdictionId(placeKey);
  if (!placeKey || !placeId) return;
  const calendar = moduleCalendar(c, COMMUNITY_EVENTS_MODULE_ID);
  const type = communityPlaceType(placeKey);
  // stopgapId: SG-WORLD-community-event-saturday
  api.stopgap("SG-WORLD-community-event-saturday");
  for (const event of communityEventsFor(type)) {
    for (const date of startDatesOf(event.rule, year)) {
      if (date <= c.date) continue;
      const key = `${EVENT_KIND}:${event.id}:${date}`;
      if (calendar.get(key)) continue;
      calendar.schedule({
        key,
        date,
        kind: EVENT_KIND,
        source: sourceOf(event, c.date),
        sourceRecordIds: [`community-events:${event.id}`],
        payload: { eventId: event.id, placeId, placeType: type },
      });
    }
  }
  // The year before last is no longer read.
  for (const row of table(api).rows() as unknown as CommunityEventRow[])
    if (Number(row.date.slice(0, 4)) < year - 1) {
      table(api).remove(row.id);
      calendar.forget(`${EVENT_KIND}:${row.eventId}:${row.date}`);
    }
}

function sourceOf(event: CommunityEvent, asOf: IsoDate): Source {
  return {
    tag: event.tag,
    asOf,
    citation: event.source,
    ...(event.tag === "ESTIMATED" ? { estimatedFrom: event.source } : {}),
  };
}

function writeEvent(
  api: CoreAPI,
  payload: Record<string, unknown>,
  date: string = api.state.date,
): void {
  const event = communityEventsFor(String(payload["placeType"])).find(
    (row) => row.id === payload["eventId"],
  );
  if (!event) return;
  const days = Number((event.rule as { days?: number })["days"] ?? 1);
  const id = `community-event:${payload["placeId"]}:${event.id}:${date}`;
  const row: CommunityEventRow = {
    id,
    placeId: String(payload["placeId"]),
    eventId: event.id,
    date,
    endsOn: plus(date, days - 1),
    days,
    placeType: String(payload["placeType"]),
    scale: event.scaleByType[String(payload["placeType"])] ?? 0,
  };
  table(api).put(row as unknown as ModuleRow);
}

function scheduleBooking(state: CoreState, date: string): void {
  moduleCalendar(state, COMMUNITY_EVENTS_MODULE_ID).schedule({
    key: `${BOOK_KIND}:${date}`,
    date,
    kind: BOOK_KIND,
    source: {
      tag: "ESTIMATED",
      estimatedFrom: "The table's rules book the year's events once a year.",
      asOf: state.date,
      citation: "src/core2/data/world/community-events.json",
    },
    sourceRecordIds: ["community-events:book"],
  });
}

/** The history reader's kind for a row of the table. */
export const COMMUNITY_EVENT = "community-event";

function historyOf(core: CoreState, row: CommunityEventRow): HistoryRow {
  return {
    id: row.id,
    date: row.date,
    life: "community",
    what: row.eventId,
    record: COMMUNITY_EVENT,
    from: row.date < core.startedAt ? "past" : "played",
    personIds: [],
    withIds: [],
    placeId: row.placeId,
    facts: {
      eventId: row.eventId,
      endsOn: row.endsOn,
      days: String(row.days),
      placeType: row.placeType,
      share: String(row.scale),
    },
    publicRecord: true,
  };
}

// stopgapId: SG-WORLD-community-event-no-reader
const COMMUNITY_EVENTS_HISTORY: HistorySource = {
  id: COMMUNITY_EVENTS_MODULE_ID,
  rows(core, scope, ask) {
    if (!core.modules.has(COMMUNITY_EVENTS_MODULE_ID)) return [];
    if (!ask.kinds?.includes(COMMUNITY_EVENT)) return [];
    if (!("place" in scope)) return [];
    return (
      coreAPI(core)
        .moduleState(COMMUNITY_EVENTS_MODULE_ID)
        .table("events")
        .rows() as unknown as CommunityEventRow[]
    )
      .filter((row) => row.placeId === scope.place)
      .map((row) => historyOf(core, row));
  },
  row(core, id) {
    if (!core.modules.has(COMMUNITY_EVENTS_MODULE_ID)) return undefined;
    const row = coreAPI(core)
      .moduleState(COMMUNITY_EVENTS_MODULE_ID)
      .table("events")
      .get(id) as unknown as CommunityEventRow | undefined;
    return row ? historyOf(core, row) : undefined;
  },
};

export const COMMUNITY_EVENTS_MODULE: CoreModule & HistoryModule = {
  id: COMMUNITY_EVENTS_MODULE_ID,
  // A plain field, not a getter (the finance engine's read check refuses an accessor).
  history: COMMUNITY_EVENTS_HISTORY,
  state: { schemaVersion: 1, tables: { events: {} } },
  onCalendarWork(api, work) {
    if (work.kind === EVENT_KIND)
      return void writeEvent(api, work.payload as Record<string, unknown>);
    if (work.kind !== BOOK_KIND) return;
    const year = Number(work.date.slice(0, 4));
    bookYear(api, year);
    scheduleBooking(core(api), day(year + 1, 1, 1));
    // The booking that ran before this one is finished.
    moduleCalendar(core(api), COMMUNITY_EVENTS_MODULE_ID).forget(
      `${BOOK_KIND}:${day(year - 1, 1, 1)}`,
    );
  },
};

export function openCommunityEvents(state: CoreState): void {
  if (state.modules.has(COMMUNITY_EVENTS_MODULE_ID)) return;
  registerModule(state, COMMUNITY_EVENTS_MODULE);
  // The events this year and last year have already been held on a world's first day.
  const api = coreAPI(state);
  const placeKey = state.placeMetadata?.placeKey;
  const placeId = placeJurisdictionId(placeKey);
  if (placeKey && placeId) {
    const placeType = communityPlaceType(placeKey);
    const year = Number(state.date.slice(0, 4));
    for (const event of communityEventsFor(placeType))
      for (const y of [year - 1, year])
        for (const date of startDatesOf(event.rule, y))
          if (date <= state.date)
            writeEvent(api, { eventId: event.id, placeId, placeType }, date);
  }
  // The rest of this year's events are booked tomorrow; each later year's on its January 1st.
  scheduleBooking(state, addDays(makeIsoDate(state.date), 1));
}
