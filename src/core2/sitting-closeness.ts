/**
 * Members of a body who sit together come to know each other (pool item
 * legislature-members-have-no-tie-to-each-other). Each sitting of a town
 * council, county board, state chamber or house of Congress is time the
 * members spend together: the sitting's hours times the share of a sitting
 * spent in contact with colleagues (`sittingContactShare`), split among the
 * colleagues a body that size lets one know (`knownAmong`). In a body of five
 * that is everyone; in a house of hundreds each member knows the colleagues
 * whose service began nearest their own (they came in together and sat
 * through the same years), up to that number.
 *
 * Nothing is written for it. The hours two members have shared are a sum over
 * the body's own calendar since both sat, each sitting faded as closeness
 * fades (`closeness.ts`), so they are read when someone asks how close the two
 * are (`closenessBetween`), on day one as on any later day, and a member
 * filled in later reads as if they had been a full person all along. Each body keeps one
 * running sum over its sittings, extended as days pass, so a read is a lookup
 * and a subtraction. The body's calendar and members come from the engine
 * that keeps them: the chambers and town bodies from `world-legislating.ts`,
 * a chamber's committees and party caucuses (its smaller rooms, which sit on
 * the chamber's own days) from `office-day-state.ts`. A day a member's own
 * office day says they stayed away is a day they did not sit (`absences`).
 * Nothing rolls a die.
 */
import { halfLifeDays, registerSharedHours } from "./closeness";
import { knownAmong } from "./encounters";
import { coreAPI } from "./state";
import type { CoreAPI, CoreState, PersonId } from "./types";

/** The kind a tie between colleagues fades as. */
const COLLEAGUE_KIND = "coworker";

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
  /** True for the bodies this engine keeps. */
  readonly owns: (api: CoreAPI, officeId: string) => boolean;
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
  /**
   * The hours of one sitting day of the body its members spend in contact,
   * before they are split among the colleagues each knows there (the
   * engine's own sitting length times its contact share).
   */
  readonly contactHoursPerDay: (api: CoreAPI, officeId: string) => number;
  /** The sitting days a person stayed away from, by body, as their own record keeps them. */
  readonly absences?: (
    api: CoreAPI,
    personId: string,
  ) => ReadonlyMap<string, readonly string[]>;
}

const calendars: SittingCalendar[] = [];
/** Each engine that keeps bodies' calendars registers what it knows. */
export function registerSittingCalendar(reader: SittingCalendar): void {
  if (!calendars.includes(reader)) calendars.push(reader);
  // Registered when a world opens, never as the file loads: in an import
  // cycle the closeness module's holder may not exist yet.
  registerSharedHours(sittingHours, {
    kind: COLLEAGUE_KIND,
    knownTo: sittingKnownTo,
    together: sittingTogether,
  });
}

const DAY_MS = 86_400_000;
const days = new Map<string, number>();
/** A date's day number, each date parsed once (seats' start dates repeat in every sort). */
const dayOf = (date: string) => {
  let day = days.get(date);
  if (day === undefined) {
    day = Date.parse(`${date}T00:00:00Z`) / DAY_MS;
    days.set(date, day);
  }
  return day;
};
/** The order `localeCompare` gives, from one collator instead of one per comparison. */
const byId = new Intl.Collator().compare;
const dateOf = (day: number) =>
  new Date(day * DAY_MS).toISOString().slice(0, 10);

/** One body as of one day: its seats, who knows whom, and the hours a sitting day gives a pair. */
interface BodyToday {
  readonly since: ReadonlyMap<string, string>;
  readonly earliest: string;
  readonly known: ReadonlyMap<string, ReadonlySet<string>>;
  readonly perDay: number;
}

/** A body's sittings since its longest-serving member began, with a running sum. */
interface BodySeries {
  readonly from: number;
  through: number;
  readonly days: number[];
  readonly sums: number[];
}

/** What a world keeps for these reads: the day's part rebuilt when the day changes. */
interface Kept {
  readonly api: CoreAPI;
  readonly halfLife: number;
  date: string;
  bodiesOf: Map<string, readonly string[]>;
  absent: Map<string, ReadonlyMap<string, readonly string[]>>;
  today: Map<string, BodyToday>;
  readonly known: Map<
    string,
    { sig: string; known: ReadonlyMap<string, ReadonlySet<string>> }
  >;
  readonly series: Map<string, BodySeries>;
}
const kept = new WeakMap<object, Kept>();

function keptFor(core: CoreState): Kept {
  let k = kept.get(core);
  if (!k) {
    const api = coreAPI(core);
    k = {
      api,
      halfLife: halfLifeDays((key) => api.parameter(key), COLLEAGUE_KIND),
      date: core.date,
      bodiesOf: new Map(),
      absent: new Map(),
      today: new Map(),
      known: new Map(),
      series: new Map(),
    };
    kept.set(core, k);
  }
  if (k.date !== core.date) {
    k.date = core.date;
    k.bodiesOf = new Map();
    k.absent = new Map();
    k.today = new Map();
  }
  return k;
}

