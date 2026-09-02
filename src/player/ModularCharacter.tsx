import type { CSSProperties } from "react";

import type { CharacterRenderPlan } from "../presentation/character-render-plan";

interface ModularCharacterProps {
  readonly plan: CharacterRenderPlan;
  /** Developer-only: draw the root and attachment anchors as DOM markers. */
  readonly debugAnchors?: boolean;
  readonly testId?: string;
}

/**
 * Renders one character render plan as ordered DOM image layers inside a
 * transformed scene camera. Every layer is positioned in plate percent units
 * exactly as the pure plan computed them; this component adds no geometry.
 * Anchor markers are DOM overlays, never part of any raster.
 */
export function ModularCharacter({
  plan,
  debugAnchors = false,
  testId = "modular-character",
}: ModularCharacterProps) {
  return (
    <div
      className="modular-character"
      data-testid={testId}
      data-person-id={plan.personId}
      data-anchor-id={plan.anchorId}
      data-pose-family={plan.poseFamily}
      data-recipe-key={plan.recipeKey}
      data-appearance-seed={plan.appearanceSeed}
      data-catalog-generation={plan.catalogGeneration}
      data-pinned-by-person={plan.pinnedByPerson ? "true" : "false"}
      data-complete={plan.complete ? "true" : "false"}
      data-layer-count={plan.layers.length}
      style={{ zIndex: plan.depth } satisfies CSSProperties}
    >
      {plan.layers.map((layer, index) =>
        layer.url ? (
          <img
            key={layer.assetId}
            className={`modular-character-layer modular-character-layer--${layer.kind}`}
            src={layer.url}
            alt=""
            aria-hidden="true"
            draggable="false"
            data-testid={`${testId}-layer`}
            data-layer-index={index}
            data-layer={layer.layer}
            data-asset-id={layer.assetId}
            data-kind={layer.kind}
            data-slot-id={layer.slotId}
            data-attachment-anchor-id={layer.attachmentAnchorId ?? ""}
            style={
              {
                left: `${layer.leftPercent}%`,
                top: `${layer.topPercent}%`,
                width: `${layer.widthPercent}%`,
                height: `${layer.heightPercent}%`,
                zIndex: layer.layer,
              } satisfies CSSProperties
            }
          />
        ) : (
          <span
            key={layer.assetId}
            className="modular-character-layer modular-character-layer--missing"
            data-testid={`${testId}-missing-layer`}
            data-asset-id={layer.assetId}
            style={
              {
                left: `${layer.leftPercent}%`,
                top: `${layer.topPercent}%`,
                width: `${layer.widthPercent}%`,
                height: `${layer.heightPercent}%`,
                zIndex: layer.layer,
              } satisfies CSSProperties
            }
          />
        ),
      )}
      {debugAnchors && plan.root ? (
        <span
          className="character-anchor-marker character-anchor-marker--root"
          data-testid={`${testId}-root-marker`}
          data-marker-id={plan.root.id}
          title={`Character root: ${plan.root.id}`}
          style={
            {
              left: `${plan.root.xPercent}%`,
              top: `${plan.root.yPercent}%`,
            } satisfies CSSProperties
          }
        />
      ) : null}
      {debugAnchors
        ? plan.attachmentAnchors.map((anchor) => (
            <span
              key={anchor.id}
              className="character-anchor-marker character-anchor-marker--attachment"
              data-testid={`${testId}-attachment-marker`}
              data-marker-id={anchor.id}
              title={`Attachment anchor: ${anchor.id}`}
              style={
                {
                  left: `${anchor.xPercent}%`,
                  top: `${anchor.yPercent}%`,
                } satisfies CSSProperties
              }
            >
              <small>{anchor.id}</small>
            </span>
          ))
        : null}
    </div>
  );
}
