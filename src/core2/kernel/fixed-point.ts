/**
 * Integer fixed-point natural logarithm.
 *
 * Mortality hazard needs `-ln(1 - qx)` and a survival threshold `-ln(u)`.
 * `Math.log` is not required to return identical bits in every JavaScript
 * engine, and a save made in the desktop app must replay identically under
 * Node. Everything here is BigInt arithmetic with a fixed truncation rule, so
 * the same inputs give the same integers everywhere.
 */

export const FIXED_SCALE = 10n ** 18n;

const THREE_HALVES = (FIXED_SCALE * 3n) / 2n;
const THREE_QUARTERS = (FIXED_SCALE * 3n) / 4n;

/** 2·atanh(y) for a scaled |y| < 1/3, truncating each term toward zero. */
function twiceAtanh(y: bigint): bigint {
  const ySquared = (y * y) / FIXED_SCALE;
  let power = y;
  let sum = 0n;
  for (let denominator = 1n; power !== 0n; denominator += 2n) {
    sum += power / denominator;
    power = (power * ySquared) / FIXED_SCALE;
  }
  return 2n * sum;
}

/** ln 2 = 2·atanh(1/3). */
export const FIXED_LN2 = twiceAtanh(FIXED_SCALE / 3n);

/** ln(x / FIXED_SCALE) · FIXED_SCALE for a positive scaled x. */
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

/** A six-decimal probability string such as "0.001685" as a scaled integer. */
export function fixedFromDecimal(text: string): bigint {
  const match = /^(0|1)\.(\d{1,18})$/.exec(text);
  if (!match) throw new Error(`Unsupported decimal probability: ${text}`);
  const fraction = match[2]!.padEnd(18, "0");
  return BigInt(match[1]!) * FIXED_SCALE + BigInt(fraction);
}

/** Annual qx → cumulative hazard −ln(1 − qx), scaled. */
export function hazardFromAnnualProbability(qx: bigint): bigint {
  if (qx < 0n || qx >= FIXED_SCALE)
    throw new Error("An annual death probability must lie in [0, 1).");
  return -fixedLn(FIXED_SCALE - qx);
}

/**
 * Survival threshold −ln(u) from two uint32 draws. u lies strictly inside
 * (0, 1), so the threshold is finite and positive.
 */
export function survivalThresholdFromDraws(high: number, low: number): bigint {
  const RANGE = 1n << 64n;
  const numerator = (BigInt(high >>> 0) << 32n) + BigInt(low >>> 0) + 1n;
  let u = (numerator * FIXED_SCALE) / (RANGE + 1n);
  if (u <= 0n) u = 1n;
  if (u >= FIXED_SCALE) u = FIXED_SCALE - 1n;
  return -fixedLn(u);
}

/** A finite double as the exact fraction it stores: numerator over a power of two. */
function exactFraction(x: number): { n: bigint; d: bigint } {
  if (!Number.isFinite(x)) throw new RangeError(`not finite: ${x}`);
  if (x === 0) return { n: 0n, d: 1n };
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, x);
  const bits = view.getBigUint64(0);
  const sign = bits >> 63n ? -1n : 1n;
  const stored = Number((bits >> 52n) & 0x7ffn);
  let mantissa = bits & ((1n << 52n) - 1n);
  let exponent = -1074;
  if (stored !== 0) {
    mantissa |= 1n << 52n;
    exponent = stored - 1075;
  }
  return exponent >= 0
    ? { n: sign * mantissa * (1n << BigInt(exponent)), d: 1n }
    : { n: sign * mantissa, d: 1n << BigInt(-exponent) };
}

/**
 * `value` times the product of `over` divided by the product of `under`,
 * computed exactly from the doubles as stored and rounded once, at the end, to
 * the nearest integer (halves up, as `Math.round`). A line of a hundred
 * trillion cents times two or three ratios lands a cent off when each step
 * rounds in floating point.
 */
export function roundExactProduct(
  value: number,
  over: readonly number[],
  under: readonly number[] = [],
): number {
  let n = 1n;
  let d = 1n;
  for (const x of [value, ...over]) {
    const f = exactFraction(x);
    n *= f.n;
    d *= f.d;
  }
  for (const x of under) {
    const f = exactFraction(x);
    if (f.n === 0n) throw new RangeError("divided by zero");
    n *= f.d;
    d *= f.n;
  }
  if (d < 0n) {
    n = -n;
    d = -d;
  }
  // floor((2n + d) / 2d), with floor division for negative numerators.
  const top = 2n * n + d;
  const bottom = 2n * d;
  let q = top / bottom;
  if (top % bottom !== 0n && top < 0n) q -= 1n;
  return Number(q);
}
