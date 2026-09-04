import { personName } from "../simulation";
import type { EntityId, World } from "../simulation";
import {
  conversationProgressFromHistory,
  openConversationSessionStart,
  recordedConversationIntents,
} from "./conversation-continuity";
import {
  conversationSubjectPresentation,
  supportsGroupAddress,
} from "./conversation-subjects";
import { schoolConversationRoom } from "./formative-play";
import {
  householdConversationRoom,
  neighborhoodConversationRoom,
} from "./ordinary-life";
import {
  RUN_B_AUDIBILITY_OPTIONS,
  availableConversationIntents,
  conversationTopicLabel,
  createConversationSessionDescriptor,
  describeConversationBriefingContext,
  openingConversationBeat,
} from "./run-b-conversation";
import type {
  ConversationAddressee,
  ConversationAudibility,
  ConversationIntentOption,
  ConversationRoomContext,
  ConversationSessionDescriptor,
} from "./run-b-conversation";
import {
  createHouseholdObligationProgress,
  createNeighborhoodMeetingProgress,
  createSchoolProjectProgress,
} from "./run-b-conversation-progress";
import type {
  ConversationProgress,
  ConversationSubjectKey,
} from "./run-b-conversation-progress";

/**
 * The conversations a life can actually have, and everything a screen needs to
 * offer one.
 *
 * The production game had one conversation in it. Not one kind — one: a
 * household exchange, at a fixed volume, with whichever housemate the world
 * happened to list first, on the only subject that had ever been given a room.
 * Four other subjects existed, were tested, and could be reached only by typing
 * a development route into the address bar.
 *
 * Nothing here is a second dialogue system. Every one of these is the same
 * engine, the same subjects and the same records; what was missing was a way
 * for a player to say which room they are in, who they are speaking to, and how
 * loudly. This module answers those three questions from the world and hands
 * the answers to a screen, so the screen does not have to know anything about
 * conversations except how to draw buttons.
 */

/** A room-builder, paired with the state its subject opens in. */
interface SubjectWiring {
  readonly subject: ConversationSubjectKey;
  room(world: World, personId: EntityId): ConversationRoomContext | null;
  opening(): ConversationProgress;
}

/**
 * Every subject with a production room, and the record that opens it.
 *
 * The office and legislative families are deliberately absent. Their rooms need
 * a briefing lead, a verifier and casework in front of them; a life that has
 * none of those would have to be given a fake one to reach them, and a faked
 * office is worse than an unreachable subject.
 */
const WIRINGS: readonly SubjectWiring[] = [
  {
    subject: "household-obligation",
    room: householdConversationRoom,
    opening: createHouseholdObligationProgress,
  },
  {
    subject: "neighborhood-meeting-notice",
    room: neighborhoodConversationRoom,
    opening: createNeighborhoodMeetingProgress,
  },
  {
    subject: "school-project-share",
    room: schoolConversationRoom,
    opening: createSchoolProjectProgress,
  },
];

export interface AvailableConversation {
  readonly subject: ConversationSubjectKey;
  /** The heading a player sees, in the subject's own words. */
  readonly topicLabel: string;
  readonly room: ConversationRoomContext;
  readonly progress: ConversationProgress;
  /** True when the world records this conversation as finished. */
  readonly settled: boolean;
}

/**
 * Which conversations this life can have right now.
 *
 * A subject appears when the world supplies its room and not otherwise. There
 * is no list of "conversations you have unlocked": a character with nobody at
 * home has no household conversation, and a character who left school has no
 * school one.
 */
export function availablePlayerConversations(
  world: World,
  personId: EntityId,
): readonly AvailableConversation[] {
  return WIRINGS.flatMap((wiring) => {
    const room = wiring.room(world, personId);
    if (!room) return [];
    const progress =
      conversationProgressFromHistory(world, personId, wiring.subject) ??
      wiring.opening();
    return [
      {
        subject: wiring.subject,
        topicLabel: conversationTopicLabel(progress),
        room,
        progress,
        settled: "phase" in progress && progress.phase === "settled",
      },
    ];
  });
}

/** One way of being heard, and whether this room allows it. */
export interface AudibilityChoice {
  readonly key: ConversationAudibility;
  /** What a player calls it. Never the engine's word for it. */
  readonly label: string;
  readonly description: string;
  readonly available: boolean;
  /** Why not, said by the room rather than by a disabled control. */
  readonly unavailableReason: string | null;
}

/** Somebody who can be spoken to, or the room itself. */
export interface AddresseeChoice {
  readonly key: ConversationAddressee;
  readonly label: string;
}

