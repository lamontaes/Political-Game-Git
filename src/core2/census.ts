/**
 * The census the game takes of itself. A state's apportionment population in a
 * census year is its resident population carried forward at the rate it grew
 * from 2020 to 2024 (BEA regional accounts), times the share of its apportioned
 * people who are counted though not resident (federal employees overseas, from
 * the 2020 Census): an ESTIMATE from recorded drift, not a forecast of any
 * person. The House follows by equal proportions (`apportionHouse`).
 */
import path from "./data/census/state-population-path.json" with { type: "json" };
import { apportionHouse, type StateCount } from "./apportionment";

const states = path.states as Record<
  string,
  { apportionment2020: number; resident2020: number; resident2024: number }
>;

/** The House the 2020 Census apportioned. */
export const HOUSE_SIZE = 435;

/** Each state's apportionment population in a census year (2030, 2040, ...). */
export function censusCounts(year: number): StateCount[] {
  return Object.entries(states)
    .map(([state, row]) => {
      // Annual growth over the four years the file records, compounded to the census year.
      const growth = (row.resident2024 / row.resident2020) ** (1 / 4);
      const resident = row.resident2024 * growth ** (year - 2024);
      return {
        state,
        population: resident * (row.apportionment2020 / row.resident2020),
      };
    })
    .sort((a, b) => a.state.localeCompare(b.state));
}

/** Seats by state after the census of the given year. */
export function censusSeats(year: number): Map<string, number> {
  return apportionHouse(censusCounts(year), HOUSE_SIZE);
}
