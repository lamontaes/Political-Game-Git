/**
 * THE PEOPLE APPEARANCE ENGINE — RASTER BASICS.
 *
 * Everything in this engine works on plain RGBA buffers, so the same code
 * runs in the game (from a canvas) and in tests and tools (from a PNG
 * decoder). Nothing here knows about React, the DOM or the save.
 */

export interface Raster {
  readonly width: number;
  readonly height: number;
  /** RGBA, row-major, 4 bytes per pixel. */
  readonly data: Uint8ClampedArray;
}

export function createRaster(width: number, height: number): Raster {
  return { width, height, data: new Uint8ClampedArray(width * height * 4) };
}

export function alphaAt(raster: Raster, x: number, y: number): number {
  return raster.data[(y * raster.width + x) * 4 + 3]!;
}

/** Relative luminance on the 0–255 scale (Rec. 709 weights). */
export function luminance(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export interface Rgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

export function parseHex(hex: string): Rgb {
  const value = hex.replace("#", "");
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

export function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

/**
 * Half the width and height, each pixel the alpha-weighted mean of the four it
 * covers, so a transparent neighbor never darkens an edge. The engine's art is
 * painted at 1024×1536; the game draws people far smaller than that.
 */
export function downscaleHalf(raster: Raster): Raster {
  const width = Math.floor(raster.width / 2);
  const height = Math.floor(raster.height / 2);
  const out = createRaster(width, height);
  const src = raster.data;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (const [dx, dy] of [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1],
      ] as const) {
        const i = ((y * 2 + dy) * raster.width + x * 2 + dx) * 4;
        const alpha = src[i + 3]!;
        r += src[i]! * alpha;
        g += src[i + 1]! * alpha;
        b += src[i + 2]! * alpha;
        a += alpha;
      }
      const o = (y * width + x) * 4;
      if (a > 0) {
        out.data[o] = r / a;
        out.data[o + 1] = g / a;
        out.data[o + 2] = b / a;
      }
      out.data[o + 3] = a / 4;
    }
  }
  return out;
}
