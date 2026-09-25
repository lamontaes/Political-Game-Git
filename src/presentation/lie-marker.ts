/**
 * Lie marker seam (OCD-UI-009, UI DECISION FOLLOW-THROUGH).
 *
 * A choice is labeled "Lie" only when the choice itself declares that the
 * player means to deceive. Being wrong, being unsure (`"uncertain"`, an
 * answer from memory), or saying something a listener later doubts is not a
 * lie, and the interface never infers intent from how a claim turned out.
 *
 * The conversation producer (PROSE) sets `truthIntent` only on answers that
 * carry a proposition; ordinary lines and evasions leave it undefined, and
 * only `"deliberate-deception"` shows the marker.
 */
export type ChoiceTruthIntent =
  "sincere" | "deliberate-deception" | "uncertain";

export interface ChoiceTruthDeclaration {
  readonly truthIntent?: ChoiceTruthIntent;
}

export interface LieMarker {
  readonly label: "Lie";
  readonly description: string;
}

export function lieMarkerFor(choice: ChoiceTruthDeclaration): LieMarker | null {
  return choice.truthIntent === "deliberate-deception"
    ? {
        label: "Lie",
        description: "You would be saying this knowing it is not true.",
      }
    : null;
}

/**
 * A lie is a recorded alternative to something this person could say now.
 * The producer owns both the words and the consequence; the UI only switches
 * which offered replies are visible. Unpaired lies are additional replies,
 * and several lies may replace the same ordinary reply.
 */
export function repliesForLieMode<
  T extends ChoiceTruthDeclaration & {
    readonly key: string;
    readonly lieVariantOf?: string;
  },
>(choices: readonly T[], lieMode: boolean): T[] {
  const lies = choices.filter(
    (choice) => choice.truthIntent === "deliberate-deception",
  );
  if (!lieMode || lies.length === 0)
    return choices.filter(
      (choice) => choice.truthIntent !== "deliberate-deception",
    );
  const replacements = new Set(
    lies.map((choice) => choice.lieVariantOf).filter(Boolean),
  );
  return choices.filter(
    (choice) =>
      choice.truthIntent === "deliberate-deception" ||
      !replacements.has(choice.key),
  );
}

export function hasLieReply(
  choices: readonly ChoiceTruthDeclaration[],
): boolean {
  return choices.some(
    (choice) => choice.truthIntent === "deliberate-deception",
  );
}
