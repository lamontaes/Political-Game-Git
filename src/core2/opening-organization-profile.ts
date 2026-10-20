/**
 * The latest profile of each organization the opening builds: its name,
 * classification and location, read from the world's profile history as it
 * stands on its date. Records become available once their sequence is below
 * the history's next sequence and their effective date has come; the latest
 * by effective date, then sequence, is the profile.
 */
import type {
  EntityId,
  OrganizationProfileRecord,
  World,
} from "../simulation/types";

/** Every organization's latest profile, read in one pass over the history. */
export function openingOrganizationProfiles(
  world: World,
): ReadonlyMap<EntityId, OrganizationProfileRecord> {
  const latest = new Map<EntityId, OrganizationProfileRecord>();
  for (const record of world.history.organizationProfiles) {
    if (
      record.sequence >= world.history.nextSequence ||
      record.effectiveAt > world.currentDate
    )
      continue;
    const held = latest.get(record.organizationId);
    if (
      !held ||
      record.effectiveAt > held.effectiveAt ||
      (record.effectiveAt === held.effectiveAt &&
        record.sequence > held.sequence)
    )
      latest.set(record.organizationId, record);
  }
  return latest;
}
