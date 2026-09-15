/** Display-only calendar arithmetic; never a World or due-time writer. */
export type CalendarDateOrder = "month-day" | "day-month";
export type CalendarGridView = "month" | "week";

function dateObject(date: string): Date {
  return new Date(`${date}T12:00:00Z`);
}
export function calendarDisplayDate(
  date: string,
  order: CalendarDateOrder,
): string {
  return new Intl.DateTimeFormat(order === "day-month" ? "en-GB" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(dateObject(date));
}
export function calendarShiftDate(date: string, days: number): string {
  const next = dateObject(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}
export function calendarPeriodDates(
  anchor: string,
  view: CalendarGridView,
): readonly string[] {
  const first = view === "month" ? `${anchor.slice(0, 7)}-01` : anchor;
  const start = calendarShiftDate(first, -dateObject(first).getUTCDay());
  const final = dateObject(first);
  final.setUTCMonth(final.getUTCMonth() + 1, 0);
  const size =
    view === "week"
      ? 7
      : Math.ceil((dateObject(first).getUTCDay() + final.getUTCDate()) / 7) * 7;
  return Array.from({ length: size }, (_, index) =>
    calendarShiftDate(start, index),
  );
}
export function calendarShiftPeriod(
  anchor: string,
  view: CalendarGridView,
  direction: number,
): string {
  if (view === "week") return calendarShiftDate(anchor, direction * 7);
  const date = dateObject(`${anchor.slice(0, 7)}-01`);
  date.setUTCMonth(date.getUTCMonth() + direction);
  return date.toISOString().slice(0, 10);
}
export function calendarMonthTitle(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(dateObject(date));
}
