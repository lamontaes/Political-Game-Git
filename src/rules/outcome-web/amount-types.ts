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
