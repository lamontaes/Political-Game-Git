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
 * the body before extraction (see registrationOffset).
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

/**
 * How far to move a painting so it lines up with the body.
 *
 * A garment lines up by what it hangs from. Tops, dresses and whole outfits
 * hang from the shoulders, so they follow the head: on the Sept. 27 outfit
 * paintings the heads and hands sit within two pixels of the bare bodies
 * while the shoes end 11 rows lower (heeled pumps) or 9 rows higher, and
 * moving by the feet would lift every collar and cuff. Trousers and shoes
 * stand on the floor, so they follow the soles. Across the page both follow
 * the head box's center.
 */
export function registrationOffset(
  painting: BodyAnchors,
  body: BodyAnchors,
  by: "head" | "feet" = "feet",
): { readonly dx: number; readonly dy: number } {
  const center = (anchors: BodyAnchors) =>
    (anchors.head.left + anchors.head.right) / 2;
  return {
    dx: Math.round(center(body) - center(painting)),
    dy: by === "head" ? body.top - painting.top : body.feet - painting.feet,
  };
}
