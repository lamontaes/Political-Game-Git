import { growingIndex, type GrowingIndexKind } from "../history-index";
import type { EntityId, World } from "../types";
import { appendCrisisRecord, crisisRecords } from "./records";
import type {
  CrisisRecord,
  HealthDisclosureRecord,
  HealthEpisodeRecord,
  HealthStateRecord,
} from "./types";

/** Pure health reads, plus the death closer mortality needs. */

export function latestHealthState(
  world: World,
  episodeId: EntityId,
): HealthStateRecord | null {
  return (
    (healthIndex(world).latest.get(`health-state|${episodeId}`) as
      HealthStateRecord | undefined) ?? null
  );
}

export function latestHealthDisclosure(
  world: World,
  episodeId: EntityId,
): HealthDisclosureRecord | null {
  return (
    (healthIndex(world).latest.get(`health-disclosure|${episodeId}`) as
      HealthDisclosureRecord | undefined) ?? null
  );
}

export function activeHealthEpisodes(
  world: World,
  personId: EntityId,
): readonly HealthEpisodeRecord[] {
  return (healthIndex(world).episodesByPerson.get(personId) ?? []).filter(
    (record) =>
      !["recovered", "deceased"].includes(
        latestHealthState(world, record.id)?.state ?? "",
      ),
  );
}

interface HealthIndex {
  /** The last health state or disclosure of each episode, by kind and episode. */
  readonly latest: Map<string, CrisisRecord>;
  /** Each person's health episodes, in record order. */
  readonly episodesByPerson: Map<EntityId, HealthEpisodeRecord[]>;
}

/**
 * Health reads kept as the record list grows. Each read filtered every
 * CRISIS record ever written, and an epidemic reads every episode's latest
 * state each week, so a week of illness cost more with every case recorded.
 * The latest record per episode is the last one in list order, as before.
 */
const HEALTH_INDEX: GrowingIndexKind<HealthIndex> = {
  create: () => ({ latest: new Map(), episodesByPerson: new Map() }),
  add: (index, value) => {
    const record = value as CrisisRecord;
    if (record.kind === "health-state" || record.kind === "health-disclosure")
      index.latest.set(`${record.kind}|${record.episodeId}`, record);
    else if (record.kind === "health-episode") {
      const episodes = index.episodesByPerson.get(record.personId);
      if (episodes) episodes.push(record);
      else index.episodesByPerson.set(record.personId, [record]);
    }
  },
};

function healthIndex(world: World): HealthIndex {
  return growingIndex(HEALTH_INDEX, crisisRecords(world));
}

/** Closes a dead person's open episodes with dated, causally linked states. */
export function closeHealthEpisodesForDeath(
  world: World,
  personId: EntityId,
  deathRecordId: EntityId,
): World {
  let next = world;
  const death = world.history.personDeaths.find((d) => d.id === deathRecordId)!;
  for (const episode of activeHealthEpisodes(world, personId))
    next = appendCrisisRecord(next, {
      kind: "health-state",
      stableKey: `${episode.stableKey}:state:deceased`,
      effectiveAt: death.diedAt,
      causalParentIds: [episode.id, deathRecordId],
      visibility: "private",
      eventId: null,
      episodeId: episode.id,
      personId,
      state: "deceased",
      functionalLimitation: "incapacitated",
      capacityRecordId: null,
    });
  return next;
}
