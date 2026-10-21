import { describe, expect, it } from "vitest";
import { billTally } from "./bill-tally";

describe("billTally", () => {
  it("prints the floor count when members voted", () => {
    expect(billTally([{ vote: "yes" }, { vote: "yes" }, { vote: "no" }])).toBe(
      "2–1",
    );
  });
  it("prints the committee's count for a bill that never reached the floor", () => {
    expect(billTally([], { heard: true, yes: 2, no: 5 })).toBe("committee 2–5");
  });
  it("says a bill the chair never heard was held, not 0–0", () => {
    expect(billTally([], { heard: false, yes: 0, no: 0 })).toBe(
      "committee held it, not heard",
    );
  });
  it("prints 0–0 for a bill with neither", () => {
    expect(billTally([])).toBe("0–0");
  });
});
