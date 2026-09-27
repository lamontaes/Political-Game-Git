import { OPAQUE_ALPHA, type BodyAnchors } from "./anchors";
import { createRaster, luminance, type Raster } from "./raster";
import { isSkinPixel } from "./skin";

/**
 * GARMENT EXTRACTION: from "a shirt painted on a body" to a cloth-only layer.
 *
 * The art team paints each garment ON the exact bare body. The image
 * generator does not leave the rest of the figure alone: on the Sept. 27
 * crewnecks it repainted 10–17 percent of the lean and average bodies' skin
 * and 70–80 percent of the fuller body's. So the engine never subtracts. A
 * pixel becomes cloth only when it lies in the band this slot may cover
 * (below the neckline, outside the head box, above the underwear bottoms for
 * a top) and is not skin. Everything else comes from the unchanged canonical
 * body at assembly.
 */

export type GarmentSlot = "top" | "bottoms" | "shoes" | "dress" | "outerwear";

/**
 * The standard neckline sits this share of the figure's height below the
 * measured neck row: about 45 px on the 1024×1536 canvas.
 */
export const NECKLINE_SHARE = 0.03;

/** Neutral gray underwear as painted on the bare bodies. */
function isUnderwearGray(r: number, g: number, b: number, a: number): boolean {
  if (a <= OPAQUE_ALPHA) return false;
  const lum = luminance(r, g, b);
  return Math.max(r, g, b) - Math.min(r, g, b) < 14 && lum > 70 && lum < 190;
}

export interface BodyBands {
  readonly necklineRow: number;
  /** First row of the underwear bottoms: where a top's allowance ends. */
  readonly bottomsTopRow: number;
  /** Last row of the underwear bottoms. */
  readonly bottomsBottomRow: number;
}

/** Where the bare body's underwear bottoms are, measured from its pixels. */
export function measureBodyBands(
  bare: Raster,
  anchors: BodyAnchors,
): BodyBands {
  const figure = anchors.feet - anchors.top;
  const from = anchors.top + Math.round(figure * 0.4);
  const to = anchors.top + Math.round(figure * 0.7);
  let bottomsTopRow = -1;
  let bottomsBottomRow = -1;
  for (let y = from; y <= to; y += 1) {
    let gray = 0;
    for (let x = 0; x < bare.width; x += 1) {
      const i = (y * bare.width + x) * 4;
      if (
        isUnderwearGray(
          bare.data[i]!,
          bare.data[i + 1]!,
          bare.data[i + 2]!,
          bare.data[i + 3]!,
        )
      )
        gray += 1;
    }
    if (gray >= Math.max(8, Math.round(bare.width * 0.015))) {
      if (bottomsTopRow < 0) bottomsTopRow = y;
      bottomsBottomRow = y;
    }
  }
  if (bottomsTopRow < 0)
    throw new Error("No underwear bottoms found on the bare body.");
  return {
    necklineRow:
      anchors.neck.row +
      Math.round((anchors.feet - anchors.top) * NECKLINE_SHARE),
    bottomsTopRow,
    bottomsBottomRow,
  };
}

export interface ExtractedGarment {
  readonly layer: Raster;
  readonly clothPixels: number;
  /** Non-skin paint the rules refused (outside what this slot may cover). */
  readonly refusedPixels: number;
}

type Under = "skin" | "underwear" | "outline" | "background";

function underKind(r: number, g: number, b: number, a: number): Under {
  if (a <= OPAQUE_ALPHA) return "background";
  if (isSkinPixel(r, g, b, a)) return "skin";
  if (isUnderwearGray(r, g, b, a)) return "underwear";
  return "outline";
}

/**
 * The cloth-only layer for one slot.
 *
 * What the BARE body has at each pixel decides what the painting's non-skin
 * paint there may be:
 * - over bare skin: cloth (sleeves run down to the wrists at any height);
 * - over the bare underwear: cloth only where this slot covers it (a top
 *   covers the bra; the underwear bottoms stay, so a top ends where they begin);
 * - over an outline or empty background: cloth only inside the slot's band,
 *   which allows a loose fit without stray edges elsewhere.
 * The painting's own skin is never cloth; the unchanged body supplies it.
 */
export function extractGarment(
  onBody: Raster,
  bare: Raster,
  anchors: BodyAnchors,
  slot: GarmentSlot,
  hemAllowance = 40,
): ExtractedGarment {
  if (onBody.width !== bare.width || onBody.height !== bare.height)
    throw new Error("The painting and the bare body must share one canvas.");
  const bands = measureBodyBands(bare, anchors);
  const figure = anchors.feet - anchors.top;
  const shoeTop = anchors.feet - Math.round(figure * 0.08);
  const legTop = bands.bottomsTopRow - 10;
  const covers = (under: Under, y: number): boolean => {
    switch (slot) {
      case "top":
      case "outerwear":
        if (y < bands.necklineRow) return false;
        if (under === "skin") return y < shoeTop;
        if (under === "underwear") return y < bands.bottomsTopRow;
        return y <= bands.bottomsTopRow + hemAllowance;
      case "dress":
        if (y < bands.necklineRow) return false;
        return under === "skin" || under === "underwear"
          ? y < shoeTop
          : y < shoeTop;
      case "bottoms":
        if (y < legTop) return false;
        return under === "background" || under === "outline"
          ? y < shoeTop
          : y < shoeTop + Math.round(figure * 0.03);
      case "shoes":
        return y >= shoeTop;
    }
  };
  const layer = createRaster(onBody.width, onBody.height);
  let clothPixels = 0;
  let refusedPixels = 0;
  const src = onBody.data;
  const under = bare.data;
  for (let y = 0; y < onBody.height; y += 1) {
    for (let x = 0; x < onBody.width; x += 1) {
      const i = (y * onBody.width + x) * 4;
      const a = src[i + 3]!;
      if (a <= OPAQUE_ALPHA) continue;
      if (isSkinPixel(src[i]!, src[i + 1]!, src[i + 2]!, a)) continue;
      const inHead =
        y <= anchors.head.bottom &&
        x >= anchors.head.left &&
        x <= anchors.head.right;
      const kind = underKind(
        under[i]!,
        under[i + 1]!,
        under[i + 2]!,
        under[i + 3]!,
      );
      if (inHead || !covers(kind, y)) {
        refusedPixels += 1;
        continue;
      }
      layer.data[i] = src[i]!;
      layer.data[i + 1] = src[i + 1]!;
      layer.data[i + 2] = src[i + 2]!;
      layer.data[i + 3] = a;
      clothPixels += 1;
    }
  }
  return { layer, clothPixels, refusedPixels };
}
