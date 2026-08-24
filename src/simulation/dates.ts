import type { IsoDate } from "./types";

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function utcDate(year: number, month: number, day: number): Date {
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  return date;
}

export function makeIsoDate(value: string): IsoDate {
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

export function daysBetween(start: IsoDate, end: IsoDate): number {
  const startDate = makeIsoDate(start);
  const endDate = makeIsoDate(end);
  const startParts = ISO_DATE_PATTERN.exec(startDate);
  const endParts = ISO_DATE_PATTERN.exec(endDate);
  if (!startParts || !endParts) {
    throw new Error("Unable to compare invalid ISO dates.");
  }
  const startTime = utcDate(
    Number(startParts[1]),
    Number(startParts[2]),
    Number(startParts[3]),
  ).getTime();
  const endTime = utcDate(
    Number(endParts[1]),
    Number(endParts[2]),
    Number(endParts[3]),
  ).getTime();
  const difference = (endTime - startTime) / 86_400_000;
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

export function dateAtAge(birthDate: IsoDate, age: number): IsoDate {
  if (!Number.isSafeInteger(age) || age < 0) {
    throw new Error("Age must be a non-negative safe integer.");
  }

  const validatedBirthDate = makeIsoDate(birthDate);
  const targetYear = yearOf(validatedBirthDate) + age;
  const month = Number(validatedBirthDate.slice(5, 7));
  const day = Number(validatedBirthDate.slice(8, 10));

  if (month === 2 && day === 29) {
    try {
      return isoDateFromParts(targetYear, month, day);
    } catch {
      return isoDateFromParts(targetYear, month, 28);
    }
  }

  return isoDateFromParts(targetYear, month, day);
}
