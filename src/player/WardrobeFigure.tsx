import { ENGINE_PEOPLE29_CHARACTER_LIBRARY } from "../presentation/engine-people29-review";
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
import {
  resolvePose41,
  type Pose41Resolution,
} from "../presentation/pose41-adapter";
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
  let effectivePose = supportedPoses.includes(pose)
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
    const buildPlan = (poseFamily: string) =>
      buildCharacterRenderPlan({
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
          poseFamily,
          depth: 1,
          bodyWidthPercent: fillPreview ? 90 : 70,
        },
      });
    let plan = buildPlan("standing-neutral");
    const prepared = new Map<
      string,
      Extract<Pose41Resolution, { status: "ready" }>
    >();
    if (plan.complete) {
      const idOf = (kind: string) =>
        plan.layers.find((layer) => layer.kind === kind)?.assetId;
      for (const candidatePose of [
        "standing-listening",
        "seated-guest-neutral",
      ] as const) {
        const source = resolvePose41({
          pose: candidatePose,
          bodyAssetId: idOf("body") ?? "",
          headAssetId: idOf("head") ?? "",
          hairAssetId: idOf("hair-front") ?? null,
          outfitAssetIds: plan.layers
            .filter((layer) =>
              [
                "top",
                "bottom",
                "footwear",
                "accessory",
                "eyewear",
                "facial-hair",
              ].includes(layer.kind),
            )
            .map((layer) => layer.assetId),
          // Only exact private component IDs can match the optional private bank.
          candidatePreview:
            libraries.characters === ENGINE_PEOPLE29_CHARACTER_LIBRARY,
        });
        if (source.status === "ready") {
          prepared.set(candidatePose, source);
          if (!supportedPoses.includes(candidatePose))
            supportedPoses.push(candidatePose);
        }
      }
    }
    effectivePose = supportedPoses.includes(pose)
      ? pose
      : (supportedPoses[0] ?? "standing-neutral");
    const source = prepared.get(effectivePose);
    if (source) {
      const box = plan.box;
      plan = {
        ...plan,
        poseFamily: effectivePose,
        layers: source.layers.map((layer) => ({
          assetId: layer.assetId,
          kind: layer.kind,
          slotId: layer.kind,
          layer: layer.layer,
          released: false,
          url: layer.url,
          hash: layer.sha256,
          attachmentAnchorId: null,
          leftPercent:
            box.leftPercent +
            (layer.x / source.canvas.width) * box.widthPercent,
          topPercent:
            box.topPercent +
            (layer.y / source.canvas.height) * box.heightPercent,
          widthPercent: (layer.width / source.canvas.width) * box.widthPercent,
          heightPercent:
            (layer.height / source.canvas.height) * box.heightPercent,
          fit: null,
          bands: null,
        })),
      };
    } else if (effectivePose !== "standing-neutral")
      plan = buildPlan(effectivePose);
    supportsSmile = plan.layers.some(
      (layer) =>
        layer.kind === "head" &&
        PREPARED_FAMILIES.some((family) =>
          family.parts.some(
            (part) =>
              part.id === layer.assetId && part.expressionVariants?.smile,
          ),
        ),
    );
    content = plan.complete ? (
      // The owning surface sizes the stage in CSS (creator versus outfit dialog).
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
      <div
        style={
          fillPreview
            ? {
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: "0.5rem",
                fontSize: "0.75rem",
              }
            : undefined
        }
      >
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
              ...(supportedPoses.includes("standing-listening")
                ? [
                    {
                      value: "standing-listening",
                      label: "Listening",
                      disabled: false,
                    },
                  ]
                : []),
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
                setExpression(
                  event.target.value === "smile" ? "smile" : "neutral",
                )
              }
              options={[
                { value: "neutral", label: "Neutral", disabled: false },
                { value: "smile", label: "Smile", disabled: false },
              ]}
            />
          </label>
        ) : null}
      </div>
      {content}
    </section>
  );
}
