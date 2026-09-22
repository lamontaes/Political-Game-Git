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
 * - WHAT TOUCHES THE FIGURE STAYS, AND THAT IS A MEASURED LIMIT. The chair's
 *   mid-tones sit at value 96 to 150, and the figure's own edge pixels below
 *   the knee run from 64 to 240 on these same plates, so every value the chair
 *   uses is a value the figure also uses. No colour rule separates them, and
 *   raising the body-tone floor far enough to try starts taking the feet.
 *   Connectivity cannot reach them either, since being against the figure is
 *   what puts them inside the protection band. What is left needs the chair
 *   drawn apart from the figure, not a better threshold.
 * - WHAT THE PROTECTION STRANDS IS STILL CHAIR. The protection band is
 *   absolute, so where the chair runs close to a thigh it cuts the chair's fill
 *   into islands that reach no seed, and those islands were the visible residue
 *   an earlier version left: a sliver of seat between the thighs, stubs of leg
 *   beside the shins. An opaque region that touches nothing else in the plate
 *   is not part of a figure drawn as one connected silhouette, so a component
 *   that is not the figure's own and lies wholly below the seat plane is taken.
 *   Below that plane the figure is legs and feet, which run continuously up
 *   into the torso, so anything down there touching nothing is chair. That is a
 *   fact about the raster rather than a guess about how big debris ought to be.
 *   Colour cannot make this call: the chair's lit surfaces are warm and light
 *   enough to read as body tone, which is why they were protected in the first
 *   place and why they had to be stranded before they could be taken.
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
  /** Of those, pixels taken because they belonged to no connected figure. */
  readonly pixelsClearedAsStranded: number;
  readonly pixelsKept: number;
  /** Opaque regions left that touch nothing else in the plate. Should be none. */
  readonly strayComponentsRemaining: number;
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

export interface PlateMasks {
  readonly opaque: Uint8Array;
  /** Lit body tone itself, with no reach added. */
  readonly bodyTone: Uint8Array;
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
  return { opaque, bodyTone, protectedMask, chairFill };
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

/**
 * Chair pieces the connectivity pass left stranded.
 *
 * The protection band around lit body tone is absolute, and where the chair
 * runs close to a thigh or a shin that band cuts its fill into islands that no
 * longer reach any seed. Those islands survived the first pass and are the
 * visible residue: a sliver of seat between the thighs, stubs of chair leg
 * beside the shins.
 *
 * They are decidable without any threshold at all. An opaque region that
 * touches nothing else is not part of a figure drawn as one connected
 * silhouette, so a component that is not the figure's own and lies wholly below
 * the seat plane is chair: below that plane the figure is legs and feet, and
 * those run continuously up into the torso.
 *
 * Colour is deliberately not consulted. These chairs are drawn warm and light,
 * so their lit surfaces pass the same body-tone test the legs do — which is
 * exactly why the protection band covered them and why they had to be stranded
 * before they could be taken. A test that asks "does this island contain skin"
 * answers yes on a chair seat.
 *
 * Nor is size. "Small enough to be debris" is a guess about the art;
 * "connected to nothing, and below the seat" is a fact about the raster.
 */
export function strandedChairComponents(
  opaque: Uint8Array,
  width: number,
  height: number,
  seatPlaneRow: number,
): Uint8Array {
  const label = new Int32Array(width * height).fill(-1);
  const sizes: number[] = [];
  const minRow: number[] = [];
  const queue: number[] = [];
  for (let start = 0; start < width * height; start += 1) {
    if (opaque[start] !== 1 || label[start] !== -1) continue;
    const id = sizes.length;
    sizes.push(0);
    minRow.push(height);
    label[start] = id;
    queue.length = 0;
    queue.push(start);
    for (let head = 0; head < queue.length; head += 1) {
      const i = queue[head]!;
      const y = Math.floor(i / width);
      const x = i - y * width;
      sizes[id]! += 1;
      if (y < minRow[id]!) minRow[id] = y;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const ny = y + dy;
          const nx = x + dx;
          if (ny < 0 || ny >= height || nx < 0 || nx >= width) continue;
          const j = ny * width + nx;
          if (opaque[j] !== 1 || label[j] !== -1) continue;
          label[j] = id;
          queue.push(j);
        }
      }
    }
  }
  let figure = -1;
  for (let id = 0; id < sizes.length; id += 1) {
    if (figure < 0 || sizes[id]! > sizes[figure]!) figure = id;
  }
  const stranded = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i += 1) {
    const id = label[i];
    if (id < 0 || id === figure) continue;
    if (minRow[id]! < seatPlaneRow) continue;
    stranded[i] = 1;
  }
  return stranded;
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
  // Strandedness is a property of what the connectivity pass LEAVES, not of the
  // plate it started from: an island only stops touching anything once the
  // chair fill that joined it to the rest has gone.
  const remaining = new Uint8Array(masks.opaque);
  for (let y = seatPlaneRow; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = y * width + x;
      if (chair[i] === 1) remaining[i] = 0;
    }
  }
  const stranded = strandedChairComponents(
    remaining,
    width,
    height,
    seatPlaneRow,
  );

  let cleared = 0;
  let strandedCleared = 0;
  let kept = 0;
  for (let y = seatPlaneRow; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = y * width + x;
      if (masks.opaque[i] !== 1) continue;
      if (stranded[i] === 1) strandedCleared += 1;
      if (chair[i] !== 1 && stranded[i] !== 1) {
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
    pixelsClearedAsStranded: strandedCleared,
    pixelsKept: kept,
    strayComponentsRemaining: countStrayComponents(verify),
    untouchedAboveSeatPlane,
  };
}

