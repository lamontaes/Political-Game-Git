import type { NewGameSetup } from "./new-game";
import type { PoseArtIndex } from "./pose-families";
import type { CharacterComponentLibrary } from "./character-components";
import type { RuntimeVisualLibrary } from "./visual-integration";
import {
  PEOPLE_VISUAL4_CHARACTER_LIBRARY,
  PEOPLE_VISUAL4_POSE_ART,
  PEOPLE_VISUAL4_VISUAL_LIBRARY,
} from "./people-visual4-review";
import { DEFAULT_DATABASE_NAME } from "./browser-world-repository";
import { ageOnDate, makeIsoDate } from "../simulation/dates";

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
 *
 * ## Which provider, and why this one
 *
 * These are the Visual4 libraries — the corrected registry, its compatible
 * hair, and the measured per-body garment fit bank. They were NOT what this
 * function returned when the preview was built: it returned the older
 * `CANDIDATE_REVIEW_*` lift, whose own comment states plainly that candidates
 * there are reviewed UNFITTED and that no candidate has a fit profile at all.
 *
 * So there were two candidate providers, and the better one was reachable only
 * from the developer proof route at `?view=character-proof&set=visual4`, which
 * saves to a demo World in localStorage. The life path — room, dossier,
 * wardrobe, conversation portrait, save and reload — ran on the other one. The
 * fitted figures being reviewed and the figures actually being played were
 * never the same figures.
 *
 * Measured across 48 seeded people at `standing-neutral`, the difference is
 * not cosmetic:
 *
 *   older lift   24/24 resolved, but from 2 distinct bodies, with NO fit bank
 *   Visual4      48/48 resolved, from 5 distinct bodies, fitted
 *
 * Two bodies for every generated person in the game is the coverage ceiling
 * this work exists to lift, and an unfitted garment is a garment sitting where
 * it was drawn rather than on the body wearing it.
 *
 * One provider, one answer: the proof route and the life path now compose from
 * the same library, so the gallery can no longer disagree with the game about
 * what the bank contains. The separation that matters is untouched — this is
 * still development-only, still outside every catalog generation, still in its
 * own IndexedDB database, and still nothing a shipped build can select.
 */
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
  let years: number;
  try {
    /*
     * The canonical age rule, not a second one written here.
     *
     * This subtracted calendar years, which is not somebody's age: a person
     * born in December 2008 read as 18 on the first of January 2026, three
     * hundred and fifty days before their eighteenth birthday. The guard whose
     * entire job is keeping an adult body off a minor was letting a
     * seventeen-year-old through for up to a year, and the error ran in the
     * unsafe direction every time.
     *
     * `ageOnDate` is the World's own rule. It compares the full date and it
     * already decides what a 29th-of-February birthday does in a common year,
     * which is exactly the kind of thing a private copy gets wrong quietly.
     * An unparseable date throws there, and a date this function cannot read
     * is a refusal rather than a number.
     */
    years = ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(currentDate));
  } catch {
    return "candidate-bank: birth date is not a date";
  }
  if (years < PREVIEW_MINIMUM_AGE) {
    return `candidate-bank has no child body: this person is ${years}, and every banked review body is an adult body`;
  }
  return null;
}

/**
 * Which database this mode uses, for ANY of the browser stores.
 *
 * A suffix, not a different store class: the preview exercises the real
 * persistence path, including the parts that would fail on a candidate
 * appearance, because a save/reload proof against a stub would prove nothing.
 *
 * The base name is a parameter because a life is not kept in one database.
 * The world goes in one and the shell's own per-slot state — which is where a
 * wardrobe CHOICE is recorded — goes in another, and isolating only the first
 * left the second leaking: a candidate outfit picked in the preview was
 * written into the ordinary shell store under the ordinary slot id, so an
 * opt-in development preview was editing a production save after all. Every
 * store the preview touches takes its name from here.
 */
export function previewDatabaseName(
  mode: ArtPreviewMode,
  base: string = DEFAULT_DATABASE_NAME,
): string {
  return mode === "candidate-review" ? `${base}-art-preview` : base;
}

/** New candidate lives may use the current review generation; existing replay pins win. */
export function setupForArtPreview<T extends NewGameSetup>(
  setup: T,
  mode: ArtPreviewMode,
): T {
  if (
    mode !== "candidate-review" ||
    setup.appearanceRecipeVersion !== "appearance-recipe-v2" ||
    setup.appearanceCatalogGeneration !== undefined
  )
    return setup;
  return {
    ...setup,
    appearanceCatalogGeneration:
      PEOPLE_VISUAL4_CHARACTER_LIBRARY.catalogGeneration,
  };
}
