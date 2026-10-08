/**
 * The Lie in conversation, and the tell (CTO 2:46 p.m. Oct 8, from the owner's
 * design: the Lie button sits beside the replies in every conversation; the
 * dialogue box is package P4's, the words are the English engine's).
 *
 * The lie is a flat denial of something the records say happened, worded from
 * the lie-and-tell bank, which holds denials and replies that real people said
 * in federal oral histories and testimony. The tell is what the listener says
 * back. Whether the listener takes the lie, asks about it or challenges it is
 * the listener's decision, made by the simulation from what they know, how far
 * they trust the speaker and their temperament; this module only words the
 * decision it is given.
 *
 * A first-person denial ("I did not.", "I wasn't there.") is used only when the
 * speaker's own part in the event is on record, and "I never said that." only
 * when that part was speaking: beginning a conversation, or a speaking role
 * such as speaker or press source. A part the owner graded down is not chosen.
 *
 * Pure: reads the world, never writes or advances time.
 */
import lieAndTellBank from "../../data/english/parts/lie-and-tell.json" with { type: "json" };
import type { EntityId, World } from "../simulation";
import { composeFromBank, type EnglishBank } from "./bank-english";
import { PART_GRADES, type PartGradeLedger } from "./english-grades";

const BANK = lieAndTellBank as EnglishBank;

/** A role that records the person saying something, in any kind of event. */
const SPEAKING_ROLE = /(?:speaker|press-source)$/;

/** The listener's decided answer to a lie. */
export type LieReply = "accept" | "ask" | "challenge";

export interface WordedLine {
  readonly text: string;
  /** The bank part, for the owner's grades. */
  readonly parts: readonly string[];
}

export interface LieAndTell {
  /** What the speaker says: the denial. */
  readonly lie: WordedLine;
  /** What the listener says back, worded from their decided answer. */
  readonly reply: WordedLine;
}

export function composeLieAndTell(
  world: World,
  speakerId: EntityId,
  listenerId: EntityId,
  eventId: EntityId,
  answer: LieReply,
  grades: PartGradeLedger = PART_GRADES,
): LieAndTell | null {
  const event = world.history.events.find((row) => row.id === eventId);
  if (!event || !world.people[speakerId] || !world.people[listenerId])
    return null;
  const ownPart = event.participants.filter(
    (participant) => participant.personId === speakerId,
  );
  const spoke = ownPart.some(
    (participant) =>
      SPEAKING_ROLE.test(participant.role) ||
      (event.type.includes("conversation") &&
        participant.role === "agency:initiator"),
  );
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
  // Asking is a question; a challenge says it outright.
  const reply = composeFromBank(
    BANK,
    answer === "accept" ? "accept" : "doubt",
    {},
    `${pick}:reply`,
    answer === "ask" ? /[.!]$/ : answer === "challenge" ? /\?$/ : undefined,
    grades,
  );
  if (!reply) return null;
  return {
    lie: { text: denial.text, parts: [`bank:${denial.partKey}`] },
    reply: { text: reply.text, parts: [`bank:${reply.partKey}`] },
  };
}
