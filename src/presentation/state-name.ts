import { US_STATE_NAMES } from "../simulation/nationwide-world/state-executive-candidacy-packs";

const STATE_NAMES: Readonly<Record<string, string>> = US_STATE_NAMES;

/** A state's or territory's name from its postal code, or null when unknown. */
export function stateNameForUsps(usps: string): string | null {
  return STATE_NAMES[usps] ?? null;
}
