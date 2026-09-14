import { personName, type EntityId, type World } from "../simulation";
import { openConversationWith } from "./person-conversation-entry";
import {
  currentOpeningLifeScene,
  openingLifeLocation,
} from "./life-scene-flow";

/**
 * Supported Talk / Contact / Meet / Travel, explained from records.
 * Pins and dossiers are not presence. No omniscient location tracker.
 * These are four different capabilities, not four labels on one talk writer.
 */

export interface PersonContactAction {
  readonly available: boolean;
  readonly label: string;
  readonly reason: string;
  readonly kind: "talk" | "contact" | "meet" | "travel";
}

export interface PersonContact {
  readonly personId: EntityId;
  readonly presentNow: boolean;
  readonly talk: PersonContactAction;
  readonly contact: PersonContactAction;
  readonly meet: PersonContactAction;
  readonly travel: PersonContactAction;
}

export function projectPersonContact(
  world: World,
  playerPersonId: EntityId,
  personId: EntityId,
): PersonContact {
  const person = world.people[personId];
  const name = person ? personName(person) : "them";
  const presentNow =
    currentOpeningLifeScene(world, playerPersonId)?.presentPersonIds.includes(
      personId,
    ) === true;
  const talkEntry = openConversationWith(world, playerPersonId, personId);
  const conversationReady = talkEntry.kind === "available";
  const talkAvailable = presentNow && conversationReady;
  const talkReason =
    talkEntry.kind === "unavailable"
      ? talkEntry.reason
      : presentNow
        ? `${name} is here. Talk starts the conversation in this room.`
        : `${name} is not in this room. Talk is in-person, not a remote message.`;

  const contactAvailable = false;
  const contactReason = presentNow
    ? `${name} is in the room. Contact would be a remote reach; there is no separate phone, mail, or inbox writer on this card.`
    : `No phone, mail, or remote address is on record for ${name}. An established scene conversation is not a way to reach them from elsewhere.`;

  const meetAvailable = presentNow;
  const meetReason = presentNow
    ? `${name} is in the room. Meet returns you to that scene without starting the conversation.`
    : `A card or pin is not proof ${name} is here. The game does not track an unknown location.`;

  const playerPlace = openingLifeLocation(world, playerPersonId);
  const theirPlace = openingLifeLocation(world, personId);
  let travelAvailable = false;
  let travelReason: string;
  if (!theirPlace) {
    travelReason = `No recorded location for ${name}. A pin or a card is not a destination.`;
  } else if (!playerPlace) {
    travelReason = `Your current place is not recorded, so there is no authored journey to ${theirPlace.label}.`;
  } else if (
    (playerPlace.jurisdictionId !== null &&
      playerPlace.jurisdictionId === theirPlace.jurisdictionId) ||
    playerPlace.label === theirPlace.label
  ) {
    travelReason = `You and ${name} are both recorded at ${playerPlace.label}. Travel is not a separate action from meeting them here.`;
  } else {
    travelReason = `No authored journey connects ${playerPlace.label} to ${theirPlace.label}, where ${name} was last recorded. Travel stays unavailable rather than inventing a route.`;
  }

  return {
    personId,
    presentNow,
    talk: {
      available: talkAvailable,
      label: "Talk",
      reason: talkReason,
      kind: "talk",
    },
    contact: {
      available: contactAvailable,
      label: "Contact",
      reason: contactReason,
      kind: "contact",
    },
    meet: {
      available: meetAvailable,
      label: "Meet",
      reason: meetReason,
      kind: "meet",
    },
    travel: {
      available: travelAvailable,
      label: "Travel",
      reason: travelReason,
      kind: "travel",
    },
  };
}
