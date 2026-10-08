import { describe, expect, it } from "vitest";

import budgets from "../../data/research/money/government-budgets-2026.json" with { type: "json" };
import { validatePlaceTable } from "./data-tables";

const placeRows = Object.keys(budgets.places).map((placeKey) => ({ placeKey }));

describe("place table validation", () => {
  it("accepts exactly one row for each researched place", () => {
    expect(validatePlaceTable("test", placeRows)).toHaveLength(56);
  });

  it("rejects missing, duplicate, and unexpected place rows", () => {
    expect(() => validatePlaceTable("test", placeRows.slice(1))).toThrow(
      /missing:/,
    );
    expect(() =>
      validatePlaceTable("test", [...placeRows, placeRows[0]!]),
    ).toThrow(/duplicate/);
    expect(() =>
      validatePlaceTable("test", [
        ...placeRows.slice(1),
        { placeKey: "US-XX" },
      ]),
    ).toThrow(/unexpected:/);
  });
});
