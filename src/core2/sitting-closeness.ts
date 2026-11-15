/**
 * Members of a body who sit together come to know each other (pool item
 * legislature-members-have-no-tie-to-each-other): a reader of the
 * shared-time mechanism (`shared-time.ts`), like work-closeness.ts for
 * coworkers. Each sitting day of a town council, county board, state chamber
 * or house of Congress, every pair of members who know each other through the
 * body is credited the sitting's minutes, times the share of a sitting spent
 * in contact with colleagues (`sittingContactShare`), split among the
 * colleagues a body that size lets one know (`knownAmong`). In a body of five
 * that is everyone; in a house of hundreds each member knows the colleagues
 * whose service began nearest their own (they came in together and sat
 * through the same years), up to that number. A pair that has not met meets
 * at the sitting, the first tie holding the sitting's hours.
 *
 * The opening and a person filled in later get the same ties as if the
 * sittings had been credited one by one: each pair is credited every sitting
 * since both sat, from the body's own calendar, each faded by the days since
 * as closeness fades (`closeness.ts`). A member who is not a full person (a
 * husk) is not credited; when they are filled in, the sittings they shared
 * are credited then, so nothing is counted twice and nothing is lost. The
 * body's calendar and its members come from the engines that keep them,
 * registered by `world-legislating.ts`. Nothing rolls a die.
 */
import { halfLifeDays } from "./closeness";
import { knownAmong } from "./encounters";
import { daysBetweenText } from "./kernel/dates";
import { creditSharedTime } from "./shared-time";
import type { CoreAPI, PersonId } from "./types";

export const SITTING_TIME_CAUSE = "sat together in the body's sittings";
/** The kind a first tie made at a sitting takes (`api.meet` writes a contact). */
const MET_KIND = "contact";

/** A member seated on a body, and the day their unbroken service in the seat began. */
export interface SittingSeat {
  readonly personId: string;
  readonly since: string;
}

/** One sitting day of a body (a town meeting, or a legislature's floor week and its floor days). */
export interface SittingDay {
  readonly date: string;
  readonly days: number;
}

/** What the engine that keeps the bodies' calendars and seats says. */
export interface SittingCalendar {
  /** The members seated on the body today. */
  readonly seats: (api: CoreAPI, officeId: string) => readonly SittingSeat[];
  /** The bodies a person sits on today. */
  readonly bodiesOf: (api: CoreAPI, personId: string) => readonly string[];
  /** The body's sittings on or after `from` and before `to`, from its own calendar. */
  readonly sittings: (
    api: CoreAPI,
    officeId: string,
    from: string,
    to: string,
  ) => readonly SittingDay[];
  /** Hours one sitting day takes (the engine's own sitting length). */
  readonly hoursPerDay: (api: CoreAPI) => number;
}

let calendar: SittingCalendar | null = null;
/** The engine that keeps the bodies' calendars registers what it knows. */
export function registerSittingCalendar(reader: SittingCalendar): void {
  calendar = reader;
}

const isFull = (api: CoreAPI, id: string) =>
  api.state.people.get(id as PersonId)?.alive === true;

/**
 * The colleagues each member knows through the body: the `knownAmong` whose
 * service began nearest their own, ties by id. Read over every seated member
 * (full or not), so a member filled in later knows the same colleagues.
 */
function nearest(
  api: CoreAPI,
  seats: readonly SittingSeat[],
  seat: SittingSeat,
  count: number,
): ReadonlySet<string> {
  if (count >= seats.length - 1)
    return new Set(
      seats.filter((s) => s.personId !== seat.personId).map((s) => s.personId),
    );
  const gap = (s: SittingSeat) =>
    Math.abs(daysBetweenText(seat.since, s.since));
  return new Set(
    seats
      .filter((s) => s.personId !== seat.personId)
      .sort((a, b) => gap(a) - gap(b) || a.personId.localeCompare(b.personId))
      .slice(0, count)
      .map((s) => s.personId),
  );
}

