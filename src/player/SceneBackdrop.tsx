import { useMemo, useRef, type CSSProperties, type ReactNode } from "react";

import { SCENE_REGISTRY } from "../presentation/scene-registry";
import type { PlacedScenePerson } from "../presentation/life-scene-people";
import { PRODUCTION_VISUAL_LIBRARY } from "../presentation/visual-integration";
import { useRasterTier } from "./useRasterTier";
import { useSceneCoverTransform } from "./useSceneTransform";

/**
 * A registered room, painted behind a section of the page.
 *
 * #86 asked for exactly this, in its own words: "OrdinaryDayView lives in
 * PlayerGame.tsx and paints no backdrop. The seam is one `<SceneBackdrop
 * sceneId={...}>` around the existing section." This is that component, and it
 * is deliberately the smallest thing that closes the seam.
 *
 * It builds no scene architecture. The registry decides what a scene is, the
 * cover transform decides how it fills a viewport, and the tier ladder decides
 * which raster is worth decoding — all of them #86's, all of them consumed
 * here rather than reimplemented. What this adds is a container that is a
 * section rather than a page, and a fallback that is honest: an unknown scene
 * or unreleased art renders the children on the ordinary page, with nothing
 * behind them and no apology.
 */
export function SceneBackdrop({
  sceneId,
  people = [],
  children,
}: {
  readonly sceneId: string | null;
  /**
   * The generated people standing in this room, positioned by the registry's
   * own anchors. They paint in the plate's coordinate space, above the plate
   * and behind the content, and are decorative: interaction is the People rail's
   * job, so nothing here takes focus.
   */
  readonly people?: readonly PlacedScenePerson[];
  readonly children: ReactNode;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const scene = sceneId ? (SCENE_REGISTRY.scenes.get(sceneId) ?? null) : null;
  const environment = scene?.raster
    ? PRODUCTION_VISUAL_LIBRARY.get(scene.raster.assetId)
    : undefined;

  // Unconditional, like every other consumer of these hooks: a section with no
  // art still has a camera, and bailing out early would make the hook order
  // depend on whether a plate happened to exist.
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
  const transform = useSceneCoverTransform(viewportRef, plate, camera);
  const tier = useRasterTier(
    scene?.raster?.ladder ?? null,
    environment?.tierUrls ?? null,
    transform.renderedSceneWidth,
    transform.devicePixelRatio,
    transform.viewport,
  );

  const painted = Boolean(tier.paintedUrl);

  return (
    <div
      className={
        painted ? "scene-backdrop scene-backdrop--art" : "scene-backdrop"
      }
      data-testid="scene-backdrop"
      data-scene-id={scene?.sceneId ?? ""}
      data-has-plate={painted ? "true" : "false"}
    >
      <div
        ref={viewportRef}
        className="scene-backdrop-stage"
        aria-hidden="true"
      >
        <div
          className="scene-camera scene-backdrop-camera"
          data-testid="scene-backdrop-camera"
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
              data-testid="scene-backdrop-plate"
            />
          ) : null}
        </div>
      </div>
      {painted && people.length > 0 ? (
        <div
          className="scene-backdrop-people"
          data-testid="scene-people"
          aria-hidden="true"
        >
          {people.map((person) => {
            const toScreen = (percentX: number, percentY: number) => ({
              x:
                transform.xOffset +
                (percentX / 100) * plate.width * transform.uniformScale,
              y:
                transform.yOffset +
                (percentY / 100) * plate.height * transform.uniformScale,
            });
            const topLeft = toScreen(person.leftPercent, person.topPercent);
            const width =
              (person.widthPercent / 100) *
              plate.width *
              transform.uniformScale;
            const height =
              (person.heightPercent / 100) *
              plate.height *
              transform.uniformScale;
            return (
              <div
                key={person.personId}
                className="scene-person-token"
                data-testid={`scene-person-${person.personId}`}
                data-has-art={person.hasArt ? "true" : "false"}
                data-relationship={person.relationship ?? ""}
                style={
                  {
                    left: `${topLeft.x}px`,
                    top: `${topLeft.y}px`,
                    width: `${width}px`,
                    height: `${height}px`,
                  } satisfies CSSProperties
                }
              >
                {person.hasArt ? (
                  person.layers.map((layer, index) => (
                    <img
                      key={`${person.personId}-${index}`}
                      className="scene-person-art"
                      src={layer.url}
                      alt=""
                      draggable="false"
                      style={{
                        position: "absolute",
                        left: `${((layer.leftPercent - person.leftPercent) / person.widthPercent) * 100}%`,
                        top: `${((layer.topPercent - person.topPercent) / person.heightPercent) * 100}%`,
                        width: `${(layer.widthPercent / person.widthPercent) * 100}%`,
                        height: `${(layer.heightPercent / person.heightPercent) * 100}%`,
                      }}
                    />
                  ))
                ) : (
                  <span
                    className={`scene-person-figure${person.seated ? " scene-person-figure--seated" : ""}`}
                    aria-hidden="true"
                  />
                )}
                <span className="scene-person-plate">
                  <strong>{person.name}</strong>
                  {person.relationship ? (
                    <small>{person.relationship}</small>
                  ) : null}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}
      <div className="scene-backdrop-content">{children}</div>
    </div>
  );
}
