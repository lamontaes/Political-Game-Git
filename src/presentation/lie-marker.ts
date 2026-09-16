/**
 * Lie marker seam (OCD-UI-009, UI DECISION FOLLOW-THROUGH).
 *
 * A choice is labelled "Lie" only when the choice itself declares that the
 * player means to deceive. Being wrong, being unsure, or saying something a
 * listener later doubts is not a lie, and the interface never infers intent
 * from how a claim turned out.
 *
 * No producer declares this intent yet: every current conversation choice
 * leaves `truthIntent` undefined, so no marker is shown. A producer that adds
 * deliberate deception sets `truthIntent: "deliberate-deception"` on the
 * option it offers.
 */
export type ChoiceTruthIntent = "sincere" | "deliberate-deception";

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
