// Lifted unchanged from src/simulation/governing/staff-evidence.ts; RULES-3, 2026-10-11.
import type { IsoDate } from "../../simulation/types";

export function yearsBetween(start: IsoDate, end: IsoDate): number {
  return Math.max(
    0,
    Math.round((Date.parse(end) - Date.parse(start)) / (365.2425 * 86_400_000)),
  );
}
