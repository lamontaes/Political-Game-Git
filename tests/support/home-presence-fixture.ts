import {
  householdMembershipsAt,
  peopleInHouseholdAt,
  recordWorldEvent,
  type EntityId,
  type World,
} from "../../src/simulation";

/**
 * A test fixture for the one fact a home conversation reads: who is recorded
 * in the room. A new life no longer opens with an authored scene that records
 * it (EN-1), so a test of what a conversation mount or commit does records the
 * presence itself, through the same world-event writer a scene uses.
 *
 * The people are the player and everybody the household record says shares
 * their primary residence; nobody is invented. A test of how presence is
 * produced belongs to the producer, not here.
 */
export function recordHomePresence(world: World, personId: EntityId): World {
  const membership = householdMembershipsAt(world, personId).find(
    (entry) => entry.state.residenceRole === "primary",
  );
  if (!membership) return world;
  const ids = [
    personId,
    ...peopleInHouseholdAt(world, membership.household.id).filter(
      (candidate) => candidate !== personId,
    ),
  ];
  const jurisdictionId = world.people[personId]!.homeJurisdictionId;
  return recordWorldEvent(world, {
    stableKey: `fixture-home-presence:${personId}:${world.currentDate}`,
    type: "life.scene.opened",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId,
    involvedEntityIds: ids,
    participants: ids.map((id) => ({
      personId: id,
      role: "presence:participant",
      detail: "Recorded home presence in the test fixture.",
    })),
    personFactConstraints: [],
    visibility: "private",
    tags: [`moment:${JSON.stringify(world.currentMoment)}`],
    summary: "The household is at home.",
    context: {
      location: { jurisdictionId, label: "home", setting: "home" },
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}
