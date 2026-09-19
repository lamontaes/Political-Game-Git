import {
  ageOnDate,
  SeededRng,
  isoDateFromParts,
  lifePlaceByKey,
  type IsoDate,
} from "../simulation";
import { DEMO_START_DATE } from "../simulation/demo-jurisdiction-context";
import {
  MAXIMUM_START_AGE,
  MINIMUM_START_AGE,
  type NewGameSetup,
} from "./new-game";

/**
 * A full birthday with the starting age derived from it (UI DECISION
 * FOLLOW-THROUGH: gender -> name -> full birthday -> derived age).
 *
 * Named year/month/day values survive partial completion. Age is derived
 * from the completed canonical date against this place's actual start date.
 * Existing descriptors without a named year keep their original age semantics.
 */

export interface FullBirthday {
  readonly year: number;
  readonly month: number | null;
  readonly day: number | null;
}

export function creatorStartDate(
  setup: Pick<NewGameSetup, "placeKey">,
): IsoDate {
  const place = lifePlaceByKey(setup.placeKey);
  return (
    (place?.context.initialMoment.date as IsoDate | undefined) ??
    DEMO_START_DATE
  );
}

function parts(date: IsoDate): { year: number; month: number; day: number } {
  return {
    year: Number(date.slice(0, 4)),
    month: Number(date.slice(5, 7)),
    day: Number(date.slice(8, 10)),
  };
}

function anniversaryLater(
  month: number | null,
  day: number | null,
  start: { month: number; day: number },
): boolean {
  if (month === null || day === null) return false;
  return month > start.month || (month === start.month && day > start.day);
}

/** The age a person born on this birthday is on the day play starts. */
export function startAgeForBirthday(
  birthday: FullBirthday,
  startDate: IsoDate,
): number {
  const start = parts(startDate);
  return (
    start.year -
    birthday.year -
    (anniversaryLater(birthday.month, birthday.day, start) ? 1 : 0)
  );
}

/** The birth year implied by a setup's age and optional anniversary. */
export function birthYearForSetup(
  setup: Pick<
    NewGameSetup,
    "placeKey" | "startAge" | "birthYear" | "birthMonth" | "birthDay"
  >,
): number {
  if (setup.birthYear !== undefined) return setup.birthYear;
  const start = parts(creatorStartDate(setup));
  return (
    start.year -
    setup.startAge -
    (anniversaryLater(setup.birthMonth ?? null, setup.birthDay ?? null, start)
      ? 1
      : 0)
  );
}

function dateExists(year: number, month: number, day: number): boolean {
  try {
    isoDateFromParts(year, month, day);
    return true;
  } catch {
    return false;
  }
}

/** Years a starting character can be born in, newest first. */
export function birthYearChoices(
  month: number | null,
  day: number | null,
  startDate: IsoDate,
): readonly number[] {
  const start = parts(startDate);
  const years: number[] = [];
  for (
    let year = start.year - MINIMUM_START_AGE;
    year >= start.year - MAXIMUM_START_AGE - 1;
    year -= 1
  ) {
    if (month !== null && day !== null && !dateExists(year, month, day)) {
      continue;
    }
    if (creatorBirthdayAgeRange({ year, month, day }, startDate))
      years.push(year);
  }
  return years;
}

/**
 * Applies a whole birthday to the setup. Returns null when that birthday
 * cannot start a life (outside the age range, or a date that never existed).
 */
export function applyFullBirthday(
  setup: NewGameSetup,
  birthday: FullBirthday,
): NewGameSetup | null {
  const startDate = creatorStartDate(setup);
  if (
    !birthYearChoices(birthday.month, birthday.day, startDate).includes(
      birthday.year,
    )
  ) {
    return null;
  }
  const next: { -readonly [K in keyof NewGameSetup]: NewGameSetup[K] } = {
    ...setup,
    birthYear: birthday.year,
    startAge: startAgeForBirthday(birthday, startDate),
  };
  if (birthday.month === null) delete next.birthMonth;
  else next.birthMonth = birthday.month;
  if (birthday.day === null) delete next.birthDay;
  else next.birthDay = birthday.day;
  return next;
}

/** A deterministic whole birthday for the Randomize control. */
export function randomFullBirthday(
  seed: string,
  salt: number,
  startDate: IsoDate,
): FullBirthday {
  let hash = 2166136261;
  for (const character of `${seed}:birthday:${salt}`) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0;
  }
  const next = () => {
    hash = (Math.imul(hash, 1664525) + 1013904223) >>> 0;
    return hash / 2 ** 32;
  };
  const month = 1 + Math.floor(next() * 12);
  const monthLength = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][
    month - 1
  ]!;
  const day = 1 + Math.floor(next() * monthLength);
  // Adult lives are the ordinary case; the range still spans the whole bank.
  const years = birthYearChoices(month, day, startDate).filter(
    (year) => startAgeForBirthday({ year, month, day }, startDate) >= 18,
  );
  const year = years[Math.floor(next() * years.length)]!;
  return { year, month, day };
}

/** Completion is a command at Next, never a render-time draw. */
export function resolveCreatorBirthday(
  setup: NewGameSetup,
  yearChosen: boolean,
): NewGameSetup | null {
  const start = creatorStartDate(setup);
  const year = yearChosen ? birthYearForSetup(setup) : null;
  const dates: FullBirthday[] = [];
  const startYear = Number(start.slice(0, 4));
  for (
    let y = year ?? startYear - MAXIMUM_START_AGE - 1;
    y <= (year ?? startYear - MINIMUM_START_AGE);
    y++
  ) {
    for (let month = 1; month <= 12; month++) {
      if (setup.birthMonth !== undefined && month !== setup.birthMonth)
        continue;
      for (let day = 1; day <= 31; day++) {
        if (setup.birthDay !== undefined && day !== setup.birthDay) continue;
        if (!dateExists(y, month, day)) continue;
        const age = ageOnDate(isoDateFromParts(y, month, day), start);
        if (age < MINIMUM_START_AGE || age > MAXIMUM_START_AGE) continue;
        // An unnamed year retains the existing selected starting age.
        if (year === null && age !== setup.startAge) continue;
        dates.push({ year: y, month, day });
      }
    }
  }
  if (!dates.length) return null;
  const rng = new SeededRng(setup.seed).fork("creator-birthday-completion-v1");
  return applyFullBirthday(setup, dates[rng.integer(0, dates.length)]!);
}

/** Incomplete anniversaries are a range, never a claimed final age. */
export function creatorBirthdayAgeRange(
  birthday: FullBirthday,
  startDate: IsoDate,
): { minimum: number; maximum: number } | null {
  const ages: number[] = [];
  for (let month = 1; month <= 12; month++)
    for (let day = 1; day <= 31; day++) {
      if (birthday.month !== null && month !== birthday.month) continue;
      if (birthday.day !== null && day !== birthday.day) continue;
      if (!dateExists(birthday.year, month, day)) continue;
      const age = ageOnDate(
        isoDateFromParts(birthday.year, month, day),
        startDate,
      );
      if (age >= MINIMUM_START_AGE && age <= MAXIMUM_START_AGE) ages.push(age);
    }
  return ages.length
    ? { minimum: Math.min(...ages), maximum: Math.max(...ages) }
    : null;
}
