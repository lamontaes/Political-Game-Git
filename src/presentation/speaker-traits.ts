import { recordsByStringField } from "../simulation/history-index";
import {
  currentHistoricalCutoff,
  latestPersonalityTendenciesForPerson,
} from "../simulation/queries";
import type {
  EntityId,
  HistoricalCutoff,
  PrincipleRecord,
  World,
} from "../simulation/types";
import type { GroundedEnglishPerson } from "./grounded-english";

/** Voice cues only: reading them neither teaches the listener nor invents a fact. */
export function speakerTraits(
  world: World,
  personId: EntityId,
  cutoff: HistoricalCutoff = currentHistoricalCutoff(world),
): GroundedEnglishPerson["traits"] {
  const traits: Record<string, GroundedEnglishPerson["traits"][string]> = {};
  for (const record of latestPersonalityTendenciesForPerson(
    world,
    personId,
    cutoff,
  )) {
    const fact = { text: record.strength, sourceRecordIds: [record.id] };
    traits[`tendency:${record.tendencyId}:${record.expressionKey}`] = fact;
    traits[`expression:${record.expressionKey}`] = fact;
  }
  const latest = new Map<EntityId, PrincipleRecord>();
  for (const record of recordsByStringField(
    world.history.principles,
    "personId",
    personId,
  )) {
    if (
      record.formedAt > cutoff.asOfDate ||
      record.sequence >= cutoff.historySequenceExclusive
    )
      continue;
    const prior = latest.get(record.principleId);
    if (
      !prior ||
      prior.formedAt < record.formedAt ||
      (prior.formedAt === record.formedAt && prior.sequence < record.sequence)
    )
      latest.set(record.principleId, record);
  }
  for (const record of latest.values())
    traits[`principle:${record.principleId}:${record.stance}`] = {
      text: record.conviction,
      sourceRecordIds: [record.id],
    };
  return traits;
}
