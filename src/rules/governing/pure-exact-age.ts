// STOPGAP RULES3-GOV-106: copied legacy policy/calibration, preserved pending independent finishing.
// Lifted unchanged from src/simulation/crisis/epidemic.ts; RULES-3, 2026-10-11.
import { daysBetween } from "./dates";
import type { IsoDate } from "../../simulation/types";

export function exactAge(birthDate: IsoDate, today: IsoDate): number {
  return daysBetween(birthDate, today) / 365.25;
}
