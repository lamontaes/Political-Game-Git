import {
  kindergartenYear,
  onCalendar,
  SCHOOL_STAGE_CALENDAR,
} from "../core2/school-calendar";
export { kindergartenYear, onCalendar, SCHOOL_STAGE_CALENDAR };
import type { EducationEnrollment, EntityId, IsoDate, World } from "./types";

/**
 * The one school calendar every child shares (`school-stages.ts` has the
 * story): kindergarten the fall after a child is five by September 1, a
 * school year from the first Monday on or after August 24 to the Friday of
 * its fortieth week.
 *
 * A leaf: dates only, so the migration move can read the calendar without
 * loading the school stage handlers.
 */
/**
 * The transition every school stage change runs under. In the leaf so the
 * handler registry (`life-paths2.ts`) reads it without entering the stage
 * handlers' module first.
 */
export const SCHOOL_STAGE_TRANSITION_KEY = "schooling:stage-change" as const;

export type SchoolStageKey = keyof typeof SCHOOL_STAGE_CALENDAR.endsAfterYears;

/** The program each stage enrolls a pupil in. */
export const SCHOOL_STAGE_PROGRAM: Record<
  SchoolStageKey,
  EducationEnrollment["programKind"]
> = {
  elementary: "schooling:elementary",
  middle: "schooling:middle",
  high: "schooling:secondary",
};
export const SCHOOL_STAGE_CONTEXT = {
  elementary: "stage:elementary",
  middle: "stage:school",
  high: "stage:secondary",
} as const;

/** The stage a grade falls in on the shared calendar: K-5, 6-8, 9-12. */
export function schoolStageForGrade(grade: number): SchoolStageKey {
  const { startsAfterYears } = SCHOOL_STAGE_CALENDAR;
  return grade >= startsAfterYears.high
    ? "high"
    : grade >= startsAfterYears.middle
      ? "middle"
      : "elementary";
}

/**
 * The school year in session on this date, from the one calendar every child
 * shares: the first day through the last day of instruction. Null in the
 * summer between them.
 */
export function schoolTermOn(date: IsoDate): {
  readonly schoolYear: number;
  readonly startsAt: IsoDate;
  readonly endsAt: IsoDate;
} | null {
  const year = Number(date.slice(0, 4));
  for (const schoolYear of [year - 1, year]) {
    const startsAt = onCalendar(schoolYear, "starts");
    const endsAt = onCalendar(schoolYear + 1, "ends");
    if (date >= startsAt && date <= endsAt)
      return { schoolYear, startsAt, endsAt };
  }
  return null;
}

/**
 * The grade the school calendar puts a child in on a date: 0 for
 * kindergarten, then 1 through 12, or null before kindergarten or after
 * senior year.
 *
 * The same calendar that moves children through school: kindergarten in the
 * fall after they are five by September 1. The summer counts as the grade
 * just finished, until this child's next school year starts.
 */
export function schoolGradeOn(
  world: World,
  personId: EntityId,
  date: IsoDate = world.currentDate,
): number | null {
  const person = world.people[personId];
  if (!person) return null;
  const year = Number(date.slice(0, 4));
  const starts = onCalendar(year, "starts");
  const schoolYear = date >= starts ? year : year - 1;
  const grade = schoolYear - kindergartenYear(person.birthDate);
  return grade >= 0 && grade <= 12 ? grade : null;
}
