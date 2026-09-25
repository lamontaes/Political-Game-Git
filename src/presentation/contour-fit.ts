/**
 * Contour fit: the modular character engine's measuring and fitting core.
 *
 * A painted garment layer is registered to the body it was painted on. This
 * module measures that body and any other body from their own alpha, row by
 * row, and moves every row of the garment so it follows the new body: the
 * torso and legs follow the torso and legs, and each arm follows its arm from
 * the armpit to the fingertips. Painted detail is sampled, never redrawn, so
 * the result keeps the art's brushwork; only its geometry changes.
 *
 * Everything here is pure: rasters in, rasters out, no DOM, no canvas, no
 * file system. The browser and the offline scripts supply the pixels.
 *
 * What a measurement is. For every row, the opaque runs (left and right edge
 * of each separate piece of the silhouette) and what each run belongs to:
 * `C` the torso or a leg, `L`/`R` the image-left or image-right arm. Arms are
 * followed down from the row where they first separate from the torso. Where
 * an arm touches the torso or a thigh for a few rows the gap disappears from
 * the alpha; the tracker then keeps the arm's last width rather than letting
 * the arm swallow the torso. Small pieces between a hand and the body (a
 * thumb, parted fingers) belong to the hand.
 *
 * Landmarks are read from the silhouette with stated rules: the neck is the
 * narrowest row between 8% and 20% of figure height, the neck base the first
 * row below it 1.6 times as wide, the arm split the first row with three or
 * more runs, the crotch the first row (below the split) whose midline is not
 * covered, and the ankle the narrowest leg row between 80% and 95% of height.
 */

export interface RgbaRaster {
  readonly width: number;
  readonly height: number;
  /** Straight (not premultiplied) RGBA, 4 bytes per pixel, row-major. */
  readonly data: Uint8ClampedArray | Uint8Array;
}

export type RunKind = "C" | "L" | "R";

export interface Run {
  readonly lo: number;
  readonly hi: number;
}

export interface FigureMeasurement {
  readonly width: number;
  readonly height: number;
  readonly top: number;
  readonly sole: number;
  readonly neck: number;
  readonly neckBase: number;
  /** First row where the arms hang clear of the torso; null if they never do. */
  readonly armSplit: number | null;
  readonly crotch: number | null;
  readonly ankle: number;
  /** Lowest row reached by a tracked arm; null without an arm split. */
  readonly handTip: number | null;
  readonly midline: number;
  readonly rows: readonly (readonly Run[])[];
  readonly kinds: readonly (readonly RunKind[])[];
}

export const CONTOUR_FIT_ALPHA_FLOOR = 128;
const MIN_RUN = 4;

/** A byte of pixel data; reads past the end are clear. */
function px(data: ArrayLike<number>, i: number): number {
  return data[i] ?? 0;
}

/** An element the caller has already bounds-checked. */
function must<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("contour-fit: index out of range");
  return value;
}

function runsAt(rows: readonly (readonly Run[])[], y: number): readonly Run[] {
  return rows[y] ?? [];
}

function first(runs: readonly Run[]): Run {
  return must(runs[0]);
}

function last(runs: readonly Run[]): Run {
  return must(runs[runs.length - 1]);
}

export function createRaster(width: number, height: number): RgbaRaster {
  return { width, height, data: new Uint8ClampedArray(width * height * 4) };
}

export function rowRuns(
  raster: RgbaRaster,
  y: number,
  floor = CONTOUR_FIT_ALPHA_FLOOR,
): Run[] {
  const { width, data } = raster;
  const runs: Run[] = [];
  let start = -1;
  const base = y * width * 4 + 3;
  for (let x = 0; x <= width; x += 1) {
    const on = x < width && px(data, base + x * 4) >= floor;
    if (on && start < 0) start = x;
    if (!on && start >= 0) {
      if (x - 1 - start >= MIN_RUN) runs.push({ lo: start, hi: x - 1 });
      start = -1;
    }
  }
  return runs;
}

function extentWidth(runs: readonly Run[]): number {
  return runs.length ? last(runs).hi - first(runs).lo : 0;
}

