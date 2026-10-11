// STOPGAP RULES3-GOV-123: copied legacy policy/calibration, preserved pending independent finishing.
// Lifted unchanged from src/simulation/crisis/hazard.ts; RULES-3, 2026-10-11.

export const DAY_LCM = 133_590n;

export const MULTIPLIER_ONE = 1_000_000;

export const MULTIPLIER_ONE_BIG = BigInt(MULTIPLIER_ONE);

export function thresholdUnits(threshold: bigint): bigint {
  return threshold * 2n * MULTIPLIER_ONE_BIG * DAY_LCM;
}
