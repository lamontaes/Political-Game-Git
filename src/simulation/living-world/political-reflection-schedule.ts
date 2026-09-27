import { addDays } from "../dates";
import { scheduleFutureDueItem } from "../future-transitions";
import { principledLeaning } from "../governing/officeholder-principles";
import type { EntityId, PropositionExposureRecord, World } from "../types";

export const POLITICAL_REFLECTION_TRANSITION_KEY =
  "people:political-reflection";

export function exposureReflectionKey(
  exposure: PropositionExposureRecord,
): string {
  return `people-reflection:exposure:${exposure.id}`;
}

/** A witnessed question with a saved bearing gets one dated NPC reconsideration. */
export function schedulePoliticalReflectionForExposure(
  world: World,
  exposureId: EntityId,
): World {
  const exposure = world.history.propositionExposures.find(
    (row) => row.id === exposureId,
  );
  if (!exposure) throw new Error(`Missing proposition exposure: ${exposureId}`);
  if (
    !world.people[exposure.personId] ||
    (world.control.kind === "person" &&
      world.control.personId === exposure.personId) ||
    exposure.provenance.kind !== "direct-experience" ||
    world.history.privateBeliefs.some(
      (belief) =>
        belief.personId === exposure.personId &&
        belief.propositionId === exposure.propositionId &&
        belief.sequence >= exposure.sequence,
    ) ||
    principledLeaning(world, exposure.personId, exposure.propositionId)
      .score === 0
  )
    return world;
  const stableKey = exposureReflectionKey(exposure);
  if (world.history.futureDueItems.some((item) => item.stableKey === stableKey))
    return world;
  return scheduleFutureDueItem(world, {
    stableKey,
    dueAt: addDays(world.currentDate, 1),
    transitionKey: POLITICAL_REFLECTION_TRANSITION_KEY,
    entityIds: [exposure.personId],
    jurisdictionId: null,
    provenance: {
      kind: "simulated",
      sourceEntityIds: [exposure.provenance.eventId],
    },
  });
}
