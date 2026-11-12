/**
 * The opening address's words (`data/english/parts/opening-speech.json`):
 * authored pieces for the President's inaugural address or State of the
 * Union, each with a polished and a plain version for the speaker's recorded
 * manner. The shape is a real address's: an opening and the oath, what the
 * President believes, the country's year, its people, the turn to Congress
 * and the priorities each tied to a law, the Vice President, the states, a
 * call to the people, a close. The address says no figure at all (owner, Oct
 * 27: "none of that real data in there"; Nov 1: "I don't like where this part
 * of the speech where it just laces statistics"), and a piece names no law:
 * every policy, name and office is a slot, and every claim a piece makes
 * ("more people are working than a year ago", "the law says no") is a
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
  /** The speaker's manner this wording is for; a list when it reads the same in several. */
  voice: SpeechVoice | readonly SpeechVoice[];
  /** How the sentence lands (glad, braced, tender, calm), for the speaker's trait pulls. */
  bearing?: string;
  /** The country's subject the sentence is about ("unemployment", "wages"); a list when one wording serves several. */
  topic?: string | readonly string[];
  /** The Speaker's gender the salutation is for (`chair-male`, `chair-female`). */
  stages?: string[];
  /** The crafted device the sentence makes, earned by the speaker's addresses. */
  device?: SpeechDevice;
  /**
   * The kind of address the sentence is for (`crisis`, `combative`,
   * `hopeful`, `victory`, `mourning`); a piece without one belongs to every
   * kind that has no piece of its own for the role (owner, Nov 8).
   */
  addressKind?: string;
  /**
   * The part of a joined sentence the piece is (owner, Nov 11, call 12: "A
   * piece the engine joins counts as composed when the sentence it makes
   * carries an insert"): an opener said before the move's core, or the core
   * itself, which names a slot from the world's records in every wording. A
   * piece without one is a whole core.
   */
  piece?: {
    of: string;
    part: "opener" | "core" | "closer";
    required?: boolean;
  };
}
export const OPENING_SPEECH_BANK = bankJson as unknown as {
  parts: OpeningPart[];
};

export type OpeningSpeechKind =
  "state-of-the-union" | "inaugural" | "state-of-the-state" | "town-address";
export type SpeechVoice = "polished" | "plain";

/** Where the camera is while a block is spoken. */
export type OpeningLevel =
  | "salutation"
  | "occasion"
  | "country"
  | "people"
  | "congress"
  | "vice-president"
  | "states"
  | "families"
  | "close";

/** One move of a block, with the number it reports when it reports one. */
export type OpeningMove = AddressMove & { readonly topic?: string };

/** What each role of the bank does in the speech. */
const ACTS: Readonly<Record<string, SpeechAct>> = {
  salutation: "greet",
  occasion: "tell",
  oath: "promise",
  creed: "tell",
  unity: "promise",
  "story-open": "tell",
  // A point's context from the world's records over a span (speech-outline.ts).
  context: "tell",
  // What the context has meant for people, between the context and the stand.
  meaning: "tell",
  // How a point's question stands today, from the law in force.
  today: "tell",
  "story-says": "tell",
  "story-turn": "tell",
  pledge: "promise",
  people: "tell",
  "to-congress": "request",
  "lead-in": "tell",
  stake: "tell",
  law: "tell",
  ask: "request",
  "to-vp": "tell",
  "to-states": "request",
  call: "request",
  history: "tell",
  hope: "promise",
  families: "comfort",
  close: "farewell",
  subject: "tell",
  change: "tell",
};

/**
 * Whether a piece's voice or topic is `wanted`: the piece holds one value or
 * a list of them, since a wording that reads the same in two voices or two
 * topics is one piece (the bank holds a text once).
 */
export function partHolds(
  value: string | readonly string[] | undefined,
  wanted: string,
): boolean {
  return typeof value === "string"
    ? value === wanted
    : !!value?.includes(wanted);
}

