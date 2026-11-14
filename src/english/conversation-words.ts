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
import { conversationPacket, renderLine, type Fact } from "./bank-line";
import { RELATION_WORDS } from "./journal-words";
import {
  CONVERSATION_BANK,
  MINED_CONVERSATION,
} from "./mined/conversation-bank";
import { fitMoves, moveVariantKey } from "./move-fit";
import { admittedParts, directorSlots } from "./bank-parts";
import {
  composeGroundedLine,
  LINE_PARTS,
  type ComposedLineBank,
  type LinePart,
  type LinePartVariant,
} from "./english-composition";

export type { Fact };

const zero = P.zero;
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
  /** A reason piece: the role of the lines it follows, and the one choice it follows when it names one. */
  for?: ConversationPart;
  forChoice?: string;
}
export interface SubjectBank {
  ask?: Move[];
  raise?: Move[];
  reply?: Move[];
  answers?: Move[];
  lie?: Move[];
  open?: Move[];
  leave?: Move[];
  /** Reasons the engine joins after a line of another role, when their facts are on record. */
  reasons?: Move[];
}
/** A move's role in a subject's bank. */
export type ConversationPart = Exclude<keyof SubjectBank, "reasons">;

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
  /** Pieces the listener already heard today (the telling): not picked again while another fits. */
  avoid?: ReadonlySet<string>;
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
  const fitting = fitMoves(moves, {
    about: request.about,
    relationWord: request.relationText?.split(" ").at(-one),
    relationWords: RELATION_WORDS,
    facts: request.facts,
  });
  // A wording the listener heard today is held back while another fits.
  const fresh = request.avoid
    ? fitting?.filter((row) => !row.part || !request.avoid!.has(row.part))
    : fitting;
  const usable = fresh?.length ? fresh : fitting;
  const bank = `conversation:${request.subject}:${request.part}`;
  // A line with reasons on record is composed: one of its wordings as the
  // core, then a reason the engine joins after it when the facts it names are
  // on record (owner, Nov 11: "a ton of different speech versions").
  const reasons = words.subjects[from.subject]?.reasons?.filter(
    (row) =>
      row.for === from.part &&
      (!row.forChoice ||
        !request.keys ||
        request.keys.some(
          (key) => key === row.forChoice || key.startsWith(`${row.forChoice}.`),
        )),
  );
  // A reason the listener heard today is held back too while another is
  // on hand ("Lives out in Sharp County." from two of the household one
  // morning; the telling's rule that the house says a thing once a day).
  const freshReasons = request.avoid
    ? reasons?.filter((row) => !row.part || !request.avoid!.has(row.part))
    : reasons;
  if (usable?.length && reasons?.length)
    return composedMove(
      request,
      bank,
      words.version,
      stage,
      usable,
      freshReasons?.length ? freshReasons : reasons,
    );
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

/** A move's wordings and the reasons after them, as parts of one line. */
function linePartVariant(row: Move): LinePartVariant {
  return {
    key: moveVariantKey(row),
    kind: "template",
    text: row.text,
    ...(row.part ? { pieceKey: row.part } : {}),
    ...(row.stages ? { stages: row.stages } : {}),
    ...(row.requiresFacts ? { requiresFacts: row.requiresFacts } : {}),
    ...(row.bearing ? { bearing: row.bearing } : {}),
  };
}

/**
 * A line the English engine composes from the move's wordings (the core,
 * always said) and the reasons that may follow it (said when the facts they
 * name are on record), with `composeGroundedLine`, the opening's composer.
 */
function composedMove(
  request: Parameters<typeof wordConversationMove>[0],
  bankKey: string,
  version: string,
  stage: string,
  usable: readonly Move[],
  reasons: readonly Move[],
): Said | null {
  const facts = request.facts;
  const compose = (cores: readonly Move[], withReasons: readonly Move[]) =>
    composeGroundedLine(
      conversationPacket({
        surface: "dialogue",
        momentKey: request.momentKey,
        worldSeed: request.seed,
        bankVersion: version,
        stage,
        holderId: request.speakerId,
        facts,
        fallbackSourceId: request.speakerId,
        voice: { traits: request.traits, register: "conversation" },
      }),
      {
        key: bankKey,
        version,
        surface: "dialogue",
        act: "tell",
        parts: {
          core: { required: true, variants: cores.map(linePartVariant) },
          ...(withReasons.length
            ? { reason: { variants: withReasons.map(linePartVariant) } }
            : {}),
        },
      },
      { speakerTraits: request.traits },
    );
  let line = compose(usable, reasons);
  // A reason never says again what its core said ("She got sick last week.
  // It started last week."): then the core is said alone.
  if (line.kind === "rendered" && line.parts.length > one) {
    const [head, ...rest] = line.parts;
    const said = new Set(head!.usedFactKeys);
    if (rest.some((part) => part.usedFactKeys.some((key) => said.has(key))))
      line = compose(
        usable.filter((row) => moveVariantKey(row) === head!.variantKey),
        [],
      );
  }
  if (line.kind !== "rendered") return null;
  const pieces = line.parts.map(
    (part) =>
      [...usable, ...reasons].find(
        (row) => moveVariantKey(row) === part.variantKey,
      )?.part ?? part.variantKey,
  );
  const core = usable.find(
    (row) => moveVariantKey(row) === line.parts[zero]?.variantKey,
  );
  return {
    text: line.text,
    sourceRecordIds: line.sourceRecordIds,
    wording: {
      bank: bankKey,
      parts: pieces,
      stage,
      facts: [...new Set(line.parts.flatMap((part) => part.usedFactKeys))],
    },
    asks: asks(line.text),
    afterPlain: !!core?.afterPlain,
  };
}

