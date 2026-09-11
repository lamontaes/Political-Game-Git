import {
  createPersonRenderSnapshot,
  type PersonRenderSnapshot,
} from "../presentation/person-render-snapshot";
import { resolvePersonWardrobeContext } from "../presentation/person-visual-selection";
import { derivePersonAppearance, type World } from "../simulation";
import { createContext, useContext } from "react";
import type { PersonWardrobePreference } from "../presentation/person-visual-selection";
import { PRODUCTION_CHARACTER_LIBRARY } from "../presentation/visual-integration";
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
        appearance: person.appearance ?? derivePersonAppearance(personId),
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
export const NORMAL_APPEARANCE_LIBRARY = {
  ...PRODUCTION_CHARACTER_LIBRARY,
  components: new Map(
    [...PRODUCTION_CHARACTER_LIBRARY.components].filter(
      ([, component]) => component.released && !component.fixture,
    ),
  ),
};

export function SavedAppearanceControls(
  props: Omit<PersonAppearanceControlsProps, "library" | "poseFamily">,
) {
  return (
    <details
      className="pg-personal-section"
      data-testid="saved-appearance-controls"
    >
      <summary>Appearance and wardrobe</summary>
      {NORMAL_APPEARANCE_LIBRARY.components.size ? (
        <PersonAppearanceControls
          {...props}
          library={NORMAL_APPEARANCE_LIBRARY}
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
