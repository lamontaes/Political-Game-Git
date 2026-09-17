import type { SeededRng } from "../rng";

/**
 * Engine-independent logarithm, exponential and normal draws.
 *
 * `Math.log`, `Math.exp` and `Math.cos` are not required to round identically
 * across JavaScript engines, and a generated opening must replay byte-for-byte
 * in any browser. These use only `+ - * /` and `Math.sqrt`, which IEEE 754
 * specifies exactly, so the same seed gives the same bits everywhere.
 */

const LN2 = 0.6931471805599453;
const SQRT_HALF = 0.7071067811865476;

export function detLog(value: number): number {
  if (!(value > 0) || !Number.isFinite(value)) {
    throw new Error(`detLog needs a finite positive number: ${value}`);
  }
  let mantissa = value;
  let exponent = 0;
  // Scaling by two is exact, so only the series below rounds.
  while (mantissa >= 2 * SQRT_HALF) {
    mantissa /= 2;
    exponent += 1;
  }
  while (mantissa < SQRT_HALF) {
    mantissa *= 2;
    exponent -= 1;
  }
  const t = (mantissa - 1) / (mantissa + 1);
  const t2 = t * t;
  let term = t;
  let sum = 0;
  for (let k = 1; k < 80; k += 2) {
    const next = sum + term / k;
    if (next === sum) break;
    sum = next;
    term *= t2;
  }
  return 2 * sum + exponent * LN2;
}

export function detExp(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error(`detExp needs a finite number: ${value}`);
  }
  if (value > 700) return Number.MAX_VALUE;
  if (value < -700) return 0;
  const k = Math.round(value / LN2);
  const r = value - k * LN2;
  let term = 1;
  let sum = 1;
  for (let n = 1; n < 60; n += 1) {
    term = (term * r) / n;
    const next = sum + term;
    if (next === sum) break;
    sum = next;
  }
  let scaled = sum;
  for (let i = 0; i < Math.abs(k); i += 1) {
    scaled = k > 0 ? scaled * 2 : scaled / 2;
  }
  return scaled;
}

export function logistic(x: number): number {
  return x >= 0 ? 1 / (1 + detExp(-x)) : detExp(x) / (1 + detExp(x));
}

export function logit(p: number): number {
  return detLog(p / (1 - p));
}

/** A share kept strictly inside (0, 1) before a logit. */
export function clampShare(p: number, epsilon: number): number {
  return Math.min(1 - epsilon, Math.max(epsilon, p));
}

/** Rounded for persistence, so stored values never carry float tails. */
export function roundTo(value: number, places = 6): number {
  const factor = 10 ** places;
  const rounded = Math.round(value * factor) / factor;
  return Object.is(rounded, -0) ? 0 : rounded;
}

// Acklam's rational approximation to the inverse normal CDF (relative error
// below 1.15e-9), which needs only the operations above.
const A = [
  -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
  1.38357751867269e2, -3.066479806614716e1, 2.506628277459239,
] as const;
const B = [
  -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
  6.680131188771972e1, -1.328068155288572e1,
] as const;
const C = [
  -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
  -2.549732539343734, 4.374664141464968, 2.938163982698783,
] as const;
const D = [
  7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996,
  3.754408661907416,
] as const;
const P_LOW = 0.02425;

export function inverseStandardNormal(p: number): number {
  if (!(p > 0 && p < 1)) {
    throw new Error(`Inverse normal needs 0 < p < 1: ${p}`);
  }
  if (p < P_LOW) {
    const q = Math.sqrt(-2 * detLog(p));
    return (
      (((((C[0] * q + C[1]) * q + C[2]) * q + C[3]) * q + C[4]) * q + C[5]) /
      ((((D[0] * q + D[1]) * q + D[2]) * q + D[3]) * q + 1)
    );
  }
  if (p > 1 - P_LOW) {
    const q = Math.sqrt(-2 * detLog(1 - p));
    return -(
      (((((C[0] * q + C[1]) * q + C[2]) * q + C[3]) * q + C[4]) * q + C[5]) /
      ((((D[0] * q + D[1]) * q + D[2]) * q + D[3]) * q + 1)
    );
  }
  const q = p - 0.5;
  const r = q * q;
  return (
    ((((((A[0] * r + A[1]) * r + A[2]) * r + A[3]) * r + A[4]) * r + A[5]) *
      q) /
    (((((B[0] * r + B[1]) * r + B[2]) * r + B[3]) * r + B[4]) * r + 1)
  );
}

/** One uniform strictly inside (0, 1): 53 bits from two draws, plus a half step. */
export function openUniform(rng: SeededRng): number {
  const high = rng.nextUint32() >>> 5;
  const low = rng.nextUint32() >>> 6;
  return (high * 67108864 + low + 0.5) / 9007199254740992;
}

export function standardNormal(rng: SeededRng): number {
  return inverseStandardNormal(openUniform(rng));
}
