// Lifted unchanged from src/simulation/campaign-weekly-plans.ts; RULES-3, 2026-10-11.
import type { IsoDate } from "../../simulation/types";

export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      86_400_000,
  );
}
