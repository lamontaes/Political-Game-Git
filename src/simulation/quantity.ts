import type { ExactQuantity, QuantityUnitKey } from "./types";

const SEMANTIC_UNIT_KEY = /^[a-z][a-z0-9-]*:[a-z0-9][a-z0-9._-]*$/;

export function makeQuantityUnitKey(value: string): QuantityUnitKey {
  if (!SEMANTIC_UNIT_KEY.test(value)) {
    throw new Error(
      `Quantity unit must be a namespaced semantic key: ${value}`,
    );
  }
  return value as QuantityUnitKey;
}

export function createExactQuantity(
  numerator: number,
  denominator: number,
  unit: string,
): ExactQuantity {
  assertSafeInteger(numerator, "Quantity numerator");
  assertSafeInteger(denominator, "Quantity denominator");
  if (denominator <= 0) {
    throw new Error("Quantity denominator must be a positive safe integer.");
  }
  const normalizedUnit = makeQuantityUnitKey(unit);
  if (numerator === 0) {
    return { numerator: 0, denominator: 1, unit: normalizedUnit };
  }
  const divisor = greatestCommonDivisor(Math.abs(numerator), denominator);
  return {
    numerator: numerator / divisor,
    denominator: denominator / divisor,
    unit: normalizedUnit,
  };
}

export function assertExactQuantity(value: ExactQuantity): void {
  const normalized = createExactQuantity(
    value.numerator,
    value.denominator,
    value.unit,
  );
  if (
    normalized.numerator !== value.numerator ||
    normalized.denominator !== value.denominator ||
    normalized.unit !== value.unit
  ) {
    throw new Error("Exact quantity must use its canonical reduced form.");
  }
}

export function quantitiesEqual(
  left: ExactQuantity,
  right: ExactQuantity,
): boolean {
  assertCompatibleUnits(left, right);
  assertExactQuantity(left);
  assertExactQuantity(right);
  return (
    left.numerator === right.numerator && left.denominator === right.denominator
  );
}

export function compareExactQuantities(
  left: ExactQuantity,
  right: ExactQuantity,
): -1 | 0 | 1 {
  assertCompatibleUnits(left, right);
  assertExactQuantity(left);
  assertExactQuantity(right);
  const divisor = greatestCommonDivisor(left.denominator, right.denominator);
  const leftScaled = safeMultiply(
    left.numerator,
    right.denominator / divisor,
    "Quantity comparison",
  );
  const rightScaled = safeMultiply(
    right.numerator,
    left.denominator / divisor,
    "Quantity comparison",
  );
  return leftScaled < rightScaled ? -1 : leftScaled > rightScaled ? 1 : 0;
}

export function addExactQuantities(
  left: ExactQuantity,
  right: ExactQuantity,
): ExactQuantity {
  return combineExactQuantities(left, right, 1);
}

export function subtractExactQuantities(
  left: ExactQuantity,
  right: ExactQuantity,
): ExactQuantity {
  return combineExactQuantities(left, right, -1);
}

function multiplyExactQuantities(
  left: ExactQuantity,
  right: ExactQuantity,
  resultUnit: string,
): ExactQuantity {
  assertExactQuantity(left);
  assertExactQuantity(right);
  const leftNumeratorDivisor = greatestCommonDivisor(
    Math.abs(left.numerator),
    right.denominator,
  );
  const rightNumeratorDivisor = greatestCommonDivisor(
    Math.abs(right.numerator),
    left.denominator,
  );
  return createExactQuantity(
    safeMultiply(
      left.numerator / leftNumeratorDivisor,
      right.numerator / rightNumeratorDivisor,
      "Quantity multiplication",
    ),
    safeMultiply(
      left.denominator / rightNumeratorDivisor,
      right.denominator / leftNumeratorDivisor,
      "Quantity multiplication",
    ),
    resultUnit,
  );
}

