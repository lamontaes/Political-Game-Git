import crypto from "crypto";
import { PNG } from "pngjs";

/**
 * Taking a green background off an edge without redrawing the figure.
 *
 * The eight adult feminine body poses were all classified REVISE for one
 * reason: 68.9% of their soft-edge pixels carry a green contour picked up from
 * whatever they were cut out of. The obvious response is to ask for eight new
 * generations. Measuring the rasters first says that would be the wrong call.
 *
 * On `ocd_body_adult_fem_standing_neutral_a_v1.png`:
 *
 *   alpha 250+     473,026 px    0 green-dominant   (0.000%)
 *   alpha 201-249   30,448 px    1,396              (4.58%)
 *   alpha 32-200    48,607 px   33,499              (68.92%)
 *   alpha 1-31      10,800 px   10,800              (100.00%)
 *
 * The interior is not contaminated at all. Every green pixel is within a few
 * pixels of transparency — 8,036 at 1px, tapering to 609 at 8px. This is not a
 * figure drawn in the wrong colours; it is a matte artifact on the boundary,
 * which is exactly the class of defect a deterministic despill exists for.
 *
 * ## The rules this works under
 *
 * **Alpha is never written.** The silhouette, and therefore the morphology and
 * the pose, come out byte-identical. The report carries a sha256 of the alpha
 * channel before and after and the caller is expected to compare them; a run
 * that changed the silhouette is a failed run, not a judgement call.
 *
 * **Interior pixels are never touched.** The cut is at alpha >= 250, where the
 * measurement says contamination is zero. So no skin, no face, no hand and no
 * garment interior can be altered by construction rather than by tuning.
 *
 * **Colour is reconstructed from the figure, not invented.** A treated pixel
 * takes the inverse-distance weighted mean of the nearest interior pixels. That
 * is why a genuinely green sleeve survives: its interior is green, so the
 * reconstruction returns green and the operation is a no-op there. Nothing is
 * generated, nothing is warped, nothing is filled from a model.
 *
 * **Pixels far from the boundary are left alone.** A green pixel eight or more
 * pixels inside the silhouette is not fringe; it is material. The distance gate
 * is the second protection for green clothing, behind reconstruction.
 */

export interface DespillOptions {
  /**
   * How much greener than both neighbours a pixel must be to count.
   *
   * 24 by default, which is not a new number: it is the threshold
   * `source-sheet-chop.ts` already uses to report green fringe, so the metric
   * that found the defect and the operation that repairs it agree on what green
   * means.
   */
  readonly greenDominanceThreshold: number;
  /** At or above this alpha a pixel is interior and is never modified. */
  readonly interiorAlpha: number;
  /**
   * Green further than this from transparency is material, not fringe.
   *
   * Applied only when the figure actually contains green material. A raster
   * whose interior carries zero green-dominant pixels has nothing green in it
   * to protect, so gating on distance there would leave contamination behind
   * to guard against a garment that does not exist. Which of the two applies
   * is measured per file, not chosen — see `materialGreenInteriorPixels`.
   */
  readonly maxBoundaryDistance: number;
  /** How far to look for interior colour to reconstruct from. */
  readonly reconstructionRadius: number;
  /** How many interior neighbours to average. */
  readonly reconstructionSamples: number;
}

export const DEFAULT_DESPILL_OPTIONS: DespillOptions = {
  greenDominanceThreshold: 24,
  interiorAlpha: 250,
  maxBoundaryDistance: 8,
  reconstructionRadius: 14,
  reconstructionSamples: 6,
};

export interface AlphaBandStat {
  readonly band: string;
  readonly pixels: number;
  readonly greenDominant: number;
}

