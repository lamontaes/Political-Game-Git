import type { Raster } from "./raster";

/** Include a cloth part's antialiased perimeter without changing its silhouette. */
export function clothEdgeMask(
  layer: Raster,
  mask: Raster,
  skin: Raster | undefined,
  otherParts: readonly Raster[],
): Raster {
  const data = new Uint8ClampedArray(mask.data);
  const { width, height } = layer;
  const alpha = (raster: Raster, p: number) => raster.data[p * 4 + 3]!;
  const protectedAt = (p: number) =>
    (skin && alpha(skin, p) > alpha(mask, p)) ||
    otherParts.some((part) => alpha(part, p) > alpha(mask, p));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      const coverage = alpha(layer, p);
      if (
        alpha(mask, p) > 128 ||
        coverage === 0 ||
        coverage > 128 ||
        protectedAt(p)
      )
        continue;
      let touchesCloth = false;
      let touchesBoundary = false;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (x + dx < 0 || x + dx >= width || y + dy < 0 || y + dy >= height)
            continue;
          const neighbor = (y + dy) * width + x + dx;
          touchesCloth ||= alpha(mask, neighbor) > 128;
          touchesBoundary ||= Boolean(protectedAt(neighbor));
        }
      }
      if (touchesCloth && !touchesBoundary) data[p * 4 + 3] = 255;
    }
  }
  return { width, height, data };
}