/** The bank without the pieces a present fact holds back. */
function withoutExcluded(
  bank: ComposedLineBank,
  facts: Readonly<Record<string, Fact>>,
): ComposedLineBank {
  const held = (variant: { excludesFacts?: readonly string[] }) =>
    !!variant.excludesFacts?.some((key) => facts[key]);
  return {
    ...bank,
    parts: Object.fromEntries(
      Object.entries(bank.parts).map(([part, row]) => [
        part,
        row && {
          ...row,
          variants: row.variants.filter((v) => !held(v as never)),
        },
      ]),
    ) as unknown as ComposedLineBank["parts"],
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

const COMPOSED = new Map<string, ComposedLineBank | null>();

/** The fact a talk carries once a speaker said how long they have held a stand ("for years"). */
export const HELD_SAID = "held-said";
let HELD_PIECES: ReadonlySet<string> | null = null;

/**
 * The pieces that say how long the speaker has held a stand: each is held
 * back once the talk has said it (`excludesFacts: held-said`), and saying one
 * is what sets that fact for the rest of the talk (lead, Nov 13: how long a
 * person has held a stand is said once per talk).
 */
export function heldPieces(): ReadonlySet<string> {
  HELD_PIECES ??= new Set(
    admittedParts(CONVERSATION_BANK.parts)
      .filter((piece) =>
        piece.uses.some((use) => use.excludesFacts?.includes(HELD_SAID)),
      )
      .map((piece) => piece.key),
  );
  return HELD_PIECES;
}

/**
 * The bank a subject's composed lines are made from: its pieces in the
 * conversation bank by the part of the line each says (opener, core, reason,
 * closer: a use whose role is one of those), for `composeGroundedLine`. Null
 * when the subject has no core. A piece the grades or the rules hold back is
 * never in it.
 */
export function composedConversationBank(
  subject: string,
): ComposedLineBank | null {
  if (COMPOSED.has(subject)) return COMPOSED.get(subject)!;
  const parts: Partial<Record<LinePart, LinePartVariant[]>> = {};
  for (const piece of admittedParts(CONVERSATION_BANK.parts))
    for (const use of piece.uses)
      if (
        use.subject === subject &&
        (LINE_PARTS as readonly string[]).includes(use.role)
      )
        (parts[use.role as LinePart] ??= []).push({
          key: piece.key,
          kind: "template",
          text: directorSlots(piece.text),
          pieceKey: piece.key,
          ...(use.stages ? { stages: use.stages } : {}),
          ...(use.requiresFacts
            ? {
                requiresFacts: use.requiresFacts.map((key) =>
                  key.replace(/_/g, "-"),
                ),
              }
            : {}),
          ...(use.excludesFacts?.length
            ? {
                excludesFacts: use.excludesFacts.map((key) =>
                  key.replace(/_/g, "-"),
                ),
              }
            : {}),
          ...(use.closesTalk ? { closesTalk: true } : {}),
          ...(piece.bearing ? { bearing: piece.bearing } : {}),
        });
  const bank: ComposedLineBank | null = parts.core?.length
    ? {
        key: `conversation.${subject}`,
        version: "words-composed-conversation-v1",
        surface: "dialogue",
        act: "tell",
        parts: {
          ...Object.fromEntries(
            Object.entries(parts).map(([part, variants]) => [
              part,
              { variants },
            ]),
          ),
          core: { required: true, variants: parts.core },
        },
      }
    : null;
  COMPOSED.set(subject, bank);
  return bank;
}

/**
 * A conversation line the engine composes from a subject's parts (opener,
 * core, reason, closer) in the speaker's voice, avoiding the parts they said
 * before. Null when no core can be said from the facts given.
 */
export function composeConversationLine(request: {
  seed: string;
  subject: string;
  speakerId: PersonId;
  traits: Readonly<Record<string, number>>;
  facts: Readonly<Record<string, Fact>>;
  stage: string;
  momentKey: string;
  /** Piece keys the speaker said earlier in the talk. */
  said?: readonly string[];
}): Said | null {
  const whole = composedConversationBank(request.subject);
  if (!whole) return null;
  // A piece held back where a fact is present (`excludesFacts`) is not
  // offered for these facts.
  const bank = withoutExcluded(whole, request.facts);
  const line = composeGroundedLine(
    conversationPacket({
      surface: "dialogue",
      momentKey: request.momentKey,
      worldSeed: request.seed,
      bankVersion: bank.version,
      stage: request.stage,
      holderId: request.speakerId,
      facts: request.facts,
      fallbackSourceId: request.speakerId,
      voice: { traits: request.traits, register: "conversation" },
    }),
    bank,
    {
      speakerTraits: request.traits,
      // What they said before, in every part it could be said in.
      recentPartKeys: (request.said ?? []).flatMap((key) =>
        LINE_PARTS.map((part) => `${bank.key}:${part}:${key}`),
      ),
    },
  );
  if (line.kind !== "rendered") return null;
  return {
    text: line.text,
    sourceRecordIds: line.sourceRecordIds,
    wording: {
      bank: `conversation:${request.subject}:composed`,
      parts: line.parts.map((part) => part.variantKey),
      stage: request.stage,
      facts: [...new Set(line.parts.flatMap((part) => part.usedFactKeys))],
    },
    asks: asks(line.text),
    afterPlain: false,
  };
}
