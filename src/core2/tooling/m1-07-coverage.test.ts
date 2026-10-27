import { describe, expect, it } from "vitest";
import bases from "../../../data/research/money/public-budget-bases.json" with { type: "json" };
import finances from "../../../data/research/money/state-local-finances-2022.json" with { type: "json" };
import {
  coverageOf,
  exitCodeOf,
  territorySpendingPerResident,
} from "./m1-07-coverage";

const censusPlaces = finances.places as Record<string, unknown>;
const places = bases.places as never;

describe("M1-07 holds every place to a per-resident comparison or fails", () => {
  it("covers each state and D.C. by the Census table and each island area by its own published spending", () => {
    for (const key of Object.keys(censusPlaces).filter((k) => k !== "US"))
      expect(coverageOf(key, censusPlaces, places), key).toBe("census");
    for (const key of ["US-AS", "US-GU", "US-MP", "US-PR", "US-VI"])
      expect(coverageOf(key, censusPlaces, places), key).toBe("territory");
  });

  it("leaves a place with neither comparison uncovered, and an uncovered place cannot exit zero", () => {
    expect(coverageOf("US-ZZ", censusPlaces, places)).toBe("none");
    expect(exitCodeOf([], ["US-ZZ: spending per resident"])).toBe(1);
    expect(exitCodeOf(["a clause failed"], [])).toBe(1);
    expect(exitCodeOf([], [])).toBe(0);
  });

  it("expects an island area's own published figure, else the median of those published", () => {
    const own = (key: string) => territorySpendingPerResident(key, places);
    const published = ["US-GU", "US-PR", "US-VI"]
      .map(own)
      .sort((a, b) => a - b);
    // Each publishing area expects its own; the others expect the median of the three.
    expect(own("US-GU")).toBeGreaterThan(0);
    expect(own("US-AS")).toBe(published[1]);
    expect(own("US-MP")).toBe(published[1]);
  });
});
