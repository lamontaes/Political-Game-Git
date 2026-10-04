import { officesHeldBy } from "../simulation/governing/office-consequence";
import type { EntityId, World } from "../simulation";

/** Candidacy or a capability never establishes a current held tenure. */
export function hasCurrentOffice(world: World, personId: EntityId): boolean {
  return officesHeldBy(world, personId).length > 0;
}
