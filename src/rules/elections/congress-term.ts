import { makeIsoDate, type IsoDate } from "./calendar";
import type { CongressSeat } from "../../simulation/living-world/congress-seats";
export interface SeatTermWindow {
  readonly startsAt: IsoDate;
  readonly endExclusive: IsoDate;
  readonly years: number;
}

export function seatTermWindow(
  seat: CongressSeat,
  onDate: IsoDate,
  TERM_REFERENCE: Readonly<
    Record<string, { readonly referenceStart: string; readonly years: number }>
  >,
): SeatTermWindow {
  const reference =
    TERM_REFERENCE[
      seat.chamberKey === "us-house"
        ? "us-house"
        : `us-senate:${seat.senateClass}`
    ]!;
  const monthDay = reference.referenceStart.slice(4);
  const referenceYear = Number(reference.referenceStart.slice(0, 4));
  const onYear = Number(onDate.slice(0, 4));
  let startYear =
    referenceYear +
    Math.floor((onYear - referenceYear) / reference.years) * reference.years;
  if (`${startYear}${monthDay}` > onDate) startYear -= reference.years;
  return {
    startsAt: makeIsoDate(`${startYear}${monthDay}`),
    endExclusive: makeIsoDate(`${startYear + reference.years}${monthDay}`),
    years: reference.years,
  };
}
