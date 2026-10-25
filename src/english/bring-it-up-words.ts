/**
 * The English engine's half of people bringing it up (M4-05). The director
 * (`src/director/bring-it-up.ts`) decides which change a person mentions and
 * whom they believe caused it, from what they heard and saw; this file picks
 * the mined sentence that says the change, and the one that says the blame,
 * and renders them in the speaker's voice (CTO, Oct 19: two layers under one
 * contract).
 */
import type { PersonId } from "../core2/types";
import {
  renderLine,
  type Fact,
  type RenderedLine,
  type Variant,
} from "./bank-line";
import { bringWordsFromBank } from "./mined/scene-bank";

export type { Fact };

/** How a person came to their belief about who caused a change. */
export type BlameHow = "told" | "record" | "assumed" | "unknown";

export interface BringWords {
  version: string;
  /** The sentences that say a change, by its event kind. */
  changes: Readonly<Record<string, Variant[]>>;
  /** The sentences that say whom the speaker blames, by how they came to it. */
  blame: Readonly<Record<BlameHow, Variant[]>>;
}
/** The default words are the mined bank's. */
export const BRING_IT_UP_WORDS: BringWords = bringWordsFromBank();

/**
 * A line the speaker says: the change (by its event kind), or the blame (how
 * they came to it, and whether anyone is named; with no one named, the line
 * says nobody knows).
 */
export type BringMove =
  | { part: "change"; eventKind: string }
  | { part: "blame"; how: BlameHow; named: boolean };

/** Words one line of bringing it up, or null when no sentence fits its facts. */
export function wordBringMove(request: {
  seed: string;
  move: BringMove;
  speakerId: PersonId;
  traits: Readonly<Record<string, number>>;
  facts: Record<string, Fact>;
  momentKey: string;
  fallbackSourceId: string;
  words?: BringWords;
}): RenderedLine | null {
  const words = request.words ?? BRING_IT_UP_WORDS;
  const { move } = request;
  const part = move.part === "change" ? "change" : `blame:${move.how}`;
  const variants =
    move.part === "change"
      ? (words.changes[move.eventKind] ?? [])
      : words.blame[move.named ? move.how : "unknown"];
  return renderLine({
    seed: request.seed,
    surface: "dialogue",
    holderId: request.speakerId,
    bankKey: `bring-it-up:${part}`,
    version: words.version,
    variants,
    facts: request.facts,
    momentKey: `${request.momentKey}:${part}`,
    fallbackSourceId: request.fallbackSourceId,
    voice: { traits: request.traits, register: "conversation" },
  });
}
