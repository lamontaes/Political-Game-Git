import type { Raster } from "./raster";

/** Native front-layer exclusion contract. Candidate bounds require art review. */
export interface HairFaceWindow {
  readonly sourceFront: string;
  readonly sourceSha256: string;
  readonly canvas: { readonly width: number; readonly height: number };
  readonly view: "front";
  readonly fromRow: number;
  readonly throughRow: number;
  readonly insetPixels: number;
  readonly featherRows: number;
  readonly approval: "candidate";
}

export function hairFaceWindowErrors(
  window: HairFaceWindow,
): readonly string[] {
  const errors: string[] = [];
  if (!/^[a-f0-9]{64}$/.test(window.sourceSha256)) errors.push("source hash");
  if (window.view !== "front") errors.push("view");
  if (window.approval !== "candidate") errors.push("approval");
  if (!window.sourceFront || !window.sourceFront.endsWith("-front.png"))
    errors.push("source filename");
  const { width, height } = window.canvas;
  if (
    ![
      width,
      height,
      window.fromRow,
      window.throughRow,
      window.insetPixels,
      window.featherRows,
    ].every(Number.isInteger)
  )
    errors.push("integer bounds");
  if (
    width <= 0 ||
    height <= 0 ||
    window.fromRow < 0 ||
    window.throughRow >= height ||
    window.throughRow < window.fromRow
  )
    errors.push("canvas bounds");
  if (
    window.insetPixels < 1 ||
    window.insetPixels > 2 ||
    window.featherRows < 1 ||
    window.featherRows > 4
  )
    errors.push("edge bounds");
  return errors;
}

/**
 * Clear only this style's front hair over the selected face's eroded alpha.
 * The upper rows preserve bangs/scalp; outside face support, hair stays intact.
 * Neither input is written. Color, anchors, back hair and missing views stay put.
 */
export function hairWithFaceWindow(
  front: Raster,
  face: Raster,
  sourceFront: string,
  window?: HairFaceWindow,
): Raster {
  if (!window) return front;
  if (
    hairFaceWindowErrors(window).length > 0 ||
    sourceFront !== window.sourceFront ||
    front.width !== window.canvas.width ||
    front.height !== window.canvas.height ||
    face.width !== front.width ||
    face.height !== front.height
  )
    return front;
  let data: Uint8ClampedArray | undefined;
  const inset = window.insetPixels;
  for (let y = window.fromRow; y <= window.throughRow; y += 1) {
    const fade = Math.min(
      1,
      (y - window.fromRow + 1) / window.featherRows,
      (window.throughRow - y + 1) / window.featherRows,
    );
    for (let x = inset; x < front.width - inset; x += 1) {
      const at = (y * front.width + x) * 4;
      const alpha = front.data[at + 3]!;
      if (alpha === 0) continue;
      let support = 255;
      for (let dy = -inset; dy <= inset; dy += 1) {
        for (let dx = -inset; dx <= inset; dx += 1) {
          const ny = y + dy;
          if (ny < 0 || ny >= face.height) {
            support = 0;
            continue;
          }
          support = Math.min(
            support,
            face.data[(ny * face.width + x + dx) * 4 + 3]!,
          );
        }
      }
      if (support === 0) continue;
      data ??= new Uint8ClampedArray(front.data);
      data[at + 3] = alpha * (1 - (support / 255) * fade);
    }
  }
  return data ? { ...front, data } : front;
}
