import { recoverOverdueProsecutions } from "../simulation/justice/prosecution-transitions";
import type { EntityId, World } from "../simulation/types";
import { shellReadOnly } from "./life-continuation-shell";
import { openOrdinaryLife } from "./ordinary-life";

/** A played save opens its existing life before recovering today's cases.
 * The codec and read-only worlds retain their saved bytes and dates. */
export function openSavedPlayedLife(world: World, personId: EntityId): World {
  if (shellReadOnly(world)) return world;
  return recoverOverdueProsecutions(openOrdinaryLife(world, personId));
}
