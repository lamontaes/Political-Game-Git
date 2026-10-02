/** Passenger rail uses its bill's own funding; funding alone is not delivered riders. */
import { federalLawAmountAt } from "./federal-outlay-laws";
import type { IsoDate, World } from "./types";
export const EXPAND_PASSENGER_RAIL_QUESTION =
  "us-federal-positions:transport-water.expand-passenger-rail";
export function passengerRailAppropriationAt(world: World, onDate: IsoDate) {
  return federalLawAmountAt(
    world,
    EXPAND_PASSENGER_RAIL_QUESTION,
    "appropriation",
    onDate,
  );
}
/** No source-backed conversion from this appropriation to additional riders is recorded. */
export function railExpansionPct(world: World, onDate: IsoDate): number | null {
  return passengerRailAppropriationAt(world, onDate).law ? null : 0;
}
