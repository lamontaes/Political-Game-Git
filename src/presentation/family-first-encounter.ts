import { ageOnDate, type EntityId, type World } from "../simulation";
import type { ScenePerson } from "./life-story";

/**
 * A child meets a recorded parent or guardian who is actually in the room.
 * The card is a UI introduction, so this selector changes no World facts.
 */
export function firstUnintroducedFamilyMember(
  world: World,
  playerPersonId: EntityId,
  presentPeople: readonly Pick<ScenePerson, "personId" | "relationship">[],
  introducedPersonIds: readonly EntityId[] | null,
): EntityId | null {
  const player = world.people[playerPersonId];
  if (!player || introducedPersonIds === null) return null;
  if (ageOnDate(player.birthDate, world.currentDate) >= 18) return null;
  const introduced = new Set(introducedPersonIds);
  for (const person of presentPeople) {
    const personId = person.personId;
    if (personId === playerPersonId || introduced.has(personId)) continue;
    const relationship = person.relationship;
    if (
      relationship === "your mom" ||
      relationship === "your dad" ||
      relationship === "your parent" ||
      relationship === "your guardian"
    )
      return personId;
  }
  return null;
}