/**
 * Opaque regions in a finished plate that touch nothing else in it.
 *
 * Asserted on the OUTPUT rather than promised by the algorithm, because the
 * only claim worth making about a subtractive pass is one read back off the
 * bytes it wrote. A figure is drawn as one connected silhouette, so anything
 * else left floating is residue and this should come back zero.
 */
export function countStrayComponents(bitmap: Bitmap): number {
  const { width, height } = bitmap;
  const opaque = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if ((bitmap.getPixelRGBA(x, y) & 0xff) > ALPHA_FLOOR)
        opaque[y * width + x] = 1;
    }
  }
  const seen = new Uint8Array(width * height);
  const queue: number[] = [];
  let components = 0;
  let largest = 0;
  for (let start = 0; start < width * height; start += 1) {
    if (opaque[start] !== 1 || seen[start] === 1) continue;
    components += 1;
    let size = 0;
    seen[start] = 1;
    queue.length = 0;
    queue.push(start);
    for (let head = 0; head < queue.length; head += 1) {
      const i = queue[head]!;
      const y = Math.floor(i / width);
      const x = i - y * width;
      size += 1;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const ny = y + dy;
          const nx = x + dx;
          if (ny < 0 || ny >= height || nx < 0 || nx >= width) continue;
          const j = ny * width + nx;
          if (opaque[j] !== 1 || seen[j] === 1) continue;
          seen[j] = 1;
          queue.push(j);
        }
      }
    }
    if (size > largest) largest = size;
  }
  return Math.max(0, components - 1);
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
        verification:
          "Each output is read back off disk and checked two ways: no pixel above the seat plane changed, and no opaque region is left that touches nothing else in the plate. Verify any change to this script by rendering ONLY the removed pixels. Looking at the result tells you what survived, not what went, and an earlier version took the whole foot outline without that being visible in the result.",
        known_incomplete:
          "Chair that TOUCHES the figure survives: a sliver of seat between the thighs and a stub of chair leg against each shin. It cannot be taken by colour, and that is measured rather than assumed. On these plates the figure's own edge pixels below the knee run from value 64 to 240, and the chair's mid-tones sit at 96 to 150, inside that range on every plate; raising the body-tone floor to separate them starts eating the feet, which is the failure an earlier version shipped. Connectivity cannot take them either, because they are inside the protection band by definition. Separating them needs the chair drawn apart from the figure, which means either the owner's layered source or his own brush. These derivatives are NOT approvable until that residue is gone.",
        parameters: {
          alpha_floor: ALPHA_FLOOR,
          body_min_chroma: BODY_MIN_CHROMA,
          body_min_value: BODY_MIN_VALUE,
          chair_max_chroma: CHAIR_MAX_CHROMA,
          outline_reach_px: OUTLINE_REACH_PX,
          stranded_rule:
            "an opaque component that is not the figure's own, lies wholly below the seat plane, and contains no lit body tone",
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
