import { settleAllOfficeSalaries } from "./office-salary";
import type { EntityId, IsoDate, World } from "./types";

/** The same clock runs every decision; only distant routine pay is summarized. */
export interface HistoricalPastMode {
  readonly kind: "historical-past-v1";
  readonly focusPersonId: EntityId;
  readonly throughDate: IsoDate;
}

export function beginHistoricalPastMode(
  world: World,
  focusPersonId: EntityId,
  throughDate: IsoDate,
): World {
  if (world.control.kind !== "observer" || !world.people[focusPersonId])
    throw new Error(
      "The historical past requires its existing resident and observer World.",
    );
  if (throughDate < world.currentDate)
    throw new Error("The historical boundary is already past.");
  return {
    ...world,
    pastMode: { kind: "historical-past-v1", focusPersonId, throughDate },
  };
}

/** Close the existing salary writer before returning the same World to Begin. */
export function endHistoricalPastMode(world: World): World {
  if (!world.pastMode) return world;
  if (world.currentDate !== world.pastMode.throughDate)
    throw new Error(
      "The historical past has not reached its recorded boundary.",
    );
  const settled = settleAllOfficeSalaries(world);
  const preserved = { ...settled };
  delete preserved.pastMode;
  return preserved;
}
