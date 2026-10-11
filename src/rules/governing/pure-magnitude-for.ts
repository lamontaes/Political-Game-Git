// STOPGAP RULES3-GOV-121: copied legacy policy/calibration, preserved pending independent finishing.
// Lifted unchanged from src/simulation/crisis/hazard-producer.ts; RULES-3, 2026-10-11.
import type { HazardMagnitude } from "../../simulation/crisis/types";

export function magnitudeFor(
  areaCount: number,
  eventCount: number,
): HazardMagnitude {
  if (areaCount >= 12 || eventCount >= 40) return "catastrophic";
  if (areaCount >= 5 || eventCount >= 12) return "major";
  if (areaCount >= 2 || eventCount >= 4) return "moderate";
  return "minor";
}
