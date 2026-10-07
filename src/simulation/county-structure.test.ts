import { describe, expect, it } from "vitest";
import readings from "../../data/research/local-government/county-governing-bodies.json" with { type: "json" };
import { countyStructureForState } from "./nationwide-world/county-governing-body-rules";

describe("county structure by state", () => {
  it("has a row for every state the county election table covers, each marked with its basis", () => {
    for (const stateUsps of Object.keys(readings.structure.states)) {
      const row = countyStructureForState(stateUsps);
      expect(row, stateUsps).not.toBeNull();
      expect(["SOURCED", "ESTIMATED FROM AVERAGE"]).toContain(row!.status);
      if (row!.status === "SOURCED")
        expect(row!.sourceUrls.length, stateUsps).toBeGreaterThan(0);
      if (row!.electedExecutive !== "none")
        expect(row!.executiveTitle, stateUsps).not.toBeNull();
    }
    expect(Object.keys(readings.structure.states)).toHaveLength(50);
  });
  it("marks the states without county government as having no body or executive", () => {
    for (const [usps, row] of Object.entries(readings.structure.states))
      if (row.structure === "none") {
        expect(row.electedExecutive, usps).toBe("none");
        expect(row.sourceUrls, usps).toEqual([]);
      }
  });
});
