/**
 * Each legislature's regular sessions by year, read from the one table
 * (`data/research/laws/state-session-calendars.json`: 2025, 2026 and 2027 for
 * the 50 states, D.C. and the five territories). The year comes from the
 * game's date; no place is named here. A year past the table repeats the
 * latest table year with the same odd/even pattern, marked ESTIMATED.
 */
import table from "../../data/research/laws/state-session-calendars.json" with { type: "json" };

export interface SessionWindow {
  readonly conveneAt: string;
  /** The sine die date, or "full-year" for a body that meets throughout the year. */
  readonly adjournAt: string;
}

export interface SessionYear {
  readonly meets: boolean;
  readonly tag: "SOURCED" | "ESTIMATED";
  readonly windows: readonly SessionWindow[];
  readonly sourceUrl: string | undefined;
}

interface YearRow {
  readonly meets: boolean;
  readonly tag: "SOURCED" | "ESTIMATED";
  readonly sessions: readonly SessionWindow[];
  readonly source: string;
  readonly sourceUrl?: string;
}

const data = table as unknown as {
  readonly sources: Record<string, { readonly url?: string }>;
  readonly places: Record<string, { readonly years: Record<string, YearRow> }>;
};

const TABLE_YEARS = Object.values(data.places).flatMap((p) =>
  Object.keys(p.years).map(Number),
);
const FIRST_YEAR = Math.min(...TABLE_YEARS);
const LAST_YEAR = Math.max(...TABLE_YEARS);

const shiftYear = (date: string, years: number): string =>
  /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? `${Number(date.slice(0, 4)) + years}${date.slice(4)}`
    : date;

/** The regular sessions a place's legislature holds in `year`; none where it doesn't meet or the place has no row. */
export function sessionYear(
  stateKey: string,
  year: number,
): SessionYear | null {
  const years = data.places[stateKey]?.years;
  if (!years) return null;
  const exact = years[String(year)];
  if (exact)
    return {
      meets: exact.meets,
      tag: exact.tag,
      windows: exact.sessions,
      sourceUrl: exact.sourceUrl || data.sources[exact.source]?.url,
    };
  // Past the table: the latest year of the same parity, moved to this year.
  let base = year > LAST_YEAR ? LAST_YEAR : FIRST_YEAR;
  if ((year - base) % 2 !== 0) base += year > LAST_YEAR ? -1 : 1;
  const row = years[String(base)];
  if (!row) return null;
  return {
    meets: row.meets,
    tag: "ESTIMATED",
    windows: row.sessions.map((s) => ({
      conveneAt: shiftYear(s.conveneAt, year - base),
      adjournAt: shiftYear(s.adjournAt, year - base),
    })),
    sourceUrl: row.sourceUrl || data.sources[row.source]?.url,
  };
}

/** The year's session windows, convening order; empty where the body doesn't meet. */
export function sessionWindows(
  stateKey: string,
  year: number,
): readonly SessionWindow[] {
  const row = sessionYear(stateKey, year);
  return row?.meets ? row.windows : [];
}

/** Every place whose legislature the calendar table records (the 50 states, D.C. and the five territories), sorted. */
export function sessionPlaces(): readonly string[] {
  return Object.keys(data.places).sort();
}
