/**
 * Where the views engine's life term reads health plans from: the coverage
 * engine carries its readers as its module's `planReaders`, so the life term
 * never imports the coverage engine (whose own imports lead back to the
 * views). Absent readers mean the plan is not known, read as the nation's
 * average.
 */
import type { CoreState } from "./types";

export interface PlanReaders {
  /** A full person's current plan ("employer", "medicare" or "none"); undefined where the engine keeps none for them, null without the coverage engine. */
  readonly fullPlan: (
    core: CoreState,
    householdId: string,
    personId: string,
  ) => string | undefined | null;
  /**
   * How many of a counted household's people under Medicare age its plan
   * covers, or null where the coverage engine keeps no counted plans in the
   * household's place (the plan is not known there).
   */
  readonly countedCovered: (
    core: CoreState,
    householdId: string,
    placeId: string,
  ) => number | null;
}

/** Where the coverage engine is not installed, no plan is known. */
const NO_COVERAGE: PlanReaders = {
  fullPlan: () => null,
  countedCovered: () => null,
};

/** The plan readers the coverage engine carries as its module's `planReaders`, or readers that know no plan. */
export function planReaders(core: CoreState): PlanReaders {
  for (const module of core.modules.values())
    if (module.planReaders) return module.planReaders;
  return NO_COVERAGE;
}
