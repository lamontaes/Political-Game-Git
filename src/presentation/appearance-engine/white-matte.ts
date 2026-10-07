import type { Raster } from "./raster";

// Decoded layers are immutable. Cache the derivative, not changes to the source.
const cleaned = new WeakMap<Raster, Raster>();

/**
 * Replace a faint white matte with the nearest opaque color in the same layer.
 * Alpha and opaque artwork are preserved; unsupported isolated edges stay put.
 * This is a rendering derivative, not source-art approval or a source rewrite.
 */
export function withoutWhiteMatte(raster: Raster): Raster {
  const prior = cleaned.get(raster);
  if (prior) return prior;
  const source = raster.data;
  let data: Uint8ClampedArray | undefined;
  for (let y = 0; y < raster.height; y += 1) {
    for (let x = 0; x < raster.width; x += 1) {
      const at = (y * raster.width + x) * 4;
      const alpha = source[at + 3]!;
      if (
        alpha === 0 ||
        alpha >= 250 ||
        source[at]! < 235 ||
        source[at + 1]! < 235 ||
        source[at + 2]! < 235
      )
        continue;
      let nearest = -1;
      let distance = Infinity;
      for (let dy = -2; dy <= 2; dy += 1) {
        for (let dx = -2; dx <= 2; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          const squared = dx * dx + dy * dy;
          if (
            nx < 0 ||
            ny < 0 ||
            nx >= raster.width ||
            ny >= raster.height ||
            squared === 0 ||
            squared > 4 ||
            squared >= distance
          )
            continue;
          const candidate = (ny * raster.width + nx) * 4;
          if (source[candidate + 3]! < 250) continue;
          nearest = candidate;
          distance = squared;
        }
      }
      if (nearest < 0) continue;
      data ??= new Uint8ClampedArray(source);
      for (let channel = 0; channel < 3; channel += 1) {
        data[at + channel] = source[nearest + channel]!;
      }
    }
  }
  const result = data ? { ...raster, data } : raster;
  cleaned.set(raster, result);
  return result;
}

/**
 * Prepare a painted source layer for the pack. The one-pixel alpha inset
 * removes the source matte at the silhouette; any remaining neutral light
 * edge pixels take their color from the nearest painted pixel on that layer.
 */
export function cleanPaintedLayer(raster: Raster): Raster {
  const { width, height } = raster;
  const source = raster.data;
  const data = new Uint8ClampedArray(source);
  const matte = (at: number) => {
    const r = source[at]!;
    const g = source[at + 1]!;
    const b = source[at + 2]!;
    return (
      source[at + 3]! > 0 &&
      r >= 210 &&
      g >= 210 &&
      b >= 210 &&
      Math.max(r, g, b) <= 245 &&
      Math.max(r, g, b) - Math.min(r, g, b) <= 18
    );
  };

  // Shrink the alpha silhouette by one source pixel. Read only the original
  // mask so the inset is exactly one pixel, independent of scan order.
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const at = (y * width + x) * 4;
      if (source[at + 3] === 0) continue;
      let edge = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      for (let dy = -1; dy <= 1 && !edge; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (
            nx >= 0 &&
            ny >= 0 &&
            nx < width &&
            ny < height &&
            source[(ny * width + nx) * 4 + 3] === 0
          ) {
            edge = true;
            break;
          }
        }
      }
      if (edge) data[at + 3] = 0;
    }
  }

  // Recolor neutral matte pixels on the retained edge from this layer's own
  // opaque paint. Do not infer a color for a layer with no nearby paint.
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const at = (y * width + x) * 4;
      if (data[at + 3] === 0 || !matte(at)) continue;
      let retainedEdge = false;
      for (let dy = -1; dy <= 1 && !retainedEdge; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (
            nx >= 0 &&
            ny >= 0 &&
            nx < width &&
            ny < height &&
            data[(ny * width + nx) * 4 + 3] === 0
          ) {
            retainedEdge = true;
            break;
          }
        }
      }
      if (!retainedEdge) continue;
      let nearest = -1;
      let distance = Infinity;
      for (let dy = -2; dy <= 2; dy += 1) {
        for (let dx = -2; dx <= 2; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          const squared = dx * dx + dy * dy;
          if (
            squared === 0 ||
            squared > 4 ||
            squared >= distance ||
            nx < 0 ||
            ny < 0 ||
            nx >= width ||
            ny >= height
          )
            continue;
          const candidate = (ny * width + nx) * 4;
          if (source[candidate + 3]! < 250 || matte(candidate)) continue;
          nearest = candidate;
          distance = squared;
        }
      }
      if (nearest < 0) continue;
      for (let channel = 0; channel < 3; channel += 1)
        data[at + channel] = source[nearest + channel]!;
    }
  }
  return { ...raster, data };
}
