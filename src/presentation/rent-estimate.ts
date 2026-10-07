/**
 * A two-bedroom rent for a place the housing tables have no figure for: the
 * average of the state's own areas, weighted by the people each area holds,
 * so a place with nothing of its own still starts from what its neighbors pay.
 */

export interface RentAreaRow {
  readonly publishedPopulation?: number | null;
  readonly rentByBedrooms?: Readonly<Record<string, number>> | null;
}

/** Whole dollars per month, or null when no area in the state has a figure. */
export function averageTwoBedroomRent(
  rows: readonly RentAreaRow[],
): number | null {
  let weighted = 0;
  let people = 0;
  for (const row of rows) {
    const rent = row.rentByBedrooms?.["2"];
    if (typeof rent !== "number" || !Number.isFinite(rent) || rent <= 0)
      continue;
    const weight =
      typeof row.publishedPopulation === "number" && row.publishedPopulation > 0
        ? row.publishedPopulation
        : 1;
    weighted += rent * weight;
    people += weight;
  }
  return people > 0 ? Math.round(weighted / people) : null;
}
