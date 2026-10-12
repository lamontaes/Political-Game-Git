/** P11 KEEP: seatTermWindow; the caller selects the seat's term reference. */
import { isoDateFromParts } from "./calendar";
export interface SeatTermReference {
  readonly referenceStart: string;
  readonly years: number;
}
export interface SeatTermWindow {
  readonly startsAt: string;
  readonly endExclusive: string;
  readonly years: number;
}
export function seatTermWindow(
  reference: SeatTermReference,
  onDate: string,
): SeatTermWindow {
  const monthDay = reference.referenceStart.slice(4);
  const referenceYear = Number(reference.referenceStart.slice(0, 4));
  const onYear = Number(onDate.slice(0, 4));
  let startYear =
    referenceYear +
    Math.floor((onYear - referenceYear) / reference.years) * reference.years;
  if (`${startYear}${monthDay}` > onDate) startYear -= reference.years;
  return {
    startsAt: isoDateFromParts(
      startYear,
      Number(monthDay.slice(1, 3)),
      Number(monthDay.slice(4)),
    ),
    endExclusive: isoDateFromParts(
      startYear + reference.years,
      Number(monthDay.slice(1, 3)),
      Number(monthDay.slice(4)),
    ),
    years: reference.years,
  };
}
