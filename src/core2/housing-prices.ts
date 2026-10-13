/**
 * Home prices over time: FHFA's all-transactions house price index for each
 * state, quarterly from 1985 through its latest quarter. Past the latest
 * quarter, and where FHFA has no rows (Puerto Rico and the island areas),
 * prices follow consumer prices (CPI-U) instead.
 */
import housingData from "./data/housing/housing.json" with { type: "json" };
import history from "./data/macro/history.json" with { type: "json" };
import { stopgap } from "./stopgaps";

const HPI = housingData.housePriceIndex.states as unknown as Record<
  string,
  Record<string, number>
>;
const CPI = new Map(
  (history.annualCpi as { year: number; index: number }[]).map((row) => [
    row.year,
    row.index,
  ]),
);
const CPI_YEARS = [...CPI.keys()].sort((a, b) => a - b);
/** ACS 2020-2024 five-year values are dated at the window's middle. */
export const ACS_VALUE_DATE = "2022-07-01";

function cpiAt(year: number): number {
  const at = Math.min(Math.max(year, CPI_YEARS[0]!), CPI_YEARS.at(-1)!);
  return CPI.get(at)!;
}

function quarterKey(date: string): string {
  const month = Number(date.slice(5, 7));
  return `${date.slice(0, 4)}-Q${Math.ceil(month / 3)}`;
}

/** A price level by date (the economy's simulated consumer prices), when the caller has one. */
export type PriceLevel = (date: string) => number | undefined;

function priceRatio(from: string, to: string, level?: PriceLevel): number {
  const a = level?.(from),
    b = level?.(to);
  if (a && b) return b / a;
  return cpiAt(Number(to.slice(0, 4))) / cpiAt(Number(from.slice(0, 4)));
}

/** The state's index on a date; null when FHFA has no rows for it. */
/** Each state's index quarters in order, sorted once. */
const SORTED_QUARTERS = new Map<string, string[]>();

function indexAt(
  usps: string,
  date: string,
  level?: PriceLevel,
): number | null {
  const rows = HPI[usps];
  if (!rows) return null;
  const key = quarterKey(date);
  if (rows[key] !== undefined) return rows[key]!;
  let keys = SORTED_QUARTERS.get(usps);
  if (!keys) SORTED_QUARTERS.set(usps, (keys = Object.keys(rows).sort()));
  if (key < keys[0]!) return rows[keys[0]!]!;
  // Past the latest quarter, the latest index moved with consumer prices since.
  const last = keys.at(-1)!;
  stopgap("SG-WORLD-housing-price-index");
  const lastDate = `${last.slice(0, 4)}-${String(Number(last.slice(-1)) * 3 - 1).padStart(2, "0")}-15`;
  return rows[last]! * priceRatio(lastDate, date, level);
}

/** How much a home's price moved from one date to another in a state. */
export function homePriceRatio(
  usps: string,
  from: string,
  to: string,
  level?: PriceLevel,
): number {
  const a = indexAt(usps, from, level),
    b = indexAt(usps, to, level);
  if (a && b) return b / a;
  // No state index (Puerto Rico, the island areas): consumer prices stand in.
  stopgap("SG-WORLD-housing-price-index");
  return priceRatio(from, to, level);
}
