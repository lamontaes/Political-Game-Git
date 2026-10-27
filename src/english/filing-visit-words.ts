/**
 * The English engine's half of the filing visit (golden path step 3). The
 * director's visit (`src/director/filing-visit.ts`) says which move each line
 * makes (the clerk's greeting, the office the player names, the terms, a rule
 * that stops the filing, the player's answer), who says it and the facts from
 * the records; this file picks the mined clerk sentence that words it and
 * renders it.
 */
import type { PersonId } from "../core2/types";
import {
  renderLine,
  type Fact,
  type RenderedLine,
  type Variant,
} from "./bank-line";
import { filingWordsFromBank } from "./mined/filing-bank";

export type { Fact };

export interface VisitWords {
  version: string;
  greet: Variant[];
  pick: Variant[];
  terms: Variant[];
  rules: Readonly<Record<string, Variant[]>>;
  accept: Variant[];
}
/** The default words are the mined clerk bank's. */
export const FILING_VISIT_WORDS: VisitWords = filingWordsFromBank();

/**
 * A move of the visit: the clerk's greeting, terms and each unmet rule
 * (`rule:<rule>`), the player's pick of an office, and their answer (`accept`
 * when a rule stops the filing, `file` when nothing does).
 */
export type FilingMove =
  "greet" | "pick" | "terms" | `rule:${string}` | "accept" | "file";

const variantsFor = (words: VisitWords, move: FilingMove) =>
  move === "greet"
    ? words.greet
    : move === "pick"
      ? words.pick
      : move === "terms"
        ? words.terms
        : move.startsWith("rule:")
          ? words.rules[move.slice("rule:".length)]
          : words.accept;

/** Words one move of the visit, or null when no sentence fits its facts. */
export function wordFilingMove(request: {
  seed: string;
  move: FilingMove;
  speakerId: PersonId;
  fallbackSourceId: PersonId;
  facts: Record<string, Fact>;
  momentKey: string;
  stage?: string;
  words?: VisitWords;
}): RenderedLine | null {
  const words = request.words ?? FILING_VISIT_WORDS;
  return renderLine({
    seed: request.seed,
    surface: "dialogue",
    holderId: request.speakerId,
    bankKey: `filing-visit:${request.move}`,
    version: words.version,
    variants: variantsFor(words, request.move),
    facts: request.facts,
    momentKey: request.momentKey,
    ...(request.stage ? { stage: request.stage } : {}),
    fallbackSourceId: request.fallbackSourceId,
  });
}
