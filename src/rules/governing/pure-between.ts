// STOPGAP RULES3-GOV-109: copied legacy policy/calibration, preserved pending independent finishing.
// Lifted unchanged from src/simulation/crisis/epidemic.ts; RULES-3, 2026-10-11.

export function between(
  acute: number,
  serious: number,
  seriousness: number,
): number {
  return acute + seriousness * (serious - acute);
}
