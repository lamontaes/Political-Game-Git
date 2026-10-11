// STOPGAP RULES3-GOV-124: copied legacy policy/calibration, preserved pending independent finishing.
// Lifted unchanged from src/simulation/crisis/hazard.ts; RULES-3, 2026-10-11.
import { dateAtAge } from "./dates";
import type { IsoDate } from "../../simulation/types";

export function ageAt(birthDate: IsoDate, date: IsoDate): number {
  // The age whose age-year contains `date` (birthday inclusive).
  let age = Number(date.slice(0, 4)) - Number(birthDate.slice(0, 4));
  if (age > 0 && dateAtAge(birthDate, age) > date) age -= 1;
  return Math.max(age, 0);
}
