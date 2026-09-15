import type { CharacterComponentKind } from "./character-components";
import type { RegisteredScene, RegisteredSceneAnchor } from "./scene-registry";
import {
  placeSubjectAtAnchor,
  resolvePerspectiveScale,
  type PlacementBox,
} from "./scene-placement";

export interface SourceScenePose {
  readonly variantId: string;
  readonly pose: string;
  readonly facing: string;
  readonly canvas: { readonly width: number; readonly height: number };
  readonly contacts: {
    readonly crown: { readonly x: number; readonly y: number };
    readonly seatedPelvis?: { readonly x: number; readonly y: number };
    readonly leftFoot: { readonly x: number; readonly y: number };
    readonly rightFoot: { readonly x: number; readonly y: number };
  };
  readonly alphaBounds: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
  readonly layers: readonly {
    readonly assetId: string;
    readonly kind: CharacterComponentKind;
    readonly layer: number;
    readonly url: string;
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  }[];
}

/** Source pixels enter once; all returned geometry uses the shared room plate.
 * The seat-to-sole span determines one uniform scale. Neither transparent
 * padding nor the dialogue panel is a ruler. Geometry warnings remain refusals. */
export function placeSourceScenePose(
  scene: RegisteredScene,
  anchor: RegisteredSceneAnchor,
  personId: string,
  bodyFamily: string,
  source: SourceScenePose,
) {
  const point = (p: { readonly x: number; readonly y: number }) => ({
    x: p.x / source.canvas.width,
    y: p.y / source.canvas.height,
  });
  const pelvis = source.contacts.seatedPelvis;
  const floor = Math.max(
    source.contacts.leftFoot.y,
    source.contacts.rightFoot.y,
  );
  const seat = anchor.seatContact;
  if (seat && (!pelvis || floor <= pelvis.y)) return null;
  if (seat && seat.floor_y_percent <= seat.seat_plane_y_percent) return null;
  const depth = resolvePerspectiveScale(scene, anchor.contactFloorYPercent);
  const seatHeight =
    seat && pelvis
      ? ((seat.floor_y_percent - seat.seat_plane_y_percent) *
          source.canvas.height) /
        (floor - pelvis.y)
      : null;
  const placement = placeSubjectAtAnchor(scene, anchor, {
    id: personId,
    bodyCanvas: source.canvas,
    root: point(pelvis ?? source.contacts.leftFoot),
    contacts: {
      leftFoot: point(source.contacts.leftFoot),
      rightFoot: point(source.contacts.rightFoot),
      ...(pelvis ? { seatedPelvis: point(pelvis) } : {}),
    },
    crownY: source.contacts.crown.y / source.canvas.height,
    visibleWidthFraction: source.alphaBounds.width / source.canvas.width,
    bodyFamily,
    poseFamily: source.pose,
    facing: source.facing,
    referenceWidthPercent:
      seatHeight !== null
        ? (((seatHeight * source.canvas.width) / source.canvas.height) *
            scene.plate.height) /
          scene.plate.width /
          depth
        : (scene.standardBodyWidthPercent ?? 1),
  });
  const box = placement.box;
  const bounds: PlacementBox = {
    leftPercent:
      box.leftPercent +
      (source.alphaBounds.x / source.canvas.width) * box.widthPercent,
    topPercent:
      box.topPercent +
      (source.alphaBounds.y / source.canvas.height) * box.heightPercent,
    widthPercent:
      (source.alphaBounds.width / source.canvas.width) * box.widthPercent,
    heightPercent:
      (source.alphaBounds.height / source.canvas.height) * box.heightPercent,
  };
  return {
    placement,
    bounds,
    sourcePixelScale:
      ((box.heightPercent / 100) * scene.plate.height) / source.canvas.height,
    layers: [...source.layers]
      .sort((a, b) => a.layer - b.layer)
      .map((layer) => ({
        assetId: layer.assetId,
        kind: layer.kind,
        slotId: `source-pose:${layer.kind}`,
        layer: layer.layer,
        url: layer.url,
        leftPercent:
          box.leftPercent + (layer.x / source.canvas.width) * box.widthPercent,
        topPercent:
          box.topPercent + (layer.y / source.canvas.height) * box.heightPercent,
        widthPercent: (layer.width / source.canvas.width) * box.widthPercent,
        heightPercent:
          (layer.height / source.canvas.height) * box.heightPercent,
      })),
  };
}
