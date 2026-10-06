/**
 * National LGBTQ identification by birth cohort, used only as a calibration
 * input for the private romantic-orientation record. Identification is not a
 * direct measure of attraction; this table is an explicitly estimated proxy
 * until an orientation-specific cohort source is available.
 *
 * Source: Gallup, "LGBTQ+ Identification Rises to 9.3% in U.S.", Feb. 20,
 * 2025, reporting 2024 identification by generation:
 * https://news.gallup.com/poll/656708/lgbtq-identification-rises.aspx
 */

export interface RomanticOrientationCalibrationRow {
  readonly cohort: string;
  readonly firstBirthYear: number | null;
  readonly lastBirthYear: number;
  readonly lgbtqIdentificationPercent: number;
  readonly basis: "estimated";
  readonly sourceYear: 2024;
}

export const ROMANTIC_ORIENTATION_CALIBRATION: readonly RomanticOrientationCalibrationRow[] =
  [
    {
      cohort: "silent-and-older",
      firstBirthYear: null,
      lastBirthYear: 1945,
      lgbtqIdentificationPercent: 1.8,
      basis: "estimated",
      sourceYear: 2024,
    },
    {
      cohort: "baby-boomer",
      firstBirthYear: 1946,
      lastBirthYear: 1964,
      lgbtqIdentificationPercent: 3.0,
      basis: "estimated",
      sourceYear: 2024,
    },
    {
      cohort: "generation-x",
      firstBirthYear: 1965,
      lastBirthYear: 1980,
      lgbtqIdentificationPercent: 5.1,
      basis: "estimated",
      sourceYear: 2024,
    },
    {
      cohort: "millennial",
      firstBirthYear: 1981,
      lastBirthYear: 1996,
      lgbtqIdentificationPercent: 14.2,
      basis: "estimated",
      sourceYear: 2024,
    },
    {
      cohort: "generation-z",
      firstBirthYear: 1997,
      lastBirthYear: 2006,
      lgbtqIdentificationPercent: 23.1,
      basis: "estimated",
      sourceYear: 2024,
    },
  ];

/** Nearest cohort for uncovered years; callers must retain the estimate flag. */
export function romanticOrientationCalibrationForBirthYear(year: number) {
  const exact = ROMANTIC_ORIENTATION_CALIBRATION.find(
    (row) =>
      (row.firstBirthYear === null || year >= row.firstBirthYear) &&
      year <= row.lastBirthYear,
  );
  if (exact) return exact;
  return year > 2006
    ? ROMANTIC_ORIENTATION_CALIBRATION.at(-1)!
    : ROMANTIC_ORIENTATION_CALIBRATION[0]!;
}
