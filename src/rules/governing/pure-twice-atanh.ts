// STOPGAP RULES3-GOV-116: copied legacy policy/calibration, preserved pending independent finishing.
// Lifted unchanged from src/simulation/crisis/fixed-point.ts; RULES-3, 2026-10-11.

export const FIXED_SCALE = 10n ** 18n;

export function twiceAtanh(y: bigint): bigint {
  const ySquared = (y * y) / FIXED_SCALE;
  let power = y;
  let sum = 0n;
  for (let denominator = 1n; power !== 0n; denominator += 2n) {
    sum += power / denominator;
    power = (power * ySquared) / FIXED_SCALE;
  }
  return 2n * sum;
}
