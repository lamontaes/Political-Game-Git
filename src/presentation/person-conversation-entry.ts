import {
  availablePlayerConversations,
  type AvailableConversation,
} from "./player-conversation";
import type { ConversationSubjectKey } from "./run-b-conversation-progress";
import { personName, type EntityId, type World } from "../simulation";

/**
 * Talking to the person you actually chose.
 *
 * The recorded defect is precise: a rail emitted a selected person, the parent
 * dropped the id, and the game opened a generic conversation surface whose
 * addressee was whoever the projection happened to pick. The repair is to ask
 * the existing conversation system one question — which of the conversations
 * this life can have puts THIS person in earshot — and to open that one with
 * them as the addressee.
 *
 * No second conversation engine, no fixture participant and no fake exchange.
 * When the world says there is no room where this person can be spoken to, the
 * answer is the specific reason, not a disabled button and not a substitute.
 */

export type PersonConversationEntry =
  | {
      readonly kind: "available";
      readonly subject: ConversationSubjectKey;
      readonly topicLabel: string;
      readonly addressee: EntityId;
      /** True when the world records this conversation as finished. */
      readonly settled: boolean;
    }
  | { readonly kind: "unavailable"; readonly reason: string };

function eligible(
  conversation: AvailableConversation,
  personId: EntityId,
): boolean {
  return conversation.room.eligibleAddresseePersonIds.includes(personId);
}

export function openConversationWith(
  world: World,
  playerPersonId: EntityId,
  personId: EntityId,
): PersonConversationEntry {
  const person = world.people[personId];
  const name = person ? personName(person) : "them";

  if (personId === playerPersonId) {
    return { kind: "unavailable", reason: "That is you." };
  }

  const available = availablePlayerConversations(world, playerPersonId);
  if (available.length === 0) {
    return {
      kind: "unavailable",
      reason: "There is nothing to talk about right now.",
    };
  }

  /*
   * An unsettled conversation is preferred over a settled one: both are real,
   * but only one of them still has a turn in it, and opening the finished one
   * when an open one exists would look like the game ignoring the choice.
   */
  const rooms = available.filter((entry) => eligible(entry, personId));
  const chosen = rooms.find((entry) => !entry.settled) ?? rooms[0];
  if (!chosen) {
    return {
      kind: "unavailable",
      reason: `${name} is not somewhere you can talk to them right now.`,
    };
  }

  return {
    kind: "available",
    subject: chosen.subject,
    topicLabel: chosen.topicLabel,
    addressee: personId,
    settled: chosen.settled,
  };
}
