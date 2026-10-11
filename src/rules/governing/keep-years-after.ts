// Lifted unchanged from src/simulation/civil-personnel-actions.ts; RULES-3, 2026-10-11.
import { makeIsoDate } from "./dates";
import type { IsoDate } from "../../simulation/types";

export function yearsAfter(date: IsoDate, years: number): IsoDate {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const target = new Date(Date.UTC(y + years, m - 1, d));
  if (target.getUTCMonth() !== m - 1) target.setUTCDate(0);
  return makeIsoDate(target.toISOString().slice(0, 10));
}
