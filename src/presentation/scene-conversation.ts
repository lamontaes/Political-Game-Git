import { describePersonContext, personName } from "../simulation";
import type { EntityId, HistoricalEvent, IsoDate, World } from "../simulation";
import { recordedConversationTurns } from "./conversation-continuity";
import { currentOpeningLifeScene } from "./life-scene-flow";
import type { ConversationSubjectKey } from "./run-b-conversation-progress";

/**
 * What has been said in a conversation, read back from the record.
 *
 * The scene's conversation box shows one exchange at a time — the last thing
 * the player did and what came back — and pages back through the earlier ones
 * in the same box. Neither needs a store of its own: every turn already
 * writes a canonical event carrying who spoke, who answered and who else was
 * there to hear it. This module reads those events and nothing else. It is a
 * projection over the existing writers, not a second conversation system, and
 * it never decides what anybody says.
 *
 * Reading the record is also what makes switching addressee honest. A turn
 * with one person does not vanish when the player turns to another; it stays
 * the last thing that happened in the room, and the record says whether the
 * new addressee was there to hear it.
 */

export interface ConversationExchangeTurn {
  readonly eventId: EntityId;
  readonly sequence: number;
  readonly date: IsoDate;
  /** True when the turn belongs to the exchange going on right now. */
  readonly current: boolean;
  /**
   * What the player did, in the second person. Null only when the record
   * holds no player action at all.
   */
  readonly playerLine: string | null;
  /** Who answered, when somebody did. */
  readonly speakerPersonId: EntityId | null;
  readonly speakerName: string | null;
  /** The answer as recorded — a line of dialogue, or what the room did. */
  readonly reply: string;
  /** Everybody else the record says was there to hear it. */
  readonly heardByPersonIds: readonly EntityId[];
}

/**
 * Every recorded turn of this conversation, oldest first.
 *
 * For an ordinary talk with somebody in the scene that is the history with
 * that person plus anything said to anybody else in this same scene today —
 * so a turn with one housemate stays in view after turning to the other. For
 * the household, school and neighborhood subjects it is the subject's own
 * recorded turns, which is what their progress is already rebuilt from.
 */
export function conversationExchangeTurns(
  world: World,
  playerPersonId: EntityId,
  subject: ConversationSubjectKey,
  addresseePersonId: EntityId | null,
): readonly ConversationExchangeTurn[] {
  if (subject === "life-talk") {
    const sceneId =
      currentOpeningLifeScene(world, playerPersonId)?.eventId ?? null;
    return world.history.events
      .filter(
        (event) =>
          event.type === "life.conversation" &&
          event.occurredAt <= world.currentDate &&
          hasRole(event, playerPersonId, "focus:subject") &&
          (counterpart(event) === addresseePersonId ||
            (sceneId !== null &&
              event.occurredAt === world.currentDate &&
              event.tags.includes(`scene:${sceneId}`))),
      )
      .sort((left, right) => left.sequence - right.sequence)
      .map((event) => {
        const speaker = counterpart(event);
        return {
          eventId: event.id,
          sequence: event.sequence,
          date: event.occurredAt,
          current:
            sceneId !== null &&
            event.occurredAt === world.currentDate &&
            event.tags.includes(`scene:${sceneId}`),
          playerLine: event.context.choice
            ? `You ${lowerFirst(event.context.choice)}.`
            : null,
          speakerPersonId: speaker,
          speakerName: speaker ? nameOf(world, speaker) : null,
          reply: event.context.immediateReaction ?? "",
          heardByPersonIds: event.participants
            .filter((entry) => entry.role === "observation:witness")
            .map((entry) => entry.personId),
        };
      });
  }

  const byId = new Map(world.history.events.map((event) => [event.id, event]));
  return recordedConversationTurns(world, playerPersonId, subject).flatMap(
    (turn) => {
      const event = byId.get(turn.eventId);
      if (!event) return [];
      const speaker =
        event.participants.find((entry) => entry.role === "focus:respondent")
          ?.personId ?? null;
      return [
        {
          eventId: event.id,
          sequence: event.sequence,
          date: event.occurredAt,
          current: event.occurredAt === world.currentDate,
          playerLine: event.context.choice
            ? secondPerson(event.context.choice)
            : null,
          speakerPersonId: speaker,
          speakerName: speaker ? nameOf(world, speaker) : null,
          reply: event.context.immediateReaction ?? "",
          heardByPersonIds: event.participants
            .filter(
              (entry) =>
                entry.personId !== playerPersonId && entry.personId !== speaker,
            )
            .map((entry) => entry.personId),
        },
      ];
    },
  );
}

