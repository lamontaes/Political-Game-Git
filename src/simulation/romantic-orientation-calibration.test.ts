import { describe, expect, it } from "vitest";
import {
  ROMANTIC_ORIENTATION_CALIBRATION,
  romanticOrientationCalibrationForBirthYear,
} from "./romantic-orientation-calibration";

describe("romantic orientation cohort calibration", () => {
  it("records the sourced 2024 national identification shares by cohort", () => {
    expect(
      ROMANTIC_ORIENTATION_CALIBRATION.map((row) => [
        row.cohort,
        row.lgbtqIdentificationPercent,
      ]),
    ).toEqual([
      ["silent-and-older", 1.8],
      ["baby-boomer", 3.0],
      ["generation-x", 5.1],
      ["millennial", 14.2],
      ["generation-z", 23.1],
    ]);
    expect(
      ROMANTIC_ORIENTATION_CALIBRATION.every(
        (row) => row.basis === "estimated",
      ),
    ).toBe(true);
  });

  it("uses the nearest available cohort for uncovered birth years", () => {
    expect(romanticOrientationCalibrationForBirthYear(1930).cohort).toBe(
      "silent-and-older",
    );
    expect(romanticOrientationCalibrationForBirthYear(2010)).toMatchObject({
      cohort: "generation-z",
      basis: "estimated",
    });
  });
});
