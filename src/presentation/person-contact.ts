import { personName, type EntityId, type World } from "../simulation";
import { openConversationWith } from "./person-conversation-entry";
import {
  currentOpeningLifeScene,
  openingLifeLocation,
} from "./life-scene-flow";

/**
 * Supported Talk / Contact / Meet / Travel, explained from records.
 * Pins and dossiers are not presence. No omniscient location tracker.
 */

export interface PersonContactAction {
  readonly available: boolean;
  readonly label: string;
  readonly reason: string;
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
  const talkAvailable = talkEntry.kind === "available";
  const talkReason =
    talkEntry.kind === "unavailable"
      ? talkEntry.reason
      : presentNow
        ? `${name} is here.`
        : `You can start a conversation that already exists with ${name}. That is not proof they are in the room.`;

  const playerPlace = openingLifeLocation(world, playerPersonId);

  return {
    personId,
    presentNow,
    talk: {
      available: talkAvailable,
      label: "Talk",
      reason: talkReason,
    },
    contact: {
      available: talkAvailable,
      label: "Contact",
      reason: talkAvailable
        ? `Reach ${name} through an established conversation. This does not invent a phone, address, or location.`
        : `No established way to contact ${name} is on record here.`,
    },
    meet: {
      available: presentNow && talkAvailable,
      label: "Meet",
      reason: presentNow
        ? `${name} is in the room now.`
        : `A card or pin is not proof ${name} is here. The game does not track an unknown location.`,
    },
    travel: {
      available: false,
      label: "Travel",
      reason: playerPlace
        ? `Your recorded place is ${playerPlace.label}. There is no authored journey that takes you to ${name} from a pin or a card.`
        : `No recorded journey reaches ${name}. Presence is not inferred from a saved reference.`,
    },
  };
}
