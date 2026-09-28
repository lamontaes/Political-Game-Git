import { traitReadingOfRecord } from "../simulation/trait-readings";
import { traitDefinitionFromPack } from "../simulation/trait-packs";
import { traitRegistryFor } from "../simulation/trait-registry";
import type {
  DecisionTraceRecord,
  EntityId,
  IsoDate,
  PersonalityTendencyRecord,
  World,
} from "../simulation/types";

/**
 * The traits the player has learned about somebody, and where.
 *
 * A trait is learned when it decided an answer that person gave the player:
 * a kept decision whose subject is the player, made by this person, where a
 * reason resting on one of their own trait records argued for what they
 * actually chose. The record of that answer is the source, so the card can say
 * when it was and what reason the person gave.
 *
 * Nothing else teaches a trait. A trait drawn when a life opens, a trait that
 * only weighed on an option the person did not choose, and a decision that was
 * never kept are not things the player saw. A trait that changed after the
 * answer is named as the player saw it then, from the record the answer cited,
 * not from the person's record today.
 *
 * Pure and read-only: opening a card writes nothing and draws no traits.
 */
export interface LearnedTrait {
  readonly tendencyId: EntityId;
  /** The pole's word as it was when the player saw it. */
  readonly label: string;
  /** How far it leaned, in the trait's own magnitudes; for ordering only. */
  readonly strength: number;
  readonly learnedOn: IsoDate;
  /** The reason the person's decision gave, in the game's own words. */
  readonly reason: string;
  readonly decisionTraceId: EntityId;
}

const tracesByPair = new WeakMap<
  readonly DecisionTraceRecord[],
  ReadonlyMap<string, readonly DecisionTraceRecord[]>
>();

function answersTo(
  world: World,
  playerId: EntityId,
  personId: EntityId,
): readonly DecisionTraceRecord[] {
  const traces = world.history.decisionTraces;
  let index = tracesByPair.get(traces);
  if (!index) {
    const built = new Map<string, DecisionTraceRecord[]>();
    for (const trace of traces) {
      const subject = trace.context.subject.entityId;
      if (subject === null || trace.selectedOptionKey === null) continue;
      const key = `${trace.context.actorPersonId}|${subject}`;
      const list = built.get(key);
      if (list) list.push(trace);
      else built.set(key, [trace]);
    }
    index = built;
    tracesByPair.set(traces, index);
  }
  return index.get(`${personId}|${playerId}`) ?? [];
}

const tendencyById = new WeakMap<
  readonly PersonalityTendencyRecord[],
  ReadonlyMap<EntityId, PersonalityTendencyRecord>
>();

function tendencyRecord(
  world: World,
  id: EntityId,
): PersonalityTendencyRecord | undefined {
  const records = world.history.personalityTendencies;
  let index = tendencyById.get(records);
  if (!index) {
    index = new Map(records.map((record) => [record.id, record]));
    tendencyById.set(records, index);
  }
  return index.get(id);
}

/** Every trait the player has learned about this person, latest sighting of each. */
export function learnedTraits(
  world: World,
  playerId: EntityId,
  personId: EntityId,
): readonly LearnedTrait[] {
  if (personId === playerId) return [];
  const traces = answersTo(world, playerId, personId);
  if (traces.length === 0) return [];
  const traitsById = new Map(
    [...traitRegistryFor(world).traits.values()].map((trait) => [
      traitDefinitionFromPack(trait).id,
      trait,
    ]),
  );
  const latest = new Map<EntityId, LearnedTrait>();
  for (const trace of traces) {
    for (const consideration of trace.context.considerations) {
      if (consideration.optionKey !== trace.selectedOptionKey) continue;
      if (consideration.direction !== "supports") continue;
      for (const ref of consideration.sourceRefs) {
        if (ref.kind !== "personality-tendency") continue;
        const record = tendencyRecord(world, ref.tendencyRecordId);
        // Their own trait only: a reason about somebody else is not theirs.
        if (!record || record.personId !== personId) continue;
        const trait = traitsById.get(record.tendencyId);
        if (!trait) continue;
        const reading = traitReadingOfRecord(trait, record);
        if (reading.state !== "recorded" || reading.label === null) continue;
        // Traces are in history order, so a later answer replaces an earlier
        // sighting of the same trait.
        latest.set(record.tendencyId, {
          tendencyId: record.tendencyId,
          label: reading.label,
          strength: Math.abs(reading.value),
          learnedOn: trace.recordedAt,
          reason: consideration.explanation,
          decisionTraceId: trace.id,
        });
      }
    }
  }
  return [...latest.values()];
}

/** The few that stand out, strongest first, then most recently seen. */
export function strongestLearnedTraits(
  world: World,
  playerId: EntityId,
  personId: EntityId,
  limit: number,
): readonly LearnedTrait[] {
  return [...learnedTraits(world, playerId, personId)]
    .sort(
      (a, b) =>
        b.strength - a.strength ||
        (a.learnedOn < b.learnedOn ? 1 : a.learnedOn > b.learnedOn ? -1 : 0),
    )
    .slice(0, limit);
}
