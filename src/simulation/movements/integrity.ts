import type { World } from "../types";
import { MOVEMENTS_CONTRACT_VERSION } from "./contract";

const PHASES = new Set(["organizing", "marching", "won", "faded"]);
const ROLES = new Set(["leader", "member", "opponent"]);

/** Movements name real places, questions and people, and never run ahead. */
export function assertMovementIntegrity(world: World): void {
  const store = world.movements;
  if (!store) return;
  if (store.contractVersion !== MOVEMENTS_CONTRACT_VERSION)
    throw new Error("Movement store has an unknown contract version.");
  const keys = new Set<string>();
  for (const movement of store.movements) {
    if (keys.has(movement.key))
      throw new Error(`Duplicate movement ${movement.key}.`);
    keys.add(movement.key);
    if (!world.jurisdictions[movement.jurisdictionId])
      throw new Error(`Movement ${movement.key} names no jurisdiction.`);
    if (!world.policyCatalog.propositions[movement.propositionId])
      throw new Error(`Movement ${movement.key} names no policy question.`);
    if (!PHASES.has(movement.phase))
      throw new Error(`Movement ${movement.key} has an unknown phase.`);
    if (movement.foundedAt > world.currentDate)
      throw new Error(`Movement ${movement.key} is founded in the future.`);
    const ended = movement.phase === "won" || movement.phase === "faded";
    if (ended !== (movement.endedAt !== null))
      throw new Error(`Movement ${movement.key} has an invalid end.`);
    if ((movement.phase === "won") !== (movement.wonByMeasureId !== null))
      throw new Error(`Movement ${movement.key} has an invalid win.`);
    for (const value of [movement.strength, movement.backlash])
      if (!Number.isFinite(value) || value < 0 || value > 1)
        throw new Error(`Movement ${movement.key} has an invalid level.`);
    let leaders = 0;
    for (const role of movement.roles) {
      if (!ROLES.has(role.role) || !world.people[role.personId])
        throw new Error(`Movement ${movement.key} has an invalid role.`);
      if (role.until !== null && role.until < role.since)
        throw new Error(`Movement ${movement.key} has a role that ends early.`);
      if (role.role === "leader" && role.until === null) leaders += 1;
    }
    if (leaders > 1)
      throw new Error(`Movement ${movement.key} has two leaders at once.`);
  }
}
