/**
 * The one school calendar every child shares: kindergarten the fall after a
 * child is five by September 1, a school year from the first Monday on or
 * after August 24 to the Friday of its fortieth week. Moved from the old
 * engine's `school-calendar.ts`.
 */
import { addDays, makeIsoDate } from "./kernel/dates";
import type { IsoDate } from "./kernel/brands";

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
