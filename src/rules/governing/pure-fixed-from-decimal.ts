// STOPGAP RULES3-GOV-119: copied legacy policy/calibration, preserved pending independent finishing.
// Lifted unchanged from src/simulation/crisis/fixed-point.ts; RULES-3, 2026-10-11.

export const FIXED_SCALE = 10n ** 18n;

export function fixedFromDecimal(text: string): bigint {
  const match = /^(0|1)\.(\d{1,18})$/.exec(text);
  if (!match) throw new Error(`Unsupported decimal probability: ${text}`);
  const fraction = match[2]!.padEnd(18, "0");
  return BigInt(match[1]!) * FIXED_SCALE + BigInt(fraction);
}
