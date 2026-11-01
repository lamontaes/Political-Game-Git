/**
 * The opening address's words (`data/english/parts/opening-speech.json`):
 * authored pieces for the President's inaugural address or State of the
 * Union, each with a polished and a plain version for the speaker's recorded
 * manner. The shape is a real address's: an opening, a story of the country,
 * priorities each tied to a law, a close. A piece holds no figure and names
 * no law: every number, policy name, state and office is a slot, and every
 * claim the piece makes ("lower than a year ago", "the law says no") is a
 * required fact the director supplies from a record, so a piece is said only
 * where its fact is held (`requiresFacts`).
 *
 * The director (`src/director/opening-story.ts`) decides which blocks the
 * address has and with which facts; this file turns one role of one block
 * into a move for `composeAddress`. It holds no sentence and no order.
 */
import bankJson from "../../data/english/parts/opening-speech.json" with { type: "json" };
import { admittedParts, directorSlots, type BankPart } from "./bank-parts";
import type {
  AddressMove,
  ComposedLineBank,
  LinePartVariant,
  SpeechAct,
} from "./english-composition";
import type { SpeechDevice } from "./speech-registers";

interface OpeningPart extends BankPart {
  /** The speaker's manner this wording is for. */
  voice: SpeechVoice;
  /** How the sentence lands (glad, braced, tender, calm), for the speaker's trait pulls. */
  bearing?: string;
  /** The country's number the sentence is about, for choosing its figure. */
  topic?: string;
  /** The Speaker's gender the salutation is for (`chair-male`, `chair-female`). */
  stages?: string[];
  /** The crafted device the sentence makes, earned by the speaker's addresses. */
  device?: SpeechDevice;
}
export const OPENING_SPEECH_BANK = bankJson as unknown as {
  parts: OpeningPart[];
};

export type OpeningSpeechKind = "state-of-the-union" | "inaugural";
export type SpeechVoice = "polished" | "plain";

/** Where the camera is while a block is spoken. */
export type OpeningLevel =
  "salutation" | "occasion" | "country" | "congress" | "families" | "close";

/** One move of a block, with the number it reports when it reports one. */
export type OpeningMove = AddressMove & { readonly topic?: string };

/** What each role of the bank does in the speech. */
const ACTS: Readonly<Record<string, SpeechAct>> = {
  salutation: "greet",
  occasion: "tell",
  creed: "tell",
  unity: "promise",
  "story-open": "tell",
  "story-fig": "tell",
  "story-turn": "tell",
  pledge: "promise",
  "lead-in": "tell",
  stake: "tell",
  law: "tell",
  ask: "request",
  families: "comfort",
  close: "farewell",
};

/** The pieces of one role, in one voice, for one kind of address. */
function variantsFor(
  kind: OpeningSpeechKind,
  voice: SpeechVoice,
  role: string,
  topic?: string,
): LinePartVariant[] {
  return admittedParts(
    OPENING_SPEECH_BANK.parts,
    (part) =>
      part.voice === voice &&
      (!topic || part.topic === topic) &&
      part.uses.some((use) => use.subject === kind && use.role === role),
  ).map((part) => {
    const requires =
      part.uses.find((use) => use.subject === kind && use.role === role)
        ?.requiresFacts ?? [];
    return {
      key: part.key,
      kind: "template" as const,
      text: directorSlots(part.text),
      pieceKey: part.key,
      ...(part.bearing ? { bearing: part.bearing } : {}),
      ...(part.stages ? { stages: part.stages } : {}),
      ...(part.device ? { device: part.device } : {}),
      ...(requires.length ? { requiresFacts: requires } : {}),
    };
  });
}

/**
 * One role of a block as a move, or null when the bank holds no piece of it
 * for this kind and voice. `topic` limits a story figure to one number.
 */
export function openingMove(
  kind: OpeningSpeechKind,
  voice: SpeechVoice,
  role: string,
  options: { topic?: string; required?: boolean } = {},
): OpeningMove | null {
  const act = ACTS[role];
  if (!act) throw new Error(`No opening role ${role}`);
  const variants = variantsFor(kind, voice, role, options.topic);
  if (!variants.length) return null;
  const bank: ComposedLineBank = {
    key: `opening-speech.${kind}.${role}${options.topic ? `.${options.topic}` : ""}`,
    version: "words-opening-speech-v1",
    surface: "dialogue",
    act,
    parts: { core: { variants } },
  };
  return {
    key: `${role}${options.topic ? `-${options.topic}` : ""}`,
    bank,
    ...(options.required ? { required: true } : {}),
    ...(options.topic ? { topic: options.topic } : {}),
  };
}
