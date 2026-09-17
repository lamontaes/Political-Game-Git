import { isoDateFromParts, lifePlaceByKey, type IsoDate } from "../simulation";
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
 * The setup keeps its existing shape: `startAge` stays the canonical number
 * the World is built from and `birthMonth`/`birthDay` stay optional. The year
 * the player picks is turned into that age against the day play starts, so no
 * save, rule or builder changes. With no month and day the year alone gives
 * the age, and the game still chooses the anniversary as it always has.
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
    "placeKey" | "startAge" | "birthMonth" | "birthDay"
  >,
): number {
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
    const age = startAgeForBirthday({ year, month, day }, startDate);
    if (age >= MINIMUM_START_AGE && age <= MAXIMUM_START_AGE) years.push(year);
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
