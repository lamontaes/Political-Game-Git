/**
 * Which mined wordings fit a line before one is picked (the English engine's
 * half of a conversation move): a sentence opening with "she" is for a woman,
 * one naming a relative ("my father") is for that relative, and one that
 * needs a fact is for a moment that has it. The director names the situation
 * and the move; this chooses the pieces that can voice it.
 */

/** The parts of a mined wording the fit reads. */
export interface FitMove {
  key: string;
  part?: string;
  text: string;
  requiresFacts?: string[];
  /** Whom the sentence speaks of, when it opens with a pronoun. */
  pronoun?: "he" | "she" | "they";
}

const RELATION_IN_TEXT = /\b(wife|husband|[a-z]+)\b/gi;

/** The pronoun a person is spoken of with; anyone else is "they". */
export function pronounFor(gender: string | undefined): "he" | "she" | "they" {
  return gender === "male" ? "he" : gender === "female" ? "she" : "they";
}

/**
 * The wordings that fit the person a line speaks of and the facts the moment
 * has. `relationWords` is every word that names a relative; `relationWord` is
 * the one that names this person to the speaker, if any.
 */
export function fitMoves<T extends FitMove>(
  moves: readonly T[] | undefined,
  context: {
    /** Whether the line speaks of a person, and their gender if so. */
    about: { gender?: string } | undefined;
    relationWord: string | undefined;
    relationWords: ReadonlySet<string>;
    facts: Readonly<Record<string, unknown>>;
  },
): T[] | undefined {
  if (!moves) return undefined;
  const pronoun = pronounFor(context.about?.gender);
  return moves.filter((move) => {
    if (move.requiresFacts?.some((key) => !context.facts[key])) return false;
    if (move.pronoun && (!context.about || move.pronoun !== pronoun))
      return false;
    const named = [...move.text.matchAll(RELATION_IN_TEXT)]
      .map((match) => match[1]!.toLowerCase())
      .filter(
        (word) =>
          context.relationWords.has(word) || /^(?:wife|husband)$/.test(word),
      );
    return named.every((word) => word === context.relationWord);
  });
}

/** The key a wording is told apart by: its choice, and its part when the choice does not end with it. */
export function moveVariantKey(move: FitMove): string {
  return move.part && !move.key.endsWith(move.part)
    ? `${move.key}.${move.part}`
    : move.key;
}
