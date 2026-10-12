import { validateIsoDate as makeIsoDate, type IsoDate } from "./calendar";
import type { HouseDelegateSeat } from "../../simulation/living-world/house-delegates";
export function houseDelegateTermWindow(
  seat: HouseDelegateSeat,
  onDate: IsoDate,
  referenceYear: number,
): {
  readonly startsAt: IsoDate;
  readonly endExclusive: IsoDate;
} {
  const onYear = Number(onDate.slice(0, 4));
  let startYear =
    referenceYear +
    Math.floor((onYear - referenceYear) / seat.termYears) * seat.termYears;
  if (`${startYear}-01-03` > onDate) startYear -= seat.termYears;
  return {
    startsAt: makeIsoDate(`${startYear}-01-03`),
    endExclusive: makeIsoDate(`${startYear + seat.termYears}-01-03`),
  };
}