/**
 * The colleagues each member knows through the body: the `knownAmong` whose
 * service began nearest their own, ties by id, and those whose own nearest
 * include them, read over every seated member.
 * Kept until the body's seats change.
 */
function knownThrough(
  k: Kept,
  officeId: string,
  seats: readonly SittingSeat[],
): ReadonlyMap<string, ReadonlySet<string>> {
  const sig = seats.map((s) => `${s.personId}@${s.since}`).join("|");
  const held = k.known.get(officeId);
  if (held?.sig === sig) return held.known;
  const count = knownAmong(k.api, Math.max(seats.length - 1, 0));
  // Both ways: one knows a colleague who knows them (a long-serving member
  // is known to the newcomers nearest them even past their own count).
  const either = new Map<string, Set<string>>(
    seats.map((seat) => [seat.personId, new Set<string>()]),
  );
  // Every member's own call ranks the whole body by id: rank it once (each
  // member sits once; a body that lists someone twice ranks as before).
  const ids = seats.map((s) => s.personId);
  const ranks =
    new Set(ids).size === ids.length
      ? new Map([...ids].sort(byId).map((id, i) => [id, i] as const))
      : undefined;
  for (const seat of seats)
    for (const other of nearestInService(
      seat,
      seats.filter((s) => s.personId !== seat.personId),
      count,
      false,
      ranks,
    )) {
      either.get(seat.personId)!.add(other.personId);
      either.get(other.personId)!.add(seat.personId);
    }
  // Each member's set in their own order, nearest first, so a reader that
  // needs one of them in turn takes the nearest.
  const known = new Map<string, ReadonlySet<string>>();
  for (const seat of seats) {
    const mine = either.get(seat.personId)!;
    known.set(
      seat.personId,
      new Set(
        nearestInService(
          seat,
          seats.filter((s) => mine.has(s.personId)),
          mine.size,
          true,
        ).map((s) => s.personId),
      ),
    );
  }
  k.known.set(officeId, { sig, known });
  return known;
}

/**
 * The `count` of `others` one comes to know in a body's room: those whose
 * service began nearest one's own (they came in together and sat through the
 * same years); among those who began alike, the seats nearest one's own in the
 * body's order (by id, going round), so a class sworn in on one day does not
 * all come to know the same few; everyone when the room is no bigger than
 * that (in that order when `ordered`).
 */
function nearestInService(
  seat: SittingSeat,
  others: readonly SittingSeat[],
  count: number,
  ordered = false,
  /** The ids of `others` and `seat` ranked by id, when the caller already ranked them. */
  ranks?: ReadonlyMap<string, number>,
): readonly SittingSeat[] {
  if (count >= others.length && !ordered) return others;
  const at = dayOf(seat.since);
  const order = ranks
    ? undefined
    : [...others, seat].map((s) => s.personId).sort(byId);
  const place = ranks ?? new Map(order!.map((id, i) => [id, i] as const));
  const size = ranks ? ranks.size : order!.length;
  const own = ranks ? ranks.get(seat.personId)! : order!.indexOf(seat.personId);
  // Each seat's keys worked out once, not in every comparison.
  return others
    .map((s) => {
      const d = Math.abs(place.get(s.personId)! - own);
      return {
        s,
        gap: Math.abs(dayOf(s.since) - at),
        round: Math.min(d, size - d),
      };
    })
    .sort(
      (x, y) =>
        x.gap - y.gap || x.round - y.round || byId(x.s.personId, y.s.personId),
    )
    .slice(0, count)
    .map((row) => row.s);
}

function bodyToday(k: Kept, officeId: string): BodyToday {
  const held = k.today.get(officeId);
  if (held) return held;
  const reader = readerFor(k.api, officeId)!;
  const seats = reader.seats(k.api, officeId);
  const body: BodyToday = {
    since: new Map(seats.map((s) => [s.personId, s.since] as const)),
    earliest: seats.map((s) => s.since).sort()[0] ?? k.date,
    known: knownThrough(k, officeId, seats),
    perDay:
      reader.contactHoursPerDay(k.api, officeId) /
      Math.max(
        k.api.parameter("one"),
        knownAmong(k.api, Math.max(seats.length - 1, 0)),
      ),
  };
  k.today.set(officeId, body);
  return body;
}

/**
 * The body's sittings from `from` through today, each weighed by its days
 * and by 2^(day / half-life), as a running sum, so the faded days since any
 * date are one subtraction and one scaling. Extended as days pass; built
 * again if a member's service reaches back before it.
 */