/** Pairs of full members who know each other through the body, each once, keyed by the smaller id. */
function knownPairs(
  api: CoreAPI,
  seats: readonly SittingSeat[],
  only?: ReadonlySet<string>,
): { a: SittingSeat; b: SittingSeat }[] {
  const count = knownAmong(api, Math.max(seats.length - 1, 0));
  const full = seats.filter((s) => isFull(api, s.personId));
  const known = new Map(
    full.map((s) => [s.personId, nearest(api, seats, s, count)] as const),
  );
  const pairs: { a: SittingSeat; b: SittingSeat }[] = [];
  for (const [i, a] of full.entries())
    for (const b of full.slice(i + 1)) {
      if (only && !only.has(a.personId) && !only.has(b.personId)) continue;
      if (
        known.get(a.personId)!.has(b.personId) ||
        known.get(b.personId)!.has(a.personId)
      )
        pairs.push({ a, b });
    }
  return pairs;
}

/** Hours of contact one pair gets from one sitting day, before fading. */
function hoursPerSittingDay(api: CoreAPI, seats: number): number {
  return (
    calendar!.hoursPerDay(api) *
    (api.parameter("sittingContactShare") /
      Math.max(api.parameter("one"), knownAmong(api, Math.max(seats - 1, 0))))
  );
}

/** Credit a pair their hours: meeting first if they have not met. */
function credit(
  api: CoreAPI,
  a: string,
  b: string,
  hours: number,
  officeId: string,
): void {
  if (!(hours > api.parameter("zero"))) return;
  const sourceId = `sitting:${officeId}`;
  const met = api.meet(a as PersonId, b as PersonId, {
    placeId: officeId,
    sourceId,
    cause: SITTING_TIME_CAUSE,
    hours,
  });
  if (met) return;
  creditSharedTime(api, {
    a: a as PersonId,
    b: b as PersonId,
    minutes: hours * api.parameter("minutesPerHour"),
    contactShare: api.parameter("one"),
    room: api.parameter("one"),
    kind: "coworker",
    cause: SITTING_TIME_CAUSE,
    sourceId,
  });
}

/** The body sits today: each pair of members who know each other through it shares the sitting. */
export function creditSitting(
  api: CoreAPI,
  officeId: string,
  days: number,
): void {
  if (!calendar) return;
  const seats = calendar.seats(api, officeId);
  if (seats.length < 2) return;
  const hours = days * hoursPerSittingDay(api, seats.length);
  for (const { a, b } of knownPairs(api, seats))
    credit(api, a.personId, b.personId, hours, officeId);
}

/**
 * Credit the sittings people have already shared, before today: at the
 * opening for every member, and for a member filled in later. Each pair is
 * credited once, every sitting since both sat faded to today.
 */
export function catchUpSittings(
  api: CoreAPI,
  personIds: ReadonlySet<string>,
): void {
  if (!calendar || personIds.size === 0) return;
  const today = api.state.date;
  const halfLife = halfLifeDays((key) => api.parameter(key), MET_KIND);
  const bodies = new Set<string>();
  for (const id of personIds)
    for (const body of calendar.bodiesOf(api, id)) bodies.add(body);
  for (const officeId of [...bodies].sort()) {
    const seats = calendar.seats(api, officeId);
    if (seats.length < 2) continue;
    const pairs = knownPairs(api, seats, personIds);
    if (!pairs.length) continue;
    const from = pairs
      .map(({ a, b }) => (a.since > b.since ? a.since : b.since))
      .sort()[0]!;
    const sittings = calendar.sittings(api, officeId, from, today);
    const perDay = hoursPerSittingDay(api, seats.length);
    for (const { a, b } of pairs) {
      const since = a.since > b.since ? a.since : b.since;
      let hours = api.parameter("zero");
      for (const s of sittings)
        if (s.date >= since)
          hours +=
            s.days *
            perDay *
            Math.pow(
              api.parameter("two"),
              -daysBetweenText(s.date, today) / halfLife,
            );
      credit(api, a.personId, b.personId, hours, officeId);
    }
  }
}
