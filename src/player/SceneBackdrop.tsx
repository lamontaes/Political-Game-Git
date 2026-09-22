import "./pose41-scene.css";
import {
  sceneConversationFrame,
  type SceneConversationFrame,
} from "../presentation/scene-conversation-frame";
import { MaterialGroup, MaterialImage } from "./ModularCharacter";
import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import { SCENE_REGISTRY } from "../presentation/scene-registry";
import type { PlacedScenePerson } from "../presentation/life-scene-people";
import {
  bindSceneSurfaces,
  dynamicSurfacePayloads,
} from "../presentation/surface-binding";
import {
  EMPTY_SURFACE_PROJECTION,
  type DynamicSurfaceProjection,
} from "../presentation/surface-projection";
import { SceneSurfaceLayer } from "./SceneSurfaceLayer";
import { SceneSurfaceReader } from "./SceneSurfaceReader";
import {
  livingSceneSurfacePayload,
  type LivingSurfaceRecord,
} from "../presentation/living-scene-surfaces";
import type { ShellRef } from "../presentation/shell-navigation";
import {
  PRODUCTION_VISUAL_LIBRARY,
  type RuntimeVisualLibrary,
} from "../presentation/visual-integration";
import {
  releasedSceneOccluders,
  scenePlateClips,
} from "../presentation/scene-occlusion";
import { useRasterTier } from "./useRasterTier";
import { useSceneCoverTransform } from "./useSceneTransform";
import {
  chooseContentDock,
  conversationSafeMaxHeight,
  figureHeadroom,
  occupiedHorizontalPan,
  type ContentPlacement,
  type ScreenFigure,
} from "../presentation/scene-framing";

/*
 * The room each side must leave for the shell's fixed controls when the panel
 * docks there: the corner cluster lives bottom-left, the pin rail bottom-right.
 */
const DOCK_LEFT_INSET = 272;
const DOCK_RIGHT_INSET = 20;

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
export interface SceneObjectMount {
  /** The `slot_id` declared on the scene, e.g. `coffee-table-papers`. */
  readonly slotId: string;
  /** Rendered inside a box positioned on that slot. */
  readonly node: ReactNode;
}