function seriesFor(k: Kept, officeId: string, from: string): BodySeries {
  const start = dayOf(from);
  const today = dayOf(k.date);
  let s = k.series.get(officeId);
  if (!s || s.from > start) {
    s = { from: start, through: start - 1, days: [], sums: [] };
    k.series.set(officeId, s);
  }
  if (s.through < today) {
    for (const sitting of readerFor(k.api, officeId)!.sittings(
      k.api,
      officeId,
      dateOf(s.through + 1),
      dateOf(today + 1),
    )) {
      const day = dayOf(sitting.date);
      const last = s.sums.length ? s.sums[s.sums.length - 1]! : 0;
      s.days.push(day);
      s.sums.push(
        last + sitting.days * Math.pow(2, (day - s.from) / k.halfLife),
      );
    }
    s.through = today;
  }
  return s;
}

/** The faded sitting days of a series on or after `since`, as of today. */
function fadedDaysSince(k: Kept, s: BodySeries, since: string): number {
  const at = dayOf(since);
  let lo = 0;
  let hi = s.days.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (s.days[mid]! < at) lo = mid + 1;
    else hi = mid;
  }
  if (lo >= s.days.length) return 0;
  const before = lo ? s.sums[lo - 1]! : 0;
  return (
    (s.sums[s.sums.length - 1]! - before) *
    Math.pow(2, -(dayOf(k.date) - s.from) / k.halfLife)
  );
}

/**
 * The hours two people have shared in the sittings of a body they both sit
 * on today and know each other through, faded to today. Zero for anyone who
 * shares no body.
 */
export function sittingHours(core: object, a: PersonId, b: PersonId): number {
  if (!calendars.length) return 0;
  const state = core as CoreState;
  if (!state.modules) return 0;
  const k = keptFor(state);
  const mine = bodiesOf(k, a);
  if (!mine.length) return 0;
  const theirs = bodiesOf(k, b);
  if (!theirs.length) return 0;
  let hours = 0;
  for (const officeId of mine)
    if (theirs.includes(officeId)) hours += bodyHours(k, officeId, a, b);
  return hours;
}

/** The hours two members have shared in one body's sittings, faded to today: zero where they do not know each other there. */
function bodyHours(k: Kept, officeId: string, a: string, b: string): number {
  const body = bodyToday(k, officeId);
  if (!body.known.get(a)?.has(b)) return 0;
  const sa = body.since.get(a)!;
  const sb = body.since.get(b)!;
  const since = sa > sb ? sa : sb;
  const sat =
    fadedDaysSince(k, seriesFor(k, officeId, body.earliest), since) -
    fadedAbsence(k, officeId, a, b, since);
  return sat > 0 ? body.perDay * sat : 0;
}

/**
 * The hours two people have shared, body by body (a chamber, each committee,
 * a caucus), as `sittingHours` sums them: the trace of where a colleague's
 * tie came from.
 */
export function sittingHoursByBody(
  core: CoreState,
  a: PersonId,
  b: PersonId,
): readonly { readonly bodyId: string; readonly hours: number }[] {
  if (!calendars.length || !core.modules) return [];
  const k = keptFor(core);
  const theirs = bodiesOf(k, b);
  return bodiesOf(k, a)
    .filter((officeId) => theirs.includes(officeId))
    .map((officeId) => ({
      bodyId: officeId,
      hours: bodyHours(k, officeId, a, b),
    }));
}

/** The colleagues a person knows through the bodies they sit on today, nearest first. */
function sittingKnownTo(core: object, id: PersonId): readonly PersonId[] {
  if (!calendars.length) return [];
  const state = core as CoreState;
  if (!state.modules) return [];
  const k = keptFor(state);
  const bodies = bodiesOf(k, id);
  if (!bodies.length) return [];
  const out: PersonId[] = [];
  for (const officeId of bodies)
    for (const other of bodyToday(k, officeId).known.get(id) ?? [])
      out.push(other as PersonId);
  return out;
}

/**
 * The first and the last sitting two colleagues who know each other have
 * shared in a body they both sit on today, through today; null before their
 * first. The body is the record.
 */
function sittingTogether(
  core: object,
  a: PersonId,
  b: PersonId,
): { first: string; last: string; sourceId: string } | null {
  if (!calendars.length) return null;
  const state = core as CoreState;
  if (!state.modules) return null;
  const k = keptFor(state);
  const mine = bodiesOf(k, a);
  if (!mine.length) return null;
  const theirs = bodiesOf(k, b);
  let best: { first: string; last: string; sourceId: string } | null = null;
  for (const officeId of mine) {
    if (!theirs.includes(officeId)) continue;
    const body = bodyToday(k, officeId);
    if (!body.known.get(a)?.has(b)) continue;
    const sa = body.since.get(a)!;
    const sb = body.since.get(b)!;
    const at = dayOf(sa > sb ? sa : sb);
    const s = seriesFor(k, officeId, body.earliest);
    let lo = 0;
    let hi = s.days.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (s.days[mid]! < at) lo = mid + 1;
      else hi = mid;
    }
    if (lo >= s.days.length) continue;
    const met = {
      first: dateOf(s.days[lo]!),
      last: dateOf(s.days[s.days.length - 1]!),
      sourceId: officeId,
    };
    if (!best || met.last > best.last) best = met;
  }
  return best;
}

