import {
  personName,
  type EntityId,
  type FutureTransitionHandlerRegistry,
  type World,
} from "../simulation";
import { openConversationWith } from "./person-conversation-entry";
import {
  currentOpeningLifeScene,
  openingLifeLocation,
  openingNeighborhoodWalkOffer,
  walkOpeningNeighborhood,
} from "./life-scene-flow";

/**
 * Supported Talk / Contact / Meet / Travel, explained from records.
 *
 * Four different capabilities, not four labels on one talk writer. Pins and
 * dossiers are not presence, and there is no omniscient location tracker.
 *
 * Presence is the ROOM's answer. The quiet room no longer keeps an authored
 * scene open, so the caller hands in who the scene projection says is here;
 * the authored scene's own roster is the fallback for callers that have none.
 *
 * What is real today:
 * - Talk: the in-person conversation, when they are here and one is open.
 * - Travel: the one authored journey the life has — the short walk between
 *   home and the neighborhood — when it actually ends where they were last
 *   recorded. `walkOpeningNeighborhood` is the writer; nothing here invents
 *   a route. Any other destination is named and refused.
 * - Contact: no remote channel writer exists in the simulation (no call,
 *   message or letter producer). The card says so; it does not fake one.
 * - Meet: no invitation producer exists. When they are here, Meet returns to
 *   the room; otherwise the gap is named.
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
  readonly travel: PersonContactAction & {
    /** The supported walk that reaches them, when one does. */
    readonly walk: "home" | "neighborhood" | null;
  };
}

export interface PersonContactOptions {
  /** Who the current scene puts in the room. Overrides the authored scene. */
  readonly presentPersonIds?: readonly EntityId[];
}

export function projectPersonContact(
  world: World,
  playerPersonId: EntityId,
  personId: EntityId,
  options: PersonContactOptions = {},
): PersonContact {
  const person = world.people[personId];
  const name = person ? personName(person) : "them";
  const present =
    options.presentPersonIds ??
    currentOpeningLifeScene(world, playerPersonId)?.presentPersonIds ??
    [];
  const presentNow = present.includes(personId);
  const talkEntry = openConversationWith(world, playerPersonId, personId);
  const talkAvailable = talkEntry.kind === "available";
  const talkReason =
    talkEntry.kind === "unavailable"
      ? talkEntry.reason
      : `${name} can be spoken to. Talk starts that conversation.`;

  const contactAvailable = false;
  const contactReason = presentNow
    ? `${name} is in the room, so there is nothing to send. No phone, mail or message channel exists in this life yet.`
    : `No phone, mail or message channel exists in this life yet, so ${name} cannot be reached from here.`;

  const meetAvailable = presentNow;
  const meetReason = presentNow
    ? `${name} is in the room. Meet takes you back to that scene.`
    : `No way to arrange a meeting with ${name} exists in this life yet. A card or a pin is not proof they are here.`;

  const playerPlace = openingLifeLocation(world, playerPersonId);
  const theirPlace = openingLifeLocation(world, personId);
  let walk: "home" | "neighborhood" | null = null;
  let travelAvailable = false;
  let travelReason: string;
  if (presentNow) {
    const here = (playerPlace ?? theirPlace)?.label;
    travelReason = here
      ? `${name} is already here with you at ${here}.`
      : `${name} is already here with you.`;
  } else if (!theirPlace) {
    travelReason = `No recorded location for ${name}. A pin or a card is not a destination.`;
  } else if (!playerPlace) {
    travelReason = `Your current place is not recorded, so there is no authored journey to ${theirPlace.label}.`;
  } else if (playerPlace.label === theirPlace.label) {
    travelReason = `You and ${name} are both recorded at ${playerPlace.label}. Travel is not a separate action from meeting them here.`;
  } else {
    const destination =
      theirPlace.setting === "home" || theirPlace.setting === "neighborhood"
        ? theirPlace.setting
        : null;
    const offer = destination
      ? openingNeighborhoodWalkOffer(world, playerPersonId, destination)
      : null;
    if (offer && offer.unavailable === null) {
      walk = destination;
      travelAvailable = true;
      travelReason = `${offer.label} to ${theirPlace.label}, where ${name} was last recorded. About ${offer.minutes} minutes.`;
    } else if (offer?.unavailable) {
      travelReason = offer.unavailable;
    } else {
      travelReason = `No journey connects ${playerPlace.label} to ${theirPlace.label}, where ${name} was last recorded. Travel stays unavailable rather than inventing a route.`;
    }
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
      label: "Travel to",
      reason: travelReason,
      kind: "travel",
      walk,
    },
  };
}

/**
 * The supported journey towards somebody, performed through the existing
 * walk writer. Returns the same World when no walk reaches them.
 */
export function travelTowardsPerson(
  world: World,
  playerPersonId: EntityId,
  personId: EntityId,
  options: PersonContactOptions & {
    readonly handlers?: FutureTransitionHandlerRegistry;
  } = {},
): World {
  const contact = projectPersonContact(world, playerPersonId, personId, {
    ...(options.presentPersonIds
      ? { presentPersonIds: options.presentPersonIds }
      : {}),
  });
  if (!contact.travel.available || !contact.travel.walk) return world;
  return walkOpeningNeighborhood(
    world,
    playerPersonId,
    contact.travel.walk,
    options.handlers,
  );
}