export function SceneBackdrop({
  sceneId,
  visualLibrary = PRODUCTION_VISUAL_LIBRARY,
  people = [],
  surfaces = EMPTY_SURFACE_PROJECTION,
  readableSurfaces,
  onOpenSurfaceEntity,
  onSelectPerson,
  selectedPersonId = null,
  objects,
  children,
}: {
  readonly sceneId: string | null;
  /** Explicit review library; normal callers retain released-only defaults. */
  readonly visualLibrary?: RuntimeVisualLibrary;
  /**
   * What this world can honestly put on the room's declared surfaces.
   *
   * Defaulted to the empty projection so a caller that has not decided yet
   * gets a room with its painted decoration, never an invented one.
   */
  readonly surfaces?: DynamicSurfaceProjection;
  readonly readableSurfaces?: ReadonlyMap<string, LivingSurfaceRecord>;
  readonly onOpenSurfaceEntity?: (ref: ShellRef) => void;
  /**
   * The generated people standing in this room, positioned by the registry's
   * own anchors. They paint in the plate's coordinate space, above the plate
   * and behind the content. Whether they can be chosen depends on
   * `onSelectPerson` below, not on this list.
   */
  readonly people?: readonly PlacedScenePerson[];
  /**
   * Choosing somebody standing in the room.
   *
   * Absent, the people layer is decoration and is hidden from assistive
   * technology, which is what it was for every caller until now. Present, each
   * person becomes a real button: focusable, named, activated by pointer or
   * keyboard alike.
   *
   * This is UI9-03 arriving properly. The rail above the room populated itself
   * from whoever was present and was the only way to pick a person, which made
   * it a second automatic roster the player never asked for — and the source
   * comment that called selection "the People rail's job" was describing the
   * arrangement being removed, not a requirement. Selection belongs on the
   * person, in the scene.
   */
  readonly onSelectPerson?: (personId: string) => void;
  /** The person whose action menu is open, so the button can say so. */
  readonly selectedPersonId?: string | null;
  /**
   * Things in the room a player can act on, each pinned to a declared surface
   * slot of the scene.
   *
   * They are NOT children. Children render in the dock below the room, and an
   * object has to sit on the thing it is: the camera carries the plate's size
   * and cover transform, so an object is positioned from the slot's own
   * percentages through that same transform, the way the people already are.
   *
   * They are also not drawn inside the camera, which is `aria-hidden` because
   * everything in it is scenery. An object is a control, so it lives in its
   * own layer beside the people, where assistive technology can reach it.
   *
   * A mount whose slot this scene does not declare renders nothing. That is
   * the fail-closed direction: a room that does not have a table does not grow
   * one because a caller asked for papers on it.
   */
  readonly objects?: readonly SceneObjectMount[];
  readonly children: ReactNode;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [readingSlot, setReadingSlot] = useState<{
    sceneId: string | null;
    slotId: string;
  } | null>(null);
  const scene = sceneId ? (SCENE_REGISTRY.scenes.get(sceneId) ?? null) : null;
  const environment = scene?.raster
    ? visualLibrary.get(scene.raster.assetId)
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
  const covering = useSceneCoverTransform(viewportRef, plate, camera);
  const tier = useRasterTier(
    scene?.raster?.ladder ?? null,
    environment?.tierUrls ?? null,
    covering.renderedSceneWidth,
    covering.devicePixelRatio,
    covering.viewport,
  );

  const painted = Boolean(tier.paintedUrl);

  /*
   * Framing around the people (see `scene-framing.ts`). The covering camera is
   * lowered just far enough to put every crown on screen, and the same lowered
   * camera places the plate, the surfaces, the people and their names, so
   * nothing drifts apart. With nobody in the room it is the covering camera
   * unchanged.
   */
  const figuresAt = (
    yOffset: number,
    xOffset = covering.xOffset,
  ): ScreenFigure[] =>
    painted
      ? people.map((person) => {
          const left =
            xOffset +
            (person.leftPercent / 100) * plate.width * covering.uniformScale;
          const top =
            yOffset +
            (person.topPercent / 100) * plate.height * covering.uniformScale;
          return {
            left,
            right:
              left +
              (person.widthPercent / 100) * plate.width * covering.uniformScale,
            top,
            bottom:
              top +
              (person.heightPercent / 100) *
                plate.height *
                covering.uniformScale,
          };
        })
      : [];
  const headroom = figureHeadroom(
    figuresAt(covering.yOffset),
    covering.viewport.height,
  );
  const transform = {
    ...covering,
    xOffset:
      covering.xOffset +
      occupiedHorizontalPan(
        figuresAt(covering.yOffset),
        covering.viewport.width,
        covering.renderedSceneWidth,
        covering.xOffset,
      ),
    yOffset: covering.yOffset + headroom,
  };
  const figures = figuresAt(transform.yOffset, transform.xOffset);

  /*
   * The foreground panel goes where it covers the fewest people. Measured
   * after layout, from the panel actually on screen, because what is in front
   * — a scene, a conversation, the continuing life — sets its size.
   */
  const contentRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<ContentPlacement>({
    dock: "center",
    maxWidth: null,
  });
  const [conversationMaxHeight, setConversationMaxHeight] = useState<
    number | null
  >(null);
  const [conversationFrame, setConversationFrame] =
    useState<SceneConversationFrame | null>(null);
  const measuredContent = useRef("");
  useLayoutEffect(() => {
    const content = contentRef.current;
    const panel = content?.firstElementChild;
    if (!content || !panel) {
      measuredContent.current = "";
      return;
    }
    const measurementKey = JSON.stringify([
      covering.viewport,
      figures,
      panel.className,
      panel.textContent,
    ]);
    if (measurementKey === measuredContent.current) return;
    measuredContent.current = measurementKey;
    const talking = panel.classList.contains("pg-talk");
    if (talking && people.length > 1) {
      const frame = sceneConversationFrame(
        figures,
        covering.viewport,
        Math.min(416, panel.scrollHeight),
      );
      setConversationFrame(frame);
      setConversationMaxHeight(frame.maxHeight);
      return;
    }
    setConversationFrame((current) => (current === null ? current : null));
    if (talking) {
      const maxHeight = conversationSafeMaxHeight(figures, covering.viewport);
      const next = chooseContentDock(
        figures,
        covering.viewport,
        {
          // The conversation box is 36rem wide at most (scene-conversation.css).
          width: Math.min(576, covering.viewport.width - 40),
          height: panel.getBoundingClientRect().height,
        },
        { leftInset: DOCK_LEFT_INSET, rightInset: DOCK_RIGHT_INSET },
        360,
      );
      setPlacement((current) =>
        current.dock === next.dock && current.maxWidth === next.maxWidth
          ? current
          : next,
      );
      setConversationMaxHeight((current) =>
        current === maxHeight ? current : maxHeight,
      );
      return;
    }
    setConversationMaxHeight((current) => (current === null ? current : null));
    /*
     * Decided at the panel's own nominal width, not the width a previous
     * decision narrowed it to, so the answer cannot feed back on itself.
     */
    const nominal = Math.min(672, covering.viewport.width - 40);
    const next = chooseContentDock(
      figures,
      covering.viewport,
      { width: nominal, height: panel.getBoundingClientRect().height },
      { leftInset: DOCK_LEFT_INSET, rightInset: DOCK_RIGHT_INSET },
    );
    setPlacement((current) =>
      current.dock === next.dock && current.maxWidth === next.maxWidth
        ? current
        : next,
    );
    // Measure once per content/viewport/occupancy change. Layout-derived
    // width and height cannot repeatedly feed back into a new dock decision.
  });
  const occluders = releasedSceneOccluders(scene, visualLibrary);
  const plateClips = scenePlateClips(scene);
  const bindings = useMemo(
    () =>
      scene
        ? bindSceneSurfaces(scene, (contentClass, slot) => {
            const record = readableSurfaces?.get(slot.slot_id);
            return record
              ? livingSceneSurfacePayload(record)(contentClass, slot)
              : dynamicSurfacePayloads(surfaces)(contentClass, slot);
          })
        : [],
    [scene, surfaces, readableSurfaces],
  );
  const readableSlotIds = new Set(
    bindings
      .filter(
        (binding) =>
          binding.state === "bound" &&
          readableSurfaces?.get(binding.slotId)?.status === "bound",
      )
      .map((binding) => binding.slotId),
  );
  const reading =
    readingSlot &&
    readingSlot.sceneId === sceneId &&
    readableSlotIds.has(readingSlot.slotId)
      ? readableSurfaces?.get(readingSlot.slotId)
      : null;
  const closeReading = () => {
    const slotId = readingSlot?.slotId;
    setReadingSlot(null);
    requestAnimationFrame(() => {
      if (slotId)
        document
          .querySelector<HTMLButtonElement>(
            `[data-testid="read-surface-${CSS.escape(slotId)}"]`,
          )
          ?.focus();
    });
  };

  return (
    <div
      className={
        painted ? "scene-backdrop scene-backdrop--art" : "scene-backdrop"
      }
      data-testid="scene-backdrop"
      data-scene-id={scene?.sceneId ?? ""}
      data-has-plate={painted ? "true" : "false"}
      data-headroom={headroom}
    >
      <div
        ref={viewportRef}
        className="scene-backdrop-stage"
        aria-hidden={readableSlotIds.size ? undefined : true}
      >
        {/*
          Headroom is lowered camera, and the band it opens above the plate is
          filled with the same painting, softened, rather than left black. It
          is the room's own art stretched as ambience, never a second picture.
        */}
        {headroom > 0 && tier.paintedUrl ? (
          <img
            className="scene-backdrop-fill"
            src={tier.paintedUrl}
            alt=""
            draggable="false"
            data-testid="scene-backdrop-fill"
          />
        ) : null}
        <div
          className={`scene-camera scene-backdrop-camera${headroom > 0 ? " scene-backdrop-camera--lowered" : ""}`}
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
          {painted ? (
            <SceneSurfaceLayer
              slots={scene?.surfaceSlots ?? []}
              bindings={bindings}
              plate={plate}
              readableSlotIds={readableSlotIds}
              onRead={(slotId) => setReadingSlot({ sceneId, slotId })}
            />
          ) : null}
        </div>
      </div>
      {painted && objects && objects.length > 0 ? (
        <div className="scene-backdrop-objects" data-testid="scene-objects">
          {objects.map((mount) => {
            const slot = scene?.surfaceSlots.find(
              (candidate) => candidate.slot_id === mount.slotId,
            );
            // Fail closed. A scene that does not declare this slot does not
            // get the object floating over whatever is at those coordinates.
            if (!slot) return null;
            const rect = slot.rect_percent;
            return (
              <div
                key={mount.slotId}
                className="scene-backdrop-object"
                data-slot-id={mount.slotId}
                style={{
                  left: `${transform.xOffset + (rect.x_percent / 100) * plate.width * transform.uniformScale}px`,
                  top: `${transform.yOffset + (rect.y_percent / 100) * plate.height * transform.uniformScale}px`,
                  width: `${(rect.width_percent / 100) * plate.width * transform.uniformScale}px`,
                  height: `${(rect.height_percent / 100) * plate.height * transform.uniformScale}px`,
                }}
              >
                {mount.node}
              </div>
            );
          })}
        </div>
      ) : null}
      {painted && people.length > 0 ? (
        <div
          className="scene-backdrop-people"
          data-testid="scene-people"
          // Decorative only while nobody can be chosen here.
          aria-hidden={onSelectPerson ? undefined : "true"}
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
            const depth = scene?.anchors.get(person.anchorId)?.zOrder ?? 0;
            const masks = [
              ...occluders
                .filter((o) => o.zOrder > depth)
                .map((o) => o.asset.url),
              ...plateClips
                .filter((o) => o.zOrder > depth)
                .map((o) => o.maskUrl),
            ];
            const masking: CSSProperties = masks.length
              ? {
                  maskImage: [
                    "linear-gradient(black, black)",
                    ...masks.map((url) => `url("${url}")`),
                  ].join(", "),
                  maskMode: "alpha",
                  maskComposite: ["subtract", ...masks.map(() => "add")].join(
                    ", ",
                  ),
                  maskRepeat: "no-repeat",
                  maskSize: [
                    "100% 100%",
                    ...masks.map(
                      () =>
                        `${plate.width * transform.uniformScale}px ${plate.height * transform.uniformScale}px`,
                    ),
                  ].join(", "),
                  maskPosition: [
                    "0 0",
                    ...masks.map(
                      () =>
                        `${transform.xOffset - topLeft.x}px ${transform.yOffset - topLeft.y}px`,
                    ),
                  ].join(", "),
                }
              : {};
            const Token = onSelectPerson ? "button" : "div";
            const chosen = selectedPersonId === person.personId;
            return (
              <Token
                key={person.personId}
                {...(onSelectPerson
                  ? {
                      type: "button" as const,
                      onClick: () => onSelectPerson(person.personId),
                      "aria-haspopup": "menu" as const,
                      "aria-expanded": chosen,
                      /*
                       * The accessible name is the presence line the room
                       * already computes — "Beth Mathis, your housemate" —
                       * so somebody using a screen reader hears who they are
                       * about to choose and how this life knows them, which is
                       * exactly what the rail used to say.
                       */
                      "aria-label": person.presence,
                    }
                  : {})}
                className={`scene-person-token${onSelectPerson ? " scene-person-token--selectable" : ""}${chosen ? " scene-person-token--chosen" : ""}`}
                data-testid={`scene-person-${person.personId}`}
                data-occlusion-count={masks.length}
                data-has-art={person.hasArt ? "true" : "false"}
                data-anchor-id={person.anchorId}
                data-pose-id={
                  person.sourcePoseId ??
                  (person.seated ? "seated-unresolved" : "standing-neutral")
                }
                data-relationship={person.relationship ?? ""}
                /*
                 * The compositor's reason, carried to where it can be read.
                 * A person who does not draw was previously indistinguishable
                 * in the DOM from one the room simply had no art for, so
                 * neither a developer nor a browser test could say which
                 * refusal they were looking at. Empty when a picture drew.
                 */
                data-art-refusal={person.artRefusal ?? ""}
                /*
                 * And what is wrong with a person who DID draw. A figure
                 * composed against an uncalibrated room or with a substituted
                 * pose is not a clean success, and the DOM said it was.
                 */
                data-art-diagnostics={(person.artDiagnostics ?? []).join(" ")}
                style={
                  {
                    left: `${topLeft.x}px`,
                    top: `${topLeft.y}px`,
                    width: `${width}px`,
                    height: `${height}px`,
                    zIndex: depth,
                    ...masking,
                  } satisfies CSSProperties
                }
              >
                {person.hasArt &&
                !person.seated &&
                scene?.anchors.get(person.anchorId)?.floorContact ? (
                  <span
                    aria-hidden="true"
                    className="scene-person-contact-shadow"
                    style={{
                      top: `${((scene.anchors.get(person.anchorId)!.contactFloorYPercent - person.topPercent) / person.heightPercent) * 100}%`,
                    }}
                  />
                ) : null}
                {person.hasArt ? (
                  <MaterialGroup layers={person.layers}>
                    {person.layers.map((layer, index) => (
                      <MaterialImage
                        key={`${person.personId}-${index}`}
                        assetId={layer.assetId ?? ""}
                        material={layer.material}
                        drawnIds={person.layers.flatMap((l) =>
                          l.assetId ? [l.assetId] : [],
                        )}
                        data-asset-id={layer.assetId}
                        data-kind={layer.kind}
                        className="scene-person-art"
                        src={layer.url}
                        alt=""
                        draggable="false"
                        style={{
                          position: "absolute",
                          zIndex: layer.layer,
                          left: `${((layer.leftPercent - person.leftPercent) / person.widthPercent) * 100}%`,
                          top: `${((layer.topPercent - person.topPercent) / person.heightPercent) * 100}%`,
                          width: `${(layer.widthPercent / person.widthPercent) * 100}%`,
                          height: `${(layer.heightPercent / person.heightPercent) * 100}%`,
                        }}
                      />
                    ))}
                  </MaterialGroup>
                ) : (
                  <span
                    className={`scene-person-figure${person.seated ? " scene-person-figure--seated" : ""}`}
                    aria-hidden="true"
                  />
                )}
              </Token>
            );
          })}
          {/* Names are interface labels, above the physical depth stack. */}
          {people.map((person) => (
            <div
              key={`label:${person.personId}`}
              style={{
                position: "absolute",
                left:
                  transform.xOffset +
                  ((person.leftPercent + person.widthPercent / 2) / 100) *
                    plate.width *
                    transform.uniformScale,
                /*
                 * At the person's feet, or at the foot of the screen when a
                 * lowered camera has put their feet below it — a name that
                 * leaves the screen with the feet is a name nobody can read.
                 */
                top: Math.min(
                  transform.yOffset +
                    ((person.topPercent + person.heightPercent) / 100) *
                      plate.height *
                      transform.uniformScale,
                  transform.viewport.height - 48,
                ),
                transform: "translateX(-50%)",
                /*
                 * Above the physical depth stack, and no higher. Raising this
                 * to clear the moment panel does not work and the measurement
                 * says so: the panel's dock is position:fixed inside the same
                 * stacking context, so a name at a figure's feet still reads
                 * back as story-options underneath it. Lifting the whole label
                 * layer over the panel would put names across its prose, which
                 * is a composition decision and not one to smuggle in here.
                 */
                zIndex:
                  Math.max(
                    0,
                    ...occluders.map((o) => o.zOrder),
                    ...plateClips.map((o) => o.zOrder),
                    ...[...(scene?.anchors.values() ?? [])].map(
                      (a) => a.zOrder,
                    ),
                  ) + 1,
              }}
            >
              {/*
                The name is what a player aims at.

                The figure's own token is the control, but the moment panel
                docks over the room and in a full room it covers somebody's
                token whatever dock it picks — and a person whose art is
                refused is drawn as nothing but this name. So the name opens
                the same person the token does. It is not a second announced
                control: the token carries the accessible name and the tab
                stop, and this is hidden from assistive technology and out of
                the tab order, a pointer shortcut to the control it labels.
              */}
              {onSelectPerson ? (
                <button
                  type="button"
                  className="scene-person-plate scene-person-plate--selectable"
                  data-testid={`scene-name-${person.personId}`}
                  aria-hidden="true"
                  tabIndex={-1}
                  onClick={() => onSelectPerson(person.personId)}
                >
                  <strong>{person.name}</strong>
                  {person.relationship ? (
                    <small>{person.relationship}</small>
                  ) : null}
                </button>
              ) : (
                <span className="scene-person-plate">
                  <strong>{person.name}</strong>
                  {person.relationship ? (
                    <small>{person.relationship}</small>
                  ) : null}
                </span>
              )}
            </div>
          ))}
        </div>
      ) : null}
      {reading && painted ? (
        <SceneSurfaceReader
          record={reading}
          onClose={closeReading}
          onOpenEntity={onOpenSurfaceEntity}
        />
      ) : null}
      <div
        className="scene-backdrop-content"
        ref={contentRef}
        data-dock={placement.dock}
        data-conversation-frame={conversationFrame ? "true" : "false"}
        data-content={conversationMaxHeight === null ? "panel" : "conversation"}
        data-testid="scene-backdrop-content"
        style={
          {
            ...(conversationFrame
              ? {
                  "--pg-frame-left": `${conversationFrame.left}px`,
                  "--pg-frame-top": `${conversationFrame.top}px`,
                  "--pg-frame-width": `${conversationFrame.width}px`,
                }
              : {}),
            ...(placement.maxWidth === null
              ? {}
              : { "--pg-dock-width": `${placement.maxWidth}px` }),
            ...(conversationMaxHeight === null
              ? {}
              : {
                  "--pg-conversation-max-height": `${conversationMaxHeight}px`,
                }),
          } as CSSProperties
        }
      >
        {children}
      </div>
    </div>
  );
}