export interface PlayerConversationView {
  readonly subject: ConversationSubjectKey;
  readonly topicLabel: string;
  readonly briefing: string;
  readonly openingLine: string;
  readonly room: ConversationRoomContext;
  readonly progress: ConversationProgress;
  readonly session: ConversationSessionDescriptor;
  readonly turnOrdinal: number;
  readonly addressees: readonly AddresseeChoice[];
  readonly audibilities: readonly AudibilityChoice[];
  readonly intents: readonly ConversationIntentOption[];
  /** Who this projection was built for, after any correction. */
  readonly addressee: ConversationAddressee;
  readonly audibility: ConversationAudibility;
  /** Who is recorded as hearing it, if it is said this way. */
  readonly listenerNames: readonly string[];
  readonly settled: boolean;
}

const AUDIBILITY_COPY: Readonly<
  Record<ConversationAudibility, { label: string; description: string }>
> = {
  normal: {
    label: "Say it normally",
    description: "Anybody here will hear it.",
  },
  quiet: {
    label: "Say it quietly",
    description: "Meant for them, not for the room.",
  },
  private: {
    label: "Say it in private",
    description: "Just the two of you, with nobody else to hear it.",
  },
};

/**
 * Everything a screen needs to offer one turn of one conversation.
 *
 * The addressee and audibility handed in are treated as a request rather than
 * an instruction: a person who is no longer eligible, or a volume this room
 * cannot offer, is corrected to something truthful and the projection says what
 * it settled on. A screen that asked for something impossible gets a working
 * conversation back instead of an exception.
 */
export function projectPlayerConversation(
  world: World,
  personId: EntityId,
  subject: ConversationSubjectKey,
  choice: {
    readonly addressee?: ConversationAddressee;
    readonly audibility?: ConversationAudibility;
  } = {},
): PlayerConversationView | null {
  const available = availablePlayerConversations(world, personId).find(
    (entry) => entry.subject === subject,
  );
  if (!available) return null;
  const { room, progress } = available;

  const groupAddress =
    supportsGroupAddress(subject) && room.eligibleAddresseePersonIds.length > 1;
  const addressees: AddresseeChoice[] = room.eligibleAddresseePersonIds.map(
    (candidateId) => ({
      key: candidateId,
      label: personName(world.people[candidateId]!),
    }),
  );
  if (groupAddress) {
    addressees.push({ key: "everyone", label: "Both of them" });
  }

  const requested = choice.addressee;
  const addressee: ConversationAddressee =
    requested !== undefined &&
    addressees.some((entry) => entry.key === requested)
      ? requested
      : (room.eligibleAddresseePersonIds[0] as ConversationAddressee);

  const audibilities: AudibilityChoice[] = RUN_B_AUDIBILITY_OPTIONS.map(
    (key) => ({
      key,
      label: AUDIBILITY_COPY[key].label,
      description: AUDIBILITY_COPY[key].description,
      available: key === "private" ? room.privateAvailable : true,
      unavailableReason:
        key === "private" && !room.privateAvailable
          ? room.privateUnavailableReason
          : null,
    }),
  );
  const requestedAudibility = choice.audibility;
  const audibility: ConversationAudibility =
    requestedAudibility !== undefined &&
    audibilities.some(
      (entry) => entry.key === requestedAudibility && entry.available,
    )
      ? requestedAudibility
      : "normal";

  const settled = available.settled;
  const listeners = settled
    ? []
    : resolveListenerNames(world, room, addressee, audibility);

  return {
    subject,
    topicLabel: available.topicLabel,
    briefing: describeConversationBriefingContext(world, room, progress),
    openingLine: openingConversationBeat(world, room, addressee, progress)
      .dialogue,
    room,
    progress,
    // Continues the session the record already opened today, so five turns of
    // one exchange stay one exchange rather than becoming five.
    session: createConversationSessionDescriptor(
      world,
      room,
      openConversationSessionStart(world, personId, subject) ?? undefined,
    ),
    // Turn ordinals start at one and come from what the world recorded, not
    // from a counter that resets when a component does.
    turnOrdinal:
      recordedConversationIntents(world, personId, subject).length + 1,
    addressees,
    audibilities,
    intents: settled
      ? []
      : availableConversationIntents(
          world,
          room,
          addressee,
          progress,
          audibility,
        ),
    addressee,
    audibility,
    listenerNames: listeners,
    settled,
  };
}

/**
 * Who would be recorded as hearing this, said this way.
 *
 * Shown to the player as names rather than as a count, because "Dana will hear
 * this" is a fact about the room and "2 listeners" is a fact about the engine.
 */
function resolveListenerNames(
  world: World,
  room: ConversationRoomContext,
  addressee: ConversationAddressee,
  audibility: ConversationAudibility,
): readonly string[] {
  const addressed =
    addressee === "everyone"
      ? room.eligibleAddresseePersonIds
      : [addressee as EntityId];
  const heard =
    audibility === "normal"
      ? room.normalHearingPersonIds
      : audibility === "quiet"
        ? [...addressed, ...room.quietAmbientHearingPersonIds]
        : addressed;
  return [...new Set(heard)]
    .filter((candidateId) => candidateId !== room.playerPersonId)
    .map((candidateId) => personName(world.people[candidateId]!));
}

export { conversationSubjectPresentation };