export interface DespillReport {
  readonly width: number;
  readonly height: number;
  readonly options: DespillOptions;
  /** Non-zero-alpha pixels. */
  readonly figurePixels: number;
  readonly before: readonly AlphaBandStat[];
  readonly after: readonly AlphaBandStat[];
  /** The headline number the intake used: green share of alpha 32..200. */
  readonly softEdgeGreenPercentBefore: number;
  readonly softEdgeGreenPercentAfter: number;
  readonly pixelsReconstructed: number;
  readonly pixelsClampFallback: number;
  readonly pixelsLeftAsMaterial: number;
  /**
   * Green-dominant pixels in the provably clean interior (alpha >= 250).
   *
   * Zero means the figure wears nothing green, so every green pixel anywhere in
   * it is matte contamination and the distance gate is not applied. Non-zero
   * means there is green material to protect and the gate is.
   */
  readonly materialGreenInteriorPixels: number;
  /** What `materialGreenInteriorPixels` had to reach for the gate to apply. */
  readonly materialGreenFloor: number;
  readonly boundaryGateApplied: boolean;
  /**
   * sha256 of the RGB of every pixel at alpha >= 250, before and after.
   *
   * The second hard proof beside the alpha digest: equal digests mean no
   * interior pixel was written, so no face, hand, foot or garment interior can
   * have been altered. Together the two say the operation touched only the
   * edge, and say it in a way that does not depend on anybody looking.
   */
  readonly interiorRgbSha256Before: string;
  readonly interiorRgbSha256After: string;
  readonly maxChannelDelta: number;
  /** Proof the silhouette is untouched. These two must be equal. */
  readonly alphaSha256Before: string;
  readonly alphaSha256After: string;
  /**
   * Where the changes landed, as a share of treated pixels by vertical band of
   * the figure box. Hands and feet are the regions a bad despill eats, so the
   * distribution is reported rather than asserted.
   */
  readonly treatedByFigureBand: Readonly<Record<string, number>>;
}

const BANDS: readonly {
  readonly band: string;
  readonly lo: number;
  readonly hi: number;
}[] = [
  { band: "1-31", lo: 1, hi: 31 },
  { band: "32-200", lo: 32, hi: 200 },
  { band: "201-249", lo: 201, hi: 249 },
  { band: "250+", lo: 250, hi: 255 },
];

function isGreenDominant(
  data: Buffer,
  offset: number,
  threshold: number,
): boolean {
  const red = data[offset]!;
  const green = data[offset + 1]!;
  const blue = data[offset + 2]!;
  return green > red + threshold && green > blue + threshold;
}

function bandStats(
  data: Buffer,
  width: number,
  height: number,
  threshold: number,
): AlphaBandStat[] {
  const counts = new Map<string, { pixels: number; green: number }>();
  for (const { band } of BANDS) counts.set(band, { pixels: 0, green: 0 });
  for (let index = 0; index < width * height; index += 1) {
    const offset = index * 4;
    const alpha = data[offset + 3]!;
    if (alpha === 0) continue;
    const entry = BANDS.find(({ lo, hi }) => alpha >= lo && alpha <= hi);
    if (!entry) continue;
    const slot = counts.get(entry.band)!;
    slot.pixels += 1;
    if (isGreenDominant(data, offset, threshold)) slot.green += 1;
  }
  return BANDS.map(({ band }) => ({
    band,
    pixels: counts.get(band)!.pixels,
    greenDominant: counts.get(band)!.green,
  }));
}

function alphaDigest(data: Buffer, width: number, height: number): string {
  const alpha = Buffer.allocUnsafe(width * height);
  for (let index = 0; index < width * height; index += 1) {
    alpha[index] = data[index * 4 + 3]!;
  }
  return crypto.createHash("sha256").update(alpha).digest("hex");
}

function interiorRgbDigest(
  data: Buffer,
  width: number,
  height: number,
  interiorAlpha: number,
): string {
  const hash = crypto.createHash("sha256");
  const pixel = Buffer.allocUnsafe(3);
  for (let index = 0; index < width * height; index += 1) {
    const offset = index * 4;
    if (data[offset + 3]! < interiorAlpha) continue;
    pixel[0] = data[offset]!;
    pixel[1] = data[offset + 1]!;
    pixel[2] = data[offset + 2]!;
    hash.update(pixel);
  }
  return hash.digest("hex");
}

/**
 * Distance from every pixel to the nearest fully transparent pixel, capped.
 *
 * A two-pass chamfer rather than a per-pixel search: the naive version is
 * O(n·r²) and this raster is 1.5 million pixels. The cap is the distance gate
 * plus one, because nothing beyond it is treated and the exact value there does
 * not matter.
 */
