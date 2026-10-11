// STOPGAP RULES3-GOV-096: copied legacy policy/calibration, preserved pending independent finishing.
// Lifted unchanged from src/environment/environment-scene-spec.ts; RULES-3, 2026-10-11.

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
