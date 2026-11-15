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
 * (full or not), so a member filled in later knows the same colleagues. Kept
 * per body until its membership changes, so a sitting does not sort again.
 */
const knownCache = new WeakMap<
  object,
  Map<string, { sig: string; known: ReadonlyMap<string, ReadonlySet<string>> }>
>();
function knownThrough(
  api: CoreAPI,
  officeId: string,
  seats: readonly SittingSeat[],
): ReadonlyMap<string, ReadonlySet<string>> {
  const sig = seats.map((s) => `${s.personId}@${s.since}`).join("|");
  let bodies = knownCache.get(api.state);
  if (!bodies) knownCache.set(api.state, (bodies = new Map()));
  const kept = bodies.get(officeId);
  if (kept?.sig === sig) return kept.known;
  const count = knownAmong(api, Math.max(seats.length - 1, 0));
  const day = new Map(
    seats.map((s) => [s.personId, Date.parse(`${s.since}T00:00:00Z`)] as const),
  );
  const known = new Map<string, ReadonlySet<string>>();
  for (const seat of seats) {
    const others = seats.filter((s) => s.personId !== seat.personId);
    if (count < others.length) {
      const at = day.get(seat.personId)!;
      const gap = (s: SittingSeat) => Math.abs(day.get(s.personId)! - at);
      others.sort(
        (x, y) => gap(x) - gap(y) || x.personId.localeCompare(y.personId),
      );
    }
    known.set(
      seat.personId,
      new Set(others.slice(0, count).map((s) => s.personId)),
    );
  }
  bodies.set(officeId, { sig, known });
  return known;
}

/** Pairs of full members who know each other through the body, each once. */
function knownPairs(
  api: CoreAPI,
  officeId: string,
  seats: readonly SittingSeat[],
  only?: ReadonlySet<string>,
): readonly { a: SittingSeat; b: SittingSeat }[] {
  const known = knownThrough(api, officeId, seats);
  const full = new Map(
    seats
      .filter((s) => isFull(api, s.personId))
      .map((s) => [s.personId, s] as const),
  );
  // The same full members as last time read the same pairs.
  const fullSig = [...full.keys()].join("|");
  const kept = only ? undefined : pairCache.get(api.state)?.get(officeId);
  if (kept && kept.known === known && kept.fullSig === fullSig)
    return kept.pairs;
  const seen = new Set<string>();
  const pairs: { a: SittingSeat; b: SittingSeat }[] = [];
  for (const a of full.values())
    for (const id of known.get(a.personId) ?? []) {
      const b = full.get(id);
      if (!b) continue;
      if (only && !only.has(a.personId) && !only.has(b.personId)) continue;
      const [x, y] = a.personId < b.personId ? [a, b] : [b, a];
      const key = `${x.personId}|${y.personId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      pairs.push({ a: x, b: y });
    }
  if (!only) {
    let bodies = pairCache.get(api.state);
    if (!bodies) pairCache.set(api.state, (bodies = new Map()));
    bodies.set(officeId, { known, fullSig, pairs });
  }
  return pairs;
}
const pairCache = new WeakMap<
  object,
  Map<
    string,
    {
      readonly known: ReadonlyMap<string, ReadonlySet<string>>;
      readonly fullSig: string;
      readonly pairs: readonly { a: SittingSeat; b: SittingSeat }[];
    }
  >
>();

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

const DAY_MS = 86_400_000;
const dayOf = (date: string) => Date.parse(`${date}T00:00:00Z`) / DAY_MS;

/**
 * Credit each pair the given sittings they both sat, each faded to today as
 * closeness fades between contacts (a sitting not yet past counts as today).
 */
function creditPairs(
  api: CoreAPI,
  officeId: string,
  seatCount: number,
  pairs: readonly { a: SittingSeat; b: SittingSeat }[],
  sittings: readonly SittingDay[],
): void {
  const today = dayOf(api.state.date);
  const halfLife = halfLifeDays((key) => api.parameter(key), MET_KIND);
  const perDay = hoursPerSittingDay(api, seatCount);
  const two = api.parameter("two");
  const zero = api.parameter("zero");
  const weighed = sittings.map((s) => ({
    date: s.date,
    hours:
      s.days *
      perDay *
      Math.pow(two, -Math.max(zero, today - dayOf(s.date)) / halfLife),
  }));
  for (const { a, b } of pairs) {
    const since = a.since > b.since ? a.since : b.since;
    let hours = zero;
    for (const s of weighed) if (s.date >= since) hours += s.hours;
    credit(api, a.personId, b.personId, hours, officeId);
  }
}

/**
 * The body has sat: each pair of members who know each other through it
 * shares its sittings from `from` through `through` (one town meeting, or a
 * legislature's floor weeks since they were last credited).
 */
export function creditSittings(
  api: CoreAPI,
  officeId: string,
  from: string,
  through: string,
): void {
  if (!calendar) return;
  const seats = calendar.seats(api, officeId);
  if (seats.length < 2) return;
  const pairs = knownPairs(api, officeId, seats);
  if (!pairs.length) return;
  const to = new Date((dayOf(through) + 1) * DAY_MS).toISOString().slice(0, 10);
  creditPairs(
    api,
    officeId,
    seats.length,
    pairs,
    calendar.sittings(api, officeId, from, to),
  );
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
  const bodies = new Set<string>();
  for (const id of personIds)
    for (const body of calendar.bodiesOf(api, id)) bodies.add(body);
  for (const officeId of [...bodies].sort()) {
    const seats = calendar.seats(api, officeId);
    if (seats.length < 2) continue;
    const pairs = knownPairs(api, officeId, seats, personIds);
    if (!pairs.length) continue;
    const from = pairs
      .map(({ a, b }) => (a.since > b.since ? a.since : b.since))
      .sort()[0]!;
    creditPairs(
      api,
      officeId,
      seats.length,
      pairs,
      calendar.sittings(api, officeId, from, api.state.date),
    );
  }
}
