/** The price engine's front door for reads: the rules a law has set on a place's prices. Each function answers one question; none returns a table. */
import { PLACE_PRICES_MODULE_ID } from "./modules/place-prices";
import type { CoreAPI, CoreState } from "./types";

/** Every price rule in force, as the price engine keeps it. */
export function placePriceRules(
  api: CoreAPI,
): readonly Readonly<Record<string, unknown>>[] {
  if (!(api.state as CoreState).modules.has(PLACE_PRICES_MODULE_ID)) return [];
  return api.moduleState(PLACE_PRICES_MODULE_ID).table("rules").rows();
}
