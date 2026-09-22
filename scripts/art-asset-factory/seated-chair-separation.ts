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
 * How it separates, and the two things that had to be true at once:
 *
 * - NOTHING OF THE FIGURE MAY BE TAKEN. Lit body tone is found by colour
 *   (chromatic and light, never by position), and everything within
 *   `OUTLINE_REACH_PX` of it is protected, which is the figure's own outline
 *   and shading. That protection is absolute: a protected pixel is never
 *   cleared, whatever else is true of it.
 * - WHAT IS TAKEN MUST BE THE CHAIR. A pixel is cleared only if it is
 *   CONNECTED, through unprotected pixels, to the chair's own neutral-grey
 *   fill. An unprotected dark pixel that reaches no chair fill is left alone,
 *   so a shadow of the figure's that happens to sit clear of the body is kept
 *   rather than guessed at.
 * - Nothing ABOVE the seat plane is touched at all, which is what protects the
 *   garment: shorts and tops are neutral grey too, and they live above it.
 *
 * KNOWN INCOMPLETE. This errs toward the figure, so it under-removes: the
 * chair's own dark outline is drawn in the same brown as the body's, and where
 * that outline falls inside the protected band it survives. The result is a
 * residual chair contour on some plates. That is a visible defect and these
 * derivatives are NOT approvable until it is gone; it is recorded here and in
 * the report rather than left for someone to find.
 *
 * The first version of this took roughly a pixel of the figure's own contour
 * everywhere below the seat line, and the whole foot outline, because it asked
 * for chroma above 45 and the feet are drawn desaturated at 19 to 24. It was
 * caught by rendering ONLY the removed pixels rather than looking at the
 * result. Looking at a result tells you what survived, not what went; anything
 * subtractive should be checked the second way.
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

/**
 * Lit body tone: chromatic and light. The thresholds are deliberately generous
 * because the cost of missing body tone is taking part of the figure. The feet
 * in these plates sit at chroma 19 and were missed by an earlier, tighter test.
 */
const BODY_MIN_CHROMA = 15;
const BODY_MIN_VALUE = 110;

/** The chair's own fill is neutral: the grey axis, with essentially no chroma. */
const CHAIR_MAX_CHROMA = 10;

/**
 * How far the figure's own outline and shading reach from lit body tone, in
 * pixels. Three covers the drawn line weight at this master size with a margin,
 * and erring high costs only residual chair, never part of the person.
 */
const OUTLINE_REACH_PX = 3;

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

function chroma(r: number, g: number, b: number): number {
  return Math.max(r, g, b) - Math.min(r, g, b);
}

function isBodyTone(r: number, g: number, b: number, a: number): boolean {
  if (a <= ALPHA_FLOOR) return false;
  return (
    chroma(r, g, b) >= BODY_MIN_CHROMA && Math.max(r, g, b) >= BODY_MIN_VALUE
  );
}

function isChairFill(r: number, g: number, b: number, a: number): boolean {
  if (a <= ALPHA_FLOOR) return false;
  return chroma(r, g, b) < CHAIR_MAX_CHROMA;
}

interface PlateMasks {
  readonly opaque: Uint8Array;
  /** Lit body tone plus its outline reach. Never cleared, under any condition. */
  readonly protectedMask: Uint8Array;
  readonly chairFill: Uint8Array;
}

