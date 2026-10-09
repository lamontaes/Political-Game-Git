/**
 * Whole exchanges for the owner's grading batch (owner rule R5, October 8,
 * 2026): a conversation is graded as several turns with their choices, not
 * one line. Each turn records the choice the player made, in the words the
 * game would give it, what the other person said back, and the choices the
 * game offered next.
 *
 * Everything comes from the game's own conversation path: the people the
 * scene records as present, the choices `projectLifeConversation` offers and
 * the replies `commitLifeConversation` saves. Nothing here words anything.
 * The harness chooses only which offered choice to take each turn: of the
 * ones not yet taken, the one an offset counts to, so exchanges in
 * different lives take different paths. The item says so.
 *
 * A development tool. It writes to its own copy of a generated world, never
 * to a save.
 */
import type { EntityId, HistoricalEvent, World } from "../../src/simulation";
import { linePartsOf } from "../../src/presentation/english-composition";
import {
  commitLifeConversation,
  projectLifeConversation,
} from "../../src/presentation/life-conversation";
import {
  composeTalkChoice,
  lastLineOf,
} from "../../src/presentation/talk-choice-english";

export interface ExchangeTurn {
  /** The choice as the game labels it on the button. */
  readonly choice: string;
  /** The choice in the words the player says, where the bank can word it. */
  readonly said: string | null;
  readonly saidParts: readonly string[];
  /** What the other person said back, exactly as saved. */
  readonly reply: string;
  readonly replyParts: readonly string[];
  /** The choices offered after the reply, as the game labels them. */
  readonly offered: readonly string[];
  /** The event the turn saved. */
  readonly eventId: EntityId;
}

export interface WholeExchange {
  readonly turns: readonly ExchangeTurn[];
  /** The world after the last turn. */
  readonly world: World;
}

function replyOf(event: HistoricalEvent | undefined): string | null {
  const said = event?.context.immediateReaction;
  return typeof said === "string" && said.trim() !== "" ? said : null;
}

/**
 * Up to `turns` turns with one person, taking each turn the offered choice
 * `offset` counts to among those not yet taken. Stops early when the game
 * offers nothing new or saves no reply. Null when not even one turn can be
 * played.
 */
export function readWholeExchange(
  start: World,
  playerId: EntityId,
  personId: EntityId,
  turns = 3,
  offset = 0,
): WholeExchange | null {
  let world = start;
  const played: ExchangeTurn[] = [];
  const taken = new Set<string>();
  let previous: { intent: string; reply: string } | null = null;
  for (let index = 0; index < turns; index += 1) {
    const view = projectLifeConversation(world, playerId, personId);
    if (!view) break;
    const open = view.intents.filter(
      (intent) => intent.key !== "leave" && !taken.has(intent.key),
    );
    const next = open[(offset + index) % Math.max(1, open.length)];
    if (!next) break;
    taken.add(next.key);
    const lastLine = previous
      ? lastLineOf(previous, view.proposal?.status === "proposed")
      : undefined;
    const words = composeTalkChoice(world, playerId, personId, next.key, {
      lastLine,
    });
    let after: World;
    try {
      after = commitLifeConversation(world, {
        playerPersonId: playerId,
        personId,
        intent: next.key,
        revision: view.revision,
      });
    } catch {
      break;
    }
    const event = after.history.events.at(-1);
    const reply = replyOf(event);
    if (!event || !reply) break;
    const following = projectLifeConversation(after, playerId, personId);
    played.push({
      choice: next.label,
      said: words?.text ?? null,
      saidParts: words?.parts ?? [],
      reply,
      replyParts: linePartsOf(event.tags) ?? [],
      offered: following?.intents.map((intent) => intent.label) ?? [],
      eventId: event.id,
    });
    previous = { intent: next.key, reply };
    world = after;
  }
  return played.length > 0 ? { turns: played, world } : null;
}
