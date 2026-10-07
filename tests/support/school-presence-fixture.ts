import {
  activeEducationEnrollmentsAt,
  didPeopleShareEducationOrganization,
  recordWorldEvent,
  type EntityId,
  type World,
} from "../../src/simulation";

/**
 * A test fixture for the one fact a school scene reads: who is recorded at
 * school. No producer opens a school scene for a child today (the opening
 * scene list is empty, and the corridor beat is withheld), so a test of what a
 * school context does records the presence itself, through the same
 * world-event writer a scene uses.
 *
 * The people are the player and the classmates the education records say
 * attend the same school; nobody is invented. A test of how presence is
 * produced belongs to the producer, not here.
 */
export function recordSchoolPresence(
  world: World,
  personId: EntityId,
  limit = 2,
): { readonly world: World; readonly classmateIds: readonly EntityId[] } {
  const classmateIds = world.personOrder
    .filter(
      (candidate) =>
        candidate !== personId &&
        activeEducationEnrollmentsAt(world, candidate).length > 0 &&
        didPeopleShareEducationOrganization(world, personId, candidate),
    )
    .slice(0, limit);
  const ids = [personId, ...classmateIds];
  const jurisdictionId = world.people[personId]!.homeJurisdictionId;
  return {
    classmateIds,
    world: recordWorldEvent(world, {
      stableKey: `fixture-school-presence:${personId}:${world.currentDate}`,
      type: "life.scene.opened",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId,
      involvedEntityIds: ids,
      participants: ids.map((id) => ({
        personId: id,
        role: "presence:participant",
        detail: "Recorded school presence in the test fixture.",
      })),
      personFactConstraints: [],
      visibility: "private",
      tags: [`moment:${JSON.stringify(world.currentMoment)}`],
      summary: "The class is at school.",
      context: {
        location: { jurisdictionId, label: "school", setting: "school" },
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    }),
  };
}