/** The engine that keeps a body. */
function readerFor(
  api: CoreAPI,
  officeId: string,
): SittingCalendar | undefined {
  return calendars.find((c) => c.owns(api, officeId));
}

/** The bodies a person sits on today, from every engine that keeps bodies, kept for the day. */
function bodiesOf(k: Kept, id: string): readonly string[] {
  let held = k.bodiesOf.get(id);
  if (!held) {
    held = calendars.flatMap((c) => c.bodiesOf(k.api, id));
    k.bodiesOf.set(id, held);
  }
  return held;
}

/** The sitting days of each body a person stayed away from, kept for the day. */
function absencesOf(
  k: Kept,
  id: string,
): ReadonlyMap<string, readonly string[]> {
  let held = k.absent.get(id);
  if (!held) {
    const all = new Map<string, string[]>();
    for (const c of calendars)
      for (const [body, dates] of c.absences?.(k.api, id) ?? [])
        all.set(body, [...(all.get(body) ?? []), ...dates]);
    held = all;
    k.absent.set(id, held);
  }
  return held;
}

/**
 * The faded days on or after `since` that either of two members stayed away
 * from a body's sittings: days they did not sit together. Each day fades as a
 * sitting day does.
 */
function fadedAbsence(
  k: Kept,
  officeId: string,
  a: string,
  b: string,
  since: string,
): number {
  const away = new Set([
    ...(absencesOf(k, a).get(officeId) ?? []),
    ...(absencesOf(k, b).get(officeId) ?? []),
  ]);
  if (!away.size) return 0;
  const today = dayOf(k.date);
  let sum = 0;
  for (const date of away)
    if (date >= since && date <= k.date)
      sum += Math.pow(2, (dayOf(date) - today) / k.halfLife);
  return sum;
}

/**
 * Why a person reads no tie from any sitting: they sit on no body, their
 * bodies have not sat since their service began (a member sworn in before
 * the first sitting), or the colleagues they know through it are not yet full
 * people (another state's officials, filled in when opened). Null when some
 * sitting does tie them. Read by checks that every official knows someone.
 */
export function noSittingTie(
  core: CoreState,
  personId: PersonId,
): "no-body" | "no-sitting-yet" | "known-colleagues-not-full" | null {
  if (!calendars.length) return "no-body";
  const k = keptFor(core);
  const bodies = bodiesOf(k, personId);
  if (!bodies.length) return "no-body";
  let sat = false;
  for (const officeId of bodies) {
    const body = bodyToday(k, officeId);
    const since = body.since.get(personId);
    if (!since) continue;
    if (!fadedDaysSince(k, seriesFor(k, officeId, body.earliest), since))
      continue;
    sat = true;
    for (const other of body.known.get(personId) ?? [])
      if (sittingHours(core, personId, other as PersonId) > 0) return null;
  }
  return sat ? "known-colleagues-not-full" : "no-sitting-yet";
}

/**
 * A meeting with no calendar of its own (the governor's with the
 * legislature's leaders) is shared by the sitting's own rule: one comes to know the
 * `knownAmong(room - 1)` there whose service in the body began nearest one's
 * own, and the meeting's hours times `sittingContactShare` are split among
 * them. Returns those colleagues and the hours each pair gets. A colleague the
 * body does not list as seated is placed last.
 */
export function roomTime(
  api: CoreAPI,
  officeId: string,
  holderId: string,
  roomIds: readonly string[],
  hours: number,
): { readonly ids: readonly string[]; readonly hours: number } {
  const seats = new Map(
    (readerFor(api, officeId)?.seats(api, officeId) ?? []).map((s) => [
      s.personId,
      s.since,
    ]),
  );
  const holderSince = seats.get(holderId) ?? api.state.date;
  const others = roomIds
    .filter((id) => id !== holderId)
    .map((id) => ({ personId: id, since: seats.get(id) ?? "" }));
  const count = knownAmong(api, others.length);
  const placed = others.filter((s) => s.since);
  const known = [
    ...nearestInService(
      { personId: holderId, since: holderSince },
      placed,
      count,
    ),
    ...others
      .filter((s) => !s.since)
      .sort((x, y) => x.personId.localeCompare(y.personId)),
  ].slice(0, count);
  return {
    ids: known.map((s) => s.personId),
    hours:
      (hours * api.parameter("sittingContactShare")) /
      Math.max(api.parameter("one"), count),
  };
}
