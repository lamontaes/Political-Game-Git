// STOPGAP(RULES3-CAM-006): see docs/plans/rules3/campaigns-stopgaps.json.
// Lifted unchanged from src/simulation/campaigns.ts; RULES-3, 2026-10-11.
import { addDays } from "./dates";
import type { IsoDate } from "../../simulation/types";

export function daysUntilElection(
  today: IsoDate,
  electionDate: IsoDate,
): number {
  let days = 0;
  let cursor = today;
  while (cursor < electionDate && days < 3_650) {
    cursor = addDays(cursor, 1);
    days += 1;
  }
  return days;
}
