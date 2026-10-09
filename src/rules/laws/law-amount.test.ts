import { describe, expect, it } from "vitest";
import {
  evaluateLawAmount as evaluateLegacyLawAmount,
  type LawAmountInputs as LegacyLawAmountInputs,
} from "../../simulation/law-consequence-amount";
import {
  evaluateLawAmount,
  type LawAmountExpression,
  type LawAmountInputs,
} from "./law-amount";

const legacyInputs: LegacyLawAmountInputs = {
  term: { hourlyFloor: { value: 1500, unit: "minor/hour" } },
  record: {
    hours: { value: 7, unit: "hours" },
    wage: { value: 56000, unit: "minor" },
  },
  capacity: { slots: { value: 2, unit: "people" } },
  exposure: { served: { value: 1, unit: "people" } },
};
const shelfInputs: LawAmountInputs = legacyInputs;

const cases: readonly LawAmountExpression[] = [
  {
    op: "product",
    left: { op: "term", key: "hourlyFloor", unit: "minor/hour" },
    right: { op: "record", key: "hours", unit: "hours" },
  },
  {
    op: "ratio",
    left: { op: "exposure", key: "served", unit: "people" },
    right: { op: "capacity", key: "slots", unit: "people" },
  },
  {
    op: "sum",
    operands: [
      { op: "record", key: "wage", unit: "minor" },
      { op: "constant", value: 500, unit: "minor", sourceIds: ["source:test"] },
    ],
  },
  {
    op: "difference",
    left: { op: "record", key: "wage", unit: "minor" },
    right: {
      op: "constant",
      value: 500,
      unit: "minor",
      sourceIds: ["source:test"],
    },
  },
];

describe("standalone law amount evaluator", () => {
  it.each(cases)("matches the old evaluator for %s", (expression) => {
    expect(evaluateLawAmount(expression, shelfInputs)).toEqual(
      evaluateLegacyLawAmount(expression, legacyInputs),
    );
  });

  it("matches the old evaluator's missing-capability failure", () => {
    const expression: LawAmountExpression = {
      op: "record",
      key: "unknown",
      unit: "hours",
    };
    expect(() => evaluateLawAmount(expression, shelfInputs)).toThrow(
      "record:unknown",
    );
    expect(() => evaluateLegacyLawAmount(expression, legacyInputs)).toThrow(
      "record:unknown",
    );
  });
});