/** A piece's voice or topic as a list: its one value, or the list it holds. */
export function partValues(
  value: string | readonly string[] | undefined,
): readonly string[] {
  return value === undefined ? [] : typeof value === "string" ? [value] : value;
}

/** The roles a piece may play with no fact and no stand: the greeting and the goodbye. */
const BARE_ROLES: readonly string[] = ["salutation", "close"];

/**
 * Whether a core piece carries something: a slot filled from the world's
 * records, or a fact it is said only when the record holds. A core that
 * carries neither ("This is a working speech.", "I'll keep this practical
 * tonight.") is not a type the outline can pick (owner, Nov 12, via the
 * words lead: four sentences that say nothing). Openers and closers lead or
 * end a core that does.
 */
function carries(
  part: OpeningPart,
  kind: OpeningSpeechKind,
  role: string,
  line: "opener" | "core" | "closer",
): boolean {
  if (line !== "core" || BARE_ROLES.includes(role)) return true;
  const use = part.uses.find(
    (row) => row.subject === kind && row.role === role,
  );
  return /\{[^}]+\}/.test(part.text) || !!use?.requiresFacts?.length;
}

/** The line part a piece is said as: an opener, a closer, or the core. */
function lineOf(part: OpeningPart): "opener" | "core" | "closer" {
  return part.piece?.part === "opener" || part.piece?.part === "closer"
    ? part.piece.part
    : "core";
}

/**
 * The pieces of one role, in one voice, for one kind of address, by the line
 * part each is said as. An opener belongs to every topic of its role unless it
 * names one; a core says only its own topic.
 */
function variantsFor(
  kind: OpeningSpeechKind,
  voice: SpeechVoice,
  role: string,
  line: "opener" | "core" | "closer",
  topic?: string,
  addressKind?: string,
): LinePartVariant[] {
  const fits = (part: OpeningPart) =>
    partHolds(part.voice, voice) &&
    carries(part, kind, role, line) &&
    lineOf(part) === line &&
    (!topic ||
      partHolds(part.topic, topic) ||
      (line !== "core" && !part.topic)) &&
    part.uses.some((use) => use.subject === kind && use.role === role);
  // A kind of address that has cores of its own for the role says only
  // those; every other kind says the role's general cores. An opener or a
  // closer of the kind's own is said beside the role's general ones.
  const own = addressKind
    ? admittedParts(
        OPENING_SPEECH_BANK.parts,
        (part) => fits(part) && part.addressKind === addressKind,
      )
    : [];
  const general = () =>
    admittedParts(
      OPENING_SPEECH_BANK.parts,
      (part) => fits(part) && !part.addressKind,
    );
  return (
    line !== "core" ? [...general(), ...own] : own.length ? own : general()
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
 * for this kind and voice. `topic` limits a story line to one subject.
 */
export function openingMove(
  kind: OpeningSpeechKind,
  voice: SpeechVoice,
  role: string,
  options: { topic?: string; required?: boolean; addressKind?: string } = {},
): OpeningMove | null {
  const act = ACTS[role];
  if (!act) throw new Error(`No opening role ${role}`);
  const of = (line: "opener" | "core" | "closer") =>
    variantsFor(kind, voice, role, line, options.topic, options.addressKind);
  const variants = of("core");
  if (!variants.length) return null;
  const opener = of("opener");
  const closer = of("closer");
  const bank: ComposedLineBank = {
    key: `opening-speech.${kind}.${role}${options.topic ? `.${options.topic}` : ""}`,
    version: "words-opening-speech-v1",
    surface: "dialogue",
    act,
    parts: {
      ...(opener.length ? { opener: { variants: opener } } : {}),
      core: { variants },
      ...(closer.length ? { closer: { variants: closer } } : {}),
    },
  };
  return {
    key: `${role}${options.topic ? `-${options.topic}` : ""}`,
    bank,
    ...(options.required ? { required: true } : {}),
    ...(options.topic ? { topic: options.topic } : {}),
  };
}
