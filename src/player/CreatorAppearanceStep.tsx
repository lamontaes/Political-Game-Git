import { useMemo } from "react";
import type { Person } from "../simulation";
import {
  artPreviewLibraries,
  artPreviewMode,
} from "../presentation/art-preview";
import { gameBuildProfile } from "../presentation/build-profile";
import {
  listPersonWardrobeFamilies,
  type PersonWardrobePreference,
} from "../presentation/person-visual-selection";
import { appearanceFamilyLabel } from "./PersonAppearanceControls";
import {
  NORMAL_APPEARANCE_LIBRARY,
  wearableChoicesIn,
} from "./SavedAppearance";
import { WardrobeFigure } from "./WardrobeFigure";

export function CreatorAppearanceStep({
  person,
  preference,
  onPreferenceChange,
}: {
  readonly person: Person;
  readonly preference?: PersonWardrobePreference;
  readonly onPreferenceChange: (preference: PersonWardrobePreference) => void;
}) {
  const preview = artPreviewLibraries(
    artPreviewMode(
      typeof window === "undefined" ? "" : window.location.search,
      {
        development: import.meta.env.DEV,
        profile: gameBuildProfile(),
      },
    ),
  );
  const library = preview
    ? wearableChoicesIn(preview.characters)
    : NORMAL_APPEARANCE_LIBRARY;
  const families = useMemo(() => {
    try {
      return listPersonWardrobeFamilies(person, {
        library,
        poseFamily: "standing-neutral",
      });
    } catch {
      return {
        top: [] as string[],
        bottom: [] as string[],
        footwear: [] as string[],
      };
    }
  }, [person, library]);

  function choose(kind: "top" | "bottom" | "footwear", family: string) {
    onPreferenceChange({
      personId: person.id,
      families: { ...preference?.families, [kind]: family || undefined },
    });
  }

  return (
    <section data-testid="creator-stage-appearance">
      <h2>How you look</h2>
      <p className="game-note">
        Optional. Changing clothes here does not start the life or change who
        lives with you.
      </p>
      {preview ? (
        <WardrobeFigure
          person={person}
          libraries={preview}
          preference={preference}
        />
      ) : (
        <p className="game-note" data-testid="creator-appearance-no-preview">
          A standing preview is available when candidate art is loaded. Wardrobe
          choices below still apply when you begin.
        </p>
      )}
      {library.components.size === 0 ? (
        <p className="game-note">
          No released clothing is available to choose yet. You can begin with
          the default outfit.
        </p>
      ) : (
        <div className="game-fields" data-testid="creator-wardrobe-fields">
          {(["top", "bottom", "footwear"] as const).map((kind) => (
            <label key={kind}>
              {kind === "top"
                ? "Shirt"
                : kind === "bottom"
                  ? "Trousers"
                  : "Shoes"}
              <select
                data-testid={`creator-wardrobe-${kind}`}
                value={preference?.families[kind] ?? ""}
                onChange={(event) => choose(kind, event.target.value)}
              >
                <option value="">Default</option>
                {families[kind].map((family) => (
                  <option key={family} value={family}>
                    {appearanceFamilyLabel(family)}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      )}
    </section>
  );
}
