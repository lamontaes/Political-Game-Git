// Lifted unchanged from src/simulation/dates.ts; RULES-3, 2026-10-11.
import type { IsoDate } from "../../simulation/types";

export const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function utcDate(year: number, month: number, day: number): Date {
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  return date;
}

export const VALID_ISO_DATES_LIMIT = 100_000;

export const VALID_ISO_DATES = new Set<string>();

export function makeIsoDate(value: string): IsoDate {
  if (VALID_ISO_DATES.has(value)) return value as IsoDate;
  const date = validateIsoDate(value);
  if (VALID_ISO_DATES.size >= VALID_ISO_DATES_LIMIT) VALID_ISO_DATES.clear();
  VALID_ISO_DATES.add(value);
  return date;
}

export function validateIsoDate(value: string): IsoDate {
  const match = ISO_DATE_PATTERN.exec(value);

  if (!match) {
    throw new Error(`Invalid ISO date: ${value}`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = utcDate(year, month, day);

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error(`Invalid calendar date: ${value}`);
  }

  return value as IsoDate;
}

export function isoDateFromParts(
  year: number,
  month: number,
  day: number,
): IsoDate {
  return makeIsoDate(
    `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day
      .toString()
      .padStart(2, "0")}`,
  );
}

export function addDays(date: IsoDate, days: number): IsoDate {
  if (!Number.isSafeInteger(days)) {
    throw new Error("Days must be a safe integer.");
  }

  const validatedDate = makeIsoDate(date);
  const match = ISO_DATE_PATTERN.exec(validatedDate);

  if (!match) {
    throw new Error(`Invalid ISO date: ${date}`);
  }

  const parsed = utcDate(Number(match[1]), Number(match[2]), Number(match[3]));
  parsed.setUTCDate(parsed.getUTCDate() + days);

  return isoDateFromParts(
    parsed.getUTCFullYear(),
    parsed.getUTCMonth() + 1,
    parsed.getUTCDate(),
  );
}

export const EPOCH_DAY_CACHE_LIMIT = 100_000;

export const EPOCH_DAY_CACHE = new Map<string, number>();

export function epochDayOf(date: string): number {
  const cached = EPOCH_DAY_CACHE.get(date);
  if (cached !== undefined) return cached;
  const valid = makeIsoDate(date);
  const parts = ISO_DATE_PATTERN.exec(valid);
  if (!parts) throw new Error("Unable to compare invalid ISO dates.");
  const day =
    utcDate(Number(parts[1]), Number(parts[2]), Number(parts[3])).getTime() /
    86_400_000;
  if (EPOCH_DAY_CACHE.size >= EPOCH_DAY_CACHE_LIMIT) EPOCH_DAY_CACHE.clear();
  EPOCH_DAY_CACHE.set(date, day);
  return day;
}

export function daysBetween(start: IsoDate, end: IsoDate): number {
  const difference = epochDayOf(end) - epochDayOf(start);
  if (!Number.isSafeInteger(difference)) {
    throw new Error("Date difference exceeds safe integer precision.");
  }
  return difference;
}

export function yearOf(date: IsoDate): number {
  return Number(date.slice(0, 4));
}

export function ageOnDate(birthDate: IsoDate, comparisonDate: IsoDate): number {
  const validatedBirthDate = makeIsoDate(birthDate);
  const validatedComparisonDate = makeIsoDate(comparisonDate);
  let age = yearOf(validatedComparisonDate) - yearOf(validatedBirthDate);
  let birthdayInComparisonYear = validatedBirthDate.slice(5);
  if (birthdayInComparisonYear === "02-29") {
    try {
      isoDateFromParts(yearOf(validatedComparisonDate), 2, 29);
    } catch {
      birthdayInComparisonYear = "02-28";
    }
  }
  if (validatedComparisonDate.slice(5) < birthdayInComparisonYear) {
    age -= 1;
  }
  return age;
}
