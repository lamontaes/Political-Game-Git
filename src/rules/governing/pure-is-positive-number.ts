// STOPGAP RULES3-GOV-098: copied legacy policy/calibration, preserved pending independent finishing.
// Lifted unchanged from src/environment/environment-scene-spec.ts; RULES-3, 2026-10-11.

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isPositiveNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value > 0;
}
