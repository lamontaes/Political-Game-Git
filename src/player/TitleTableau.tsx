import { EngineFigure } from "./EnginePerson";
import { MaterialImage } from "./ModularCharacter";
import { scenePlateClips } from "../presentation/scene-occlusion";
import type { PlacedScenePerson } from "../presentation/life-scene-people";
import type { RuntimeVisualLibrary } from "../presentation/visual-integration";
import { useMemo, useRef, type CSSProperties, type ReactNode } from "react";

import { requireSceneAnchor } from "../presentation/scene-registry";
import type { TitlePresentation } from "../presentation/title-tableau";
import {
  titleCameraClassName,
  titleStageDrifts,
  type TitleStageRole,
} from "../presentation/title-ambient";
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
  role,
  drifting,
  hero,
  visualLibrary,
}: {
  readonly hero?: PlacedScenePerson | null;
  readonly visualLibrary: RuntimeVisualLibrary;
  readonly presentation: TitlePresentation;
  /**
   * What this stage is doing. `showing` is the ordinary state and does not
   * animate — a room that faded in every time the screen mounted would mean
   * the front door of the game spends its first second and a half arriving.
   * `arriving` and `leaving` exist only for the length of a crossfade.
   */
  readonly role: TitleStageRole;
  readonly drifting: boolean;
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
    ? visualLibrary.get(scene.raster.assetId)
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
      className={`title-tableau-stage title-tableau-stage--${role}`}
      data-testid={
        role === "leaving"
          ? "title-tableau-stage-leaving"
          : "title-tableau-stage"
      }
      data-title-kind={presentation.kind}
      data-scene-id={scene?.sceneId ?? ""}
      data-tableau-id={presentation.tableau?.tableauId ?? ""}
      data-drifting={drifting ? "true" : "false"}
      aria-hidden="true"
    >
      <div
        className={titleCameraClassName(drifting)}
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
        <div className="title-tableau-motion">
          {tier.paintedUrl ? (
            <img
              className="scene-environment-art"
              src={tier.paintedUrl}
              alt=""
              draggable="false"
              data-testid="title-tableau-plate"
            />
          ) : null}
          {tier.paintedUrl &&
          hero &&
          presentation.kind === "hero-in-tableau" ? (
            <div
              style={{ position: "absolute", inset: 0 }}
              data-testid="title-hero"
              data-person-id={hero.personId}
              data-pose-id={hero.sourcePoseId}
            >
              {[false, true].map((front) => {
                // Only furniture standing nearer the camera than the hero's
                // feet hides the hero: a table the hero stands in front of
                // must not be drawn over them.
                const heroFloor = hero.topPercent + hero.heightPercent;
                const masks = scenePlateClips(scene)
                  .filter((clip) => clip.baseYPercent > heroFloor)
                  .map((clip) => clip.maskUrl);
                return (
                  <div
                    key={String(front)}
                    className="title-hero-layers"
                    data-contact-layer={String(front)}
                    // The layer fills the plate: a mask sized "100% 100%"
                    // on a layer with no height hides everything in it.
                    style={
                      !front && masks.length
                        ? {
                            position: "absolute",
                            inset: 0,
                            maskImage: [
                              "linear-gradient(black, black)",
                              ...masks.map((url) => `url("${url}")`),
                            ].join(", "),
                            maskComposite: [
                              "subtract",
                              ...masks.map(() => "add"),
                            ].join(", "),
                            maskSize: "100% 100%",
                            maskRepeat: "no-repeat",
                          }
                        : { position: "absolute", inset: 0 }
                    }
                  >
                    {!front && hero.engine ? (
                      <div
                        style={{
                          position: "absolute",
                          left: `${hero.leftPercent}%`,
                          top: `${hero.topPercent}%`,
                          width: `${hero.widthPercent}%`,
                          height: `${hero.heightPercent}%`,
                        }}
                      >
                        <EngineFigure
                          recipe={hero.engine}
                          className="title-hero-art title-hero-engine"
                          testId="title-hero-engine"
                        />
                      </div>
                    ) : null}
                    {hero.layers
                      .filter((layer) =>
                        layer.kind === "accessory" ? front : !front,
                      )
                      .map((layer) => (
                        <MaterialImage
                          key={layer.assetId}
                          assetId={layer.assetId ?? ""}
                          drawnIds={hero.layers.flatMap((l) =>
                            l.assetId ? [l.assetId] : [],
                          )}
                          className="title-hero-art"
                          data-kind={layer.kind}
                          data-asset-id={layer.assetId}
                          src={layer.url}
                          alt=""
                          draggable={false}
                          style={{
                            position: "absolute",
                            left: `${layer.leftPercent}%`,
                            top: `${layer.topPercent}%`,
                            width: `${layer.widthPercent}%`,
                            height: `${layer.heightPercent}%`,
                          }}
                        />
                      ))}
                  </div>
                );
              })}
            </div>
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
    </div>
  );
}

/** Every place picture is painted at this size (art/backdrops). */
const PICTURE_PLATE = { width: 1672, height: 941 } as const;
const PICTURE_CAMERA = {
  minimumAspectRatio: 1.5,
  maximumAspectRatio: 12 / 5,
  horizontalFocus: 0.5,
  verticalFocus: 0.62,
} as const;

/**
 * One place picture from the civic rotation, covering the window the same way
 * a registered room does, with the returning player standing in front of it
 * when the resolver put them there. Nothing here chooses the picture.
 */
function PictureStage({
  presentation,
  role,
  drifting,
}: {
  readonly presentation: TitlePresentation;
  readonly role: TitleStageRole;
  readonly drifting: boolean;
}) {
  const picture = presentation.picture!;
  const hero = presentation.pictureHero ?? null;
  const viewportRef = useRef<HTMLDivElement>(null);
  const transform = useSceneCoverTransform(
    viewportRef,
    PICTURE_PLATE,
    PICTURE_CAMERA,
  );
  return (
    <div
      ref={viewportRef}
      className={`title-tableau-stage title-tableau-stage--${role}`}
      data-testid={
        role === "leaving"
          ? "title-tableau-stage-leaving"
          : "title-tableau-stage"
      }
      data-title-kind={hero ? "hero-in-tableau" : presentation.kind}
      data-scene-id={`picture:${picture.place}`}
      data-place={picture.place}
      data-civic-kind={picture.kind}
      data-tableau-id={`picture:${picture.place}`}
      data-drifting={drifting ? "true" : "false"}
      aria-hidden="true"
    >
      <div
        className={titleCameraClassName(drifting)}
        data-testid="title-tableau-camera"
        data-painted-tier={PICTURE_PLATE.width}
        style={
          {
            width: `${PICTURE_PLATE.width}px`,
            height: `${PICTURE_PLATE.height}px`,
            transform: `translate3d(${transform.xOffset}px, ${transform.yOffset}px, 0) scale(${transform.uniformScale})`,
          } satisfies CSSProperties
        }
      >
        <div className="title-tableau-motion">
          <img
            className="scene-environment-art"
            src={picture.url}
            alt=""
            draggable="false"
            data-testid="title-tableau-plate"
            style={{
              width: "100%",
              height: "100%",
              display: "block",
              objectFit: "cover",
            }}
          />
          {hero ? (
            <div
              data-testid="title-hero"
              data-person-id={hero.personId}
              style={{
                position: "absolute",
                left: `${hero.leftPercent}%`,
                top: `${hero.topPercent}%`,
                width: `${hero.widthPercent}%`,
                height: `${hero.heightPercent}%`,
              }}
            >
              <EngineFigure
                recipe={hero.engine}
                className="title-hero-art title-hero-engine"
                testId="title-hero-engine"
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** A registered room or a place picture, whichever the presentation holds. */
function AnyStage(props: {
  readonly presentation: TitlePresentation;
  readonly role: TitleStageRole;
  readonly drifting: boolean;
  readonly visualLibrary: RuntimeVisualLibrary;
  readonly hero?: PlacedScenePerson | null;
}) {
  return props.presentation.picture ? (
    <PictureStage
      presentation={props.presentation}
      role={props.role}
      drifting={props.drifting}
    />
  ) : (
    <TitleStage {...props} />
  );
}

/**
 * PACKET 77 SEAM. Three props were added and no architecture was.
 *
 * `leaving` is the room being replaced, painted underneath for as long as the
 * crossfade lasts; `drifting` is the viewer's motion preference, arriving as a
 * boolean because a component should not be reading media queries; `cycleKey`
 * remounts the arriving stage so its fade-in animation actually runs rather
 * than being skipped because React reused the element.
 *
 * The caller decides all three. Nothing here knows what a cycle is, how long a
 * hold is, or which room comes next.
 */
export function TitleTableau({
  presentation,
  children,
  leaving = null,
  drifting = false,
  cycleKey = "still",
  leavingCycleKey = null,
  hero = null,
  illustration = null,
  visualLibrary = PRODUCTION_VISUAL_LIBRARY,
}: {
  readonly hero?: PlacedScenePerson | null;
  readonly illustration?: {
    readonly url: string;
    readonly width: number;
    readonly height: number;
    readonly assetId: string;
  } | null;
  readonly visualLibrary?: RuntimeVisualLibrary;
  readonly presentation: TitlePresentation;
  readonly children: ReactNode;
  readonly leaving?: TitlePresentation | null;
  readonly drifting?: boolean;
  readonly cycleKey?: string;
  /**
   * The key the outgoing stage had while it was current. Reusing it is what
   * lets React move that exact decoded image and camera into the leaving slot
   * instead of destroying it one render before the replacement has painted.
   */
  readonly leavingCycleKey?: string | null;
}) {
  const hasPlate =
    Boolean(illustration) ||
    Boolean(presentation.picture) ||
    (!NO_PLATE_KINDS.has(presentation.kind) &&
      presentation.scene?.raster !== null &&
      presentation.scene?.raster !== undefined);

  return (
    <div
      className={
        hasPlate
          ? "title-tableau title-tableau--art front-door"
          : "title-tableau front-door"
      }
      data-testid="title-tableau"
      data-has-plate={hasPlate ? "true" : "false"}
      data-title-kind={presentation.kind}
      data-motion={drifting ? "drift" : "reduced"}
    >
      {illustration ? (
        <div
          className="title-tableau-stage title-tableau-stage--showing"
          aria-hidden="true"
        >
          <div className="title-tableau-motion">
            <img
              className="pg-title-establishing"
              src={illustration.url}
              width={illustration.width}
              height={illustration.height}
              alt=""
              data-asset-id={illustration.assetId}
              data-testid="title-establishing-plate"
            />
          </div>
        </div>
      ) : null}
      {!illustration && leaving && !NO_PLATE_KINDS.has(leaving.kind) ? (
        <AnyStage
          key={leavingCycleKey ?? `leaving:${cycleKey}`}
          visualLibrary={visualLibrary}
          presentation={leaving}
          role="leaving"
          drifting={titleStageDrifts("leaving", drifting)}
        />
      ) : null}
      {illustration || NO_PLATE_KINDS.has(presentation.kind) ? null : (
        <AnyStage
          key={cycleKey}
          visualLibrary={visualLibrary}
          hero={hero}
          presentation={presentation}
          role={leaving ? "arriving" : "showing"}
          drifting={titleStageDrifts(
            leaving ? "arriving" : "showing",
            drifting,
          )}
        />
      )}
      <div className="title-tableau-content">{children}</div>
    </div>
  );
}
