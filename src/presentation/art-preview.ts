import type { PoseArtIndex } from "./pose-families";
import type { CharacterComponentLibrary } from "./character-components";
import type { RuntimeVisualLibrary } from "./visual-integration";
import {
  CANDIDATE_REVIEW_CHARACTER_LIBRARY,
  CANDIDATE_REVIEW_POSE_ART,
  CANDIDATE_REVIEW_VISUAL_LIBRARY,
} from "./visual-integration";
import { DEFAULT_DATABASE_NAME } from "./browser-world-repository";

/**
 * A LOCAL DEVELOPMENT preview of banked candidate art, in the ordinary shell.
 *
 * The refusal that shows a household member as initials is a RELEASE
 * eligibility refusal, not a missing-art one. `scripts/dev-lab/
 * trace-candidate-coverage.test.ts` measured it: against the production
 * libraries every generated adult resolves to fixture regression art, and
 * against the banked candidate review libraries the same people resolve to a
 * complete, zero-fixture plan and a standing figure with real drawable layers.
 *
 * So the art exists and the shell cannot show it, because the shell is right to
 * refuse unreleased pixels. This module is the deliberate, labelled exception:
 * an explicitly opted-into development mode that composes the SAME people
 * through the SAME compositor against the review libraries instead, so the
 * owner can look at what the bank actually contains before anything is
 * promoted.
 *
 * Three properties keep it from being a back door.
 *
 * It cannot turn on in a shipped build. The mode is read from the URL and then
 * gated on `import.meta.env.DEV`, which Vite replaces with a literal `false`
 * when it builds for production, so no address selects candidate art in
 * anything a player runs. That is a claim about what DRAWS. It is deliberately
 * not a claim about what is bundled: the review libraries were already
 * reachable from the existing character-proof route, and nothing here changes
 * what ships or what is eligible to ship.
 *
 * It promotes nothing. The review libraries are the existing lift, built in
 * memory from a separate registry file and written back nowhere; production
 * defaults are untouched, and every caller that does not ask for the preview
 * still gets the production libraries it always got.
 *
 * It writes into its own saved-game database. Opting into candidate pixels
 * must not quietly edit a life that was played on production art — a wardrobe
 * choice made against a candidate outfit would be recorded against the
 * ordinary save otherwise. `previewDatabaseName` puts the preview's lives in a
 * physically separate IndexedDB database, so the two cannot reach each other.
 */

export type ArtPreviewMode = "production" | "candidate-review";

/** The query parameter, and the one value that turns the preview on. */
export const ART_PREVIEW_PARAMETER = "art-preview";
export const ART_PREVIEW_VALUE = "candidate";

/** Said on screen, so nobody mistakes a preview for the shipped game. */
export const ART_PREVIEW_LABEL =
  "Development art preview — unreleased candidate art, not approved";

export interface ArtPreviewLibraries {
  readonly characters: CharacterComponentLibrary;
  readonly visuals: RuntimeVisualLibrary;
  readonly poseArt: PoseArtIndex;
}

/**
 * The mode this page is in.
 *
 * `development` is passed rather than read so the decision is testable without
 * a build mode, and so the one place that consults `import.meta.env.DEV` is the
 * caller in the shell.
 */
export function artPreviewMode(
  search: string,
  development: boolean,
): ArtPreviewMode {
  if (!development) return "production";
  const requested = new URLSearchParams(search).get(ART_PREVIEW_PARAMETER);
  return requested === ART_PREVIEW_VALUE ? "candidate-review" : "production";
}

/**
 * The libraries to compose against, or null for the ordinary production path.
 *
 * Null rather than the production libraries on purpose: a caller that receives
 * null passes nothing on, and every downstream default stays exactly the
 * default it was. Handing back the production libraries explicitly would make
 * every call site look like an override even when nothing is overridden.
 */
export function artPreviewLibraries(
  mode: ArtPreviewMode,
): ArtPreviewLibraries | null {
  if (mode !== "candidate-review") return null;
  return {
    characters: CANDIDATE_REVIEW_CHARACTER_LIBRARY,
    visuals: CANDIDATE_REVIEW_VISUAL_LIBRARY,
    poseArt: CANDIDATE_REVIEW_POSE_ART,
  };
}

/**
 * The youngest person the banked review bodies can honestly represent.
 *
 * The character component system carries no age class: a recipe resolves a
 * body family from an appearance seed and nothing in that path knows how old
 * anybody is. That is fine while every drawable body is a fixture nobody
 * ships, and it is not fine the moment a preview starts drawing real ones,
 * because the banked bodies are adult bodies and the compositor would put one
 * on a ten-year-old without a word.
 *
 * So the preview refuses instead, and says which coverage it is missing. This
 * is a floor for a DEVELOPMENT PREVIEW against TODAY'S bank; it is not a claim
 * about what the game's art system should model, and the day child bodies are
 * banked the refusal below is what has to be revisited.
 */
export const PREVIEW_MINIMUM_AGE = 18;

/**
 * Whether the preview may draw this person, or the reason it may not.
 *
 * Returns null when it may. `currentDate` and `birthDate` are the canonical
 * ISO dates the World already holds; an unknown birth date is a refusal rather
 * than an assumption, because guessing at somebody's age is the failure this
 * exists to prevent.
 */
export function previewArtRefusal(
  person: { readonly birthDate?: string | null; readonly id: string },
  currentDate: string,
): string | null {
  if (!person.birthDate) return "candidate-bank: no birth date to check age";
  const years =
    Number(currentDate.slice(0, 4)) - Number(person.birthDate.slice(0, 4));
  if (!Number.isFinite(years)) {
    return "candidate-bank: birth date is not a date";
  }
  if (years < PREVIEW_MINIMUM_AGE) {
    return `candidate-bank has no child body: this person is ${years}, and every banked review body is an adult body`;
  }
  return null;
}

/**
 * Which saved-game database this mode uses.
 *
 * A suffix, not a different store class: the preview exercises the real
 * persistence path, including the parts that would fail on a candidate
 * appearance, because a save/reload proof against a stub would prove nothing.
 */
export function previewDatabaseName(mode: ArtPreviewMode): string {
  return mode === "candidate-review"
    ? `${DEFAULT_DATABASE_NAME}-art-preview`
    : DEFAULT_DATABASE_NAME;
}
