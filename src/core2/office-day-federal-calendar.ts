/**
 * Congress's working calendar for the federal day (office play, FEDERAL).
 *
 * Which days the House sits, which the Senate sits, the federal holidays and
 * the president's address to a joint session, all read from one table
 * (`data/office-day/federal-calendar.json`): the House Majority Leader's
 * published calendars and the Senate's schedules, cited row by row. A week
 * with a House sitting is a Washington week; any other week is a district
 * week. A year past the table repeats the latest table year of the same
 * parity (a first session after a first session, an election year after an
 * election year), moved to the same week and weekday, marked ESTIMATED.
 * Nothing names a place: Congress is one body for all 56.
 */
import table from "./data/office-day/federal-calendar.json" with { type: "json" };

export type CalendarTag = "SOURCED" | "ESTIMATED";
export type FederalChamber = "house" | "senate";

interface HouseYear {
  readonly tag: CalendarTag;
  readonly source: string;
  readonly sourceUrl: string;
  readonly sessionDays: readonly string[];
}

interface SenateYear {
  readonly tag: CalendarTag;
  readonly source: string;
  readonly sourceUrl: string;
  readonly workPeriods: readonly (readonly [string, string])[];
}

interface AddressYear {
  readonly date: string;
  readonly kind: "joint-address" | "state-of-the-union";
  readonly tag: CalendarTag;
  readonly source: string;
  readonly sourceUrl: string;
}

const data = table as unknown as {
  readonly house: Record<string, HouseYear>;
  readonly senate: Record<string, SenateYear>;
  readonly jointAddress: { readonly years: Record<string, AddressYear> };
  readonly holidays: {
    readonly citation: string;
    readonly fixed: readonly (readonly [string, string])[];
    readonly nthWeekday: readonly {
      readonly id: string;
      readonly month: number;
      readonly weekday: number;
      readonly nth: number;
    }[];
    readonly inauguration: {
      readonly id: string;
      readonly monthDay: string;
      readonly everyYears: number;
      readonly fromYear: number;
    };
  };
};

const DAY_MS = 86_400_000;
const toMs = (date: string) => Date.parse(`${date}T00:00:00Z`);
const fromMs = (ms: number) => new Date(ms).toISOString().slice(0, 10);
export const addDays = (date: string, days: number): string =>
  fromMs(toMs(date) + days * DAY_MS);
/** 0 Sunday .. 6 Saturday. */
const weekday = (date: string) => new Date(toMs(date)).getUTCDay();

/** The table year a year reads: itself, else the latest (or earliest) table year of the same parity. */
function baseYear(years: readonly number[], year: number): number {
  if (years.includes(year)) return year;
  const last = Math.max(...years);
  const first = Math.min(...years);
  let base = year > last ? last : first;
  if ((year - base) % 2 !== 0) base += year > last ? -1 : 1;
  return base;
}

/** Whole weeks from a table year to a later or earlier one, so a weekday stays a weekday. */
const weekShift = (from: number, to: number) =>
  Math.round(((to - from) * 365.2425) / 7) * 7;

const tableYears = (rows: Record<string, unknown>) =>
  Object.keys(rows).map(Number);

export interface Sitting {
  readonly sits: boolean;
  readonly tag: CalendarTag;
  readonly sourceUrl: string;
}

const houseCache = new Map<number, { set: Set<string>; row: HouseYear }>();

function houseYear(year: number): { set: Set<string>; row: HouseYear } {
  const cached = houseCache.get(year);
  if (cached) return cached;
  const base = baseYear(tableYears(data.house), year);
  const row = data.house[String(base)]!;
  const shift = weekShift(base, year);
  const set = new Set(
    row.sessionDays
      .map((d) => addDays(d, shift))
      .filter((d) => d.startsWith(String(year))),
  );
  const built = {
    set,
    row: base === year ? row : { ...row, tag: "ESTIMATED" as const },
  };
  houseCache.set(year, built);
  return built;
}

/** Whether the House sits on a date (its published calendar's "in session" days). */
export function houseSits(date: string): Sitting {
  const { set, row } = houseYear(Number(date.slice(0, 4)));
  return { sits: set.has(date), tag: row.tag, sourceUrl: row.sourceUrl };
}

/** Whether the Senate sits: a weekday outside its state work periods and the federal holidays. */
export function senateSits(date: string): Sitting {
  const year = Number(date.slice(0, 4));
  const base = baseYear(tableYears(data.senate), year);
  const row = data.senate[String(base)]!;
  const shift = weekShift(base, year);
  const day = weekday(date);
  const away = row.workPeriods.some(
    ([from, to]) => date >= addDays(from, shift) && date <= addDays(to, shift),
  );
  return {
    sits: day !== 0 && day !== 6 && !away && !federalHoliday(date),
    tag: base === year ? row.tag : "ESTIMATED",
    sourceUrl: row.sourceUrl,
  };
}

