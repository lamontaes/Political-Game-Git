import {
  recordsByKey,
  recordsByStringField,
  recordsWithFieldValue,
} from "../history-index";
import { householdMembershipsAt, peopleInHouseholdAt } from "../life-queries";
import type { EntityId, HistoricalCutoff, IsoDate, World } from "../types";
import { isPersonAliveAt } from "../vitality";

/** One evidence ceiling for a monthly exposure or incident read. */
export function crimeCutoff(
  world: World,
  asOfDate: IsoDate,
  historySequenceExclusive = world.history.nextSequence,
): HistoricalCutoff {
  return { asOfDate, historySequenceExclusive };
}

/** Recorded residence only; an absent historical home stays unknown. */
export function crimeResidenceAt(
  world: World,
  personId: EntityId,
  cutoff: HistoricalCutoff,
): EntityId | null {
  if (
    !world.people[personId] ||
    world.people[personId]!.birthDate > cutoff.asOfDate
  )
    return null;
  return (
    householdMembershipsAt(world, personId, cutoff).find((row) => row.location)
      ?.location?.jurisdictionId ?? null
  );
}

/** Knowing survives an ended partnership; future ties never establish it. */
export function crimeKnownTiesAt(
  world: World,
  subjects: readonly EntityId[],
  cutoff: HistoricalCutoff,
): readonly EntityId[] {
  const ties = new Set<EntityId>();
  for (const subject of subjects) {
    if (
      !world.people[subject] ||
      world.people[subject]!.birthDate > cutoff.asOfDate
    )
      continue;
    for (const membership of householdMembershipsAt(world, subject, cutoff))
      for (const id of peopleInHouseholdAt(
        world,
        membership.household.id,
        cutoff,
      ))
        ties.add(id);
    const interactions = recordsByKey(
      world.history.relationshipInteractions,
      "relationship-interactions-by-person",
      (row) => row.personIds,
      subject,
    );
    const kin = recordsByKey(
      world.history.kinshipRelationships,
      "kinship-relationships-by-person",
      (row) => row.personIds,
      subject,
    );
    const partners = recordsByKey(
      world.history.partnerships,
      "partnerships-by-person",
      (row) => row.personIds,
      subject,
    );
    for (const row of interactions)
      if (
        row.sequence < cutoff.historySequenceExclusive &&
        row.occurredAt <= cutoff.asOfDate
      )
        for (const id of row.personIds) ties.add(id);
    for (const row of kin)
      if (
        row.sequence < cutoff.historySequenceExclusive &&
        row.establishedAt <= cutoff.asOfDate
      )
        for (const id of row.personIds) ties.add(id);
    for (const row of partners)
      if (
        row.sequence < cutoff.historySequenceExclusive &&
        row.startedAt <= cutoff.asOfDate
      )
        for (const id of row.personIds) ties.add(id);
  }
  for (const subject of subjects) ties.delete(subject);
  return [...ties]
    .filter((id) => world.people[id] && isPersonAliveAt(world, id, cutoff))
    .sort();
}

const evidenceCache = new WeakMap<World, { key: string; world: World }>();
/** Prevent future sentences/clemency from changing a dated jail read. */
export function crimeJusticeEvidenceAt(
  world: World,
  cutoff: HistoricalCutoff,
  personalityPersonId?: EntityId,
): World {
  const key = `${cutoff.asOfDate}:${cutoff.historySequenceExclusive}:${personalityPersonId ?? ""}`;
  const cached = evidenceCache.get(world);
  if (cached?.key === key) return cached.world;
  const dated = {
    ...world,
    history: {
      ...world.history,
      personalityTendencies:
        personalityPersonId === undefined
          ? world.history.personalityTendencies
          : recordsByStringField(
              world.history.personalityTendencies,
              "personId",
              personalityPersonId,
            ).filter(
              (row) =>
                row.sequence < cutoff.historySequenceExclusive &&
                row.recordedAt <= cutoff.asOfDate,
            ),
      events: [
        ...recordsWithFieldValue(
          world.history.events,
          "type",
          "justice.sentenced",
        ),
        ...recordsWithFieldValue(
          world.history.events,
          "type",
          "justice.clemency-granted",
        ),
      ].filter(
        (row) =>
          row.sequence < cutoff.historySequenceExclusive &&
          row.occurredAt <= cutoff.asOfDate,
      ),
    },
  };
  evidenceCache.set(world, { key, world: dated });
  return dated;
}