function argMin(from: number, to: number, value: (y: number) => number) {
  let best = from;
  let bestValue = Infinity;
  for (let y = from; y < to; y += 1) {
    const v = value(y);
    if (v < bestValue) {
      bestValue = v;
      best = y;
    }
  }
  return best;
}

export interface MeasureOptions {
  /**
   * Hand length as a fraction of (crotch - armSplit), used to stop following an
   * arm whose hand rests against the thigh. Measure it on a figure whose hands
   * hang clear and reuse it for bodies whose hands touch.
   */
  readonly armLengthRatio?: number;
}

export function measureFigure(
  raster: RgbaRaster,
  options: MeasureOptions = {},
): FigureMeasurement {
  const { width, height } = raster;
  const rows: Run[][] = [];
  for (let y = 0; y < height; y += 1) rows.push(rowRuns(raster, y));
  const row = (y: number): Run[] => rows[y] ?? [];
  let top = -1;
  let sole = -1;
  for (let y = 0; y < height; y += 1) {
    if (row(y).length) {
      if (top < 0) top = y;
      sole = y;
    }
  }
  if (top < 0) throw new Error("contour-fit: the raster has no opaque figure");
  const figureHeight = sole - top;
  const at = (fraction: number) => top + Math.round(fraction * figureHeight);

  const neck = argMin(at(0.08), at(0.2), (y) =>
    row(y).length ? extentWidth(row(y)) : Infinity,
  );
  const neckWidth = extentWidth(row(neck));
  let neckBase = neck;
  while (neckBase < sole && extentWidth(row(neckBase)) <= 1.6 * neckWidth)
    neckBase += 1;

  // Midline: median center of the chest rows.
  const centers: number[] = [];
  for (let y = at(0.2); y < at(0.3); y += 1) {
    const r = row(y);
    if (r.length) centers.push((first(r).lo + last(r).hi) / 2);
  }
  centers.sort((a, b) => a - b);
  const midline = centers[Math.floor(centers.length / 2)] ?? width / 2;

  let armSplit: number | null = null;
  for (let y = neckBase + Math.round(0.05 * figureHeight); y < sole; y += 1) {
    if (row(y).length >= 3) {
      armSplit = y;
      break;
    }
  }

  let crotch: number | null = null;
  const crotchFrom = (armSplit ?? neckBase) + Math.round(0.12 * figureHeight);
  for (let y = crotchFrom; y < sole; y += 1) {
    if (!row(y).some((r) => r.lo <= midline && midline <= r.hi)) {
      crotch = y;
      break;
    }
  }

  const ankle = argMin(at(0.8), at(0.95), (y) =>
    row(y).length ? Math.min(...row(y).map((r) => r.hi - r.lo)) : Infinity,
  );

  const kinds: RunKind[][] = rows.map((r) => r.map((): RunKind => "C"));
  const kindsAt = (y: number): RunKind[] => kinds[y] ?? [];
  let handTip: number | null = null;
  if (armSplit !== null) {
    const split = armSplit;
    const limit =
      options.armLengthRatio !== undefined && crotch !== null
        ? Math.round(split + options.armLengthRatio * (crotch - split))
        : sole;
    const prev: Record<"L" | "R", Run | null> = {
      L: first(row(split)),
      R: last(row(split)),
    };
    let tip = split;
    for (let y = split; y < sole && y <= limit; y += 1) {
      const runs = row(y);
      const ks = kindsAt(y);
      for (const side of ["L", "R"] as const) {
        const p = prev[side];
        if (!p) continue;
        const pw = p.hi - p.lo;
        let best = 0;
        let bi = -1;
        runs.forEach((r, i) => {
          if (ks[i] !== "C") return;
          const overlap = Math.min(r.hi, p.hi) - Math.max(r.lo, p.lo);
          if (overlap > best) {
            best = overlap;
            bi = i;
          }
        });
        if (bi < 0) {
          prev[side] = null;
          continue;
        }
        let run = must(runs[bi]);
        if (run.hi - run.lo > 1.5 * pw + 8) {
          // Past the crotch with no stated hand length, a widening means the
          // hand ended and the tracker reached a leg.
          if (
            crotch !== null &&
            y > crotch &&
            options.armLengthRatio === undefined
          ) {
            prev[side] = null;
            continue;
          }
          // The gap between arm and body vanished on this row: keep the arm's
          // width and give the rest of the run back to the body.
          const arm: Run =
            side === "L"
              ? { lo: run.lo, hi: run.lo + pw }
              : { lo: run.hi - pw, hi: run.hi };
          const rest: Run =
            side === "L"
              ? { lo: run.lo + pw + 1, hi: run.hi }
              : { lo: run.lo, hi: run.hi - pw - 1 };
          runs.splice(bi, 1, ...(side === "L" ? [arm, rest] : [rest, arm]));
          ks.splice(bi, 0, "C");
          if (side === "R") bi += 1;
          run = arm;
        }
        ks[bi] = side;
        prev[side] = run;
        tip = Math.max(tip, y);
      }
    }
    handTip = tip;
    // Small pieces between a hand and the body belong to the hand.
    for (let y = split; y < sole; y += 1) {
      const runs = row(y);
      const ks = kindsAt(y);
      if (!ks.includes("L") && !ks.includes("R")) continue;
      const body = runs.filter((_, i) => ks[i] === "C");
      if (!body.length) continue;
      const biggest = Math.max(...body.map((r) => r.hi - r.lo));
      const solid = runs.filter(
        (r, i) => ks[i] === "C" && r.hi - r.lo >= 0.5 * biggest,
      );
      const lo = first(solid).lo;
      const hi = last(solid).hi;
      runs.forEach((r, i) => {
        if (ks[i] !== "C" || r.hi - r.lo >= 0.5 * biggest) return;
        if (ks.includes("L") && r.hi < lo) ks[i] = "L";
        else if (ks.includes("R") && r.lo > hi) ks[i] = "R";
      });
    }
  }

  return {
    width,
    height,
    top,
    sole,
    neck,
    neckBase,
    armSplit,
    crotch,
    ankle,
    handTip,
    midline,
    rows,
    kinds,
  };
}

