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
