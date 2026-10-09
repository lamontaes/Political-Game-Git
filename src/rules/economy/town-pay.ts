import { ECONOMY_RULE_PARAMETERS as parameters } from "./parameters";

export type WageCells = readonly (number | null)[];

export interface WageAreaRow {
  readonly area: string;
  readonly annualWageByPercentile: WageCells;
}

export interface TownJobRate {
  readonly soc: string;
  readonly area: string;
  readonly percentile: number;
  readonly hourlyMinor: number;
  readonly floored: boolean;
}

/** Preserve the current tenure-to-percentile calibration as a pure rule. */
export function townPayPercentile(tenureYears: number): number {
  const minimum = parameters.newHirePayPercentile.value;
  const maximum = parameters.experiencedPayPercentile.value;
  const years = parameters.yearsToExperiencedPayPercentile.value;
  return (
    minimum +
    (maximum - minimum) * Math.min(1, Math.max(0, tenureYears) / years)
  );
}

/** Interpolate only between adjacent published columns; withheld cells stay unavailable. */
export function interpolateAnnualWage(
  cells: WageCells,
  percentile: number,
): number | null {
  const points = parameters.wagePercentiles.value;
  for (let index = 0; index + 1 < points.length; index += 1) {
    const low = points[index]!;
    const high = points[index + 1]!;
    if (percentile < low || percentile > high) continue;
    const lower = cells[index];
    const upper = cells[index + 1];
    if (
      lower === null ||
      lower === undefined ||
      upper === null ||
      upper === undefined
    )
      return null;
    return lower + ((upper - lower) * (percentile - low)) / (high - low);
  }
  return null;
}

/** Resolve the first available wage area, then apply the supplied legal floor. */
export function townJobRate(input: {
  // STOPGAP: economy.local-minimum-wages
  readonly soc: string | null;
  readonly orderedAreas: readonly string[];
  readonly wageRows: readonly WageAreaRow[];
  readonly percentile: number;
  readonly minimumHourly: number | null;
}): TownJobRate | null {
  if (!input.soc || input.minimumHourly === null) return null;
  const rows = new Map(input.wageRows.map((row) => [row.area, row]));
  for (const area of input.orderedAreas) {
    const row = rows.get(area);
    const annual = row
      ? interpolateAnnualWage(row.annualWageByPercentile, input.percentile)
      : null;
    if (annual === null) continue;
    const hourly = annual / parameters.annualWorkHours.value;
    return {
      soc: input.soc,
      area,
      percentile: input.percentile,
      hourlyMinor: Math.round(
        Math.max(hourly, input.minimumHourly) *
          parameters.minorUnitsPerDollar.value,
      ),
      floored: hourly < input.minimumHourly,
    };
  }
  return null;
}
