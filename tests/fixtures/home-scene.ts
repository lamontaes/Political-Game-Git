import {
  ageOnDate,
  householdMembershipsAt,
  peopleInHouseholdAt,
  recordWorldEvent,
  type EntityId,
  type World,
} from "../../src/simulation";
import { refreshContextualScenes } from "../../src/presentation/contextual-scene-producers";

/** Authored co-presence, separate from merely sharing a household. */
export function homeSceneFixture(world: World, personId: EntityId): World {
  const home = householdMembershipsAt(world, personId).find(
    (entry) => entry.state.residenceRole === "primary",
  );
  if (!home?.location) throw new Error("Fixture requires a current home.");
  const housemateIds = peopleInHouseholdAt(world, home.household.id).filter(
    (id) =>
      id !== personId &&
      ageOnDate(world.people[id]!.birthDate, world.currentDate) >= 18,
  );
  if (housemateIds.length === 0)
    throw new Error("Fixture requires an adult housemate.");
  const ids = [personId, ...housemateIds];
  const present = recordWorldEvent(world, {
    stableKey: `fixture:home-scene:${personId}:${world.currentDate}`,
    type: "life.scene.opened",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: home.location.jurisdictionId,
    involvedEntityIds: ids,
    participants: ids.map((id) => ({
      personId: id,
      role: "presence:participant",
      detail: "Authored household conversation fixture.",
    })),
    personFactConstraints: [],
    visibility: "private",
    tags: [`moment:${JSON.stringify(world.currentMoment)}`],
    summary: "The household members are together at home.",
    context: {
      location: {
        jurisdictionId: home.location.jurisdictionId,
        label: home.location.label,
        setting: "home",
      },
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  return refreshContextualScenes(present, personId);
}
