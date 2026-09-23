import { describe, expect, it } from "vitest";
import { projectStateVotingContext } from "./state-voting-context";

describe("a territory's opening voting line", () => {
  it.each([
    ["PR", "Puerto Rico"],
    ["GU", "Guam"],
    ["VI", "the U.S. Virgin Islands"],
    ["AS", "American Samoa"],
    ["MP", "the Northern Mariana Islands"],
  ])("%s says the survey does not report it", (usps, name) => {
    const context = projectStateVotingContext(usps, "2026-01-05", []);
    expect(context.totals).toBeNull();
    expect(context.unavailableReason).toBe(
      `This survey covers the fifty states and the District of Columbia. It does not report ${name}.`,
    );
  });

  it("still gives the unknown-place reason for a code that is no place", () => {
    expect(
      projectStateVotingContext("ZZ", "2026-01-05", []).unavailableReason,
    ).toBe("No reviewed state identity matches this selection.");
  });
});
