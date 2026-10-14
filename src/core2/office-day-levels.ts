/**
 * Every level's part of the officeholder's day, registered on import: the
 * local acts with the engine itself; OFFICE-STATE and OFFICE-FEDERAL add one
 * import line each here for `office-day-state.ts` and `office-day-federal.ts`.
 * The played world builds its data and opens the engine from here.
 */
import "./modules/office-day";

export { officeDayData } from "./office-day-acts";
export { openOfficeDay } from "./modules/office-day";