function boundaryDistance(
  data: Buffer,
  width: number,
  height: number,
  cap: number,
): Uint8Array {
  const distance = new Uint8Array(width * height);
  distance.fill(cap);
  for (let index = 0; index < width * height; index += 1) {
    if (data[index * 4 + 3]! === 0) distance[index] = 0;
  }
  const relax = (index: number, from: number) => {
    const next = distance[from]! + 1;
    if (next < distance[index]!) distance[index] = next;
  };
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (x > 0) relax(index, index - 1);
      if (y > 0) relax(index, index - width);
    }
  }
  for (let y = height - 1; y >= 0; y -= 1) {
    for (let x = width - 1; x >= 0; x -= 1) {
      const index = y * width + x;
      if (x < width - 1) relax(index, index + 1);
      if (y < height - 1) relax(index, index + width);
    }
  }
  return distance;
}

export interface DespillResult {
  readonly png: PNG;
  readonly report: DespillReport;
}

export function despillGreenEdge(
  source: PNG,
  options: DespillOptions = DEFAULT_DESPILL_OPTIONS,
): DespillResult {
  const { width, height } = source;
  const output = new PNG({ width, height });
  source.data.copy(output.data);
  const data = output.data;
  const original = Buffer.from(source.data);

  const before = bandStats(
    original,
    width,
    height,
    options.greenDominanceThreshold,
  );
  const alphaBefore = alphaDigest(original, width, height);

  // Does this figure contain any green material at all? The interior is the
  // only place that can answer it: contamination lives on the boundary, so a
  // green pixel at full opacity is paint. Every one of the eight bodies
  // measured zero here, which is why their residual after a distance-gated
  // pass was contamination the gate had protected rather than cloth.
  const interiorBand = before.find((entry) => entry.band === "250+")!;
  const materialGreenInteriorPixels = interiorBand.greenDominant;
  // A handful of stray pixels is compression noise, not a garment. The floor is
  // deliberately generous — a green sleeve is tens of thousands of pixels, and
  // one body in this batch tripped a `> 0` test on a single pixel out of
  // 477,813 and kept 1.02% of its fringe as a result.
  const materialGreenFloor = Math.max(
    64,
    Math.round(interiorBand.pixels * 0.0005),
  );
  const boundaryGateApplied = materialGreenInteriorPixels >= materialGreenFloor;
  const distance = boundaryDistance(
    original,
    width,
    height,
    options.maxBoundaryDistance + 1,
  );

  // The figure box, so the report can say where the treated pixels were.
  let minY = height;
  let maxY = -1;
  let figurePixels = 0;
  for (let index = 0; index < width * height; index += 1) {
    if (original[index * 4 + 3]! === 0) continue;
    figurePixels += 1;
    const y = Math.floor(index / width);
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const figureHeight = Math.max(1, maxY - minY + 1);
  const treatedByFigureBand: Record<string, number> = {
    "head 0-15%": 0,
    "torso 15-55%": 0,
    "hands and hips 55-70%": 0,
    "legs 70-92%": 0,
    "feet 92-100%": 0,
  };
  const bandFor = (y: number): string => {
    const fraction = (y - minY) / figureHeight;
    if (fraction < 0.15) return "head 0-15%";
    if (fraction < 0.55) return "torso 15-55%";
    if (fraction < 0.7) return "hands and hips 55-70%";
    if (fraction < 0.92) return "legs 70-92%";
    return "feet 92-100%";
  };

  let pixelsReconstructed = 0;
  let pixelsClampFallback = 0;
  let pixelsLeftAsMaterial = 0;
  let maxChannelDelta = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const offset = index * 4;
      const alpha = original[offset + 3]!;
      if (alpha === 0) continue;
      if (alpha >= options.interiorAlpha) continue;
      if (!isGreenDominant(original, offset, options.greenDominanceThreshold)) {
        continue;
      }
      if (
        boundaryGateApplied &&
        distance[index]! > options.maxBoundaryDistance
      ) {
        // Deep green with a soft alpha is material — a green sleeve seen
        // through an antialiased overlap, not a matte edge. Left alone.
        pixelsLeftAsMaterial += 1;
        continue;
      }

      // Nearest interior colour, inverse-distance weighted. Interior is proven
      // clean, so this reconstructs the figure's own colour rather than
      // inventing one.
      let weightSum = 0;
      let red = 0;
      let green = 0;
      let blue = 0;
      let samples = 0;
      for (
        let radius = 1;
        radius <= options.reconstructionRadius &&
        samples < options.reconstructionSamples;
        radius += 1
      ) {
        for (let dy = -radius; dy <= radius; dy += 1) {
          for (let dx = -radius; dx <= radius; dx += 1) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            const neighbour = (ny * width + nx) * 4;
            if (original[neighbour + 3]! < options.interiorAlpha) continue;
            const weight = 1 / radius;
            weightSum += weight;
            red += original[neighbour]! * weight;
            green += original[neighbour + 1]! * weight;
            blue += original[neighbour + 2]! * weight;
            samples += 1;
            if (samples >= options.reconstructionSamples) break;
          }
          if (samples >= options.reconstructionSamples) break;
        }
      }

      let nextRed: number;
      let nextGreen: number;
      let nextBlue: number;
      if (weightSum > 0) {
        nextRed = Math.round(red / weightSum);
        nextGreen = Math.round(green / weightSum);
        nextBlue = Math.round(blue / weightSum);
        pixelsReconstructed += 1;
      } else {
        // No interior within reach — a thin filament such as a stray hair or a
        // finger gap. Clamp the green to its neighbours rather than guess a
        // colour: it removes the cast and cannot introduce one.
        nextRed = original[offset]!;
        nextBlue = original[offset + 2]!;
        nextGreen = Math.min(
          original[offset + 1]!,
          Math.round((nextRed + nextBlue) / 2),
        );
        pixelsClampFallback += 1;
      }

      maxChannelDelta = Math.max(
        maxChannelDelta,
        Math.abs(nextRed - original[offset]!),
        Math.abs(nextGreen - original[offset + 1]!),
        Math.abs(nextBlue - original[offset + 2]!),
      );
      data[offset] = nextRed;
      data[offset + 1] = nextGreen;
      data[offset + 2] = nextBlue;
      // Alpha deliberately untouched.
      treatedByFigureBand[bandFor(y)] += 1;
    }
  }

  const after = bandStats(data, width, height, options.greenDominanceThreshold);
  const softBefore = before.find((entry) => entry.band === "32-200")!;
  const softAfter = after.find((entry) => entry.band === "32-200")!;

  return {
    png: output,
    report: {
      width,
      height,
      options,
      figurePixels,
      before,
      after,
      softEdgeGreenPercentBefore:
        softBefore.pixels === 0
          ? 0
          : (softBefore.greenDominant / softBefore.pixels) * 100,
      softEdgeGreenPercentAfter:
        softAfter.pixels === 0
          ? 0
          : (softAfter.greenDominant / softAfter.pixels) * 100,
      pixelsReconstructed,
      pixelsClampFallback,
      pixelsLeftAsMaterial,
      materialGreenInteriorPixels,
      materialGreenFloor,
      boundaryGateApplied,
      interiorRgbSha256Before: interiorRgbDigest(
        original,
        width,
        height,
        options.interiorAlpha,
      ),
      interiorRgbSha256After: interiorRgbDigest(
        data,
        width,
        height,
        options.interiorAlpha,
      ),
      maxChannelDelta,
      alphaSha256Before: alphaBefore,
      alphaSha256After: alphaDigest(data, width, height),
      treatedByFigureBand,
    },
  };
}

/** Which of the three dispositions the numbers support. */
export type DespillDisposition =
  | "SALVAGEABLE BY DETERMINISTIC DESPILL"
  | "RE-EXPORT PREFERRED"
  | "REGENERATION REQUIRED";

/**
 * The verdict, from the measurements rather than from an opinion.
 *
 * A salvage is only claimed when the silhouette is provably untouched and the
 * defect the intake measured is actually gone. Anything the operation could
 * not clear falls to a re-export, because a re-export is cheap and correct;
 * regeneration is reserved for a figure whose geometry is wrong, which is a
 * different failure this operation cannot and should not address.
 */
export function classifyDespill(report: DespillReport): DespillDisposition {
  if (report.alphaSha256Before !== report.alphaSha256After) {
    return "RE-EXPORT PREFERRED";
  }
  if (report.interiorRgbSha256Before !== report.interiorRgbSha256After) {
    return "RE-EXPORT PREFERRED";
  }
  if (report.softEdgeGreenPercentAfter <= 0.5) {
    return "SALVAGEABLE BY DETERMINISTIC DESPILL";
  }
  return "RE-EXPORT PREFERRED";
}
