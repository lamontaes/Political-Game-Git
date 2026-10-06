import { recordWorldEvent, type EntityId, type World } from "../simulation";
import { whereaboutsAt } from "../simulation/living-world/work-schedules";
import { openingLifeLocation } from "./life-scene-flow";
import { householdResidentIds } from "./play-scene-context";

const VERSION = "home-presence-v1";

/**
 * Who is in the player's home right now, written down once per moment.
 *
 * Conversation rooms read recorded presence only, so a household whose members
 * were never recorded as home offers nobody to talk to. This writer records
 * the answer the schedules already give: a housemate is home at this moment
 * when they have no shift, no recorded activity and no work absence taking
 * them elsewhere (`whereaboutsAt`). Nothing here draws or guesses; a housemate
 * on shift, away at an activity, or dead is simply not written down.
 *
 * It runs where time moves (the opening and every accepted time command), not
 * where a screen reads, so reading stays free of writes.
 */
export function recordHomePresence(world: World, personId: EntityId): World {
  if (world.control.kind !== "person" || world.control.personId !== personId)
    return world;
  const person = world.people[personId];
  if (!person) return world;
  const stableKey = `${VERSION}:${personId}:${JSON.stringify(world.currentMoment)}`;
  const recent = world.history.events.slice(-40);
  if (recent.some((event) => event.stableKey === stableKey)) return world;
  // Only a player at home: a recorded trip or shift elsewhere keeps its own record.
  const location = openingLifeLocation(world, personId);
  if (location && location.setting !== "home") return world;
  if (whereaboutsAt(world, personId).kind !== "home") return world;
  const housemates = [...householdResidentIds(world, personId)]
    .filter((id) => world.people[id] !== undefined)
    .filter((id) => whereaboutsAt(world, id).kind === "home")
    .sort();
  if (housemates.length === 0) return world;
  const jurisdictionId = person.homeJurisdictionId;
  return recordWorldEvent(world, {
    stableKey,
    type: "life.scene.opened",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId,
    involvedEntityIds: [personId, ...housemates],
    participants: [
      {
        personId,
        role: "focus:subject",
        detail: "At home",
      },
      ...housemates.map((id) => ({
        personId: id,
        role: "presence:participant" as const,
        detail: "At home: no shift, activity or absence elsewhere",
      })),
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      VERSION,
      "place:home",
      `moment:${JSON.stringify(world.currentMoment)}`,
    ],
    summary: "Home.",
    context: {
      location: { jurisdictionId, label: "Home", setting: "home" },
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}
