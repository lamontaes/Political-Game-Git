import { describe, expect, it } from "vitest";
import {
  chamberComposition,
  calibratedChamberLeans,
} from "./state-chamber-calibration";

describe("each chamber's 2024 composition", () => {
  it("keeps Vermont's chambers and other affiliations separate", () => {
    expect(chamberComposition("VT", "lower")).toMatchObject({
      size: 150,
      democratic: 87,
      republican: 56,
      other: 7,
    });
    expect(chamberComposition("VT", "upper")).toMatchObject({
      size: 30,
      democratic: 16,
      republican: 13,
      other: 1,
    });
  });
  it("does not translate Nebraska's nonpartisan seats or Puerto Rico's local parties to D/R", () => {
    expect(chamberComposition("NE", "upper")?.democratic).toBeNull();
    expect(chamberComposition("PR", "lower")?.democratic).toBeNull();
    expect(chamberComposition("XX", "lower")).toBeNull();
  });
  it("centers the partisan seats at their chamber share instead of the presidential vote", () => {
    const composition = { size: 10, democratic: 3, republican: 7 };
    const leans = calibratedChamberLeans(
      [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4],
      composition,
      1,
      0,
    );
    expect(leans.filter((x) => x > 0)).toHaveLength(3);
    expect(leans.filter((x) => x < 0)).toHaveLength(7);
    expect(
      calibratedChamberLeans(
        [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4],
        composition,
        1,
        1,
      ).filter((x) => x > 0).length,
    ).toBeGreaterThan(3);
  });
  it("provides district diversity when at-large inputs are tied", () => {
    const leans = calibratedChamberLeans(
      [0, 0, 0, 0, 0],
      { size: 5, democratic: 2, republican: 3 },
      1,
      0,
    );
    expect(new Set(leans).size).toBe(5);
    expect(leans.filter((x) => x > 0)).toHaveLength(2);
  });
  it("preserves unknown and nonpartisan conditions", () => {
    const draws = [0.2, -0.3];
    expect(calibratedChamberLeans(draws, null, 1, 0)).toBe(draws);
    expect(
      calibratedChamberLeans(
        draws,
        { size: 2, democratic: null, republican: null },
        1,
        0,
      ),
    ).toBe(draws);
  });
});
