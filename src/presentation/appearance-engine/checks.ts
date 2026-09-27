import { OPAQUE_ALPHA } from "./anchors";
import type { PlacedLayer } from "./assemble";
import type { Raster } from "./raster";
import { isSkinPixel } from "./skin";

/**
 * THE CHECKS THAT CATCH A JIGSAW BEFORE A PLAYER DOES.
 *
 * Lamontae's screenshot (Sept. 27): the lower face reads as a pasted piece
 * "on certain shirts". The two usual causes are a garment that carries its
 * own painted skin (a neck, a chin or hands from when it was generated) and a
 * head whose neck does not meet the body's neck. Both are measurable.
 */

export interface SkinInGarment {
  readonly skinPixels: number;
  readonly opaquePixels: number;
  /** Skin pixels as a share of the garment's opaque pixels. */
  readonly share: number;
}

/** How close (sum of channel differences) a garment pixel must be to the body under it to be a painted copy of that skin. */
export const PAINTED_SKIN_DISTANCE = 30;

/**
 * Painted skin inside a garment layer. A clean garment has none.
 *
 * With the body the garment was drawn on, a pixel counts only when it is skin
 * colored AND matches the body's skin at the same spot, so tan, mustard or
 * brown fabric is not mistaken for skin. Without a body, color alone decides,
 * and warm fabrics will be flagged: use that only as a first pass.
 */
export function skinInGarment(garment: Raster, body?: Raster): SkinInGarment {
  let skinPixels = 0;
  let opaquePixels = 0;
  const { data } = garment;
  const under =
    body && body.width === garment.width && body.height === garment.height
      ? body.data
      : null;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3]! <= OPAQUE_ALPHA) continue;
    opaquePixels += 1;
    if (!isSkinPixel(data[i]!, data[i + 1]!, data[i + 2]!, data[i + 3]!))
      continue;
    if (under) {
      if (!isSkinPixel(under[i]!, under[i + 1]!, under[i + 2]!, under[i + 3]!))
        continue;
      const distance =
        Math.abs(data[i]! - under[i]!) +
        Math.abs(data[i + 1]! - under[i + 1]!) +
        Math.abs(data[i + 2]! - under[i + 2]!);
      if (distance > PAINTED_SKIN_DISTANCE) continue;
    }
    skinPixels += 1;
  }
  return {
    skinPixels,
    opaquePixels,
    share: opaquePixels === 0 ? 0 : skinPixels / opaquePixels,
  };
}

/** Garments may carry a trace of warm color (a tan jacket); not skin. */
export const GARMENT_SKIN_TOLERANCE = 0.002;

function span(
  raster: Raster,
  dx: number,
  dy: number,
  row: number,
): { first: number; last: number } | null {
  const y = row - dy;
  if (y < 0 || y >= raster.height) return null;
  let first = -1;
  let last = -1;
  for (let x = 0; x < raster.width; x += 1) {
    if (raster.data[(y * raster.width + x) * 4 + 3]! > OPAQUE_ALPHA) {
      if (first < 0) first = x + dx;
      last = x + dx;
    }
  }
  return first < 0 ? null : { first, last };
}

export interface NeckJoin {
  /** The canvas row where the head layer's neck ends. */
  readonly row: number;
  /** How far the head's neck edges sit from the body's, left and right. */
  readonly leftStep: number;
  readonly rightStep: number;
}

/**
 * Where a placed head layer's neck ends, compare its width to the body's
 * neck on that row. A step of more than a few pixels shows as a seam.
 */
export function neckJoin(head: PlacedLayer, body: Raster): NeckJoin | null {
  let bottom = head.raster.height - 1;
  while (bottom >= 0) {
    const row = span(head.raster, head.dx, head.dy, bottom + head.dy);
    if (row) break;
    bottom -= 1;
  }
  if (bottom < 0) return null;
  const row = bottom + head.dy - 2;
  const headSpan = span(head.raster, head.dx, head.dy, row);
  const bodySpan = span(body, 0, 0, row);
  if (!headSpan || !bodySpan) return null;
  return {
    row,
    leftStep: Math.abs(headSpan.first - bodySpan.first),
    rightStep: Math.abs(headSpan.last - bodySpan.last),
  };
}

/** More than this many pixels of step at the neck reads as a seam. */
export const NECK_STEP_TOLERANCE = 3;
