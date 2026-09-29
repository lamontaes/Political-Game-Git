import type { EntityId, World } from "../../simulation/types";
import { activePartnershipsAt } from "../../simulation/life-queries";

/**
 * Whether this person has an active legal marriage now, read from the
 * partnership records already written (the same test the tax withholding uses
 * for filing status). A wedding ring follows it. Reading it records nothing.
 */
export function isMarriedNow(world: World, personId: EntityId): boolean {
  return activePartnershipsAt(world, personId).some(
    (partnership) => partnership.kind === "legal:marriage",
  );
}
