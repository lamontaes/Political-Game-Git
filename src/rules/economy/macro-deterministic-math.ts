/** Retained KEEP closure and necessary supporting declarations; native public-caller proof is bounded, not exhaustive. */

const LN2 = 0.6931471805599453;
const SQRT_HALF = 0.7071067811865476;
export function detLog(value: number): number {
  if (!(value > 0) || !Number.isFinite(value)) {
    throw new Error(`detLog needs a finite positive number: ${value}`);
  }
  let mantissa = value;
  let exponent = 0;
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
