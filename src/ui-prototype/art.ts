import {
  SCENE_REGISTRY,
  type RegisteredScene,
} from "../presentation/scene-registry";
import { resolvePerspectiveScale } from "../presentation/scene-placement";
import { PRODUCTION_VISUAL_LIBRARY } from "../presentation/visual-integration";

/**
 * The prototype's read-only window onto released production art.
 *
 * DEVELOPMENT-ONLY PROTOTYPE MODULE. It imports the production scene registry
 * and the production visual library and never writes to either. The dependency
 * runs one way on purpose: the prototype may read production presentation truth,
 * and no production module may import anything under `src/ui-prototype/`.
 *
 * Two rules are enforced here rather than trusted to the screens above:
 *
 *   - a backdrop is painted only when its asset is in the released library, so
 *     no candidate or unreleased raster can reach the prototype; and
 *   - a room whose plate is missing renders as a declared CSS fallback that says
 *     so, rather than borrowing another room's picture.
 *
 * Nothing here promotes, re-lineages, upscales, or re-manifests an asset. No
 * image is generated. The prototype consumes what the production gate already
 * released and stops when that runs out.
 */

/** A room the prototype can show, resolved to a released raster. */
export interface PrototypeBackdrop {
  readonly sceneId: string;
  readonly label: string;
  /** Null when the room has no released plate. The caller must say so. */
  readonly url: string | null;
  readonly assetId: string | null;
  /** Plate aspect ratio, so the frame can letterbox honestly. */
  readonly aspectRatio: number;
}

/** Where a prototype person stands, in the scene's own authored coordinates. */
export interface PrototypeAnchor {
  readonly anchorId: string;
  readonly xPercent: number;
  /** The floor line the figure contacts, as a percentage of plate height. */
  readonly floorYPercent: number;
  /**
   * How tall a standing figure is on this floor line, as a percentage of plate
   * height, from the scene's own calibration. Null when the room does not
   * declare the geometry — the marker then falls back to a fixed size and the
   * shell does not pretend the depth is measured.
   */
  readonly bodyHeightPercent: number | null;
}

function sceneOrNull(sceneId: string): RegisteredScene | null {
  return SCENE_REGISTRY.scenes.get(sceneId) ?? null;
}

/**
 * Resolves one room to the best released raster it has.
 *
 * The widest tier wins because the prototype is judged on a desktop display and
 * the owner is looking at picture quality; where a scene ships a single raster
 * with no ladder, that raster is used and nothing pretends to a ladder.
 */
export function resolveBackdrop(sceneId: string): PrototypeBackdrop {
  const scene = sceneOrNull(sceneId);
  if (!scene) {
    return {
      sceneId,
      label: sceneId,
      url: null,
      assetId: null,
      aspectRatio: 16 / 9,
    };
  }

  const aspectRatio = scene.plate.width / scene.plate.height;
  const raster = scene.raster;
  if (!raster) {
    return {
      sceneId,
      label: scene.label,
      url: null,
      assetId: null,
      aspectRatio,
    };
  }

  const asset = PRODUCTION_VISUAL_LIBRARY.get(raster.assetId);
  if (!asset) {
    return {
      sceneId,
      label: scene.label,
      url: null,
      assetId: null,
      aspectRatio,
    };
  }

  let url = asset.url;
  let widest = 0;
  for (const [width, tierUrl] of asset.tierUrls) {
    if (width > widest) {
      widest = width;
      url = tierUrl;
    }
  }

  return {
    sceneId,
    label: scene.label,
    url,
    assetId: asset.assetId,
    aspectRatio,
  };
}

/**
 * The authored anchors of a room, in left-to-right order.
 *
 * Prototype people are placed on these rather than on coordinates chosen by eye,
 * so the owner is judging figure placement that the scene actually specifies.
 * A room with no authored anchors returns nothing; the scene shell then says the
 * room carries no placement geometry instead of inventing some.
 */
export function sceneAnchors(sceneId: string): readonly PrototypeAnchor[] {
  const scene = sceneOrNull(sceneId);
  if (!scene) return [];

  /*
   * Depth comes from the room's own floor calibration, not from a guess.
   *
   * A marker the same size at the back of the room and at the front would tell
   * the owner something false about the composition, and the scene already
   * carries the measured answer: `resolvePerspectiveScale` interpolates the two
   * calibration points, and `standardBodyWidthPercent` says how large a
   * normalized body canvas paints at scale 1. The canvas is 765x1024, so its
   * height as a share of plate height follows from the plate's aspect ratio.
   */
  const bodyWidthPercent = scene.standardBodyWidthPercent;
  const plateAspect = scene.plate.width / scene.plate.height;

  return [...scene.anchors.values()]
    .map((anchor) => {
      const floorYPercent = anchor.contactFloorYPercent;
      const bodyHeightPercent =
        bodyWidthPercent === null
          ? null
          : bodyWidthPercent *
            resolvePerspectiveScale(scene, floorYPercent) *
            (1024 / 765) *
            plateAspect;
      return {
        anchorId: anchor.id,
        xPercent: anchor.xPercent,
        floorYPercent,
        bodyHeightPercent,
      };
    })
    .sort((left, right) => left.xPercent - right.xPercent);
}

/** True when a room has a released plate. Used to report shortfall honestly. */
export function hasReleasedPlate(sceneId: string): boolean {
  return resolveBackdrop(sceneId).url !== null;
}
