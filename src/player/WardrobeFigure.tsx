import { useState } from "react";
import type { Person, PersonAppearance } from "../simulation/types";
import type { ArtPreviewLibraries } from "../presentation/art-preview";
import { buildCharacterRenderPlan } from "../presentation/character-render-plan";
import {
  resolvePersonWardrobeContext,
  type PersonWardrobePreference,
} from "../presentation/person-visual-selection";
import { ModularCharacter } from "./ModularCharacter";

/** The controlled person's actual saved outfit, at a fixed full-body scale. */
export function WardrobeFigure({
  person,
  libraries,
  preference,
}: {
  readonly person: Person;
  readonly libraries: ArtPreviewLibraries;
  readonly preference?: PersonWardrobePreference;
}) {
  const [pose, setPose] = useState("standing-neutral");
  let content;
  try {
    const wardrobe = preference
      ? resolvePersonWardrobeContext(person, preference, {
          library: libraries.characters,
          poseFamily: pose,
        })
      : undefined;
    const plan = buildCharacterRenderPlan({
      personId: person.id,
      appearance: person.appearance as PersonAppearance,
      library: libraries.characters,
      visualLibrary: libraries.visuals,
      wardrobe,
      plate: { width: 300, height: 560 },
      anchor: {
        id: "own-wardrobe",
        xPercent: 50,
        yPercent: 52,
        scale: 1,
        poseFamily: pose,
        depth: 1,
        bodyWidthPercent: 70,
      },
    });
    content = plan.complete ? (
      <div
        style={{
          position: "relative",
          width: 200,
          aspectRatio: "300 / 560",
          maxWidth: "100%",
        }}
      >
        <ModularCharacter plan={plan} testId="wardrobe-full-body" />
      </div>
    ) : (
      <p role="status">This outfit has no complete fit for {pose}.</p>
    );
  } catch (error) {
    content = (
      <p role="status">
        {error instanceof Error ? error.message : String(error)}
      </p>
    );
  }
  return (
    <section aria-label="Your outfit preview" data-testid="wardrobe-figure">
      <p>
        Candidate outfit — not approved. Your saved identity and clothing are
        used in every view.
      </p>
      <label>
        Outfit view{" "}
        <select
          aria-label="Outfit view"
          value={pose}
          onChange={(e) => setPose(e.target.value)}
        >
          <option value="standing-neutral">Standing</option>
          <option value="seated-guest-neutral">Seated fit check</option>
        </select>
      </label>
      {content}
    </section>
  );
}
