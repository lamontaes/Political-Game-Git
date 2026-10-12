import { makeIsoDate, type IsoDate } from "../elections/calendar";
export const CONGRESS_LAWMAKING_PROFILE = {
  id: "ocd-congress-lawmaking/v1",
  intakeDayOfMonth: 1,
} as const;

export function nextIntakeDate(after: IsoDate): IsoDate {
  const year = Number(after.slice(0, 4));
  const month = Number(after.slice(5, 7));
  const day = String(CONGRESS_LAWMAKING_PROFILE.intakeDayOfMonth).padStart(
    2,
    "0",
  );
  const thisMonth = makeIsoDate(
    `${year}-${String(month).padStart(2, "0")}-${day}`,
  );
  if (thisMonth > after) return thisMonth;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  return makeIsoDate(
    `${nextYear}-${String(nextMonth).padStart(2, "0")}-${day}`,
  );
}
export function maxIsoDate(a: IsoDate, b: IsoDate): IsoDate {
  return a > b ? a : b;
}
