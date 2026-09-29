import { addDays } from "../dates";
import { scheduleFutureDueItem } from "../future-transitions";
import { principledLeaning } from "../governing/officeholder-principles";
import { formPrinciplesFromLife } from "../principles-from-life";
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
  before: World,
  exposureId: EntityId,
): World {
  const exposure = before.history.propositionExposures.find(
    (row) => row.id === exposureId,
  );
  if (!exposure) throw new Error(`Missing proposition exposure: ${exposureId}`);
  if (
    !before.people[exposure.personId] ||
    (before.control.kind === "person" &&
      before.control.personId === exposure.personId) ||
    exposure.provenance.kind !== "direct-experience" ||
    before.history.privateBeliefs.some(
      (belief) =>
        belief.personId === exposure.personId &&
        belief.propositionId === exposure.propositionId &&
        belief.sequence >= exposure.sequence,
    )
  )
    return before;
  const stableKey = exposureReflectionKey(exposure);
  if (
    before.history.futureDueItems.some((item) => item.stableKey === stableKey)
  )
    return before;
  // Meeting a question is when what a person's life has made of them first
  // matters, so their principles are formed from it now. When none of them
  // bears on this question there is nothing to reflect on, and nothing is
  // written: they are formed again, the same way, when one does.
  const world = formPrinciplesFromLife(before, [exposure.personId]);
  if (
    principledLeaning(world, exposure.personId, exposure.propositionId)
      .score === 0
  )
    return before;
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