/** The turn to show as "what just happened", when one belongs to now. */
export function currentExchangeTurn(
  turns: readonly ConversationExchangeTurn[],
): ConversationExchangeTurn | null {
  const last = turns.at(-1);
  return last && last.current ? last : null;
}

/**
 * Whether the person now being spoken to was there for the last turn.
 *
 * Switching addressee is a change of who the player faces, not a new
 * conversation. What survives the switch is what the record says: the new
 * addressee either answered the last turn, heard it, or did neither — and the
 * box says which rather than greeting them as though nothing had been said.
 */
export function addresseeHeardTurn(
  turn: ConversationExchangeTurn,
  addresseePersonId: EntityId,
): "answered" | "heard" | "not-heard" {
  if (turn.speakerPersonId === addresseePersonId) return "answered";
  return turn.heardByPersonIds.includes(addresseePersonId)
    ? "heard"
    : "not-heard";
}

export interface ConversationHistoryPage {
  readonly turns: readonly ConversationExchangeTurn[];
  /** Zero is the newest page. */
  readonly index: number;
  readonly count: number;
}

/**
 * Earlier turns, a fixed number at a time, newest page first.
 *
 * Paged rather than scrolled: the conversation box keeps one height, and
 * looking further back replaces what is in it instead of growing a transcript
 * down the screen. The page never includes the turn the box is already
 * showing as "what just happened".
 */
export function conversationHistoryPage(
  turns: readonly ConversationExchangeTurn[],
  index: number,
  pageSize = 3,
): ConversationHistoryPage {
  const current = currentExchangeTurn(turns);
  const earlier = current ? turns.slice(0, -1) : turns;
  const count = Math.max(1, Math.ceil(earlier.length / pageSize));
  const bounded = Math.min(Math.max(0, index), count - 1);
  const end = earlier.length - bounded * pageSize;
  return {
    turns: earlier.slice(Math.max(0, end - pageSize), end),
    index: bounded,
    count: earlier.length === 0 ? 0 : count,
  };
}

/** Who this person is to the player, in the record's own words. */
export function conversationRelationship(
  world: World,
  playerPersonId: EntityId,
  personId: EntityId,
): string | null {
  return (
    describePersonContext(world, playerPersonId, personId)?.relationship ?? null
  );
}

function hasRole(
  event: HistoricalEvent,
  personId: EntityId,
  role: string,
): boolean {
  return event.participants.some(
    (entry) => entry.personId === personId && entry.role === role,
  );
}

function counterpart(event: HistoricalEvent): EntityId | null {
  return (
    event.participants.find(
      (entry) => entry.role === "coordination:counterpart",
    )?.personId ?? null
  );
}

function nameOf(world: World, personId: EntityId): string {
  const person = world.people[personId];
  return person ? personName(person) : "Somebody";
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

/**
 * The record's sentence about the player, addressed to the player.
 *
 * Ordinary subjects write their choice as "The player brought up the week's
 * errands with Pollard." That is the record's voice and it stays the record.
 * Shown to the player it is the same sentence with the subject turned to
 * "You"; nothing else about it is rewritten.
 */
function secondPerson(sentence: string): string {
  if (!/^The player\b/.test(sentence)) return sentence;
  return sentence
    .replace(/^The player's\b/, "Your")
    .replace(/^The player\b/, "You")
    .replace(/\bthemselves\b/g, "yourself");
}
