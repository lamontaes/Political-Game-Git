/**
 * Every level's part of the officeholder's day: the local acts ride the
 * engine's own module, the state and federal acts ride the two level modules
 * (`office-day-state.ts`, `office-day-federal.ts`), each carrying its offers,
 * effects, steps and the rows it adds to the core's data. The played world
 * builds its data and opens the engine from here.
 */
import {
  OFFICE_DAY_MODULE,
  openOfficeDay as openEngine,
} from "./modules/office-day";
import {
  OFFICE_DAY_FEDERAL_MODULE,
  openFederalDay,
} from "./office-day-federal";
import "./office-day-federal-president";
import {
  OFFICE_DAY_STATE_MODULE,
  openOfficeDayState,
} from "./office-day-state";
import type { CoreData, CoreModule, CoreState } from "./types";

/** The level modules, in the order their acts join the core's data. */
const LEVELS: readonly CoreModule[] = [
  OFFICE_DAY_FEDERAL_MODULE,
  OFFICE_DAY_STATE_MODULE,
  OFFICE_DAY_MODULE,
];

/** The core data with every level's acts of office and their hours. */
export function officeDayData(base: CoreData): CoreData {
  return LEVELS.reduce((data, module) => module.dataFor?.(data) ?? data, base);
}

/** Open the officeholder's day: the engine, then each level's own records. */
export function openOfficeDay(core: CoreState, worldSeed: string): void {
  // The acts read their hours from the core's data, which is fixed when the
  // core is made: a world that opens the office day is built on officeDayData.
  const missing = LEVELS.flatMap((module) =>
    Object.keys(
      module.dataFor?.({ ...core.data, parameters: {} } as CoreData)
        .parameters ?? {},
    ),
  ).filter((key) => !(key in core.data.parameters));
  if (missing.length)
    throw new Error(
      `The office day opened on a world built without officeDayData (missing ${missing.join(", ")}).`,
    );
  openEngine(core, worldSeed);
  openFederalDay(core);
  openOfficeDayState(core);
}
