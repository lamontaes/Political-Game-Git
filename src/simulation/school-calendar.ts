import { addDays, makeIsoDate } from "./dates";
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
export const SCHOOL_STAGE_CALENDAR = {
  schoolAgeCutoff: "09-01",
  /** The first Monday on or after this day. */
  termStarts: { month: 8, day: 24 },
  /**
   * A school year runs forty weeks, to the Friday of the last: about 180
   * days of instruction and twenty of holidays and breaks.
   */
  termEnds: { weeksLong: 40 },
  /** Years after kindergarten begins that each stage ends. */
  endsAfterYears: { elementary: 6, middle: 9, high: 13 },
  /** Years after kindergarten begins that each stage starts. */
  startsAfterYears: { elementary: 0, middle: 6, high: 9 },
} as const;

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

/** The fall a child starts kindergarten, which is also the class they are in. */
export function kindergartenYear(birthDate: IsoDate): number {
  const year = Number(birthDate.slice(0, 4));
  return birthDate.slice(5) <= SCHOOL_STAGE_CALENDAR.schoolAgeCutoff
    ? year + 5
    : year + 6;
}

/**
 * The first day of the school year that starts in `year`: the first Monday on
 * or after August 24. Every child in a district shares it, so classmates start
 * and finish together; nothing is drawn per child or per school (A140).
 */
function termStartsIn(year: number): IsoDate {
  const { month, day } = SCHOOL_STAGE_CALENDAR.termStarts;
  const earliest = makeIsoDate(
    `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
  );
  const weekday = new Date(`${earliest}T00:00:00Z`).getUTCDay();
  return addDays(earliest, (8 - weekday) % 7);
}

/**
 * A date on the school calendar: the first day of the school year that
 * starts in `year`, or the last day of the one that ends in `year`, the
 * Friday of its fortieth week.
 */
export function onCalendar(year: number, which: "starts" | "ends"): IsoDate {
  return which === "starts"
    ? termStartsIn(year)
    : addDays(
        termStartsIn(year - 1),
        SCHOOL_STAGE_CALENDAR.termEnds.weeksLong * 7 - 3,
      );
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
