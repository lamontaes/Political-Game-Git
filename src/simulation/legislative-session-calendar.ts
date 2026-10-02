import { addDays, makeIsoDate } from "./dates";
import type { IsoDate } from "./types";

export type SessionCalendarRecurrence =
  | { readonly kind: "interval"; readonly days: number }
  | { readonly kind: "weekdays"; readonly weekdays: readonly number[] }
  | { readonly kind: "annual"; readonly monthDays: readonly string[] };

export type SessionCalendarTask =
  "sitting" | "hearing" | "agenda" | "reading" | "budget" | "bill" | "resume";

/** One body's timetable, including tasks that need not occur at a sitting. */
export interface SittingCalendar {
  readonly id: string;
  readonly basis: "researched" | "game-profile";
  readonly note: string;
  readonly sitting: SessionCalendarRecurrence;
  readonly tasks?: Partial<
    Readonly<
      Record<Exclude<SessionCalendarTask, "sitting">, SessionCalendarRecurrence>
    >
  >;
}

/**
 * One date operation for every body and task. Existing callers retain their
 * legal minimum dates and session-year gates; a timetable never grants an
 * action, convenes a closed session, or records a decision.
 */
export function nextSessionCalendarDate(
  calendar: SittingCalendar,
  after: IsoDate,
  task: SessionCalendarTask = "sitting",
  options: {
    readonly notBefore?: IsoDate;
    readonly eligibleYear?: (year: number) => boolean;
  } = {},
): IsoDate {
  const rule = task === "sitting" ? calendar.sitting : calendar.tasks?.[task];
  if (!rule)
    throw new Error(`Calendar '${calendar.id}' has no '${task}' task.`);
  const firstYear = Number(after.slice(0, 4));
  const endYear = firstYear + 4;
  const eligible = (date: IsoDate) =>
    date > after &&
    (!options.notBefore || date >= options.notBefore) &&
    (!options.eligibleYear || options.eligibleYear(Number(date.slice(0, 4))));
  if (rule.kind === "annual") {
    for (let year = firstYear; year <= endYear; year += 1) {
      for (const monthDay of [...rule.monthDays].sort()) {
        const date = makeIsoDate(`${year}-${monthDay}`);
        if (eligible(date)) return date;
      }
    }
  } else {
    if (
      rule.kind === "interval" &&
      (!Number.isInteger(rule.days) || rule.days <= 0)
    )
      throw new Error(`Calendar '${calendar.id}' has an invalid interval.`);
    if (
      rule.kind === "weekdays" &&
      (rule.weekdays.length === 0 ||
        rule.weekdays.some(
          (day) => !Number.isInteger(day) || day < 0 || day > 6,
        ))
    )
      throw new Error(`Calendar '${calendar.id}' has invalid weekdays.`);
    let date = addDays(after, rule.kind === "interval" ? rule.days : 1);
    // A legal minimum can fall between ordinary interval dates. Keep the
    // existing minimum-date behavior rather than delay it a second interval.
    if (
      rule.kind === "interval" &&
      options.notBefore &&
      date < options.notBefore
    )
      date = options.notBefore;
    while (Number(date.slice(0, 4)) <= endYear) {
      if (
        eligible(date) &&
        (rule.kind === "interval" ||
          rule.weekdays.includes(new Date(`${date}T00:00:00Z`).getUTCDay()))
      )
        return date;
      date = addDays(date, rule.kind === "interval" ? rule.days : 1);
    }
  }
  throw new Error(`Calendar '${calendar.id}' has no next '${task}' date.`);
}
