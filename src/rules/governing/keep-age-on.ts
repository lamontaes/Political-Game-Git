// Lifted unchanged from src/simulation/governing/office-continuity.ts; RULES-3, 2026-10-11.
import type { IsoDate } from "../../simulation/types";

export function ageOn(birthDate: IsoDate, date: IsoDate): number {
  const years = Number(date.slice(0, 4)) - Number(birthDate.slice(0, 4));
  return date.slice(5) < birthDate.slice(5) ? years - 1 : years;
}
