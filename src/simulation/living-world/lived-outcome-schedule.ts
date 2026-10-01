import { addDays } from "../dates";
import { scheduleFutureDueItem } from "../future-transitions";
import type { EntityId, World } from "../types";

/**
 * When something happens to a person that an official answers for (a job
 * they did not choose to leave), the producer that writes it schedules the
 * person's reflection on that official here. The reflection itself runs in
 * `official-views.ts`, through the one belief pipeline.
 *
 * Kept apart from the reflection so the producers that write these records
 * do not load the reflection's dependencies.
 */

export const LIVED_OUTCOME_REFLECTION_TRANSITION_KEY =
  "people:lived-outcome-reflection";

// PLACEHOLDER: the same few days a law's reflection waits (law-exposure.ts).
const REFLECTION_DAYS = 3;

export function livedOutcomeReflectionKey(
  personId: EntityId,
  sourceRecordId: EntityId,
): string {
  return `lived-outcome:reflect:${sourceRecordId}:${personId}`;
}

/** Schedules one reflection on one recorded outcome. The player decides their own mind. */
export function scheduleLivedOutcomeReflection(
  world: World,
  personId: EntityId,
  sourceRecordId: EntityId,
): World {
  if (!world.people[personId]) return world;
  if (world.control.kind === "person" && world.control.personId === personId)
    return world;
  const stableKey = livedOutcomeReflectionKey(personId, sourceRecordId);
  if (world.history.futureDueItems.some((item) => item.stableKey === stableKey))
    return world;
  return scheduleFutureDueItem(world, {
    stableKey,
    dueAt: addDays(world.currentDate, REFLECTION_DAYS),
    transitionKey: LIVED_OUTCOME_REFLECTION_TRANSITION_KEY,
    entityIds: [personId],
    jurisdictionId: null,
    provenance: {
      kind: "initialization",
      reference: "lived-outcome:reflect",
    },
  });
}
