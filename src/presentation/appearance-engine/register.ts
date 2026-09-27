import type { BodyAnchors } from "./anchors";
import { createRaster, type Raster } from "./raster";

/**
 * REGISTRATION: putting a painting on the body's own pixels.
 *
 * The image service refuses some edits on the bare bodies (Sept. 27: a
 * trouser request was blocked as unsafe), so the art team also paints
 * clothes over fully clothed fitting-suit figures. Those figures were drawn
 * separately and do not stand on exactly the same pixels: on the Sept. 27
 * pants-and-boots set the soles sit 2 to 12 rows off the bare bodies' soles,
 * while the figure's height matches within 3 rows. So a painting is moved to
 * the body before extraction: its soles onto the body's soles, and its head
 * box centered on the body's head box.
 */

export function translateRaster(
  raster: Raster,
  dx: number,
  dy: number,
): Raster {
  if (dx === 0 && dy === 0) return raster;
  const out = createRaster(raster.width, raster.height);
  for (let y = 0; y < raster.height; y += 1) {
    const ty = y + dy;
    if (ty < 0 || ty >= raster.height) continue;
    for (let x = 0; x < raster.width; x += 1) {
      const tx = x + dx;
      if (tx < 0 || tx >= raster.width) continue;
      const s = (y * raster.width + x) * 4;
      out.data.set(
        raster.data.subarray(s, s + 4),
        (ty * raster.width + tx) * 4,
      );
    }
  }
  return out;
}

/** How far to move a painting so its soles and head line up with the body. */
export function registrationOffset(
  painting: BodyAnchors,
  body: BodyAnchors,
): { readonly dx: number; readonly dy: number } {
  const center = (anchors: BodyAnchors) =>
    (anchors.head.left + anchors.head.right) / 2;
  return {
    dx: Math.round(center(body) - center(painting)),
    dy: body.feet - painting.feet,
  };
}
