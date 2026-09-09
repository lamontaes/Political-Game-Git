import type { RegisteredScene } from "./scene-registry";
import {
  PRODUCTION_VISUAL_LIBRARY,
  type RuntimeVisualLibrary,
} from "./visual-integration";

/** Only an admitted alpha asset paints; coarse debug bounds never become masks. */
export function releasedSceneOccluders(
  scene: RegisteredScene | null,
  library: RuntimeVisualLibrary = PRODUCTION_VISUAL_LIBRARY,
) {
  return (scene?.occluders ?? []).flatMap((occluder) => {
    const asset = occluder.assetId ? library.get(occluder.assetId) : undefined;
    return asset ? [{ id: occluder.id, zOrder: occluder.zOrder, asset }] : [];
  });
}

/** The current painted URL is reused, so camera/tier retention stays identical. */
export function scenePlateClips(scene: RegisteredScene | null) {
  return (scene?.occluders ?? []).flatMap((occluder) =>
    occluder.plateClip
      ? [
          {
            id: occluder.id,
            zOrder: occluder.zOrder,
            maskUrl: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><polygon points="${occluder.plateClip.points.map(({ x, y }) => `${x},${y}`).join(" ")}" fill="black"/></svg>`)}`,
            clipPath: `polygon(${occluder.plateClip.points.map(({ x, y }) => `${x}% ${y}%`).join(", ")})`,
          },
        ]
      : [],
  );
}
