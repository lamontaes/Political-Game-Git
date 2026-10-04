import {
  openConversationWith,
  type PersonConversationEntry,
} from "../presentation/person-conversation-entry";
import { lifeTalkUnavailableReason } from "../presentation/life-talk-conversation";
import { personName, type EntityId, type World } from "../simulation";

/** Room activation reads current presence and the existing conversation eligibility. */
export function roomPortraitConversationEntry(
  world: World,
  playerPersonId: EntityId,
  selectedPersonId: EntityId,
  currentRoomPersonIds: readonly EntityId[],
): PersonConversationEntry {
  const entry = openConversationWith(world, playerPersonId, selectedPersonId);
  if (
    entry.kind === "unavailable" ||
    currentRoomPersonIds.includes(selectedPersonId)
  ) {
    return entry;
  }
  const person = world.people[selectedPersonId];
  return {
    kind: "unavailable",
    reason:
      lifeTalkUnavailableReason(world, playerPersonId, selectedPersonId) ??
      `${person ? personName(person) : "This person"} is not here with you right now.`,
  };
}
