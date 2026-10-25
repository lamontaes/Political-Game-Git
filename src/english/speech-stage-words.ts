/**
 * The English engine's half of the speech the player builds (owner, Oct 15:
 * the Suzerain example): the authored pieces of
 * `data/english/parts/speech-stages.json`, by stage role, that a speech may
 * be worded from. The director's speech builder says which stage and subject
 * comes next and fills the facts; it never reads the bank (CTO, Oct 19: two
 * layers under one contract). Pieces the owner's grades hold back are left
 * out.
 */
import stagesJson from "../../data/english/parts/speech-stages.json" with { type: "json" };
import type { PersonId } from "../core2/types";
import { heldByGrades } from "./english-grades";
import {
  renderLine,
  type Fact,
  type RenderedLine,
  type Variant,
} from "./bank-line";

export type { Fact };

interface BankPart {
  key: string;
  text: string;
  uses: { subject: string; role: string }[];
  shippable: boolean;
}
const BANK = stagesJson as unknown as { parts: BankPart[] };

/** The bank's version, for the renderer's stable pick. */
export const SPEECH_STAGES_VERSION = "words-speech-stages-v1";

/**
 * The pieces that may word one stage role ("opener", "core:work", ...), as
 * renderer variants. Play offers only shipped pieces. A grading page
 * (`heldFirst`) offers the held ones wherever one fits, so the owner hears
 * each in a real speech; a stage no held piece fits keeps its shipped pieces.
 */
export function speechStageVariants(
  role: string,
  heldFirst = false,
): Variant[] {
  const fits = (part: BankPart) =>
    !heldByGrades(part.key) &&
    part.uses.some((use) => use.subject === "stage" && use.role === role);
  const shipped = BANK.parts.filter((part) => part.shippable && fits(part));
  const held = heldFirst
    ? BANK.parts.filter((part) => !part.shippable && fits(part))
    : [];
  return (held.length ? held : shipped).map((part) => ({
    key: part.key,
    // The bank writes a slot as {name}; the renderer reads {{name}}.
    text: part.text.replace(/\{(\w+)\}/g, "{{$1}}"),
  }));
}

/** The pieces that may word a stage role, by key: each is offered as its own choice at an edge of the speech. */
export function speechStagePieces(role: string, heldFirst = false): string[] {
  return speechStageVariants(role, heldFirst).map((variant) => variant.key);
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
  heldFirst?: boolean;
  pieceKey?: string;
}): RenderedLine | null {
  const variants = speechStageVariants(request.role, request.heldFirst).filter(
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
