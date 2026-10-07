import { describe, expect, it } from "vitest";
import {
  evaluateLawAmount,
  type LawAmountInputs,
} from "./law-consequence-amount";
const inputs: LawAmountInputs = {
  term: { floor: { value: 1500, unit: "minor/hour" } },
  record: { worked: { value: 7, unit: "hours" } },
  capacity: { slots: { value: 2, unit: "people" } },
  exposure: { served: { value: 1, unit: "people" } },
};
describe("law amount contract", () => {
  it("computes legal hourly terms times actual hours without sampling", () => {
    expect(
      evaluateLawAmount(
        {
          op: "product",
          left: { op: "term", key: "floor", unit: "minor/hour" },
          right: { op: "record", key: "worked", unit: "hours" },
        },
        inputs,
      ),
    ).toEqual({ value: 10500, unit: "minor" });
  });
  it("reads measured exposure and capacity in the same language", () => {
    expect(
      evaluateLawAmount(
        {
          op: "ratio",
          left: { op: "exposure", key: "served", unit: "people" },
          right: { op: "capacity", key: "slots", unit: "people" },
        },
        inputs,
      ),
    ).toEqual({ value: 0.5, unit: "ratio" });
  });
  it("names missing facts instead of substituting zero", () => {
    expect(() =>
      evaluateLawAmount(
        { op: "record", key: "missing", unit: "hours" },
        inputs,
      ),
    ).toThrow("record:missing");
  });
  it("refuses mismatched input units and unsupported arithmetic", () => {
    expect(() =>
      evaluateLawAmount({ op: "term", key: "floor", unit: "minor" }, inputs),
    ).toThrow("unit mismatch");
    expect(() =>
      evaluateLawAmount(
        {
          op: "product",
          left: { op: "capacity", key: "slots", unit: "people" },
          right: { op: "record", key: "worked", unit: "hours" },
        },
        inputs,
      ),
    ).toThrow("Missing law amount unit capability");
  });
  it("refuses ungrounded constants and zero division", () => {
    expect(() =>
      evaluateLawAmount(
        { op: "constant", value: 3, unit: "ratio", sourceIds: [] },
        inputs,
      ),
    ).toThrow("evidence");
    expect(() =>
      evaluateLawAmount(
        {
          op: "ratio",
          left: { op: "record", key: "worked", unit: "hours" },
          right: {
            op: "constant",
            value: 0,
            unit: "hours",
            sourceIds: ["test-legal-term"],
          },
        },
        inputs,
      ),
    ).toThrow("division by zero");
  });
});
