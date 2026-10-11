// STOPGAP RULES3-GOV-112: copied legacy policy/calibration, preserved pending independent finishing.
// Lifted unchanged from src/simulation/crisis/epidemic.ts; RULES-3, 2026-10-11.
import { addDays } from "./dates";
import type { IsoDate } from "../../simulation/types";

export function isWorkday(date: IsoDate): boolean {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day !== 0 && day !== 6;
}

export function workdaysBetween(from: IsoDate, to: IsoDate): number {
  let count = 0;
  for (let day = from; day <= to; day = addDays(day, 1))
    if (isWorkday(day)) count += 1;
  return count;
}
