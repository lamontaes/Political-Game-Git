import type { IsoDate } from "./calendar";
export function daysToFiscalYear(today: IsoDate, monthDay: string): number {
  const year = Number(today.slice(0, 4));
  const at = (y: number) => Date.parse(`${y}-${monthDay}T00:00:00Z`);
  const now = Date.parse(`${today}T00:00:00Z`);
  const next = at(year) > now ? at(year) : at(year + 1);
  return Math.round((next - now) / 86400000);
}
export function previousMonthKey(monthKey: string, back = 1): string {
  const year = Number(monthKey.slice(0, 4));
  const month = Number(monthKey.slice(5, 7)) - 1 - back;
  const y = year + Math.floor(month / 12);
  const m = ((month % 12) + 12) % 12;
  return `${String(y).padStart(4, "0")}-${String(m + 1).padStart(2, "0")}`;
}
