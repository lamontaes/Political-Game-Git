import { districtIdentityCatalog } from "../districts/catalog";

/**
 * Stand-ins for the state card on the opening, so it is never blank or stuck
 * loading. Each is averaged from the game's own similar entities and marked
 * estimated; the exact survey value replaces it the moment it is read.
 */

/**
 * Average people per U.S. House seat at the 2020 apportionment
 * (331,449,281 residents over 435 seats).
 */
export const PEOPLE_PER_HOUSE_SEAT = 761_169;

/**
 * Share of citizen adults who reported registering and voting in November
 * 2024, nationwide (Census Bureau Current Population Survey, released April
 * 30, 2025).
 */
export const NATIONAL_REPORTED_VOTING_2024 = {
  registeredPercent: 73.6,
  votedPercent: 65.3,
} as const;

const seatsByState = new Map<string, number>();
for (const row of districtIdentityCatalog())
  if (row.chamber === "congressional")
    seatsByState.set(row.stateUsps, (seatsByState.get(row.stateUsps) ?? 0) + 1);

/**
 * People in a state or territory, from its seats in the House times the
 * average people per seat, to the nearest thousand. A place without a seat of
 * its own counts as one.
 */
export function estimatedStatePopulation(stateUsps: string): number {
  const seats = seatsByState.get(stateUsps) ?? 1;
  return Math.round((seats * PEOPLE_PER_HOUSE_SEAT) / 1000) * 1000;
}
