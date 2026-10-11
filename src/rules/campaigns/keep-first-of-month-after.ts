// Lifted unchanged from src/simulation/living-world/movement-succession.ts; RULES-3, 2026-10-11.
import { makeIsoDate } from "./dates";
import type { IsoDate } from "../../simulation/types";

export function firstOfMonthAfter(date: IsoDate, months: number): IsoDate {
  const [year, month] = date.split("-").map(Number);
  const absoluteMonth = year! * 12 + month! - 1 + months;
  const nextYear = Math.floor(absoluteMonth / 12);
  const nextMonth = (absoluteMonth % 12) + 1;
  return makeIsoDate(`${nextYear}-${String(nextMonth).padStart(2, "0")}-01`);
}
