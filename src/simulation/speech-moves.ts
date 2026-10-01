import type { EntityId } from "./types";

/**
 * What the speaker does in the speech, in order: the moves, not the words
 * (design D-3, step 3). The simulation decides the moves from the record and
 * the speaker's own character; the English engine words them later from this
 * same record, so the speech reads the same after Save and Continue.
 */
export type ElectionSpeechMove =
  | { readonly move: "thanks" }
  | { readonly move: "opponent"; readonly personId: EntityId }
  | { readonly move: "congratulate"; readonly personId: EntityId }
  | {
      readonly move: "lost-parent";
      readonly personId: EntityId;
      readonly kinshipId: EntityId;
      readonly deathId: EntityId;
    }
  | { readonly move: "the-work" }
  | { readonly move: "keep-going" }
  | { readonly move: "close" };

export const SPEECH_REGISTER_TAG = "speech.register:";
export const SPEECH_MOVES_TAG = "speech.moves.v1:";

/** The moves a recorded speech made, or null for a speech saved before them. */
export function speechMovesOf(
  tags: readonly string[],
): readonly ElectionSpeechMove[] | null {
  const tag = tags.find((entry) => entry.startsWith(SPEECH_MOVES_TAG));
  if (!tag) return null;
  try {
    const moves = JSON.parse(tag.slice(SPEECH_MOVES_TAG.length));
    return Array.isArray(moves) ? moves : null;
  } catch {
    return null;
  }
}