/** Hand length relative to the arm split and crotch, for `armLengthRatio`. */
export function armLengthRatio(figure: FigureMeasurement): number | null {
  if (
    figure.armSplit === null ||
    figure.crotch === null ||
    figure.handTip === null
  )
    return null;
  return (figure.handTip - figure.armSplit) / (figure.crotch - figure.armSplit);
}

/** Piecewise-linear interpolation, extended linearly past both ends. */
function interp(x: number, xs: readonly number[], ys: readonly number[]) {
  const n = xs.length - 1;
  let i = 0;
  if (x >= must(xs[n])) i = n - 1;
  else while (i < n - 1 && x > must(xs[i + 1])) i += 1;
  const x0 = must(xs[i]);
  const x1 = must(xs[i + 1]);
  const y0 = must(ys[i]);
  const y1 = must(ys[i + 1]);
  return x1 === x0 ? y0 : y0 + ((x - x0) * (y1 - y0)) / (x1 - x0);
}

/** Matching landmark rows in both figures, strictly increasing in both. */
function keyRows(
  source: FigureMeasurement,
  target: FigureMeasurement,
  names: readonly (keyof FigureMeasurement)[],
): { src: number[]; dst: number[] } {
  const src: number[] = [];
  const dst: number[] = [];
  for (const name of names) {
    const s = source[name];
    const d = target[name];
    if (typeof s !== "number" || typeof d !== "number") continue;
    const ps = src[src.length - 1];
    const pd = dst[dst.length - 1];
    if (ps !== undefined && pd !== undefined && (s <= ps || d <= pd)) continue;
    src.push(s);
    dst.push(d);
  }
  return { src, dst };
}

function partRuns(figure: FigureMeasurement, y: number, kind: RunKind): Run[] {
  const runs = runsAt(figure.rows, y);
  const kinds = figure.kinds[y] ?? [];
  return runs.filter((_, i) => kinds[i] === kind);
}

export interface FitOptions {
  /** Pixels the garment reaches past the body edge on each side. */
  readonly ease?: number;
}

const BODY_KEYS = [
  "top",
  "neckBase",
  "armSplit",
  "crotch",
  "ankle",
  "sole",
] as const;
const ARM_KEYS = ["top", "neckBase", "armSplit", "handTip"] as const;

/**
 * Move a garment layer painted on `source` onto `target`.
 *
 * `layer` is on the source body's canvas (same width and height as the
 * measured source). The result is on the target body's canvas.
 */
