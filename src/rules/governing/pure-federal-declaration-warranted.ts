// STOPGAP RULES3-GOV-105: copied legacy policy/calibration, preserved pending independent finishing.
// Lifted unchanged from src/simulation/crisis/disaster-warrants.ts; RULES-3, 2026-10-11.
import type { HazardMagnitude } from "../../simulation/crisis/types";

export const MAGNITUDE_RANK: Record<HazardMagnitude, number> = {
  minor: 0,
  moderate: 1,
  major: 2,
  catastrophic: 3,
};

export function federalDeclarationWarranted(
  magnitude: HazardMagnitude,
): boolean {
  return MAGNITUDE_RANK[magnitude] >= MAGNITUDE_RANK.major;
}
