import { addDays, daysBetween } from "../dates";
import type {
  EntityId,
  FutureTransitionHandler,
  IsoDate,
  World,
} from "../types";
import { isPersonAliveAt } from "../vitality";
import {
  CONDITION_PACK_ORIGIN,
  CONDITION_PACK,
  conditionHazard,
  conditionOfOnsetItem,
  conditionOnsetDay,
  onsetCauseFactor,
} from "./condition-pack";
import { beginHealthEpisode } from "./health";
import { conditionStrainInput, mortalityCalibrationOf } from "./mortality";
import { activeHealthEpisodes } from "./health-queries";

/** Dated biography uses the same strain crossing and episode writer as the live handler. */
export function recordEarlierConditionOnsets(
  world: World,
  personId: EntityId,
  sourceId: EntityId,
): World {
  if (world.preStartLife?.personId !== personId)
    throw new Error(
      "Earlier conditions require the admitted pre-start resident.",
    );
  const person = world.people[personId]!;
  const coverage = (world.history.crisisRecords ?? [])
    .filter(
      (row) =>
        row.kind === "health-coverage" &&
        row.personId === personId &&
        row.effectiveAt < world.currentDate,
    )
    .filter((row) => row.kind === "health-coverage");
  let next = world;
  for (const condition of CONDITION_PACK) {
    if (
      activeHealthEpisodes(next, personId).some(
        (episode) => episode.conditionKey === condition.key,
      )
    )
      continue;
    const day = conditionOnsetDay(
      {
        key: condition.key,
        birthDate: person.birthDate,
        category: mortalityCalibrationOf(world, personId),
        exposureStart: person.birthDate,
        coverage,
      },
      person.birthDate,
      world.currentDate,
    );
    if (day === null) continue;
    const pushedBy = coverage.filter((row) => row.effectiveAt <= day).at(-1);
    next = recordConditionOnset(next, personId, condition.key, day, [
      sourceId,
      ...(pushedBy && onsetCauseFactor(pushedBy) !== 1 ? [pushedBy.id] : []),
    ]);
  }
  return next;
}

function recordConditionOnset(
  world: World,
  personId: EntityId,
  key: string,
  onsetAt: IsoDate,
  causalParentIds: readonly EntityId[],
): World {
  return beginHealthEpisode(world, {
    stableKey: `condition:${key}:${personId}:${onsetAt}`,
    personId,
    onsetAt,
    severity: "chronic",
    initialLimitation: "none",
    origin: CONDITION_PACK_ORIGIN,
    conditionKey: key,
    causalParentIds,
    hazard: conditionHazard(
      world.seed,
      personId,
      key,
      daysBetween(world.people[personId]!.birthDate, onsetAt) / 365.25,
    ),
  });
}

/**
 * Begins a chronic condition on the day its own strain crossed the threshold
 * (Ruling 38, step 2), through the ordinary health-episode writer. The
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
      { ...strain, key },
      strain.exposureStart,
      addDays(today, 1),
    ) === null
  )
    return cancelled("A later record change moved the day the strain crosses.");
  const pushedBy = strain.coverage
    .filter((record) => record.effectiveAt <= today)
    .at(-1);
  const next = recordConditionOnset(world, personId, key, today, [
    item.id,
    ...(pushedBy && onsetCauseFactor(pushedBy) !== 1 ? [pushedBy.id] : []),
  ]);
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
