import type { Raster } from "./raster";

/**
 * Where a body actually is on its canvas, measured from its own pixels.
 *
 * The six bodies were painted separately and do not agree: on the Sept. 27
 * set the neck row ranges from 188 to 233 and the head top from 30 to 60,
 * while the feet agree within a pixel. So the engine never assumes a painting
 * matches a template. It measures each body, and every head, face and hair
 * layer is moved to that body's measured neck point when a person is
 * assembled.
 */
export interface BodyAnchors {
  /** First row with any opaque pixel. */
  readonly top: number;
  /** Last row with any opaque pixel: where the feet stand. */
  readonly feet: number;
  /** The narrowest row between the head and the shoulders. */
  readonly neck: {
    readonly row: number;
    readonly centerX: number;
    readonly width: number;
  };
  /** The head's bounding box, top row to the neck row. */
  readonly head: {
    readonly left: number;
    readonly right: number;
    readonly top: number;
    readonly bottom: number;
  };
  /** The widest row just below the neck. */
  readonly shoulderRow: number;
}

/** Alpha at or below this counts as empty: anti-aliasing and glow. */
export const OPAQUE_ALPHA = 16;

function rowSpan(
  raster: Raster,
  y: number,
): { count: number; first: number; last: number } {
  let count = 0;
  let first = -1;
  let last = -1;
  const offset = y * raster.width * 4;
  for (let x = 0; x < raster.width; x += 1) {
    if (raster.data[offset + x * 4 + 3]! > OPAQUE_ALPHA) {
      count += 1;
      if (first < 0) first = x;
      last = x;
    }
  }
  return { count, first, last };
}

export function measureBodyAnchors(raster: Raster): BodyAnchors {
  const spans = Array.from({ length: raster.height }, (_, y) =>
    rowSpan(raster, y),
  );
  const top = spans.findIndex((span) => span.count > 0);
  if (top < 0) throw new Error("The body layer has no opaque pixels.");
  let feet = raster.height - 1;
  while (feet > top && spans[feet]!.count === 0) feet -= 1;

  const figure = feet - top;
  const searchFrom = top + Math.max(8, Math.round(figure * 0.03));
  const searchTo = top + Math.round(figure * 0.22);
  let neckRow = searchFrom;
  for (let y = searchFrom; y <= searchTo; y += 1) {
    const count = spans[y]!.count;
    if (count > 0 && count < spans[neckRow]!.count) neckRow = y;
  }
  const neckSpan = spans[neckRow]!;

  let left = raster.width;
  let right = -1;
  for (let y = top; y <= neckRow; y += 1) {
    const span = spans[y]!;
    if (span.count === 0) continue;
    left = Math.min(left, span.first);
    right = Math.max(right, span.last);
  }

  let shoulderRow = neckRow;
  const shoulderTo = Math.min(feet, neckRow + Math.round(figure * 0.1));
  for (let y = neckRow; y <= shoulderTo; y += 1) {
    if (spans[y]!.count > spans[shoulderRow]!.count) shoulderRow = y;
  }

  return {
    top,
    feet,
    neck: {
      row: neckRow,
      centerX: (neckSpan.first + neckSpan.last) / 2,
      width: neckSpan.count,
    },
    head: { left, right, top, bottom: neckRow },
    shoulderRow,
  };
}

/**
 * How far to move a layer drawn for one body so it sits on another: the
 * difference between the two measured neck points, rounded to whole pixels.
 */
export function neckOffset(
  from: BodyAnchors,
  to: BodyAnchors,
): { readonly dx: number; readonly dy: number } {
  return {
    dx: Math.round(to.neck.centerX - from.neck.centerX),
    dy: to.neck.row - from.neck.row,
  };
}
