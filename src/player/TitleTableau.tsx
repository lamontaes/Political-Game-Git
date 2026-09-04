import { useMemo, useRef, type CSSProperties, type ReactNode } from "react";

import { requireSceneAnchor } from "../presentation/scene-registry";
import type { TitlePresentation } from "../presentation/title-tableau";
import { PRODUCTION_VISUAL_LIBRARY } from "../presentation/visual-integration";
import { useRasterTier } from "./useRasterTier";
import { useSceneCoverTransform } from "./useSceneTransform";

/**
 * The title screen's backdrop.
 *
 * It paints whatever `resolveTitlePresentation` decided and nothing else: it
 * chooses no room, reads no save and knows no capability. The whole component
 * is a switch over the four rungs of the fallback ladder, which is why there
 * is no code path here that could put a character somewhere the resolver did
 * not put them.
 *
 * A missing plate is a first-class outcome, not an error. When the resolved
 * scene has no registered raster — or when the ladder fell all the way to the
 * typographic rung — this renders a plain painted ground and the title screen
 * on top of it reads exactly as it did before any art existed.
 */

const NO_PLATE_KINDS = new Set(["typographic"]);

function TitleStage({
  presentation,
}: {
  readonly presentation: TitlePresentation;
}) {
  const scene = presentation.scene;
  const viewportRef = useRef<HTMLDivElement>(null);
  // The hooks below are unconditional: a scene with no plate still has a
  // camera, and bailing out early here would make the hook order depend on
  // whether art happened to exist.
  const plate = scene?.plate ?? { width: 1376, height: 768 };
  const camera = useMemo(
    () =>
      scene?.camera ?? {
        minimumAspectRatio: 1.5,
        maximumAspectRatio: 12 / 5,
        horizontalFocus: 0.5,
        verticalFocus: 0.7,
      },
    [scene],
  );
  // A backdrop covers rather than fits: see `resolveCoverTransform`.
  const transform = useSceneCoverTransform(viewportRef, plate, camera);

  const environment = scene?.raster
    ? PRODUCTION_VISUAL_LIBRARY.get(scene.raster.assetId)
    : undefined;
  const tier = useRasterTier(
    scene?.raster?.ladder ?? null,
    environment?.tierUrls ?? null,
    transform.renderedSceneWidth,
    transform.devicePixelRatio,
    transform.viewport,
  );

  /**
   * Where an outline stands, when the resolver asked for one. Read from the
   * scene's own anchor, never from a number chosen to make the shape look
   * placed.
   */
  const outline = useMemo(() => {
    if (presentation.kind !== "silhouette-in-tableau") return null;
    if (!scene || !presentation.heroAnchorId) return null;
    const anchor = requireSceneAnchor(scene, presentation.heroAnchorId);
    return {
      leftPercent: anchor.xPercent,
      floorPercent: anchor.contactFloorYPercent,
    };
  }, [presentation.kind, presentation.heroAnchorId, scene]);

  return (
    <div
      ref={viewportRef}
      className="title-tableau-stage"
      data-testid="title-tableau-stage"
      data-title-kind={presentation.kind}
      data-scene-id={scene?.sceneId ?? ""}
      data-tableau-id={presentation.tableau?.tableauId ?? ""}
      aria-hidden="true"
    >
      <div
        className="scene-camera title-tableau-camera"
        data-testid="title-tableau-camera"
        data-painted-tier={tier.paintedWidth ?? ""}
        style={
          {
            width: `${plate.width}px`,
            height: `${plate.height}px`,
            transform: `translate3d(${transform.xOffset}px, ${transform.yOffset}px, 0) scale(${transform.uniformScale})`,
          } satisfies CSSProperties
        }
      >
        {tier.paintedUrl ? (
          <img
            className="scene-environment-art"
            src={tier.paintedUrl}
            alt=""
            draggable="false"
            data-testid="title-tableau-plate"
          />
        ) : null}
        {outline ? (
          /**
           * Deliberately not a person. It is a soft column standing on the
           * anchor's own floor line, marking that somebody would be here if
           * there were art of them. The copy beside it says so in words.
           */
          <div
            className="title-tableau-outline"
            data-testid="title-tableau-outline"
            style={
              {
                left: `${outline.leftPercent}%`,
                top: `${outline.floorPercent}%`,
              } satisfies CSSProperties
            }
          />
        ) : null}
      </div>
    </div>
  );
}

export function TitleTableau({
  presentation,
  children,
}: {
  readonly presentation: TitlePresentation;
  readonly children: ReactNode;
}) {
  const hasPlate =
    !NO_PLATE_KINDS.has(presentation.kind) &&
    presentation.scene?.raster !== null &&
    presentation.scene?.raster !== undefined;

  return (
    <div
      className={
        hasPlate ? "title-tableau title-tableau--art" : "title-tableau"
      }
      data-testid="title-tableau"
      data-has-plate={hasPlate ? "true" : "false"}
      data-title-kind={presentation.kind}
    >
      {NO_PLATE_KINDS.has(presentation.kind) ? null : (
        <TitleStage presentation={presentation} />
      )}
      <div className="title-tableau-content">{children}</div>
    </div>
  );
}
