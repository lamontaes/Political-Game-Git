import fs from "fs";
import path from "path";

import { hashArtFile } from "./content-hash";
import { readPng, writePng } from "./pg-modular-intake";

/**
 * Seated chair SEPARATION.
 *
 * Four of the wave-a seated crops are complete, propless-below-the-waist
 * figures with a chair drawn BEHIND them: a sliver of seat edge between the
 * thighs and four thin legs. The admission refuses them, correctly, because a
 * modular body may not carry furniture the room owns. The consequence is that
 * no man can sit anywhere in the game, since every man's front-facing seated
 * crop is one of these.
 *
 * This recovers the body that is already drawn. It is a DETERMINISTIC
 * DERIVATIVE of the owner's plate, not new artwork: it deletes pixels and adds
 * none, and the same input bytes and parameters always produce the same output
 * bytes. Nothing here draws, paints, infills or generates.
 *
 * How it separates, and why it is safe to do by machine on these four:
 *
 * - The figure's skin is chromatic (warm, well off the grey axis); the chair is
 *   neutral grey and near-black outline. So skin is found by saturation, never
 *   by position.
 * - Below the seat plane a pixel is kept only if it lies within
 *   `OUTLINE_REACH_PX` of skin, which is the body's own outline and shading,
 *   and is dropped otherwise, which is the chair. The chair legs run clear of
 *   the calves, so they fall outside that reach; the body's outline never does.
 * - Nothing ABOVE the seat plane is touched at all, which is what protects the
 *   garment: shorts and tops are neutral grey too, and they live above it.
 *
 * What this does NOT do. It does not touch a plate whose prop is a DESK: a desk
 * is painted across the lap and forearms, so separating it would mean inventing
 * the body underneath, and inventing is the one thing this must not do. Those
 * stay retained.
 *
 * The output is a CANDIDATE. The owner approves how people look, and that does
 * not change because the bytes came from a script rather than a generator.
 */

export const SEATED_CHAIR_SEPARATION_VERSION = "seated-chair-separation-v1";

export const SEPARATION_OUTPUT_DIR =
  "art/generated/candidates/wave-a-chairless";

export const SEPARATION_REPORT_PATH =
  "art/qa/wave-a-chairless/seated-chair-separation-report.json";

/** Alpha at or below this is already background. */
const ALPHA_FLOOR = 32;

/** Chroma above this, with a warm red channel, reads as skin rather than chair. */
const SKIN_MIN_CHROMA = 45;
const SKIN_MIN_RED = 120;

/**
 * How far the body's own outline and shading reach from lit skin, in pixels.
 * Two is the drawn line weight at this master size; the chair legs stand clear
 * of the calves by far more, which is what makes the two separable at all.
 */
const OUTLINE_REACH_PX = 2;

export interface SeparationSubject {
  /** The owner's plate. Read, never written. */
  readonly sourcePath: string;
  /** Where the recovered body is written. */
  readonly outputPath: string;
  /**
   * Seat plane as a fraction of canvas height. Nothing above it is touched.
   * Measured from the plate's own seated figure, not assumed.
   */
  readonly seatPlaneYFraction: number;
  /** What the sweep recorded as painted into the crop. */
  readonly bakedProp: "chair";
}

export const SEATED_CHAIR_SUBJECTS: readonly SeparationSubject[] = [
  {
    sourcePath:
      "art/generated/candidates/wave-a-morphology/average-man/wave_a_average_man_seated_front_neutral_v1.png",
    outputPath: `${SEPARATION_OUTPUT_DIR}/wave_a_average_man_seated_front_neutral_chairless_v1.png`,
    seatPlaneYFraction: 0.603,
    bakedProp: "chair",
  },
  {
    sourcePath:
      "art/generated/candidates/recent-drive-sweep/fat-man/wave_a_fat_man_seated_front_chair_v1.png",
    outputPath: `${SEPARATION_OUTPUT_DIR}/wave_a_fat_man_seated_front_chairless_v1.png`,
    seatPlaneYFraction: 0.6,
    bakedProp: "chair",
  },
  {
    sourcePath:
      "art/generated/candidates/recent-drive-sweep/skinny-man/wave_a_skinny_man_seated_front_chair_v1.png",
    outputPath: `${SEPARATION_OUTPUT_DIR}/wave_a_skinny_man_seated_front_chairless_v1.png`,
    seatPlaneYFraction: 0.6,
    bakedProp: "chair",
  },
  {
    sourcePath:
      "art/generated/candidates/wave-a-morphology/older-woman/wave_a_older_woman_seated_front_neutral_v1.png",
    outputPath: `${SEPARATION_OUTPUT_DIR}/wave_a_older_woman_seated_front_neutral_chairless_v1.png`,
    seatPlaneYFraction: 0.6,
    bakedProp: "chair",
  },
];