export function fitLayer(
  layer: RgbaRaster,
  source: FigureMeasurement,
  target: FigureMeasurement,
  options: FitOptions = {},
): RgbaRaster {
  if (layer.width !== source.width || layer.height !== source.height)
    throw new Error("contour-fit: the layer must be on the source body canvas");
  const ease = options.ease ?? 6;
  const out = new Float32Array(target.width * target.height * 4);
  const filled = new Uint8Array(target.width * target.height);
  const bodyKeys = keyRows(source, target, BODY_KEYS);
  const armKeys = keyRows(source, target, ARM_KEYS);
  const layerHasRow = new Uint8Array(layer.height);
  for (let y = 0; y < layer.height; y += 1) {
    const base = y * layer.width * 4 + 3;
    for (let x = 0; x < layer.width; x += 1)
      if (px(layer.data, base + x * 4) > 0) {
        layerHasRow[y] = 1;
        break;
      }
  }

  for (let y = 0; y < target.height; y += 1) {
    for (const kind of ["C", "L", "R"] as const) {
      const dst = partRuns(target, y, kind);
      if (!dst.length) continue;
      const keys = kind === "C" ? bodyKeys : armKeys;
      if (keys.src.length < 2) continue;
      const ys = Math.round(interp(y, keys.dst, keys.src));
      if (ys < 0 || ys >= layer.height || !layerHasRow[ys]) continue;
      let src = partRuns(source, ys, kind);
      if (!src.length && kind !== "C") continue;
      if (!src.length) src = [...runsAt(source.rows, ys)];
      if (!src.length) continue;
      const pairs: [Run, Run][] =
        src.length === dst.length
          ? src.map((s, i): [Run, Run] => [s, must(dst[i])])
          : [
              [
                { lo: first(src).lo, hi: last(src).hi },
                { lo: first(dst).lo, hi: last(dst).hi },
              ],
            ];
      for (const [s, d] of pairs) {
        const a = d.lo - ease;
        const b = d.hi + ease;
        const sa = s.lo - ease;
        const sb = s.hi + ease;
        const xEnd = Math.min(b, target.width - 1);
        for (let x = Math.max(a, 0); x <= xEnd; x += 1) {
          const i = y * target.width + x;
          if (filled[i]) continue;
          const sx = sa + ((x - a) * (sb - sa)) / Math.max(b - a, 1);
          if (samplePremultiplied(layer, sx, ys, out, i * 4)) filled[i] = 1;
        }
      }
    }
  }
  return fromPremultiplied(out, target.width, target.height);
}

function samplePremultiplied(
  raster: RgbaRaster,
  x: number,
  y: number,
  out: Float32Array,
  o: number,
): boolean {
  const x0 = Math.floor(x);
  const t = x - x0;
  let r = 0;
  let g = 0;
  let b = 0;
  let a = 0;
  for (const [xi, w] of [
    [x0, 1 - t],
    [x0 + 1, t],
  ] as const) {
    if (w <= 0 || xi < 0 || xi >= raster.width) continue;
    const p = (y * raster.width + xi) * 4;
    const alpha = px(raster.data, p + 3);
    const k = (alpha / 255) * w;
    r += px(raster.data, p) * k;
    g += px(raster.data, p + 1) * k;
    b += px(raster.data, p + 2) * k;
    a += alpha * w;
  }
  if (a <= 0) return false;
  out[o] = r;
  out[o + 1] = g;
  out[o + 2] = b;
  out[o + 3] = a;
  return true;
}

function fromPremultiplied(
  premultiplied: Float32Array,
  width: number,
  height: number,
): RgbaRaster {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    const a = px(premultiplied, i * 4 + 3);
    if (a <= 0) continue;
    const k = 255 / a;
    data[i * 4] = px(premultiplied, i * 4) * k;
    data[i * 4 + 1] = px(premultiplied, i * 4 + 1) * k;
    data[i * 4 + 2] = px(premultiplied, i * 4 + 2) * k;
    data[i * 4 + 3] = a;
  }
  return { width, height, data };
}

