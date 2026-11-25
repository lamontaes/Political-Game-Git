/**
 * For tests that need people who act in the played town (the candidate, the
 * rival, the donor, the player's stand-in). Relatives who live elsewhere are
 * husks with their own savings; they can richly top a "richest adults" list
 * yet cannot file for a town race or walk a door in town. This returns the
 * town's full residents, richest first, id as the tie-break. The town is read
 * the way the engine reads it: `lawChain(api).townPlaceId`. A test keeps its
 * own age rule by filtering the result.
 */
import { lawChain } from "./modules/laws";
import type { CoreAPI, CoreState, PersonState } from "./types";

export function townResidentsByCash(
  core: Pick<CoreState, "people">,
  api: CoreAPI,
): PersonState[] {
  const town = lawChain(api).townPlaceId;
  return [...core.people.values()]
    .filter((p) => p.alive && p.tier !== "husk" && p.placeId === town)
    .sort((a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id));
}
