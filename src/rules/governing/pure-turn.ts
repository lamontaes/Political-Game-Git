// STOPGAP RULES3-GOV-107: copied legacy policy/calibration, preserved pending independent finishing.
// Lifted unchanged from src/simulation/crisis/epidemic.ts; RULES-3, 2026-10-11.

export function turn(age: number, at: number, width: number): number {
  return 1 / (1 + Math.exp(-(age - at) / (width / 4)));
}
