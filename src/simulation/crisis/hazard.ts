import { addDays, dateAtAge, daysBetween, makeIsoDate } from "../dates";
import type { IsoDate } from "../types";
import {
  doubledAgeYearHazard,
  type MortalityCalibrationCategory,
} from "./mortality-table";

/**
 * Cumulative all-cause hazard with exact age-year splitting.
 *
 * Inside the age-year that starts on birthday a and lasts D days, one
 * simulated day carries H_a / D of hazard, times any represented multiplier.
 * The accumulated total from a fixed exposure start is a pure function of
 * dates and records. A person dies on the first day whose end pushes that
 * total to their stable threshold −ln(u). Because nothing is rolled per
 * period, splitting a time skip at any boundary cannot change the day.
 *
 * All values are integers in one common unit so the comparison is exact:
 *   unit = hazard · FIXED_SCALE · 2 · MULTIPLIER_ONE · DAY_LCM
 */

/** Least common multiple of 365 and 366: every age-year length divides it. */
const DAY_LCM = 133_590n;
export const MULTIPLIER_ONE = 1_000_000;
const MULTIPLIER_ONE_BIG = BigInt(MULTIPLIER_ONE);

export interface HazardMultiplierChange {
  /** From this date (inclusive) the multiplier applies until the next change. */
  readonly effectiveAt: IsoDate;
  /** Millionths: 1,000,000 is the ordinary table hazard. */
  readonly micros: number;
}

export interface HazardProfile {
  readonly birthDate: IsoDate;
  readonly category: MortalityCalibrationCategory;
  /** First day the model exposes this person; earlier days carry no hazard. */
  readonly exposureStart: IsoDate;
  /** Sorted by date; later same-date entries win. */
  readonly multipliers: readonly HazardMultiplierChange[];
}

export function thresholdUnits(threshold: bigint): bigint {
  return threshold * 2n * MULTIPLIER_ONE_BIG * DAY_LCM;
}

interface Segment {
  readonly start: IsoDate;
  readonly days: number;
  /** Hazard units carried by each day of the segment. */
  readonly perDay: bigint;
}

function ageAt(birthDate: IsoDate, date: IsoDate): number {
  // The age whose age-year contains `date` (birthday inclusive).
  let age = Number(date.slice(0, 4)) - Number(birthDate.slice(0, 4));
  if (age > 0 && dateAtAge(birthDate, age) > date) age -= 1;
  return Math.max(age, 0);
}

function multiplierAt(profile: HazardProfile, date: IsoDate): number {
  let micros = MULTIPLIER_ONE;
  for (const change of profile.multipliers) {
    if (change.effectiveAt <= date) micros = change.micros;
    else break;
  }
  return micros;
}

function nextMultiplierChange(
  profile: HazardProfile,
  after: IsoDate,
): IsoDate | null {
  for (const change of profile.multipliers)
    if (change.effectiveAt > after) return change.effectiveAt;
  return null;
}

/** Constant-rate segments covering [from, to). */
function* segments(
  profile: HazardProfile,
  from: IsoDate,
  to: IsoDate,
): Generator<Segment> {
  let cursor = from < profile.birthDate ? profile.birthDate : from;
  while (cursor < to) {
    const age = ageAt(profile.birthDate, cursor);
    const ageStart = dateAtAge(profile.birthDate, age);
    const ageEnd = dateAtAge(profile.birthDate, age + 1);
    const yearDays = BigInt(daysBetween(ageStart, ageEnd));
    let end = ageEnd < to ? ageEnd : to;
    const change = nextMultiplierChange(profile, cursor);
    if (change !== null && change < end) end = change;
    const micros = BigInt(multiplierAt(profile, cursor));
    yield {
      start: cursor,
      days: daysBetween(cursor, end),
      // DAY_LCM is a multiple of every age-year length, so this is exact.
      perDay:
        doubledAgeYearHazard(age, profile.category) *
        micros *
        (DAY_LCM / yearDays),
    };
    cursor = end;
  }
}

/** Hazard units accumulated over [exposureStart, until). */
export function cumulativeHazardUnits(
  profile: HazardProfile,
  until: IsoDate,
): bigint {
  const end = makeIsoDate(until);
  let total = 0n;
  if (end <= profile.exposureStart) return total;
  for (const segment of segments(profile, profile.exposureStart, end))
    total += segment.perDay * BigInt(segment.days);
  return total;
}

/**
 * The first day in [from, to) on which accumulated hazard reaches the
 * threshold, or null. `from` must not precede the exposure start.
 */
export function firstThresholdDay(
  profile: HazardProfile,
  thresholdHazardUnits: bigint,
  from: IsoDate,
  to: IsoDate,
): IsoDate | null {
  const start = from < profile.exposureStart ? profile.exposureStart : from;
  let total = cumulativeHazardUnits(profile, start);
  if (total >= thresholdHazardUnits) return start;
  for (const segment of segments(profile, start, to)) {
    const after = total + segment.perDay * BigInt(segment.days);
    if (after >= thresholdHazardUnits && segment.perDay > 0n) {
      const needed = thresholdHazardUnits - total;
      // Smallest j ≥ 0 with total + perDay·(j + 1) ≥ threshold.
      const j = (needed + segment.perDay - 1n) / segment.perDay - 1n;
      return addDays(segment.start, Number(j));
    }
    total = after;
  }
  return null;
}
