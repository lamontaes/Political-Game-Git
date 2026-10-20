/**
 * Turns the mined speech bank (`data/english/parts/address.json`) into move
 * banks for the English engine's `composeAddress`, so a speech, a turn at a
 * council microphone or a floor statement is composed from pieces mined from
 * public-domain federal records or authored to the calibrated patterns (text
 * rule, Oct 15). Each register's moves follow its register
 * card (docs/research/speech-and-dialogue-corpus-2026-09-28.md).
 *
 * A sentence that opens "Mr." or "Madam" addresses a chair: it is said only
 * at the stage `chair-male` or `chair-female`, from the chair's record.
 *
 * Folded into the engine (Oct 19, 2026); OPUS-WORDS still owns the bank it
 * reads, and `scripts/english-corpus/address-bank.ts` re-exports it for the
 * corpus tooling and tests.
 */
import bankJson from "../../data/english/parts/address.json" with { type: "json" };
import { heldByGrades } from "./english-grades";
import {
  composeAddress,
  composeGroundedLine,
  type AddressMove,
  type ComposedLineBank,
  type LinePartVariant,
  type SpeechAct,
} from "./english-composition";
import type { GroundedEnglishPacket } from "./grounded-english";
import { REGISTER_CARDS, type SpeechRegister } from "./speech-registers";

interface MinedPart {
  key: string;
  text: string;
  uses: { subject: string; role: string; requiresFacts?: string[] }[];
  shippable: boolean;
}
export const ADDRESS_BANK = bankJson as unknown as { parts: MinedPart[] };

/** Each mined register: the engine's register and its moves, in order. */
export const ADDRESS_REGISTERS: Readonly<
  Record<
    string,
    {
      /** The mined register the moves come from, when it differs from the key. */
      from?: string;
      register: SpeechRegister;
      moves: readonly {
        move: string;
        act: SpeechAct;
        required?: boolean;
        /** Only the sentences of this move that say this. */
        only?: RegExp;
      }[];
    }
  >
> = {
  // A House member remembers someone who died, honors someone living, or
  // speaks for or against a measure.
  "house-memorial": {
    from: "house-floor",
    register: "house-one-minute",
    moves: [
      {
        move: "address-chair",
        act: "greet",
        required: true,
        only: /honor the life|recognize the life|remember|in honor of/,
      },
      { move: "tribute-story", act: "recall" },
      { move: "tribute-close", act: "praise", only: /missed|honoring|service/ },
      {
        move: "yield",
        act: "farewell",
        only: /^(?:(?:Mr\.|Madam) Speaker, )?I yield back/,
      },
    ],
  },
  "house-honor": {
    from: "house-floor",
    register: "house-one-minute",
    moves: [
      {
        move: "address-chair",
        act: "greet",
        required: true,
        only: /to honor [^t]|recogni[sz]e (?!the life)|congratulate|celebrate|pay tribute|in recognition/,
      },
      { move: "tribute-story", act: "recall", only: /^(?!.*survived)/ },
      { move: "tribute-close", act: "praise", only: /^(?!.*missed)/ },
      {
        move: "yield",
        act: "farewell",
        only: /^(?:(?:Mr\.|Madam) Speaker, )?I yield back/,
      },
    ],
  },
  "house-support": {
    from: "house-floor",
    register: "house-debate",
    moves: [
      {
        move: "address-chair",
        act: "greet",
        required: true,
        only: /support of/,
      },
      {
        move: "yield",
        act: "persuade",
        only: /^I urge .*(?:support|yes|join)/,
      },
      {
        move: "yield",
        act: "farewell",
        only: /^(?:(?:Mr\.|Madam) Speaker, )?I yield back/,
      },
    ],
  },
  "house-oppose": {
    from: "house-floor",
    register: "house-debate",
    moves: [
      {
        move: "address-chair",
        act: "greet",
        required: true,
        only: /opposition to/,
      },
      { move: "yield", act: "persuade", only: /^I urge .*\bno\b/ },
      {
        move: "yield",
        act: "farewell",
        only: /^(?:(?:Mr\.|Madam) Speaker, )?I yield back/,
      },
    ],
  },
  "senate-floor": {
    register: "senate-floor",
    moves: [{ move: "address-chair", act: "greet", required: true }],
  },
  "state-floor": {
    register: "state-floor",
    moves: [
      { move: "address-chair", act: "greet", required: true },
      { move: "close", act: "request" },
    ],
  },
  hearing: {
    register: "committee-questioning",
    moves: [
      { move: "open", act: "thank", required: true },
      { move: "close", act: "farewell" },
    ],
  },
  "public-comment": {
    register: "council-comment",
    moves: [
      { move: "greet", act: "greet" },
      { move: "name", act: "tell", required: true },
      { move: "story", act: "tell" },
      { move: "ask", act: "request" },
      { move: "close", act: "thank" },
    ],
  },
  campaign: {
    register: "rally",
    moves: [
      { move: "thanks", act: "thank", required: true },
      { move: "self", act: "tell" },
      { move: "issue", act: "persuade" },
      { move: "contrast", act: "blame" },
      { move: "ask", act: "request" },
      { move: "close", act: "thank" },
    ],
  },
  // A candidates' debate: the moderator's lines and a candidate's turn are
  // separate registers, since each speaker composes their own.
  "debate-moderator": {
    from: "debate",
    register: "town-hall",
    moves: [{ move: "moderator", act: "request", required: true }],
  },
  "debate-candidate": {
    from: "debate",
    register: "town-hall",
    moves: [
      { move: "rebut", act: "deflect", required: true },
      { move: "closing", act: "request" },
    ],
  },
  // The cinematic opening: a President's State of the Union or inaugural.
  // Stand-in: the engine has no register card for a president's address
  // yet, so these compose under election-night until PEOPLE adds one.
  "state-of-the-union": {
    register: "election-night",
    moves: [
      { move: "salutation", act: "greet", required: true },
      { move: "report", act: "tell" },
      { move: "guest", act: "praise" },
      { move: "ask", act: "request" },
      { move: "close", act: "farewell" },
    ],
  },
  inaugural: {
    register: "election-night",
    moves: [
      { move: "salutation", act: "greet", required: true },
      { move: "moment", act: "promise" },
      { move: "close", act: "farewell" },
    ],
  },
  victory: {
    register: "election-night",
    moves: [{ move: "claim", act: "thank", required: true }],
  },
  concession: {
    register: "election-night",
    moves: [{ move: "concede", act: "praise", required: true }],
  },
};

