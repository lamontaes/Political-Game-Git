/** Units supported by the legacy legal amount evaluator. */
export const LAW_AMOUNT_UNITS = [
  "minor",
  "minor/hour",
  "minor/container",
  "minor/tonne-co2-equivalent",
  "hours",
  "share-of-federal-poverty-level",
  "share-of-local-poverty-level",
  "people",
  "count",
  "ratio",
  "basis-points",
  "dollars/year",
  "years",
  "months",
  "days",
  "containers",
  "tonnes-co2-equivalent",
  "fluid-ounces",
  "litres",
  "usd-per-award",
] as const;
export type LawAmountUnit = (typeof LAW_AMOUNT_UNITS)[number];

export type LawAmountExpression =
  | {
      op: "term" | "record" | "capacity" | "exposure";
      key: string;
      unit: LawAmountUnit;
    }
  | { op: "constant"; value: number; unit: LawAmountUnit; sourceIds: string[] }
  | { op: "sum" | "minimum" | "maximum"; operands: LawAmountExpression[] }
  | {
      op: "difference" | "product" | "ratio";
      left: LawAmountExpression;
      right: LawAmountExpression;
    };

export interface LawAmount {
  readonly value: number;
  readonly unit: LawAmountUnit;
}

export interface LawAmountInputs {
  readonly term: Readonly<Record<string, LawAmount>>;
  readonly record: Readonly<Record<string, LawAmount>>;
  readonly capacity: Readonly<Record<string, LawAmount>>;
  readonly exposure: Readonly<Record<string, LawAmount>>;
}

function checked(value: number, unit: LawAmountUnit): LawAmount {
  if (!Number.isFinite(value)) throw new Error("Law amount must be finite");
  return { value, unit };
}

function sameUnit(a: LawAmount, b: LawAmount): void {
  if (a.unit !== b.unit)
    throw new Error(`Law amount unit mismatch: ${a.unit} and ${b.unit}`);
}

/** Evaluates declared capabilities and legal terms; missing facts stay missing. */
export function evaluateLawAmount(
  expression: LawAmountExpression,
  inputs: LawAmountInputs,
): LawAmount {
  switch (expression.op) {
    case "term":
    case "record":
    case "capacity":
    case "exposure": {
      const input = Object.hasOwn(inputs[expression.op], expression.key)
        ? inputs[expression.op][expression.key]
        : undefined;
      if (!input)
        throw new Error(
          `Missing law amount capability: ${expression.op}:${expression.key}`,
        );
      sameUnit(input, { value: 0, unit: expression.unit });
      return checked(input.value, input.unit);
    }
    case "constant":
      if (!expression.sourceIds.length)
        throw new Error("Law constant requires source or legal-term evidence");
      return checked(expression.value, expression.unit);
    case "sum":
    case "minimum":
    case "maximum": {
      const values = expression.operands.map((operand) =>
        evaluateLawAmount(operand, inputs),
      );
      const first = values[0];
      if (!first)
        throw new Error(`Law ${expression.op} requires at least one operand`);
      for (const value of values) sameUnit(first, value);
      const numbers = values.map((value) => value.value);
      return checked(
        expression.op === "sum"
          ? numbers.reduce((a, b) => a + b, 0)
          : expression.op === "minimum"
            ? Math.min(...numbers)
            : Math.max(...numbers),
        first.unit,
      );
    }
    case "difference":
    case "product":
    case "ratio": {
      const left = evaluateLawAmount(expression.left, inputs);
      const right = evaluateLawAmount(expression.right, inputs);
      if (expression.op === "difference") {
        sameUnit(left, right);
        return checked(left.value - right.value, left.unit);
      }
      if (expression.op === "ratio") {
        if (right.value === 0) throw new Error("Law amount division by zero");
        if (right.unit === "ratio")
          return checked(left.value / right.value, left.unit);
        if (left.unit === right.unit)
          return checked(left.value / right.value, "ratio");
        if (left.unit === "minor" && right.unit === "hours")
          return checked(left.value / right.value, "minor/hour");
      } else {
        if (right.unit === "ratio")
          return checked(left.value * right.value, left.unit);
        if (left.unit === "ratio")
          return checked(left.value * right.value, right.unit);
        if (
          (left.unit === "minor/hour" && right.unit === "hours") ||
          (right.unit === "minor/hour" && left.unit === "hours")
        )
          return checked(left.value * right.value, "minor");
      }
      throw new Error(
        `Missing law amount unit capability: ${left.unit} ${expression.op} ${right.unit}`,
      );
    }
  }
}
