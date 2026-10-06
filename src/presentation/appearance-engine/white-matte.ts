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
        alpha > 128 ||
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
