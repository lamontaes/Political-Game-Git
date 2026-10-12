/** Shift an ISO calendar date by a signed number of years. */
export function calendarDateByYearsFromFacts(
  date: string,
  years: number,
): string {
  const year = Number(date.slice(0, 4)) - years;
  const monthAndDay = date.slice(4);
  return `${year}${monthAndDay === "-02-29" ? "-02-28" : monthAndDay}`;
}
