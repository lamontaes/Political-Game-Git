/**
 * Group A's law-reach reads that need nothing of the run: its table, a mechanic's row, its policies and its parameter table. src/core2/law-reach/group-a-records.ts re-exports them.
 */
import parameters from "../data/laws/reach-group-a-parameters.json" with { type: "json" };
import reach from "../data/laws/reach-group-a.json" with { type: "json" };
import { parameter } from "../parameters";
import type { CoreAPI } from "../types";
import type { PolicySpec, MechanicRow } from "./group-a-records";
import { REACH_A_MODULE_ID } from "./group-a-records-constants";

export const data = reach as unknown as {
  selectors: Record<string, readonly string[]>;
  extraSelectors: Record<string, readonly string[]>;
  staffing: Record<string, { employers: string; levels: readonly string[] }>;
  policies: Record<string, PolicySpec>;
};

export const POLICIES = data.policies;

const params = (
  parameters as unknown as {
    parameters: Record<string, { value: number }>;
  }
).parameters;

/**
 * A number from the group A parameter table. The voting age is the elections
 * data's one row (`votingAge`, the Twenty-Sixth Amendment), never a copy here.
 */
export function reachParameter(key: string): number {
  if (key === "votingAge") return parameter(key);
  const row = params[key];
  if (!row) throw new Error(`No law-reach parameter: ${key}`);
  return row.value;
}

export function reachTable(api: CoreAPI, name: string) {
  return api.moduleState(REACH_A_MODULE_ID).table(name);
}

export function mechanicRow(api: CoreAPI, id: string): MechanicRow | null {
  if (!api.state.modules.has(REACH_A_MODULE_ID)) return null;
  return (
    (reachTable(api, "mechanics").get(id) as unknown as
      MechanicRow | undefined) ?? null
  );
}
