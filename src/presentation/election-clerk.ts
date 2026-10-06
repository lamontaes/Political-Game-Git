import {
  currentLifeCutoff,
  organizationProfileAt,
  workRoleAt,
  workStatusAt,
} from "../simulation/life-queries";
import { personName } from "../simulation/people";
import type { EntityId, World } from "../simulation/types";
import { isPersonAliveAt } from "../simulation/vitality-integrity";
import { recordedRoomPresence } from "./recorded-room-presence";

export interface ElectionClerk {
  readonly personId: EntityId;
  readonly name: string;
  readonly kind: "municipal" | "county";
  readonly title: string;
  readonly organizationId: EntityId;
  readonly organizationName: string;
  readonly jurisdictionId: EntityId;
  readonly workRelationshipId: EntityId;
  readonly roleRecordId: EntityId;
  readonly statusRecordId: EntityId;
  /** A job alone never establishes that someone is in the player's room. */
  readonly presenceEventId: EntityId | null;
}

const CLERKS = new WeakMap<World, Map<EntityId, readonly ElectionClerk[]>>();

/** Existing active clerk staff at home, resolved once per immutable World. */
export function electionClerksForPerson(
  world: World,
  playerPersonId: EntityId,
): readonly ElectionClerk[] {
  const cached = CLERKS.get(world)?.get(playerPersonId);
  if (cached) return cached;
  const player = world.people[playerPersonId];
  if (!player) return [];
  const cutoff = currentLifeCutoff(world);
  const presence = recordedRoomPresence(world, playerPersonId);
  const clerks: ElectionClerk[] = [];
  for (const work of world.history.workRelationships) {
    if (
      work.personId === playerPersonId ||
      !work.organizationId ||
      work.recordedAt > cutoff.asOfDate ||
      work.startedAt > cutoff.asOfDate ||
      work.sequence >= cutoff.historySequenceExclusive ||
      !isPersonAliveAt(world, work.personId, cutoff)
    )
      continue;
    const role = workRoleAt(world, work.id, cutoff);
    const kind =
      role?.occupationClassification === "profession:municipal-clerk"
        ? "municipal"
        : role?.occupationClassification === "profession:county-clerk"
          ? "county"
          : null;
    if (
      !kind ||
      !role ||
      role.locationJurisdictionId !== player.homeJurisdictionId
    )
      continue;
    const status = workStatusAt(world, work.id, cutoff);
    const profile = organizationProfileAt(world, work.organizationId, cutoff);
    if (
      status?.status !== "active" ||
      !profile ||
      profile.locationJurisdictionId !== player.homeJurisdictionId
    )
      continue;
    clerks.push({
      personId: work.personId,
      name: personName(world.people[work.personId]!),
      kind,
      title: role.title,
      organizationId: work.organizationId,
      organizationName: profile.name,
      jurisdictionId: player.homeJurisdictionId,
      workRelationshipId: work.id,
      roleRecordId: role.id,
      statusRecordId: status.id,
      presenceEventId:
        presence?.personIds.includes(work.personId) &&
        presence.location.label === profile.name &&
        presence.location.jurisdictionId === role.locationJurisdictionId &&
        world.history.events
          .find((event) => event.id === presence.eventId)
          ?.involvedEntityIds.includes(work.organizationId)
          ? presence.eventId
          : null,
    });
  }
  const byPlayer = CLERKS.get(world) ?? new Map();
  byPlayer.set(playerPersonId, clerks);
  CLERKS.set(world, byPlayer);
  return clerks;
}
