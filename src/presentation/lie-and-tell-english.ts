/**
 * The Lie in conversation, and the tell (CTO 2:46 p.m. Oct 8, from the owner's
 * design: the Lie button sits beside the replies in every conversation; the
 * dialogue box is package P4's, the words are the English engine's).
 *
 * The lie is a flat denial of something the records say happened, worded from
 * the lie-and-tell bank, which holds denials and replies that real people said
 * in federal oral histories and testimony. The tell is what the listener says
 * back, and whether they believe it is never a roll: it is what the listener's
 * own records say they know about the event.
 * - A listener with no knowledge of the event takes the denial ("Fair
 *   enough.").
 * - A listener who knows of it with low confidence asks ("Is that true?").
 * - A listener who knows of it with medium or high confidence may say so
 *   outright ("I don't believe that.").
 *
 * A first-person denial ("I did not.", "I wasn't there.") is used only when the
 * speaker's own part in the event is on record, and "I never said that." only
 * for something the speaker said. A part the owner graded down is not chosen.
 *
 * Pure: reads the world, never writes or advances time.
 */
import lieAndTellBank from "../../data/english/parts/lie-and-tell.json" with { type: "json" };
import type { EntityId, World } from "../simulation";
import { knowledgeForEvent } from "../simulation/queries";
import { composeFromBank, type EnglishBank } from "./bank-english";
import { PART_GRADES, type PartGradeLedger } from "./english-grades";

const BANK = lieAndTellBank as EnglishBank;

const CONFIDENCE_RANK = { low: 0, medium: 1, high: 2 } as const;

export interface WordedLine {
  readonly text: string;
  /** The bank part, for the owner's grades. */
  readonly parts: readonly string[];
}

export interface LieAndTell {
  /** What the speaker says: the denial. */
  readonly lie: WordedLine;
  /** What the listener says back. */
  readonly reply: WordedLine;
  /** Whether the listener takes the denial. */
  readonly believed: boolean;
  /** The listener's knowledge records the reply rests on; empty when believed. */
  readonly becauseKnowledgeIds: readonly EntityId[];
}

export function composeLieAndTell(
  world: World,
  speakerId: EntityId,
  listenerId: EntityId,
  eventId: EntityId,
  grades: PartGradeLedger = PART_GRADES,
): LieAndTell | null {
  const event = world.history.events.find((row) => row.id === eventId);
  if (!event || !world.people[speakerId] || !world.people[listenerId])
    return null;
  const ownPart = event.participants.filter(
    (participant) => participant.personId === speakerId,
  );
  const spoke =
    event.type.includes("conversation") &&
    ownPart.some((participant) => participant.role === "agency:initiator");
  const excludes = [
    ...(ownPart.length === 0 ? ["^(?:I|No, I)\\b"] : []),
    ...(spoke ? [] : ["\\bsaid that\\b"]),
  ];
  const pick = `lie:${world.id}:${speakerId}:${listenerId}:${eventId}`;
  const denial = composeFromBank(
    BANK,
    "deny",
    {},
    pick,
    excludes.length > 0 ? new RegExp(excludes.join("|")) : undefined,
    grades,
  );
  if (!denial) return null;

  const known = knowledgeForEvent(world, eventId).filter(
    (row) => row.personId === listenerId && row.learnedAt <= world.currentDate,
  );
  const surest = known.reduce<number>(
    (best, row) => Math.max(best, CONFIDENCE_RANK[row.confidence]),
    -1,
  );
  const believed = surest < 0;
  // An unsure listener asks; a sure one may say so.
  const reply = composeFromBank(
    BANK,
    believed ? "accept" : "doubt",
    {},
    `${pick}:reply`,
    !believed && surest === CONFIDENCE_RANK.low ? /[.!]$/ : undefined,
    grades,
  );
  if (!reply) return null;
  return {
    lie: { text: denial.text, parts: [`bank:${denial.partKey}`] },
    reply: { text: reply.text, parts: [`bank:${reply.partKey}`] },
    believed,
    becauseKnowledgeIds: known.map((row) => row.id),
  };
}
