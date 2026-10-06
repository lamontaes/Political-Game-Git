import { applyLawConsequences } from "../enacted-law-effects";
import { createStableId } from "../ids";
import { householdLocationAt } from "../life-queries";
import { lifePlaceByJurisdictionId } from "../life-places";
import { SNAP_WORK_REQUIREMENT_QUESTION } from "../law-consequences/modules/snap-participation";
import type { EntityId, IsoDate, World } from "../types";

/** Dispatch the household producer once for each state with recorded households. */
export function settleSnapParticipationForMonth(
  world: World,
  onDate: IsoDate,
  activityId: EntityId,
  baselineOnly = false,
): World {
  if (
    !world.policyCatalog?.propositionOrder?.length ||
    !world.history.households?.length
  )
    return world;
  let next = world;
  const stateByHousehold = new Map<EntityId, string>();
  for (const household of world.history.households) {
    const location = householdLocationAt(world, household.id, {
      asOfDate: onDate,
      historySequenceExclusive: world.history.nextSequence,
    });
    const stateKey = location
      ? lifePlaceByJurisdictionId(location.jurisdictionId)?.stateJurisdictionKey
      : null;
    if (stateKey) stateByHousehold.set(household.id, stateKey);
  }
  for (const stateKey of [...new Set(stateByHousehold.values())].sort()) {
    const householdIds = [...stateByHousehold]
      .filter(([, key]) => key === stateKey)
      .map(([id]) => id);
    if (!householdIds.length) continue;
    next = applyLawConsequences(next, {
      onDate,
      activity: "renewal",
      activityId: baselineOnly
        ? createStableId("event", `${world.id}:snap-baseline:${onDate}`)
        : activityId,
      subjectIds: householdIds,
      questionKey: SNAP_WORK_REQUIREMENT_QUESTION,
    });
  }
  return next;
}
