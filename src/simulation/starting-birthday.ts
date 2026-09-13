import { ageOnDate, isoDateFromParts, yearOf } from "./dates";
import type { IsoDate } from "./types";

/**
 * Canonical date of birth for a new life.
 *
 * The player still names a starting age. Month and day complete the
 * anniversary; the full ISO date is derived against the simulation's start
 * date so there is one age clock, not two. Absent from this module: any
 * personal default date, and any rewrite of a birthday already stored on a
 * saved person.
 */

export interface StartingBirthdayInput {
  readonly currentDate: IsoDate;
  readonly startAge: number;
  readonly birthMonth: number;
  readonly birthDay: number;
}

export type StartingBirthdayResolution =
  | { readonly ok: true; readonly birthDate: IsoDate }
  | { readonly ok: false; readonly message: string };

function isValidCalendarDate(
  year: number,
  month: number,
  day: number,
): boolean {
  try {
    isoDateFromParts(year, month, day);
    return true;
  } catch {
    return false;
  }
}

function anniversaryExistsInSomeYear(month: number, day: number): boolean {
  if (month === 2 && day === 29) return true;
  return isValidCalendarDate(2001, month, day);
}

export function startingBirthdayFieldProblem(
  birthMonth: number | undefined,
  birthDay: number | undefined,
): string | null {
  const monthPresent = birthMonth !== undefined;
  const dayPresent = birthDay !== undefined;
  if (monthPresent !== dayPresent) {
    return "Choose both a birthday month and day, or leave both blank.";
  }
  if (!monthPresent) return null;
  const month = birthMonth;
  const day = birthDay;
  if (month === undefined || day === undefined) return null;
  if (!Number.isSafeInteger(month) || month < 1 || month > 12) {
    return "Choose a birthday month from 1 to 12.";
  }
  if (!Number.isSafeInteger(day) || day < 1 || day > 31) {
    return "Choose a birthday day that exists on the calendar.";
  }
  if (!anniversaryExistsInSomeYear(month, day)) {
    return "That month and day are not a calendar date. Choose another birthday.";
  }
  return null;
}

/**
 * Derive the persisted birth date, or an explicit reason the age and
 * anniversary cannot form one.
 */
export function resolveStartingBirthday(
  input: StartingBirthdayInput,
): StartingBirthdayResolution {
  const fieldProblem = startingBirthdayFieldProblem(
    input.birthMonth,
    input.birthDay,
  );
  if (fieldProblem) return { ok: false, message: fieldProblem };
  if (!Number.isSafeInteger(input.startAge) || input.startAge < 0) {
    return {
      ok: false,
      message: "A starting person needs a plausible age in whole years.",
    };
  }

  const currentYear = yearOf(input.currentDate);
  const candidates: IsoDate[] = [];
  for (const year of [
    currentYear - input.startAge,
    currentYear - input.startAge - 1,
  ]) {
    if (!isValidCalendarDate(year, input.birthMonth, input.birthDay)) continue;
    const birthDate = isoDateFromParts(year, input.birthMonth, input.birthDay);
    if (ageOnDate(birthDate, input.currentDate) === input.startAge) {
      candidates.push(birthDate);
    }
  }

  if (candidates.length === 1) {
    return { ok: true, birthDate: candidates[0]! };
  }
  if (candidates.length > 1) {
    const currentMonth = Number(input.currentDate.slice(5, 7));
    const currentDay = Number(input.currentDate.slice(8, 10));
    const anniversaryPassed =
      input.birthMonth < currentMonth ||
      (input.birthMonth === currentMonth && input.birthDay <= currentDay);
    const preferredYear =
      currentYear - input.startAge - (anniversaryPassed ? 0 : 1);
    const preferred = candidates.find((date) => yearOf(date) === preferredYear);
    return { ok: true, birthDate: preferred ?? candidates[0]! };
  }

  if (input.birthMonth === 2 && input.birthDay === 29) {
    return {
      ok: false,
      message:
        "February 29 is not a calendar date in the birth year this starting age requires. Choose another day or a different starting age.",
    };
  }
  return {
    ok: false,
    message:
      "That birthday does not match the starting age on the simulation calendar. Choose another day or age.",
  };
}

export function requireStartingBirthday(input: StartingBirthdayInput): IsoDate {
  const resolved = resolveStartingBirthday(input);
  if (!resolved.ok) throw new Error(resolved.message);
  return resolved.birthDate;
}
