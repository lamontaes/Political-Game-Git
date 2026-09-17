import {
  campaignLifeActivityForScheduledActivity,
  campaignLifeOutcomeRecords,
  recordCampaignLifeAttendance,
  scheduledActivityState,
  type CampaignLifeAttendance,
  type EntityId,
  type World,
} from "../simulation";

/**
 * What a completed calendar activity meant for the domain that booked it.
 *
 * The ordinary venue action only moves the clock through a journey and an
 * activity. When that activity was a party or campaign activity (CRUNCH46),
 * its outcome — who was met, money, support, the host's decision — is recorded
 * here, once, right after the calendar activity completed. For every other
 * activity, for an activity that has not completed, and for one whose outcome
 * is already recorded, this returns the very same World object.
 */
export function recordDomainAttendance(
  world: World,
  personId: EntityId,
  activityId: EntityId,
  attendance: CampaignLifeAttendance = "attended",
): World {
  const record = campaignLifeActivityForScheduledActivity(world, activityId);
  if (!record) return world;
  if (
    record.subjectPersonId !== personId ||
    world.control.kind !== "person" ||
    world.control.personId !== personId
  )
    return world;
  if (scheduledActivityState(world, activityId).status !== "completed")
    return world;
  if (
    campaignLifeOutcomeRecords(world).some(
      (outcome) => outcome.activityId === record.id,
    )
  )
    return world;
  return recordCampaignLifeAttendance(world, personId, activityId, attendance);
}