export interface SeparationResult {
  readonly sourcePath: string;
  readonly sourceSha256: string;
  readonly outputPath: string;
  readonly outputSha256: string;
  readonly canvas: { readonly width: number; readonly height: number };
  readonly seatPlaneRow: number;
  readonly pixelsCleared: number;
  readonly pixelsKept: number;
  /** True when no pixel above the seat plane changed. Asserted, not assumed. */
  readonly untouchedAboveSeatPlane: boolean;
}

type Bitmap = Awaited<ReturnType<typeof readPng>>;

function isSkin(r: number, g: number, b: number, a: number): boolean {
  if (a <= ALPHA_FLOOR) return false;
  const chroma = Math.max(r, g, b) - Math.min(r, g, b);
  return chroma > SKIN_MIN_CHROMA && r > SKIN_MIN_RED;
}

/**
 * The mask of pixels the body's own line work can occupy: lit skin, plus
 * everything within `OUTLINE_REACH_PX` of it. Computed as a plain square
 * dilation so the result is exactly reproducible.
 */
export function bodyReachMask(bitmap: Bitmap): Uint8Array {
  const { width, height } = bitmap;
  const skin = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const rgba = bitmap.getPixelRGBA(x, y);
      const r = (rgba >> 24) & 0xff;
      const g = (rgba >> 16) & 0xff;
      const b = (rgba >> 8) & 0xff;
      const a = rgba & 0xff;
      if (isSkin(r, g, b, a)) skin[y * width + x] = 1;
    }
  }
  const reach = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (skin[y * width + x] !== 1) continue;
      const y0 = Math.max(0, y - OUTLINE_REACH_PX);
      const y1 = Math.min(height - 1, y + OUTLINE_REACH_PX);
      const x0 = Math.max(0, x - OUTLINE_REACH_PX);
      const x1 = Math.min(width - 1, x + OUTLINE_REACH_PX);
      for (let yy = y0; yy <= y1; yy += 1) {
        for (let xx = x0; xx <= x1; xx += 1) reach[yy * width + xx] = 1;
      }
    }
  }
  return reach;
}

export async function separateOne(
  repositoryRoot: string,
  subject: SeparationSubject,
): Promise<SeparationResult> {
  const sourceFile = path.join(repositoryRoot, subject.sourcePath);
  const bitmap = await readPng(sourceFile);
  const { width, height } = bitmap;
  const reach = bodyReachMask(bitmap);
  const seatPlaneRow = Math.round(subject.seatPlaneYFraction * height);

  let cleared = 0;
  let kept = 0;
  for (let y = seatPlaneRow; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const rgba = bitmap.getPixelRGBA(x, y);
      const a = rgba & 0xff;
      if (a <= ALPHA_FLOOR) continue;
      if (reach[y * width + x] === 1) {
        kept += 1;
        continue;
      }
      // Clear ALPHA only. The colour channels are left exactly as drawn, so the
      // operation is reversible from the original and adds no invented colour.
      bitmap.setPixelRGBA(x, y, rgba & 0xffffff00);
      cleared += 1;
    }
  }

  const outputFile = path.join(repositoryRoot, subject.outputPath);
  await writePng(outputFile, bitmap);

  const verify = await readPng(outputFile);
  const original = await readPng(sourceFile);
  let untouchedAboveSeatPlane = true;
  for (let y = 0; y < seatPlaneRow && untouchedAboveSeatPlane; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (verify.getPixelRGBA(x, y) !== original.getPixelRGBA(x, y)) {
        untouchedAboveSeatPlane = false;
        break;
      }
    }
  }

  return {
    sourcePath: subject.sourcePath,
    sourceSha256: hashArtFile(sourceFile),
    outputPath: subject.outputPath,
    outputSha256: hashArtFile(outputFile),
    canvas: { width, height },
    seatPlaneRow,
    pixelsCleared: cleared,
    pixelsKept: kept,
    untouchedAboveSeatPlane,
  };
}

export async function separateSeatedChairs(
  repositoryRoot: string,
): Promise<readonly SeparationResult[]> {
  const results: SeparationResult[] = [];
  for (const subject of SEATED_CHAIR_SUBJECTS) {
    results.push(await separateOne(repositoryRoot, subject));
  }
  const reportFile = path.join(repositoryRoot, SEPARATION_REPORT_PATH);
  fs.mkdirSync(path.dirname(reportFile), { recursive: true });
  fs.writeFileSync(
    reportFile,
    `${JSON.stringify(
      {
        schema: "seated-chair-separation-report-v1",
        generator: SEATED_CHAIR_SEPARATION_VERSION,
        operation:
          "Deterministic alpha-clearing derivative of the owner's wave-a seated plates. Pixels are removed, never added; no colour is invented and nothing is drawn. Each output is a CANDIDATE awaiting the owner's own look, not released art.",
        parameters: {
          alpha_floor: ALPHA_FLOOR,
          skin_min_chroma: SKIN_MIN_CHROMA,
          skin_min_red: SKIN_MIN_RED,
          outline_reach_px: OUTLINE_REACH_PX,
        },
        release_status: "CANDIDATE_REFERENCE_ONLY",
        production_pixels_released: false,
        derivatives: results,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  return results;
}
