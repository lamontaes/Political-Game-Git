/**
 * Turns the mined opening-speech bank (`data/english/parts/opening-speech.json`)
 * into the President's address that opens the game: the inaugural address in
 * an inauguration year, otherwise the State of the Union (M6-01). Each part is
 * a sentence real Presidents said, from the Daily Compilation of Presidential
 * Documents, with the world's own numbers in its slots.
 *
 * The speech comes back in sections, one per level it addresses, so the
 * opening can cut to Congress, the governors, the town and the family as the
 * speech reaches each of them. A section whose facts the world doesn't hold
 * (no recorded fall in unemployment, no guest) is left out; a sentence that
 * claims something about the country is said only when its fact is in the
 * packet.
 *
 * Stand-in: the engine has no register card for a President's address, so
 * these compose under election-night (a public address) until PEOPLE adds one
 * (listed for PEOPLE in docs/coordination/words.md).
 *
 * Folded into the engine for the opening story (Oct 14, 2026); OPUS-WORDS
 * still owns the bank it reads, and `scripts/english-corpus/
 * opening-speech-bank.ts` re-exports it for the corpus tooling and tests.
 */
import bankJson from "../../data/english/parts/opening-speech.json" with { type: "json" };
import { heldByGrades } from "./english-grades";
import {
  composeAddress,
  type AddressMove,
  type ComposedLineBank,
  type LinePartVariant,
  type SpeechAct,
} from "./english-composition";
import type { GroundedEnglishPacket } from "./grounded-english";

interface MinedPart {
  key: string;
  text: string;
  uses: { subject: string; role: string; requiresFacts?: string[] }[];
  shippable: boolean;
  /** How the sentence lands (glad, braced, tender, calm), for the speaker's trait pulls. */
  bearing?: string;
}
export const OPENING_SPEECH_BANK = bankJson as unknown as {
  parts: MinedPart[];
};

export type OpeningSpeechKind = "state-of-the-union" | "inaugural";

/** Where the camera is while a section is spoken. */
export type OpeningLevel =
  | "occasion"
  | "country"
  | "congress"
  | "governors"
  | "towns"
  | "families"
  | "close";

interface SectionMove {
  role: string;
  act: SpeechAct;
  required?: boolean;
  /** Only the sentences of this role that say this. */
  only?: RegExp;
}

/** The sections in order, each the moves it is composed from. */
export const OPENING_SECTIONS: readonly {
  level: OpeningLevel;
  required?: boolean;
  moves: readonly SectionMove[];
}[] = [
  {
    level: "occasion",
    required: true,
    moves: [
      // The formal address to the chamber or the nation, not "Thank you, everybody."
      {
        role: "salutation",
        act: "greet",
        required: true,
        only: /Speaker|fellow|evening/,
      },
      { role: "occasion", act: "tell" },
    ],
  },
  // One sentence per kind of number, each only when the world records it.
  {
    level: "country",
    moves: [
      { role: "report", act: "tell", only: /econom|grew/i },
      { role: "report", act: "tell", only: /unemploy|out of work/i },
      { role: "report", act: "tell", only: /jobs|manufacturing/i },
      { role: "report", act: "tell", only: /wages/i },
      { role: "report", act: "tell", only: /^(?!Wages).*(inflation|prices)/i },
      { role: "report", act: "tell", only: /housing|rent|interest|mortgage/i },
      { role: "report", act: "tell", only: /deficit|debt/i },
      { role: "report", act: "tell", only: /crime|murder/i },
    ],
  },
  // "Pass it." follows only an ask that names what "it" is.
  {
    level: "congress",
    moves: [
      { role: "congress", act: "request", only: /\{goal\}/ },
      { role: "congress", act: "request", only: /\b(?:it|this)\b/i },
    ],
  },
  { level: "governors", moves: [{ role: "governors", act: "request" }] },
  // A town the President visited, else communities in general; never "It's
  // happening all across the country." with nothing before it.
  {
    level: "towns",
    moves: [
      { role: "towns", act: "tell", only: /\{place\}/ },
      { role: "towns", act: "tell", only: /communit|cities|towns/i },
    ],
  },
  { level: "families", moves: [{ role: "families", act: "comfort" }] },
  {
    level: "close",
    required: true,
    moves: [{ role: "close", act: "farewell", required: true }],
  },
];