export function divideExactQuantities(
  dividend: ExactQuantity,
  divisor: ExactQuantity,
  resultUnit: string,
): ExactQuantity {
  assertExactQuantity(dividend);
  assertExactQuantity(divisor);
  if (dividend.unit !== divisor.unit) {
    throw new Error("Exact quantity division requires compatible units.");
  }
  if (divisor.numerator === 0) {
    throw new Error("Cannot divide an exact quantity by zero.");
  }
  const sign = divisor.numerator < 0 ? -1 : 1;
  const reciprocal = createExactQuantity(
    sign * divisor.denominator,
    Math.abs(divisor.numerator),
    "ratio:reciprocal",
  );
  return multiplyExactQuantities(dividend, reciprocal, resultUnit);
}

export function multiplyExactShares(
  left: ExactQuantity,
  right: ExactQuantity,
): ExactQuantity {
  if (left.unit !== "rate:share" || right.unit !== "rate:share") {
    throw new Error("Exact share multiplication requires rate:share inputs.");
  }
  return multiplyExactQuantities(left, right, "rate:share");
}

export function scaleExactQuantity(
  value: ExactQuantity,
  factor: ExactQuantity,
): ExactQuantity {
  if (factor.unit !== "rate:share") {
    throw new Error("Exact quantity scale factor must use rate:share.");
  }
  return multiplyExactQuantities(value, factor, value.unit);
}

export function scaleSafeIntegerByExactShare(
  value: number,
  factor: ExactQuantity,
): number {
  assertSafeInteger(value, "Scaled integer");
  assertExactQuantity(factor);
  if (factor.unit !== "rate:share") {
    throw new Error("Exact integer scale factor must use rate:share.");
  }
  const divisor = greatestCommonDivisor(Math.abs(value), factor.denominator);
  const numerator = safeMultiply(
    value / divisor,
    factor.numerator,
    "Exact integer scaling",
  );
  const denominator = factor.denominator / divisor;
  if (numerator % denominator !== 0) {
    throw new Error("Exact integer scaling would create a fractional unit.");
  }
  return numerator / denominator;
}

function combineExactQuantities(
  left: ExactQuantity,
  right: ExactQuantity,
  rightSign: 1 | -1,
): ExactQuantity {
  assertCompatibleUnits(left, right);
  assertExactQuantity(left);
  assertExactQuantity(right);
  const divisor = greatestCommonDivisor(left.denominator, right.denominator);
  const leftTerm = safeMultiply(
    left.numerator,
    right.denominator / divisor,
    "Quantity addition",
  );
  const rightTerm = safeMultiply(
    right.numerator,
    left.denominator / divisor,
    "Quantity addition",
  );
  const numerator = safeAdd(
    leftTerm,
    rightSign === 1 ? rightTerm : -rightTerm,
    "Quantity addition",
  );
  const denominator = safeMultiply(
    left.denominator / divisor,
    right.denominator,
    "Quantity addition",
  );
  return createExactQuantity(numerator, denominator, left.unit);
}

function assertCompatibleUnits(
  left: ExactQuantity,
  right: ExactQuantity,
): void {
  if (left.unit !== right.unit) {
    throw new Error(
      `Exact quantity units are incompatible: ${left.unit} and ${right.unit}`,
    );
  }
}

function greatestCommonDivisor(left: number, right: number): number {
  let a = left;
  let b = right;
  while (b !== 0) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  return a;
}

function safeMultiply(left: number, right: number, label: string): number {
  const result = left * right;
  if (!Number.isSafeInteger(result)) {
    throw new Error(`${label} exceeds safe integer precision.`);
  }
  return result;
}

function safeAdd(left: number, right: number, label: string): number {
  const result = left + right;
  if (!Number.isSafeInteger(result)) {
    throw new Error(`${label} exceeds safe integer precision.`);
  }
  return result;
}

function assertSafeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new Error(`${label} must be a safe integer.`);
  }
}
