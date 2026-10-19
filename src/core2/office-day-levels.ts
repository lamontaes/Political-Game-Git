/**
 * Every level's part of the officeholder's day, registered on import: the
 * local acts with the engine itself; OFFICE-STATE and OFFICE-FEDERAL add one
 * import line each here for `office-day-state.ts` and `office-day-federal.ts`.
 * The played world builds its data and opens the engine from here.
 */
import type { CoreState } from "./types";
import { openOfficeDay as openEngine } from "./modules/office-day";
import { openFederalDay } from "./office-day-federal";
import "./office-day-federal-president";
import { openOfficeDayState } from "./office-day-state";

export { officeDayData } from "./office-day-acts";

/** Open the officeholder's day: the engine, then each level's own records. */
export function openOfficeDay(core: CoreState, worldSeed: string): void {
  openEngine(core, worldSeed);
  openFederalDay(core);
  openOfficeDayState(core);
}