/** `{unemployment_rate}` becomes the renderer's `{{unemployment-rate}}`. */
function engineText(text: string): string {
  return text.replace(
    /\{(\w+)\}/g,
    (_all, slot: string) => `{{${slot.replace(/_/g, "-")}}}`,
  );
}

function variantsFor(
  kind: OpeningSpeechKind,
  role: string,
  only?: RegExp,
): LinePartVariant[] {
  return OPENING_SPEECH_BANK.parts
    .filter(
      (part) =>
        part.shippable &&
        !heldByGrades(part.key) &&
        part.uses.some((use) => use.subject === kind && use.role === role) &&
        (!only || only.test(part.text)),
    )
    .map((part) => {
      // "Mr. Speaker" or "Madam Speaker" follows the Speaker's record.
      const chair = /\bMr\. Speaker\b/.test(part.text)
        ? ["chair-male"]
        : /\bMadam Speaker\b/.test(part.text)
          ? ["chair-female"]
          : undefined;
      // A sentence that points back ("Pass it.", "This is not a partisan
      // issue.") is said only when the ask before it named the goal.
      const pointsBack =
        !part.text.includes("{") && /\b(?:it|this)\b/i.test(part.text);
      const requires = [
        ...(part.uses.find((use) => use.subject === kind && use.role === role)
          ?.requiresFacts ?? []),
        ...(pointsBack && role === "congress" ? ["goal"] : []),
      ];
      return {
        key: part.key,
        kind: "template" as const,
        text: engineText(part.text),
        ...(part.bearing ? { bearing: part.bearing } : {}),
        ...(chair ? { stages: chair } : {}),
        ...(requires?.length ? { requiresFacts: requires } : {}),
      };
    });
}

/** One section's moves, ready for `composeAddress`. */
export function openingMoves(
  kind: OpeningSpeechKind,
  level: OpeningLevel,
): AddressMove[] {
  const section = OPENING_SECTIONS.find((entry) => entry.level === level);
  if (!section) throw new Error(`No opening section ${level}`);
  return section.moves.flatMap(({ role, act, required, only }, index) => {
    const variants = variantsFor(kind, role, only);
    if (!variants.length) return [];
    const bank: ComposedLineBank = {
      key: `opening-speech.${kind}.${level}.${index}-${role}`,
      version: "words-opening-speech-v1",
      surface: "dialogue",
      act,
      parts: { core: { variants } },
    };
    return [
      {
        key: `${level}-${index}-${role}`,
        bank,
        ...(required ? { required } : {}),
      },
    ];
  });
}

export interface OpeningSection {
  level: OpeningLevel;
  text: string;
  sentences: string[];
  sourceRecordIds: string[];
}

/**
 * The whole speech, section by section. The packet carries the world's facts
 * (`unemployment-rate`, `jobs-added`, `inflation-down`, a guest's `name`, the
 * administration's `goal`, ...) and the Speaker's gender as its stage
 * (`chair-male` or `chair-female`). The President's recorded traits are the
 * voice: through the calibration table they pull each pick toward the bearing
 * and length that person favors (a combative President toward braced lines, a
 * warm one toward tender and glad ones), never deciding a line alone. Null
 * when the speech can't open or close from the record.
 */
export function composeOpeningSpeech(
  packet: GroundedEnglishPacket,
  kind: OpeningSpeechKind,
  speakerTraits?: Readonly<Record<string, number>>,
): OpeningSection[] | null {
  const sections: OpeningSection[] = [];
  for (const section of OPENING_SECTIONS) {
    const moves = openingMoves(kind, section.level);
    const address = moves.length
      ? composeAddress(
          { ...packet, momentKey: `${packet.momentKey}/${section.level}` },
          "election-night",
          moves,
          speakerTraits ? { speakerTraits } : {},
        )
      : null;
    if (!address || address.kind !== "rendered") {
      if (section.required) return null;
      continue;
    }
    sections.push({
      level: section.level,
      text: address.text,
      sentences: address.moves.map((move) => move.text),
      sourceRecordIds: [...address.sourceRecordIds],
    });
  }
  return sections;
}

/** The inaugural address in an inauguration year, otherwise the State of the Union. */
export function openingSpeechKind(year: number): OpeningSpeechKind {
  return year % 4 === 1 ? "inaugural" : "state-of-the-union";
}
