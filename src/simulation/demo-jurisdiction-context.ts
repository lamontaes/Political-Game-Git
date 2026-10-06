import { makeIsoDate } from "./dates";
import scenarios from "./authored-scenarios.generated.json" with { type: "json" };
import type { Jurisdiction, SimulationMoment } from "./types";

/** Authored scenario inputs, not jurisdiction rules or a persisted hierarchy. */
export interface DemoJurisdictionContext {
  readonly jurisdiction: Jurisdiction;
  readonly initialMoment: SimulationMoment;
  readonly creationSummary: string;
  readonly goalScope: string;
  readonly householdLocationLabel: string;
}

export const DEMO_START_DATE = makeIsoDate("2026-01-05");

/** Retained explicit scenario inputs, separate from the searchable all-place corpus. */
export function authoredScenarioContext(
  key: keyof typeof scenarios.contexts,
): DemoJurisdictionContext {
  return scenarios.contexts[key] as unknown as DemoJurisdictionContext;
}

export const DEFAULT_AUTHORED_SCENARIO_SEED = scenarios.defaultSeed;

/** Persisted identities of explicit retained scenarios; never a normal-play venue selector. */
export const AUTHORED_SCENARIO_SCENE_KEYS = scenarios.sceneKeys;

/** Identity metadata for retained explicit scenario Worlds, excluded from fresh-place selection. */
export const RETAINED_SCENARIO_PLACE_INPUTS = scenarios.retainedPlaces;
