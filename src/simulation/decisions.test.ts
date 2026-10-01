import { describe, expect, it } from "vitest";
import { isSelectedDecision } from "./decisions";

describe("decision consequence contract", () => {
  it("authorizes only an explicitly selected option", () => {
    expect(
      isSelectedDecision({
        outcomeKind: "selected",
        selectedOptionKey: "accept",
      }),
    ).toBe(true);
    expect(
      isSelectedDecision({ outcomeKind: "undecided", selectedOptionKey: null }),
    ).toBe(false);
    expect(
      isSelectedDecision({
        outcomeKind: "no-available-option",
        selectedOptionKey: null,
      }),
    ).toBe(false);
    expect(
      isSelectedDecision({ outcomeKind: "selected", selectedOptionKey: null }),
    ).toBe(false);
  });
});
