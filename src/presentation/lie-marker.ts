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
