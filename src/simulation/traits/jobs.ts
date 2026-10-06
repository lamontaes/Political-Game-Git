import { registeredTraitConsiderations } from "../trait-readings";
import { traitRegistryFor } from "../trait-registry";
import type { DecisionDeclaration } from "../trait-packs";
import type { DecisionConsideration, EntityId, World } from "../types";

export { JOB_TRAIT_DECISIONS } from "./jobs-decisions";

/** Reads every installed trait effect registered for this job decision. */
export function jobTraitConsiderations(
  world: World,
  actorPersonId: EntityId,
  keyPrefix: string,
  decision: DecisionDeclaration,
): readonly DecisionConsideration[] {
  return registeredTraitConsiderations(
    world,
    traitRegistryFor(world),
    actorPersonId,
    keyPrefix,
    decision.id,
  );
}
