import { addDays, daysBetween } from "../dates";
import type { FutureTransitionHandler } from "../types";
import { isPersonAliveAt } from "../vitality";
import {
  CONDITION_PACK_ORIGIN,
  conditionHazard,
  conditionOfOnsetItem,
  conditionOnsetDay,
  onsetCauseFactor,
} from "./condition-pack";
import { beginHealthEpisode } from "./health";
import { conditionStrainInput } from "./mortality";

/**
 * Begins a chronic condition on the day its own strain reached the person's
 * threshold (Ruling 38, step 2; conditionOnsetDay), through the ordinary
 * health-episode writer. The
 * crossing is re-read from the records as they stand; an item a later record
 * change moved begins nothing. The episode cites the coverage record whose
 * causes pushed the strain, when one did.
 */
export const conditionOnsetHandler: FutureTransitionHandler = (world, item) => {
  const personId = item.entityIds[0];
  const today = world.currentDate;
  const cancelled = (context: string) => ({
    world,
    status: "cancelled" as const,
    reasonKey: "crisis:condition-onset-superseded" as const,
    context,
    outcomeEventId: null,
  });
  if (!personId || !world.people[personId])
    return cancelled("The onset no longer names a person.");
  if (
    !isPersonAliveAt(world, personId, {
      asOfDate: today,
      historySequenceExclusive: world.history.nextSequence,
    })
  )
    return cancelled("The person was no longer alive.");
  const key = conditionOfOnsetItem(personId, item.stableKey, item.dueAt);
  if (!key) return cancelled("The onset names no installed condition.");
  const strain = conditionStrainInput(world, personId);
  if (!strain) return cancelled("The person is not exposed to the model.");
  if (strain.held.has(key)) return cancelled("The condition is already held.");
  if (
    conditionOnsetDay(
      { ...strain, key, seed: world.seed, personId },
      strain.exposureStart,
      addDays(today, 1),
    ) === null
  )
    return cancelled("A later record change moved the day the strain crosses.");
  const pushedBy = strain.coverage
    .filter((record) => record.effectiveAt <= today)
    .at(-1);
  const next = beginHealthEpisode(world, {
    stableKey: `condition:${key}:${personId}:${today}`,
    personId,
    severity: "chronic",
    initialLimitation: "none",
    origin: CONDITION_PACK_ORIGIN,
    conditionKey: key,
    causalParentIds: [
      item.id,
      ...(pushedBy && onsetCauseFactor(pushedBy) !== 1 ? [pushedBy.id] : []),
    ],
    hazard: conditionHazard(
      world.seed,
      personId,
      key,
      daysBetween(strain.birthDate, today) / 365.25,
    ),
  });
  const began = next.history.events.find(
    (event) =>
      event.stableKey ===
      `crisis:health:condition:${key}:${personId}:${today}:event`,
  );
  return {
    world: next,
    status: "resolved",
    reasonKey: "crisis:condition-onset",
    context: `Began living with ${key}.`,
    outcomeEventId: began?.id ?? null,
  };
};