/** Place a cropped component on a body canvas by its anchor and origin. */
export function placeOnCanvas(
  component: RgbaRaster,
  canvas: { readonly width: number; readonly height: number },
  anchor: { readonly x: number; readonly y: number },
  origin: { readonly x: number; readonly y: number },
): RgbaRaster {
  const out = new Uint8ClampedArray(canvas.width * canvas.height * 4);
  const left = Math.round(anchor.x * canvas.width - origin.x * component.width);
  const top = Math.round(
    anchor.y * canvas.height - origin.y * component.height,
  );
  for (let y = 0; y < component.height; y += 1) {
    const ty = top + y;
    if (ty < 0 || ty >= canvas.height) continue;
    for (let x = 0; x < component.width; x += 1) {
      const tx = left + x;
      if (tx < 0 || tx >= canvas.width) continue;
      const s = (y * component.width + x) * 4;
      out.set(component.data.subarray(s, s + 4), (ty * canvas.width + tx) * 4);
    }
  }
  return { width: canvas.width, height: canvas.height, data: out };
}

/** Straight-alpha "over" of `top` onto `bottom`; both on the same canvas. */
export function composeOver(bottom: RgbaRaster, top: RgbaRaster): RgbaRaster {
  if (bottom.width !== top.width || bottom.height !== top.height)
    throw new Error("contour-fit: compose needs matching canvases");
  const out = new Uint8ClampedArray(bottom.data.length);
  for (let i = 0; i < out.length; i += 4) {
    const ta = px(top.data, i + 3) / 255;
    const ba = px(bottom.data, i + 3) / 255;
    const a = ta + ba * (1 - ta);
    if (a <= 0) continue;
    for (let c = 0; c < 3; c += 1)
      out[i + c] =
        (px(top.data, i + c) * ta + px(bottom.data, i + c) * ba * (1 - ta)) / a;
    out[i + 3] = a * 255;
  }
  return { width: bottom.width, height: bottom.height, data: out };
}

// ---------------------------------------------------------------- color

type Lab = readonly [number, number, number];

function srgbToLinear(c: number) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}
function linearToSrgb(v: number) {
  const c = v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;
  return Math.round(Math.min(1, Math.max(0, c)) * 255);
}
const labF = (t: number) =>
  t > 216 / 24389 ? Math.cbrt(t) : (841 / 108) * t + 4 / 29;
const labFi = (t: number) => (t > 6 / 29 ? t ** 3 : (108 / 841) * (t - 4 / 29));

export function rgbToLab(r: number, g: number, b: number): Lab {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);
  const x = (0.4124 * lr + 0.3576 * lg + 0.1805 * lb) / 0.95047;
  const y = 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
  const z = (0.0193 * lr + 0.1192 * lg + 0.9505 * lb) / 1.08883;
  return [
    116 * labF(y) - 16,
    500 * (labF(x) - labF(y)),
    200 * (labF(y) - labF(z)),
  ];
}

export function labToRgb(
  l: number,
  a: number,
  b: number,
): [number, number, number] {
  const fy = (l + 16) / 116;
  const x = labFi(fy + a / 500) * 0.95047;
  const y = labFi(fy);
  const z = labFi(fy - b / 200) * 1.08883;
  return [
    linearToSrgb(3.2406 * x - 1.5372 * y - 0.4986 * z),
    linearToSrgb(-0.9689 * x + 1.8758 * y + 0.0415 * z),
    linearToSrgb(0.0557 * x - 0.204 * y + 1.057 * z),
  ];
}

export function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m?.[1]) throw new Error(`contour-fit: not a color: ${hex}`);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Move the base color of the masked pixels to `target` while keeping every
 * painted light and shadow: each pixel keeps its difference from the region's
 * median color. Dark ink blends back in by lightness so outlines stay ink.
 * Alpha is never changed.
 */