export function chamberSits(chamber: FederalChamber, date: string): Sitting {
  return chamber === "house" ? houseSits(date) : senateSits(date);
}

/** The Monday of a date's week. */
export const weekOf = (date: string): string =>
  addDays(date, -((weekday(date) + 6) % 7));

/** A Washington week has at least one sitting of the chamber; any other week is a district (or state) work week. */
export function washingtonWeek(chamber: FederalChamber, date: string): boolean {
  const monday = weekOf(date);
  for (let i = 0; i < 7; i++)
    if (chamberSits(chamber, addDays(monday, i)).sits) return true;
  return false;
}

/** The sitting days of a chamber in a week (Monday first). */
export function sittingsInWeek(
  chamber: FederalChamber,
  date: string,
): readonly string[] {
  const monday = weekOf(date);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i)).filter(
    (d) => chamberSits(chamber, d).sits,
  );
}

const holidayCache = new Map<number, Map<string, string>>();

/** The federal holidays of a year as observed (5 U.S.C. 6103), by date. */
export function federalHolidays(year: number): ReadonlyMap<string, string> {
  const cached = holidayCache.get(year);
  if (cached) return cached;
  const out = new Map<string, string>();
  const observe = (date: string, id: string) => {
    const day = weekday(date);
    out.set(
      day === 6 ? addDays(date, -1) : day === 0 ? addDays(date, 1) : date,
      id,
    );
  };
  for (const [monthDay, id] of data.holidays.fixed)
    observe(`${year}-${monthDay}`, id);
  for (const rule of data.holidays.nthWeekday) {
    const mm = String(rule.month).padStart(2, "0");
    if (rule.nth > 0) {
      const first = `${year}-${mm}-01`;
      const offset = (rule.weekday - weekday(first) + 7) % 7;
      out.set(addDays(first, offset + (rule.nth - 1) * 7), rule.id);
    } else {
      const next =
        rule.month === 12
          ? `${year + 1}-01-01`
          : `${year}-${String(rule.month + 1).padStart(2, "0")}-01`;
      const last = addDays(next, -1);
      out.set(
        addDays(last, -((weekday(last) - rule.weekday + 7) % 7)),
        rule.id,
      );
    }
  }
  const inaug = data.holidays.inauguration;
  if (
    year >= inaug.fromYear &&
    (year - inaug.fromYear) % inaug.everyYears === 0
  ) {
    const date = `${year}-${inaug.monthDay}`;
    // Falling on a Sunday, the oath and the holiday move to Monday (U.S. Const. amend. XX practice).
    out.set(weekday(date) === 0 ? addDays(date, 1) : date, inaug.id);
  }
  holidayCache.set(year, out);
  return out;
}

export function federalHoliday(date: string): string | null {
  return federalHolidays(Number(date.slice(0, 4))).get(date) ?? null;
}

export interface JointAddress {
  readonly date: string;
  readonly kind: "joint-address" | "state-of-the-union";
  readonly tag: CalendarTag;
  readonly sourceUrl: string;
}

/**
 * The president's address to a joint session in a year. A year past the table
 * takes the table year of the same place in the four-year term (a new term's
 * first-year address, or a State of the Union), moved to the same week and
 * weekday, ESTIMATED.
 */
export function jointAddress(year: number): JointAddress {
  const rows = data.jointAddress.years;
  const years = tableYears(rows);
  const termYear = (y: number) => (((y - 2025) % 4) + 4) % 4;
  const base =
    rows[String(year)] !== undefined
      ? year
      : (years.find((y) => termYear(y) === termYear(year)) ??
        years.find((y) => termYear(y) !== 0 && termYear(year) !== 0) ??
        Math.max(...years));
  const row = rows[String(base)]!;
  const kind =
    base === year
      ? row.kind
      : termYear(year) === 0
        ? "joint-address"
        : "state-of-the-union";
  return {
    date: addDays(row.date, weekShift(base, year)),
    kind,
    tag: base === year ? row.tag : "ESTIMATED",
    sourceUrl: row.sourceUrl,
  };
}

/**
 * The day the president's budget request is due: on or after the first
 * Monday in January and not later than the first Monday in February
 * (31 U.S.C. sec. 1105(a)); the game takes the last day the law allows.
 */
export function budgetRequestDate(year: number): {
  readonly date: string;
  readonly citation: string;
} {
  const first = `${year}-02-01`;
  const date = addDays(first, (1 - weekday(first) + 7) % 7);
  return { date, citation: "31 U.S.C. sec. 1105(a)" };
}

/** The `n`th day after `from` on which a chamber sits (the first sitting after `from` is the first). */
export function nthSitting(
  chamber: FederalChamber,
  from: string,
  n: number,
): string {
  let date = from;
  let seen = 0;
  // A year holds over a hundred sittings; four years bound any wait.
  for (let i = 0; i < 1461; i++) {
    date = addDays(date, 1);
    if (chamberSits(chamber, date).sits && ++seen >= n) return date;
  }
  return date;
}
