import type { EntityId, World } from "../types";
import { appendCrisisRecord, crisisRecords } from "./records";
import type {
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
    crisisRecords(world)
      .filter(
        (record): record is HealthStateRecord =>
          record.kind === "health-state" && record.episodeId === episodeId,
      )
      .at(-1) ?? null
  );
}

export function latestHealthDisclosure(
  world: World,
  episodeId: EntityId,
): HealthDisclosureRecord | null {
  return (
    crisisRecords(world)
      .filter(
        (record): record is HealthDisclosureRecord =>
          record.kind === "health-disclosure" && record.episodeId === episodeId,
      )
      .at(-1) ?? null
  );
}

export function activeHealthEpisodes(
  world: World,
  personId: EntityId,
): readonly HealthEpisodeRecord[] {
  return crisisRecords(world).filter(
    (record): record is HealthEpisodeRecord =>
      record.kind === "health-episode" &&
      record.personId === personId &&
      !["recovered", "deceased"].includes(
        latestHealthState(world, record.id)?.state ?? "",
      ),
  );
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