/** `{pronoun_obj}` becomes the renderer's `{{pronoun-obj}}`. */
function engineText(text: string): string {
  return text.replace(
    /\{(\w+)\}/g,
    (_all, slot: string) => `{{${slot.replace(/_/g, "-")}}}`,
  );
}

function variantsFor(
  register: string,
  move: string,
  only?: RegExp,
): LinePartVariant[] {
  return ADDRESS_BANK.parts
    .filter(
      (part) =>
        part.shippable &&
        !heldByGrades(part.key) &&
        part.uses.some(
          (use) => use.subject === register && use.role === move,
        ) &&
        (!only || only.test(part.text)),
    )
    .map((part) => {
      const chair = /\b(?:Mr\.|Chairman)\s/.test(part.text)
        ? ["chair-male"]
        : /\b(?:Madam|Chairwoman)\b/.test(part.text)
          ? ["chair-female"]
          : undefined;
      // A claim about the speaker's life or the place needs its record fact.
      const requires = part.uses.find(
        (use) => use.subject === register && use.role === move,
      )?.requiresFacts;
      return {
        key: part.key,
        kind: "template" as const,
        text: engineText(part.text),
        ...(chair ? { stages: chair } : {}),
        ...(requires?.length ? { requiresFacts: requires } : {}),
      };
    });
}

/** The moves of one mined register, ready for `composeAddress`. */
export function addressMoves(register: string): {
  register: SpeechRegister;
  moves: AddressMove[];
} {
  const card = ADDRESS_REGISTERS[register];
  if (!card) throw new Error(`No mined register ${register}`);
  return {
    register: card.register,
    moves: card.moves.flatMap(({ move, act, required, only }, index) => {
      const variants = variantsFor(card.from ?? register, move, only);
      if (!variants.length) return [];
      const bank: ComposedLineBank = {
        key: `address.${register}.${index}-${move}`,
        version: "words-address-v1",
        surface: "dialogue",
        act,
        parts: { core: { variants } },
      };
      return [
        { key: `${index}-${move}`, bank, ...(required ? { required } : {}) },
      ];
    }),
  };
}

/**
 * A turn in one mined register: an address is composed whole; an exchange
 * (a committee hearing) is a line per move under its register.
 */
export function composeTurn(
  packet: GroundedEnglishPacket,
  register: string,
): { text: string; moves: string[]; sourceRecordIds: string[] } | null {
  const card = addressMoves(register);
  if (REGISTER_CARDS[card.register].setting === "public-address") {
    const address = composeAddress(packet, card.register, card.moves);
    return address.kind === "rendered"
      ? {
          text: address.text,
          moves: address.moves.map((move) => move.text),
          sourceRecordIds: [...address.sourceRecordIds],
        }
      : null;
  }
  const moves: string[] = [];
  const ids = new Set<string>();
  for (const move of card.moves) {
    const line = composeGroundedLine(
      { ...packet, momentKey: `${packet.momentKey}/${move.key}` },
      move.bank,
      { register: card.register },
    );
    if (line.kind !== "rendered") {
      if (move.required) return null;
      continue;
    }
    moves.push(line.text);
    for (const id of line.sourceRecordIds) ids.add(id);
  }
  return moves.length
    ? { text: moves.join(" "), moves, sourceRecordIds: [...ids] }
    : null;
}
