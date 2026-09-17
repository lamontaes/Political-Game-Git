import { resolveCompleteOutfit } from "../presentation/complete-outfit";
import { useState } from "react";
import type { Person, PersonAppearance } from "../simulation/types";
import type { ArtPreviewLibraries } from "../presentation/art-preview";
import { buildCharacterRenderPlan } from "../presentation/character-render-plan";
import {
  resolvePersonWardrobeContext,
  type PersonWardrobePreference,
} from "../presentation/person-visual-selection";
import { ModularCharacter } from "./ModularCharacter";
import { GameSelect } from "./controls/GameSelect";
import { PREPARED_FAMILIES } from "../presentation/engine-people29-data";

/** The controlled person's actual saved outfit, at a fixed full-body scale. */
export function WardrobeFigure({
  person,
  libraries,
  preference,
  pending = false,
  fillPreview = false,
}: {
  readonly person: Person;
  readonly libraries: ArtPreviewLibraries;
  readonly preference?: PersonWardrobePreference;
  readonly pending?: boolean;
  readonly fillPreview?: boolean;
}) {
  const [pose, setPose] = useState("standing-neutral");
  const [expression, setExpression] = useState<"neutral" | "smile">("neutral");
  const supportedPoses = ["standing-neutral", "seated-guest-neutral"].filter(
    (poseFamily) =>
      person.appearance &&
      resolveCompleteOutfit({
        appearance: person.appearance,
        families: person.appearance.outfit?.families ?? preference?.families,
        library: libraries.characters,
        poseFamily,
      }).ok,
  );
  const effectivePose = supportedPoses.includes(pose)
    ? pose
    : (supportedPoses[0] ?? "standing-neutral");
  let content;
  let supportsSmile = false;
  try {
    const wardrobe = preference
      ? resolvePersonWardrobeContext(person, preference, {
          library: libraries.characters,
          poseFamily: effectivePose,
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
        poseFamily: effectivePose,
        depth: 1,
        bodyWidthPercent: fillPreview ? 90 : 70,
      },
    });
    supportsSmile = plan.layers.some(
      (layer) =>
        layer.kind === "head" &&
        PREPARED_FAMILIES.some((family) =>
          family.parts.some(
            (part) => part.id === layer.assetId && part.expressionVariants?.smile,
          ),
        ),
    );
    content = plan.complete ? (
      <div className="wardrobe-figure-stage">
        <ModularCharacter
          plan={plan}
          expression={supportsSmile ? expression : "neutral"}
          testId={pending ? "outfit-pending-full-body" : "wardrobe-full-body"}
        />
      </div>
    ) : (
      <p role="status">
        This outfit needs compatible clothing before it can be previewed.
      </p>
    );
  } catch (error) {
    content = (
      <p role="status" data-diagnostic={String(error)}>
        This saved outfit is unavailable. Use the recovery choice below to
        preview compatible clothing.
      </p>
    );
  }
  return (
    <section
      className="wardrobe-figure"
      aria-label="Your outfit preview"
      data-testid={pending ? "outfit-pending-figure" : "wardrobe-figure"}
    >
      <p>
        {pending ? "Preview — not saved." : "Your saved appearance and outfit."}
      </p>
      <label className="wardrobe-figure-view">
        Outfit view{" "}
        <GameSelect
          aria-label="Outfit view"
          value={effectivePose}
          onChange={(e) => setPose(e.target.value)}
          options={[
            {
              value: "standing-neutral",
              label: "Standing",
              disabled: !supportedPoses.includes("standing-neutral"),
            },
            ...(supportedPoses.includes("seated-guest-neutral")
              ? [
                  {
                    value: "seated-guest-neutral",
                    label: "Seated",
                    disabled: false,
                  },
                ]
              : []),
          ]}
        />
      </label>
      {supportsSmile ? (
        <label className="wardrobe-figure-view">
          Expression{" "}
          <GameSelect
            aria-label="Expression preview"
            value={expression}
            onChange={(event) =>
              setExpression(event.target.value === "smile" ? "smile" : "neutral")
            }
            options={[
              { value: "neutral", label: "Neutral", disabled: false },
              { value: "smile", label: "Smile", disabled: false },
            ]}
          />
        </label>
      ) : null}
      {content}
    </section>
  );
}
