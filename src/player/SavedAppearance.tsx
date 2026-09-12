import {
  createPersonRenderSnapshot,
  type PersonRenderSnapshot,
} from "../presentation/person-render-snapshot";
import { resolvePersonWardrobeContext } from "../presentation/person-visual-selection";
import {
  derivePersonAppearance,
  LEGACY_APPEARANCE_RECIPE_VERSION,
  type World,
} from "../simulation";
import { createContext, useContext } from "react";
import type { PersonWardrobePreference } from "../presentation/person-visual-selection";
import {
  artPreviewLibraries,
  artPreviewMode,
} from "../presentation/art-preview";
import { PRODUCTION_CHARACTER_LIBRARY } from "../presentation/visual-integration";
import type { CharacterComponentLibrary } from "../presentation/character-components";
import {
  PersonAppearanceControls,
  type PersonAppearanceControlsProps,
} from "./PersonAppearanceControls";

const SavedAppearanceContext = createContext<
  Readonly<Record<string, PersonWardrobePreference>>
>({});
export const SavedAppearanceProvider = SavedAppearanceContext.Provider;
export function useSavedWardrobe(personId: string) {
  return useContext(SavedAppearanceContext)[personId];
}

const SavedRenderSnapshotsContext = createContext<
  Readonly<Record<string, PersonRenderSnapshot>>
>({});
export const SavedRenderSnapshotsProvider =
  SavedRenderSnapshotsContext.Provider;
export function useSavedRenderSnapshot(personId: string) {
  return useContext(SavedRenderSnapshotsContext)[personId];
}
export function savedRenderSnapshots(
  world: World,
  wardrobes: Readonly<Record<string, PersonWardrobePreference>>,
) {
  const snapshots: Record<string, PersonRenderSnapshot> = {};
  for (const personId of world.personOrder) {
    const person = world.people[personId]!;
    try {
      const wardrobe = wardrobes[personId]
        ? resolvePersonWardrobeContext(person, wardrobes[personId]!, {
            library: PRODUCTION_CHARACTER_LIBRARY,
            poseFamily: "standing-neutral",
          })
        : undefined;
      snapshots[personId] = createPersonRenderSnapshot({
        personId,
        appearance:
          person.appearance ??
          derivePersonAppearance(personId, LEGACY_APPEARANCE_RECIPE_VERSION),
        wardrobe,
        library: PRODUCTION_CHARACTER_LIBRARY,
      });
    } catch {
      // Existing portrait/scene adapters retain their explicit incompatibility refusal.
    }
  }
  return snapshots;
}

/** Catalog eligibility alone includes diagnostic fixtures; normal choices exclude them. */
export function wearableChoicesIn(
  library: CharacterComponentLibrary,
): CharacterComponentLibrary {
  return {
    ...library,
    components: new Map(
      [...library.components].filter(
        ([, component]) => component.released && !component.fixture,
      ),
    ),
  };
}

export const NORMAL_APPEARANCE_LIBRARY = wearableChoicesIn(
  PRODUCTION_CHARACTER_LIBRARY,
);

export function SavedAppearanceControls(
  props: Omit<PersonAppearanceControlsProps, "library" | "poseFamily">,
) {
  /*
   * Choose clothes out of the catalog that will actually draw them.
   *
   * This offered the production catalog and nothing else, and every component
   * released today is fixture regression art, so the filter emptied it and the
   * control said there was nothing to choose. That is a correct sentence about
   * production and a dead end in the preview: the whole point of standing a
   * person in candidate art is being able to see a different outfit on them,
   * and the one surface for doing that was the one surface the preview did not
   * reach. It now offers whichever catalog is drawing this person, so a chosen
   * garment exists in the library that composes the picture.
   *
   * Production is untouched: with no preview the library is the same filtered
   * production catalog it always was, and the same honest refusal shows when
   * that catalog has nothing approved in it.
   */
  const preview = artPreviewLibraries(
    artPreviewMode(
      typeof window === "undefined" ? "" : window.location.search,
      import.meta.env.DEV,
    ),
  );
  const library = preview
    ? wearableChoicesIn(preview.characters)
    : NORMAL_APPEARANCE_LIBRARY;
  return (
    <details
      className="pg-personal-section"
      data-testid="saved-appearance-controls"
      data-appearance-catalog={preview ? "candidate-review" : "production"}
    >
      <summary>Appearance and wardrobe</summary>
      {library.components.size ? (
        <PersonAppearanceControls
          {...props}
          library={library}
          poseFamily="standing-neutral"
        />
      ) : (
        <p>
          No approved compatible appearance choices are available in this
          catalog.
        </p>
      )}
    </details>
  );
}
