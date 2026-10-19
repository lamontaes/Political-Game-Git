/**
 * Which households keep a gun (SG-GOV-REACH-A-firearms). A household owns a
 * firearm or does not, drawn once from the household's own key against its
 * state's survey rate (`data/people/firearm-ownership.json`, RAND 2020), so
 * the same household is the same answer every time it is asked and a state's
 * share of owning households is its rate. Counted households are read as a
 * group: their count times the same rate.
 */
import rates from "./data/people/firearm-ownership.json" with { type: "json" };
import { stableHash } from "./kernel/ids";
import type { CoreAPI } from "./types";

const DATA = rates as unknown as {
  national: { percent: number };
  byState: Record<string, number>;
};

/** The share of a state's households that keep a firearm, in [0, 1]. */
export function firearmOwnershipRate(stateKey: string): number {
  const usps = stateKey.startsWith("US-") ? stateKey.slice(3) : stateKey;
  return (DATA.byState[usps] ?? DATA.national.percent) / 100;
}

/** Whether a named household keeps a firearm: its own draw against its state's rate. */
export function householdOwnsFirearm(
  api: CoreAPI,
  householdId: string,
  stateKey: string,
): boolean {
  const hex = stableHash(`${api.state.seed}:firearms:${householdId}`).slice(
    0,
    8,
  );
  return Number.parseInt(hex, 16) / 2 ** 32 < firearmOwnershipRate(stateKey);
}
