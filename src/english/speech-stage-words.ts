/**
 * The English engine's half of the speech the player builds: the authored pieces of
 * `data/english/parts/speech-stages.json`, by stage role, that a speech may
 * be worded from. The director's speech builder says which stage and subject
 * comes next and fills the facts; it never reads the bank. Pieces the owner's grades hold back are left
 * out.
 */
import stagesJson from "../../data/english/parts/speech-stages.json" with { type: "json" };
import type { PersonId } from "../core2/types";
import { admittedParts, type BankPart } from "./bank-parts";
import {
  renderLine,
  type Fact,
  type RenderedLine,
  type Variant,
} from "./bank-line";

export type { Fact };

const BANK = stagesJson as unknown as { parts: BankPart[] };

/** The bank's version, for the renderer's stable pick. */
export const SPEECH_STAGES_VERSION = "words-speech-stages-v1";

/**
 * The pieces that may word one stage role ("opener", "core:work", ...), as
 * renderer variants: every piece the owner's grades leave in.
 */
export function speechStageVariants(role: string): Variant[] {
  return admittedParts(BANK.parts, (part) =>
    part.uses.some((use) => use.subject === "stage" && use.role === role),
  ).map((part) => ({
    key: part.key,
    // The bank writes a slot as {name}; the renderer reads {{name}}.
    text: part.text.replace(/\{(\w+)\}/g, "{{$1}}"),
  }));
}

/** The pieces that may word a stage role, by key: each is offered as its own choice at an edge of the speech. */
export function speechStagePieces(role: string): string[] {
  return speechStageVariants(role).map((variant) => variant.key);
}

/**
 * Words one part of the speech from the speaker's facts, or null when no
 * piece fits them. With `pieceKey`, only that piece may word it (an opener or
 * a closer is offered piece by piece); otherwise the renderer picks among
 * every piece of the role.
 */
export function wordSpeechPart(request: {
  seed: string;
  role: string;
  speakerId: PersonId;
  facts: Record<string, Fact>;
  momentKey: string;
  pieceKey?: string;
}): RenderedLine | null {
  const variants = speechStageVariants(request.role).filter(
    (variant) => !request.pieceKey || variant.key === request.pieceKey,
  );
  return renderLine({
    seed: request.seed,
    surface: "dialogue",
    holderId: request.speakerId,
    bankKey: `speech-stages.${request.role}`,
    version: SPEECH_STAGES_VERSION,
    variants,
    facts: request.facts,
    momentKey: request.momentKey,
    fallbackSourceId: request.speakerId,
  });
}

/**
 * The parts of a speech in the order a speaker's reach takes them: someone
 * who carries talk on hears the longer, weightier parts first, someone who
 * keeps it short the plainer ones; parts of one length keep their order.
 */
export function speechPartsByReach<T extends { text: string }>(
  rows: readonly T[],
  longFirst: boolean,
): T[] {
  return rows
    .map((row, at) => ({ row, at }))
    .sort(
      (a, b) =>
        (longFirst ? -1 : 1) * (a.row.text.length - b.row.text.length) ||
        a.at - b.at,
    )
    .map(({ row }) => row);
}

/** The speech as given: its parts, in order. */
export function speechWords(parts: readonly { text: string }[]): string {
  return parts.map((row) => row.text).join(" ");
}