export function platemasks(bitmap: Bitmap): PlateMasks {
  const { width, height } = bitmap;
  const opaque = new Uint8Array(width * height);
  const bodyTone = new Uint8Array(width * height);
  const chairFill = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const rgba = bitmap.getPixelRGBA(x, y);
      const r = (rgba >> 24) & 0xff;
      const g = (rgba >> 16) & 0xff;
      const b = (rgba >> 8) & 0xff;
      const a = rgba & 0xff;
      const i = y * width + x;
      if (a <= ALPHA_FLOOR) continue;
      opaque[i] = 1;
      if (isBodyTone(r, g, b, a)) bodyTone[i] = 1;
      else if (isChairFill(r, g, b, a)) chairFill[i] = 1;
    }
  }
  // Square dilation, so the result is exactly reproducible.
  const protectedMask = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (bodyTone[y * width + x] !== 1) continue;
      const y0 = Math.max(0, y - OUTLINE_REACH_PX);
      const y1 = Math.min(height - 1, y + OUTLINE_REACH_PX);
      const x0 = Math.max(0, x - OUTLINE_REACH_PX);
      const x1 = Math.min(width - 1, x + OUTLINE_REACH_PX);
      for (let yy = y0; yy <= y1; yy += 1) {
        for (let xx = x0; xx <= x1; xx += 1) protectedMask[yy * width + xx] = 1;
      }
    }
  }
  return { opaque, protectedMask, chairFill };
}

/**
 * The chair: every unprotected opaque pixel reachable, eight-connected, from
 * the chair's own neutral fill without crossing a protected pixel.
 *
 * Reachability rather than colour is what lets the chair's dark outline go
 * while a dark pixel belonging to the figure stays: the chair's outline hangs
 * off chair fill, and a mark of the figure's does not.
 */
export function chairRegion(bitmap: Bitmap, masks: PlateMasks): Uint8Array {
  const { width, height } = bitmap;
  const { opaque, protectedMask, chairFill } = masks;
  const reached = new Uint8Array(width * height);
  const queue: number[] = [];
  for (let i = 0; i < width * height; i += 1) {
    if (chairFill[i] === 1 && protectedMask[i] !== 1) {
      reached[i] = 1;
      queue.push(i);
    }
  }
  for (let head = 0; head < queue.length; head += 1) {
    const i = queue[head]!;
    const y = Math.floor(i / width);
    const x = i - y * width;
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        const ny = y + dy;
        const nx = x + dx;
        if (ny < 0 || ny >= height || nx < 0 || nx >= width) continue;
        const j = ny * width + nx;
        if (reached[j] === 1 || opaque[j] !== 1 || protectedMask[j] === 1)
          continue;
        reached[j] = 1;
        queue.push(j);
      }
    }
  }
  return reached;
}

export async function separateOne(
  repositoryRoot: string,
  subject: SeparationSubject,
): Promise<SeparationResult> {
  const sourceFile = path.join(repositoryRoot, subject.sourcePath);
  const bitmap = await readPng(sourceFile);
  const { width, height } = bitmap;
  const masks = platemasks(bitmap);
  const chair = chairRegion(bitmap, masks);
  const seatPlaneRow = Math.round(subject.seatPlaneYFraction * height);

  let cleared = 0;
  let kept = 0;
  for (let y = seatPlaneRow; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = y * width + x;
      if (masks.opaque[i] !== 1) continue;
      if (chair[i] !== 1) {
        kept += 1;
        continue;
      }
      // Clear ALPHA only. The colour channels are left exactly as drawn, so the
      // operation is reversible from the original and adds no invented colour.
      bitmap.setPixelRGBA(x, y, bitmap.getPixelRGBA(x, y) & 0xffffff00);
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
          "Deterministic alpha-clearing derivative of the owner's wave-a seated plates. Pixels are removed, never added; no colour is invented and nothing is drawn. Lit body tone and everything within the outline reach of it is never cleared, and a pixel is cleared only where it is connected to the chair's own neutral fill. Each output is a CANDIDATE awaiting the owner's own look, not released art.",
        known_incomplete:
          "This errs toward the figure and so under-removes. The chair's dark outline is drawn in the same brown as the body's, and where it falls inside the protected band it survives, leaving a residual chair contour on some plates. These derivatives are NOT approvable until that is gone. Verify any change by rendering ONLY the removed pixels: looking at the result tells you what survived, not what went, and an earlier version of this took the whole foot outline without that being visible in the result.",
        parameters: {
          alpha_floor: ALPHA_FLOOR,
          body_min_chroma: BODY_MIN_CHROMA,
          body_min_value: BODY_MIN_VALUE,
          chair_max_chroma: CHAIR_MAX_CHROMA,
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
