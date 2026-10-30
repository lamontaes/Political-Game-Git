import { describe, expect, it } from "vitest";
import { screenLine } from "./screen-words";

// The bill paper's warning on a power its authority row marks disputed
// (governing phase B, gov-m3-01-city-attorney-warning-on-the-bill): worded
// from the records the paper holds, and nothing when a slot is missing.
describe("the bill paper's disputed-authority warning", () => {
  it("names the lawyer by title where the records give one", () => {
    expect(
      screenLine("bill-paper", "bill-paper.authority.disputed", {
        lawyer: "city attorney",
        body: "council",
      }),
    ).toBe(
      "The city attorney warns that the council may not have the power to do this.",
    );
  });

  it("names only the body where they don't, and says nothing without it", () => {
    expect(
      screenLine("bill-paper", "bill-paper.authority.disputed-body", {
        body: "board",
      }),
    ).toBe(
      "The board's lawyer warns that it may not have the power to do this.",
    );
    expect(
      screenLine("bill-paper", "bill-paper.authority.disputed", {
        body: "council",
      }),
    ).toBeNull();
  });
});
