import { addDays, makeIsoDate, type IsoDate } from "../elections/calendar";
function isWeekend(date: IsoDate): boolean {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
}

// stopgapId: "legislatures.review-calendar-weekends-only"
export function addWeekdays(from: IsoDate, count: number): IsoDate {
  let date = from;
  let counted = 0;
  while (counted < count) {
    date = addDays(date, 1);
    if (!isWeekend(date)) counted += 1;
  }
  return date;
}

export function congressionalReviewEffectiveOn(
  transmittedOn: IsoDate,
  days: number,
): IsoDate {
  const firstCounted = isWeekend(transmittedOn) ? 0 : 1;
  const lastDay =
    firstCounted === 1 && days === 1
      ? transmittedOn
      : addWeekdays(transmittedOn, days - firstCounted);
  return addDays(lastDay, 1);
}
export function nextGeneralElectionDay(from: IsoDate): IsoDate {
  for (let year = Number(from.slice(0, 4)); ; year += 1) {
    const first = new Date(Date.UTC(year, 10, 1)).getUTCDay();
    const firstMonday = 1 + ((8 - first) % 7);
    const day = makeIsoDate(
      `${year}-11-${String(firstMonday + 1).padStart(2, "0")}`,
    );
    if (day >= from) return day;
  }
}
