import type { PoseArtIndex } from "./pose-families";
import type { CharacterComponentLibrary } from "./character-components";
import type { RuntimeVisualLibrary } from "./visual-integration";
import {
  PEOPLE_VISUAL4_CHARACTER_LIBRARY,
  PEOPLE_VISUAL4_POSE_ART,
  PEOPLE_VISUAL4_VISUAL_LIBRARY,
} from "./people-visual4-review";
import { DEFAULT_DATABASE_NAME } from "./browser-world-repository";
import { gameBuildProfile, type GameBuildProfile } from "./build-profile";
import { ageOnDate, makeIsoDate } from "../simulation/dates";

/**
 * Candidate-art preview for development and the labelled internal
 * art-review package. Production builds (`DEV=false` and the production
 * profile) cannot select it from a URL.
 */

export type ArtPreviewMode = "production" | "candidate-review";

export const ART_PREVIEW_PARAMETER = "art-preview";
export const ART_PREVIEW_VALUE = "candidate";

export const ART_PREVIEW_LABEL =
  "Development art preview — unreleased candidate art, not approved";

export const INTERNAL_ART_REVIEW_LABEL =
  "Internal art review — unreleased candidate art, not approved";

export interface ArtPreviewLibraries {
  readonly characters: CharacterComponentLibrary;
  readonly visuals: RuntimeVisualLibrary;
  readonly poseArt: PoseArtIndex;
}

export function candidatePreviewAllowed(
  development: boolean,
  profile: GameBuildProfile = "production",
): boolean {
  return development || profile === "internal-art-review";
}

/**
 * The mode this page is in.
 *
 * An internal-art-review compiled package is itself the labelled exception,
 * so it does not require the development query flag. Ordinary production
 * cannot opt in from the address bar.
 */
export function artPreviewMode(
  search: string,
  options: {
    readonly development: boolean;
    readonly profile?: GameBuildProfile;
  },
): ArtPreviewMode {
  const profile = options.profile ?? gameBuildProfile();
  if (profile === "internal-art-review") return "candidate-review";
  if (!options.development) return "production";
  const requested = new URLSearchParams(search).get(ART_PREVIEW_PARAMETER);
  return requested === ART_PREVIEW_VALUE ? "candidate-review" : "production";
}

export function artPreviewLibraries(
  mode: ArtPreviewMode,
): ArtPreviewLibraries | null {
  if (mode !== "candidate-review") return null;
  return {
    characters: PEOPLE_VISUAL4_CHARACTER_LIBRARY,
    visuals: PEOPLE_VISUAL4_VISUAL_LIBRARY,
    poseArt: PEOPLE_VISUAL4_POSE_ART,
  };
}

export const PREVIEW_MINIMUM_AGE = 18;

export function previewArtRefusal(
  person: { readonly birthDate?: string | null; readonly id: string },
  currentDate: string,
): string | null {
  if (!person.birthDate) return "candidate-bank: no birth date to check age";
  let years: number;
  try {
    years = ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(currentDate));
  } catch {
    return "candidate-bank: birth date is not a date";
  }
  if (years < PREVIEW_MINIMUM_AGE) {
    return `candidate-bank has no child body: this person is ${years}, and every banked review body is an adult body`;
  }
  return null;
}

export function previewDatabaseName(
  mode: ArtPreviewMode,
  base: string = DEFAULT_DATABASE_NAME,
): string {
  return mode === "candidate-review" ? `${base}-art-preview` : base;
}

export function artPreviewBanner(mode: ArtPreviewMode): string | null {
  if (mode !== "candidate-review") return null;
  return gameBuildProfile() === "internal-art-review"
    ? INTERNAL_ART_REVIEW_LABEL
    : ART_PREVIEW_LABEL;
}
