/**
 * Siblings are born months apart, never days, unless marked as twins. Each
 * household member's birthday is drawn on its own, so two can land a week
 * apart; this places them `siblingBirthGapDays` apart or more. A sibling
 * drawn too close to one already placed moves to the nearest day far
 * enough from every placed sibling: within the year that keeps their age on
 * the opening day where it has room, else anywhere that keeps a minor a
 * minor and a grown child grown.
 */
import type { IsoDate } from "./kernel/brands";
import {
  addDays,
  ageOnDate,
  daysBetween,
  isoDateFromParts,
  makeIsoDate,
} from "./kernel/dates";
import { parameter as p } from "./parameters";

/** The date `years` years before `on` (a February 29 falls to the 28th). */
function yearsBack(on: IsoDate, years: number): IsoDate {
  const [year, month, day] = on.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const leapDay = month === 2 && day === 29;
  try {
    return isoDateFromParts(year - years, month, day);
  } catch (error) {
    if (!leapDay) throw error;
    return isoDateFromParts(year - years, month, day - p("one"));
  }
}

/**
 * New birth dates for one set of siblings, in the order given. `on` is the
 * day ages are read on (the opening day); `fixed` are births that stay put
 * (the player's own chosen birthday). Siblings are placed oldest first, and
 * one already far enough from every placed sibling keeps the day it drew.
 */
export function spacedSiblingBirths(
  on: string,
  births: readonly string[],
  fixed: readonly string[] = [],
): IsoDate[] {
  const start = makeIsoDate(on);
  const gap = p("siblingBirthGapDays");
  const adultAge = p("votingAge");
  const dayOf = (date: string) => daysBetween(start, makeIsoDate(date));
  const placed = fixed.map(dayOf);
  const clear = (day: number) =>
    placed.every((other) => Math.abs(day - other) >= gap);
  // The allowed day nearest the drawn one, the earlier of two as near.
  const nearest = (drawn: number, low: number, high: number) =>
    [drawn, ...placed.flatMap((other) => [other - gap, other + gap])]
      .filter((day) => day >= low && day <= high && clear(day))
      .sort((a, b) => Math.abs(a - drawn) - Math.abs(b - drawn) || a - b)[0];
  const out = births.map(makeIsoDate);
  const order = births
    .map((date, index) => ({ date, index }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.index - b.index);
  for (const { date, index } of order) {
    const drawn = dayOf(date);
    if (clear(drawn)) {
      placed.push(drawn);
      continue;
    }
    const age = ageOnDate(date, start);
    // The year of birth that keeps their age on the opening day.
    const yearLow = dayOf(addDays(yearsBack(start, age + p("one")), p("one")));
    const yearHigh = dayOf(yearsBack(start, age));
    // A minor stays under 18 and born by the opening day; a grown child stays
    // 18 or older.
    const minor = age < adultAge;
    const rangeLow = minor
      ? dayOf(addDays(yearsBack(start, adultAge), p("one")))
      : Number.NEGATIVE_INFINITY;
    const rangeHigh = minor ? p("zero") : dayOf(yearsBack(start, adultAge));
    const day =
      nearest(drawn, yearLow, yearHigh) ??
      nearest(drawn, rangeLow, rangeHigh) ??
      drawn;
    placed.push(day);
    out[index] = addDays(start, day);
  }
  return out;
}
