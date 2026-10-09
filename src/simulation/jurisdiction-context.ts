import { researchRuleTable } from "./research-rule-tables";
import type { Jurisdiction, SimulationMoment, IsoDate } from "./types";

/** Recorded place and clock inputs, independent of any world builder. */
export interface JurisdictionContext {
  readonly jurisdiction: Jurisdiction;
  readonly initialMoment: SimulationMoment;
  readonly creationSummary: string;
  readonly goalScope: string;
  readonly householdLocationLabel: string;
}

const rows = researchRuleTable("authoredPlaceContexts");
export const DEFAULT_START_DATE = rows.startDate as IsoDate;

export function authoredJurisdictionContext(key: string): JurisdictionContext {
  const row = rows.contexts[key as keyof typeof rows.contexts];
  if (!row) throw new Error(`No recorded place context for '${key}'.`);
  return row as JurisdictionContext;
}
