// STOPGAP RULES3-GOV-118: copied legacy policy/calibration, preserved pending independent finishing.
// Lifted unchanged from src/simulation/crisis/fixed-point.ts; RULES-3, 2026-10-11.

export const FIXED_SCALE = 10n ** 18n;

export const THREE_HALVES = (FIXED_SCALE * 3n) / 2n;

export const THREE_QUARTERS = (FIXED_SCALE * 3n) / 4n;

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

export const FIXED_LN2 = twiceAtanh(FIXED_SCALE / 3n);

export function fixedLn(x: bigint): bigint {
  if (x <= 0n) throw new Error("Fixed-point logarithm needs a positive input.");
  let value = x;
  let exponent = 0n;
  while (value >= THREE_HALVES) {
    value /= 2n;
    exponent += 1n;
  }
  while (value < THREE_QUARTERS) {
    value *= 2n;
    exponent -= 1n;
  }
  const y = ((value - FIXED_SCALE) * FIXED_SCALE) / (value + FIXED_SCALE);
  return twiceAtanh(y) + exponent * FIXED_LN2;
}
