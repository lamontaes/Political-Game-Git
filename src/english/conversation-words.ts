/**
 * The English engine's half of a conversation. The director
 * (`src/director/conversation.ts`) decides what is talked about, who speaks,
 * which move each line makes (ask, raise, reply, answer, lie, open, leave)
 * and what the records give it; this file picks, from every mined wording of
 * that move, the ones that fit the person spoken of and the facts the moment
 * has, renders one in the speaker's voice, and says whether the line asks a
 * question and whether it is said after a plain answer.
 */
import { P } from "../core2/parameters";
import type { PersonId } from "../core2/types";
import { renderLine, type Fact } from "./bank-line";
import { RELATION_WORDS } from "./journal-words";
import {
  CONVERSATION_BANK,
  MINED_CONVERSATION,
} from "./mined/conversation-bank";
import { fitMoves, moveVariantKey } from "./move-fit";

export type { Fact };

const one = P.one;

export interface Move {
  /** The choice it makes (an answer), or the choice and its part (any other role). */
  key: string;
  /** The mined part it is worded from. */
  part?: string;
  text: string;
  stages?: string[];
  raises?: string;
  requiresFacts?: string[];
  /** Whom the sentence speaks of, when it opens with a pronoun. */
  pronoun?: "he" | "she" | "they";
  /** A bare question turned back ("And you?"), said after the plain answer. */
  afterPlain?: boolean;
  /** The manner the wording carries (tender, guarded, ...), from the bank. */
  bearing?: string;
}
export interface SubjectBank {
  ask?: Move[];
  raise?: Move[];
  reply?: Move[];
  answers?: Move[];
  lie?: Move[];
  open?: Move[];
  leave?: Move[];
}
/** A move's role in a subject's bank. */
export type ConversationPart = keyof SubjectBank;

/** The words a conversation is said with, by subject and role. */
export interface ConversationWords {
  version: string;
  subjects: Readonly<Record<string, SubjectBank>>;
}
/** The mined words, read by default. */
export const CONVERSATION_WORDS = MINED_CONVERSATION;
/** Whether a piece of the bank serves a subject (or its reply), by a use of its own. */
export function pieceServes(key: string, subject: string): boolean {
  return CONVERSATION_BANK.parts.some(
    (part) =>
      part.key === key &&
      part.uses.some(
        (use) => use.subject === subject || use.subject === `${subject}-reply`,
      ),
  );
}

/** Which mined sentences made a line, for grading and the screen. */
export interface Wording {
  /** The bank and role: `conversation:own-work:ask`. */
  bank: string;
  /** The mined parts the line is made of, in order. */
  parts: string[];
  stage: string;
  /** The record facts the line copied. */
  facts: string[];
}

/** A line as said, with the mined sentence that said it. */
export interface Said {
  text: string;
  sourceRecordIds: readonly string[];
  wording: Wording;
  /** The line asks a question. */
  asks: boolean;
  /** A bare question turned back ("And you?"), said after the plain answer. */
  afterPlain: boolean;
}

const asks = (text: string) => /\?$/.test(text);

/** Whether the bank has the subject at all, or, with a part, any wording of that part. */
export function conversationHas(
  subject: string,
  part?: ConversationPart,
  words: ConversationWords = CONVERSATION_WORDS,
): boolean {
  const bank = words.subjects[subject];
  return part ? !!bank?.[part]?.length : !!bank;
}

/**
 * The moves a part offers, one per choice (every wording of a choice is one
 * move), in the bank's order, with the subject a move goes on to raise.
 */
export function conversationMoves(
  subject: string,
  part: ConversationPart,
  words: ConversationWords = CONVERSATION_WORDS,
): { key: string; raises?: string }[] {
  const out = new Map<string, { key: string; raises?: string }>();
  for (const move of words.subjects[subject]?.[part] ?? [])
    if (!out.has(move.key))
      out.set(move.key, {
        key: move.key,
        ...(move.raises ? { raises: move.raises } : {}),
      });
  return [...out.values()];
}

/**
 * Words one line of a conversation, or null when no wording fits the person
 * it speaks of and the facts the moment has. `keys` keeps only the wordings
 * of those moves; `statementsOnly` keeps only the ones that ask nothing (a
 * greeting that would need its own answer does not open).
 */
export function wordConversationMove(request: {
  seed: string;
  subject: string;
  part: ConversationPart;
  speakerId: PersonId;
  traits: Readonly<Record<string, number>>;
  facts: Record<string, Fact>;
  momentKey: string;
  stage?: string;
  /** The person the line speaks of, when it speaks of one. */
  about?: { gender?: string };
  /** How the speaker names that person, when they are a relative ("my father"). */
  relationText?: string;
  keys?: readonly string[];
  statementsOnly?: boolean;
  /** The bank the wordings come from, when it is not the line's own (an acknowledgment offered as an answer). */
  from?: { subject: string; part: ConversationPart };
  words?: ConversationWords;
}): Said | null {
  const words = request.words ?? CONVERSATION_WORDS;
  const stage = request.stage ?? "default";
  const from = request.from ?? request;
  const all = words.subjects[from.subject]?.[from.part];
  const moves = all?.filter(
    (move) =>
      (!request.keys || request.keys.includes(move.key)) &&
      (!request.statementsOnly || !asks(move.text)),
  );
  const usable = fitMoves(moves, {
    about: request.about,
    relationWord: request.relationText?.split(" ").at(-one),
    relationWords: RELATION_WORDS,
    facts: request.facts,
  });
  const bank = `conversation:${request.subject}:${request.part}`;
  const line = renderLine({
    seed: request.seed,
    surface: "dialogue",
    holderId: request.speakerId,
    bankKey: bank,
    version: words.version,
    variants: usable?.map((row) => ({
      key: moveVariantKey(row),
      text: row.text,
      ...(row.stages ? { stages: row.stages } : {}),
      ...(row.bearing ? { bearing: row.bearing } : {}),
      ...(row.part ? { pieceKey: row.part } : {}),
    })),
    facts: Object.fromEntries(
      Object.entries(request.facts).filter(([, fact]) => fact.text !== ""),
    ),
    momentKey: request.momentKey,
    stage,
    fallbackSourceId: request.speakerId,
    // Said in the speaker's own voice: their traits pull the pick.
    voice: { traits: request.traits, register: "conversation" },
  });
  if (!line) return null;
  const chosen = usable?.find((row) => moveVariantKey(row) === line.variantKey);
  const part = chosen?.part ?? line.variantKey ?? bank;
  return {
    text: line.text,
    sourceRecordIds: line.sourceRecordIds,
    wording: {
      bank,
      parts: [part],
      stage,
      facts: [...(line.factKeys ?? [])],
    },
    asks: asks(line.text),
    afterPlain: !!moves?.find((row) => row.part === part)?.afterPlain,
  };
}

/** A line and what follows it (the raised subject, a turned-back question), said as one reply. */
export function joinedReply(
  head: { text: string },
  tail?: { text: string } | null,
): string {
  return tail ? `${head.text} ${tail.text}` : head.text;
}

/** Whether a line someone said asks a question. */
export function asksQuestion(line: { text: string }): boolean {
  return asks(line.text.trim());
}