export function recolorRegion(
  raster: RgbaRaster,
  mask: (index: number) => boolean,
  target: string,
): RgbaRaster {
  const [tr, tg, tb] = hexToRgb(target);
  const tl = rgbToLab(tr, tg, tb);
  const labs: Lab[] = [];
  const idx: number[] = [];
  const n = raster.width * raster.height;
  const d = raster.data;
  for (let i = 0; i < n; i += 1) {
    if (px(d, i * 4 + 3) === 0 || !mask(i)) continue;
    idx.push(i);
    labs.push(rgbToLab(px(d, i * 4), px(d, i * 4 + 1), px(d, i * 4 + 2)));
  }
  const data = new Uint8ClampedArray(d);
  if (!idx.length) return { width: raster.width, height: raster.height, data };
  const median = (k: 0 | 1 | 2) => {
    const v = labs.map((l) => l[k]).sort((a, b) => a - b);
    return must(v[Math.floor(v.length / 2)]);
  };
  const ref: Lab = [median(0), median(1), median(2)];
  const kL = Math.min(1.4, Math.max(0.5, tl[0] / Math.max(ref[0], 1)));
  idx.forEach((i, j) => {
    const [l, a, b] = must(labs[j]);
    const nl = tl[0] + (l - ref[0]) * kL;
    const na = tl[1] + (a - ref[1]) * 0.85;
    const nb = tl[2] + (b - ref[2]) * 0.85;
    const w = Math.min(
      1,
      Math.max(0, (l - 14) / Math.max(ref[0] * 0.75 - 14, 1)),
    );
    data.set(
      labToRgb(l + (nl - l) * w, a + (na - a) * w, b + (nb - b) * w),
      i * 4,
    );
  });
  return { width: raster.width, height: raster.height, data };
}

/**
 * Remove light matte left on the outline by generation on a white ground: in
 * a band `band` pixels wide along the outline, any pixel at least `margin`
 * levels lighter than the nearest interior paint takes that paint's color.
 * Alpha is never changed.
 */
export function cleanOutline(
  raster: RgbaRaster,
  band = 3,
  margin = 60,
): RgbaRaster {
  const { width, height, data: d } = raster;
  const n = width * height;
  const dist = new Int16Array(n).fill(band + 1);
  const queue: number[] = [];
  for (let i = 0; i < n; i += 1)
    if (px(d, i * 4 + 3) < 128) {
      dist[i] = 0;
      queue.push(i);
    }
  for (let head = 0; head < queue.length; head += 1) {
    const i = must(queue[head]);
    const di = px(dist, i);
    if (di >= band) continue;
    const x = i % width;
    const y = (i - x) / width;
    for (let dy = -1; dy <= 1; dy += 1)
      for (let dx = -1; dx <= 1; dx += 1) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const j = ny * width + nx;
        if (px(dist, j) > di + 1) {
          dist[j] = di + 1;
          queue.push(j);
        }
      }
  }
  // Nearest interior color, grown outward from interior pixels.
  const color = new Int16Array(n * 3).fill(-1);
  const grow: number[] = [];
  for (let i = 0; i < n; i += 1)
    if (px(dist, i) > band && px(d, i * 4 + 3) >= 250) {
      color[i * 3] = px(d, i * 4);
      color[i * 3 + 1] = px(d, i * 4 + 1);
      color[i * 3 + 2] = px(d, i * 4 + 2);
      grow.push(i);
    }
  const steps = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const;
  for (let head = 0; head < grow.length; head += 1) {
    const i = must(grow[head]);
    const x = i % width;
    const y = (i - x) / width;
    for (const [dx, dy] of steps) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const j = ny * width + nx;
      if (px(color, j * 3) >= 0 || px(dist, j) > band || px(d, j * 4 + 3) === 0)
        continue;
      color[j * 3] = px(color, i * 3);
      color[j * 3 + 1] = px(color, i * 3 + 1);
      color[j * 3 + 2] = px(color, i * 3 + 2);
      grow.push(j);
    }
  }
  const data = new Uint8ClampedArray(d);
  for (let i = 0; i < n; i += 1) {
    if (px(d, i * 4 + 3) === 0 || px(dist, i) > band || px(color, i * 3) < 0)
      continue;
    const own = (px(d, i * 4) + px(d, i * 4 + 1) + px(d, i * 4 + 2)) / 3;
    const near =
      (px(color, i * 3) + px(color, i * 3 + 1) + px(color, i * 3 + 2)) / 3;
    if (own > near + margin) {
      data[i * 4] = px(color, i * 3);
      data[i * 4 + 1] = px(color, i * 3 + 1);
      data[i * 4 + 2] = px(color, i * 3 + 2);
    }
  }
  return { width, height, data };
}
