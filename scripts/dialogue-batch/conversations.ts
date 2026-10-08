/**
 * Conversations for the owner's grading batch (CTO 2:14 p.m. Oct 8, from the
 * owner): each item shows what a person actually said to the player and the
 * reply choices the game then offers, at least four, with whether a Lie is
 * among them, and enough context to judge the exchange.
 *
 * Everything comes from the game's own conversation path: the scene the
 * player is in, the people the scene records as present, the choices
 * `projectLifeConversation` offers, and the reply `commitLifeConversation`
 * saves. Nothing here words anything. The harness chooses only which offered
 * choice the player opens with, and says so in the item.
 *
 * A development tool. It writes to its own copy of a generated world, never
 * to a save.
 */
import type { EntityId, HistoricalEvent, World } from "../../src/simulation";
import { personName } from "../../src/simulation";
import { describePersonContext } from "../../src/simulation/person-context";
import { linePartsOf } from "../../src/presentation/english-composition";
import {
  commitLifeConversation,
  lifeTalkContext,
  projectLifeConversation,
} from "../../src/presentation/life-conversation";
import { openNextLifeScene } from "../../src/presentation/life-scene-flow";
import { currentLifeTalkScene } from "../../src/presentation/life-talk-presence";

/** The owner judges an exchange only when the player has a real choice. */
export const MIN_CHOICES = 4;

export interface ConversationExchange {
  readonly personId: EntityId;
  /** How the player knows the person, from the records, or null. */
  readonly relation: string | null;
  /** Where the exchange happens, from the scene's recorded location. */
  readonly setting: string;
  readonly placeLabel: string;
  /** Everyone else the scene records as present, by name. */
  readonly othersPresent: readonly string[];
  /** The choice the player opened with, as the game labels it. */
  readonly opened: string;
  /** What the person said back, exactly as saved. */
  readonly reply: string;
  readonly parts: readonly string[];
  /** The choices the game offers next, as it labels them. */
  readonly choices: readonly string[];
  /** Whether any offered choice is a deliberate lie. */
  readonly lieOffered: boolean;
}

export interface ConversationReading {
  readonly exchanges: readonly ConversationExchange[];
  /** Why each person present gave no item. */
  readonly skipped: readonly string[];
}

/** The scene the player is in, opened the way the game opens it if needed. */
function inScene(world: World, playerId: EntityId): World {
  if (currentLifeTalkScene(world, playerId)) return world;
  try {
    return openNextLifeScene(world, playerId);
  } catch {
    return world;
  }
}

function replyOf(event: HistoricalEvent | undefined): string | null {
  const said = event?.context.immediateReaction;
  return typeof said === "string" && said.trim() !== "" ? said : null;
}

export function readConversations(
  start: World,
  playerId: EntityId,
  limit = 2,
): ConversationReading {
  const world = inScene(start, playerId);
  const scene = currentLifeTalkScene(world, playerId);
  if (!scene)
    return {
      exchanges: [],
      skipped: ["the player is in no scene with anyone to talk to"],
    };
  const present = scene.presentPersonIds.filter((id) => id !== playerId);
  const exchanges: ConversationExchange[] = [];
  const skipped: string[] = [];
  for (const personId of present) {
    if (exchanges.length >= limit) break;
    const name = world.people[personId]
      ? personName(world.people[personId]!)
      : personId;
    const first = projectLifeConversation(world, playerId, personId);
    const context = lifeTalkContext(world, playerId, personId);
    if (!first || !context) {
      skipped.push(`${name}: the game offers no conversation`);
      continue;
    }
    // Open the way a player most often does: with hello, when it is offered.
    const opener =
      first.intents.find((intent) => intent.key === "greet") ??
      first.intents.find((intent) => intent.key !== "leave");
    if (!opener) {
      skipped.push(`${name}: the only choice is to leave`);
      continue;
    }
    let after: World;
    try {
      after = commitLifeConversation(world, {
        playerPersonId: playerId,
        personId,
        intent: opener.key,
        revision: first.revision,
      });
    } catch (error) {
      skipped.push(`${name}: ${String((error as Error).message ?? error)}`);
      continue;
    }
    const event = after.history.events.at(-1);
    const reply = replyOf(event);
    const next = projectLifeConversation(after, playerId, personId);
    if (!reply || !next) {
      skipped.push(`${name}: no reply was saved`);
      continue;
    }
    if (next.intents.length < MIN_CHOICES) {
      skipped.push(
        `${name}: the game offers ${next.intents.length} choices after the reply, fewer than ${MIN_CHOICES}`,
      );
      continue;
    }
    exchanges.push({
      personId,
      relation:
        describePersonContext(world, playerId, personId)?.relationship ?? null,
      setting: context.setting,
      placeLabel: context.placeLabel,
      othersPresent: present
        .filter((id) => id !== personId && world.people[id])
        .map((id) => personName(world.people[id]!)),
      opened: opener.label,
      reply,
      parts: event ? (linePartsOf(event.tags) ?? []) : [],
      choices: next.intents.map((intent) => intent.label),
      // Life talk carries no truth intent on any choice (traced: no intent
      // in life-conversation.ts is marked deliberate-deception).
      lieOffered: next.intents.some(
        (intent) =>
          (intent as { readonly truthIntent?: string }).truthIntent ===
          "deliberate-deception",
      ),
    });
  }
  return { exchanges, skipped };
}
