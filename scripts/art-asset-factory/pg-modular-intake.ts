import fs from "fs";
import path from "path";
import * as PImage from "pureimage";

import type {
  CharacterAttachmentAnchor,
  CharacterComponentCandidateDefinition,
  CharacterComponentKind,
} from "../../src/presentation/character-components";
import { hashArtFile } from "./content-hash";
import { resampleLanczos } from "./resample";

/**
 * Political Game real modular asset intake.
 *
 * Normalizes owner-supplied master assets (gray body-geometry authorities,
 * bald head/face identity masters, hair-only masters, and unfitted garment /
 * footwear design masters) into the runtime component contract proven by
 * D-053/D-054. Everything here is deterministic image processing: per-row
 * neutral-background keying, opaque-bounds cropping, mask-derived body rig
 * measurement, fixed fit ratios, and Lanczos-3 resampling. No pixel is
 * generated or repainted; source masters are preserved byte-for-byte under
 * `art/references/masters/pg-modular/`.
 */

/**
 * Where the PR #48 masters live in THIS repository.
 *
 * The intake was written against the upstream Drive filenames
 * (`PG_BODY_FEMALE_LEAN.png` and friends). The surviving graphics branch had
 * already re-homed the same twenty-five files under its own naming, and the
 * bytes are identical — every master here matches its Drive twin by SHA-256 —
 * so the derivation is unchanged and only the paths were repointed. The
 * upstream identity is not lost: each spec still carries its `masterAssetId`
 * (`PG_FACE_M_001`, `PG_HAIR_F_BLACK_007`), which is what provenance cites.
 */
export const PG_MASTER_SOURCE_DIRECTORY = "art/references/masters/pg-modular";
export const PG_MODULAR_OUTPUT_DIRECTORY = "art/generated/approved/pg-modular";
export const PG_MODULAR_INTAKE_VERSION = "pg-modular-intake-v1";
export const PG_LANCZOS_LOBES = 3;

/**
 * Runtime canvas height for a normalized body. A fixture/normalization
 * choice for this candidate set, recorded in provenance; the render plan
 * scales characters to the scene, so it is not a rendering standard.
 */
export const PG_BODY_RUNTIME_HEIGHT = 960;

export type PgBodyFamilyId = "pg-female-lean" | "pg-male-lean";

export interface KeyingProfile {
  /** Distance (0–441) from the row's background estimate that stays fully transparent. */
  readonly tolerance: number;
  /** Additional distance over which alpha ramps to opaque. */
  readonly softness: number;
  /**
   * Treat neutral (near-gray) pixels that are darker than the background by
   * at most `shadowDepth` as background. Removes soft drop shadows under
   * garments and hair; never used for the gray mannequin bodies.
   */
  readonly suppressNeutralShadows: boolean;
  readonly shadowDepth: number;
}

export const BODY_KEYING: KeyingProfile = {
  tolerance: 9,
  softness: 10,
  suppressNeutralShadows: false,
  shadowDepth: 0,
};

export const COMPONENT_KEYING: KeyingProfile = {
  tolerance: 14,
  softness: 16,
  suppressNeutralShadows: true,
  shadowDepth: 70,
};

export interface OpaqueBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

type Bitmap = ReturnType<typeof PImage.make>;

function makeTransparent(width: number, height: number): Bitmap {
  const bitmap = PImage.make(width, height);
  bitmap.data.fill(0);
  return bitmap;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

/**
 * Keys a flat neutral background. Each row's background color is estimated
 * from the outer 2% of columns on both sides and interpolated across the row,
 * so vertical wall/floor gradients and mild horizontal gradients key cleanly
 * while interior openings (a hair master's face cut-out) key by color alone.
 */
export function keyNeutralBackground(
  source: Bitmap,
  profile: KeyingProfile,
): Bitmap {
  const { width, height, data } = source;
  const out = makeTransparent(width, height);
  const margin = Math.max(2, Math.round(width * 0.02));
  for (let y = 0; y < height; y += 1) {
    const left: number[][] = [[], [], []];
    const right: number[][] = [[], [], []];
    for (let x = 0; x < margin; x += 1) {
      const l = (y * width + x) * 4;
      const r = (y * width + (width - 1 - x)) * 4;
      for (let c = 0; c < 3; c += 1) {
        left[c]!.push(data[l + c] ?? 0);
        right[c]!.push(data[r + c] ?? 0);
      }
    }
    const bgLeft = left.map(median);
    const bgRight = right.map(median);
    for (let x = 0; x < width; x += 1) {
      const t = x / Math.max(1, width - 1);
      const offset = (y * width + x) * 4;
      const r = data[offset] ?? 0;
      const g = data[offset + 1] ?? 0;
      const b = data[offset + 2] ?? 0;
      const bgR = bgLeft[0]! * (1 - t) + bgRight[0]! * t;
      const bgG = bgLeft[1]! * (1 - t) + bgRight[1]! * t;
      const bgB = bgLeft[2]! * (1 - t) + bgRight[2]! * t;
      const distance = Math.sqrt(
        (r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2,
      );
      let alpha: number;
      if (distance <= profile.tolerance) alpha = 0;
      else if (distance >= profile.tolerance + profile.softness) alpha = 255;
      else
        alpha = Math.round(
          ((distance - profile.tolerance) / profile.softness) * 255,
        );
      if (alpha > 0 && profile.suppressNeutralShadows) {
        const chroma = Math.max(
          Math.abs(r - g),
          Math.abs(g - b),
          Math.abs(r - b),
        );
        const bgLuma = (bgR + bgG + bgB) / 3;
        const luma = (r + g + b) / 3;
        if (
          chroma <= 10 &&
          luma < bgLuma &&
          bgLuma - luma <= profile.shadowDepth
        ) {
          alpha = 0;
        }
      }
      out.data[offset] = r;
      out.data[offset + 1] = g;
      out.data[offset + 2] = b;
      out.data[offset + 3] = alpha;
    }
  }
  return out;
}

export function opaqueBounds(bitmap: Bitmap, threshold = 24): OpaqueBounds {
  let minX = bitmap.width;
  let minY = bitmap.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < bitmap.height; y += 1) {
    for (let x = 0; x < bitmap.width; x += 1) {
      if ((bitmap.data[(y * bitmap.width + x) * 4 + 3] ?? 0) > threshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) throw new Error("Bitmap has no opaque pixels after keying.");
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

export function cropBitmap(bitmap: Bitmap, bounds: OpaqueBounds): Bitmap {
  const out = makeTransparent(bounds.width, bounds.height);
  for (let y = 0; y < bounds.height; y += 1) {
    const sourceOffset = ((bounds.y + y) * bitmap.width + bounds.x) * 4;
    const targetOffset = y * bounds.width * 4;
    out.data.set(
      bitmap.data.subarray(sourceOffset, sourceOffset + bounds.width * 4),
      targetOffset,
    );
  }
  return out;
}

function rowRuns(bitmap: Bitmap, y: number, threshold = 127): number[][] {
  const runs: number[][] = [];
  let start = -1;
  for (let x = 0; x <= bitmap.width; x += 1) {
    const opaque =
      x < bitmap.width &&
      (bitmap.data[(y * bitmap.width + x) * 4 + 3] ?? 0) > threshold;
    if (opaque && start < 0) start = x;
    if (!opaque && start >= 0) {
      runs.push([start, x - 1]);
      start = -1;
    }
  }
  return runs;
}

function rowWidth(bitmap: Bitmap, y: number): number {
  return rowRuns(bitmap, y).reduce((sum, [a, b]) => sum + (b! - a! + 1), 0);
}

function centralRun(
  bitmap: Bitmap,
  y: number,
  centerX: number,
): number[] | null {
  return (
    rowRuns(bitmap, y).find(([a, b]) => a! <= centerX && centerX <= b!) ?? null
  );
}

function argMin(values: readonly number[], from: number, to: number): number {
  let best = from;
  for (let index = from; index <= to; index += 1) {
    if ((values[index] ?? Infinity) < (values[best] ?? Infinity)) best = index;
  }
  return best;
}

export interface BodyRigMeasurement {
  readonly centerX: number;
  readonly headTop: number;
  readonly neckRow: number;
  readonly shoulderRow: number;
  readonly waistRow: number;
  readonly crotchRow: number;
  readonly soleRow: number;
  readonly headWidth: number;
  readonly headHeight: number;
  readonly shoulderWidth: number;
  readonly waistWidth: number;
  readonly feetSpan: number;
}

/**
 * Measures the rig from the keyed, cropped body mask. Every row is the
 * narrowest/widest silhouette row in a fixed band, so the result is a pure
 * function of the raster.
 */
export function measureBodyRig(body: Bitmap): BodyRigMeasurement {
  const H = body.height;
  const widths = Array.from({ length: H }, (_, y) => rowWidth(body, y));
  const headTop = widths.findIndex((w) => w > 0);
  const centerX = Math.round(
    (() => {
      // center of the widest row (shoulders) is the most stable midline
      let best = 0;
      for (let y = 0; y < H; y += 1) if (widths[y]! > widths[best]!) best = y;
      const runs = rowRuns(body, best);
      return (runs[0]![0]! + runs[runs.length - 1]![1]!) / 2;
    })(),
  );
  const neckRow = argMin(
    widths,
    headTop + Math.round(H * 0.06),
    headTop + Math.round(H * 0.2),
  );
  const shoulderBand = widths.slice(neckRow, neckRow + Math.round(H * 0.15));
  const shoulderPeak = Math.max(...shoulderBand);
  const shoulderRow =
    neckRow + shoulderBand.findIndex((w) => w >= shoulderPeak * 0.92);
  const central = Array.from({ length: H }, (_, y) => {
    const run = centralRun(body, y, centerX);
    return run ? run[1]! - run[0]! + 1 : 0;
  });
  const waistRow = argMin(
    central.map((w) => (w === 0 ? Infinity : w)),
    Math.round(H * 0.33),
    Math.round(H * 0.5),
  );
  let crotchRow = waistRow;
  for (let y = waistRow; y < H; y += 1) {
    if (!centralRun(body, y, centerX) && rowRuns(body, y).length >= 2) {
      crotchRow = y;
      break;
    }
  }
  let soleRow = H - 1;
  while (soleRow > 0 && widths[soleRow] === 0) soleRow -= 1;
  const headWidth = Math.max(...widths.slice(headTop, neckRow));
  const feetSpan = Math.max(
    ...widths.slice(Math.max(0, soleRow - Math.round(H * 0.06)), soleRow + 1),
  );
  return {
    centerX,
    headTop,
    neckRow,
    shoulderRow,
    waistRow,
    crotchRow,
    soleRow,
    headWidth,
    headHeight: neckRow - headTop,
    shoulderWidth: widths[shoulderRow]!,
    waistWidth: central[waistRow]!,
    feetSpan,
  };
}

/** Interior transparent region not connected to the border (a hair face opening). */
export function interiorOpening(bitmap: Bitmap): OpaqueBounds | null {
  const { width, height } = bitmap;
  const visited = new Uint8Array(width * height);
  const transparent = (x: number, y: number) =>
    (bitmap.data[(y * width + x) * 4 + 3] ?? 0) <= 24;
  const stack: number[] = [];
  const push = (x: number, y: number) => {
    const index = y * width + x;
    if (!visited[index] && transparent(x, y)) {
      visited[index] = 1;
      stack.push(index);
    }
  };
  for (let x = 0; x < width; x += 1) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    push(0, y);
    push(width - 1, y);
  }
  while (stack.length > 0) {
    const index = stack.pop()!;
    const x = index % width;
    const y = (index - x) / width;
    if (x > 0) push(x - 1, y);
    if (x < width - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < height - 1) push(x, y + 1);
  }
  let minX = width,
    minY = height,
    maxX = -1,
    maxY = -1,
    count = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (transparent(x, y) && !visited[y * width + x]) {
        count += 1;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (count < 64) return null;
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

export interface FaceGap {
  readonly width: number;
  readonly centerX: number;
  /** Hairline: the first row where the face gap opens. */
  readonly topY: number;
  readonly bottomY: number;
}

/**
 * Face gap of a hair-only master: the transparent bay between the left and
 * right hair runs around the midline, whether enclosed at the bottom or open
 * to the neck. Width and center are medians over the gap rows, so stray
 * strands cannot dominate.
 */
export function measureFaceGap(bitmap: Bitmap): FaceGap | null {
  const midX = Math.round(bitmap.width / 2);
  const widths: number[] = [];
  const centers: number[] = [];
  let topY = -1;
  let bottomY = -1;
  for (let y = Math.round(bitmap.height * 0.25); y < bitmap.height; y += 1) {
    const runs = rowRuns(bitmap, y, 24);
    for (let index = 0; index + 1 < runs.length; index += 1) {
      const gapStart = runs[index]![1]! + 1;
      const gapEnd = runs[index + 1]![0]! - 1;
      if (gapStart <= midX && midX <= gapEnd && gapEnd - gapStart + 1 >= 8) {
        widths.push(gapEnd - gapStart + 1);
        centers.push((gapStart + gapEnd) / 2);
        if (topY < 0) topY = y;
        bottomY = y;
        break;
      }
    }
  }
  if (widths.length < 12) return null;
  // Cheekbone level: 40% down the gap, where the face is widest and the
  // hairline curve above and the neck below cannot bias the measurement.
  const pick = Math.floor(widths.length * 0.4);
  return { width: widths[pick]!, centerX: centers[pick]!, topY, bottomY };
}

/** Narrowest row in the lower part of a head master: the neck cut line. */
export function neckCutRow(head: Bitmap): number {
  const H = head.height;
  const widths = Array.from({ length: H }, (_, y) => rowWidth(head, y));
  return argMin(
    widths.map((w) => (w === 0 ? Infinity : w)),
    Math.round(H * 0.68),
    H - 1,
  );
}

// ---------------------------------------------------------------------------
// Intake specification
// ---------------------------------------------------------------------------

export interface PgBodySpec {
  readonly familyId: PgBodyFamilyId;
  readonly suffix: string;
  readonly masterFile: string;
  readonly masterSet: string;
}

export const PG_BODY_SPECS: readonly PgBodySpec[] = [
  {
    familyId: "pg-female-lean",
    suffix: "fl",
    masterFile: "bodies/pg_master_body_standing_frame_a.png",
    masterSet: "Desktop body-geometry authority 'female lean.png'",
  },
  {
    familyId: "pg-male-lean",
    suffix: "ml",
    masterFile: "bodies/pg_master_body_standing_frame_b.png",
    masterSet: "Desktop body-geometry authority 'male lean.png'",
  },
];

export type FitReference =
  "headHeight" | "headWidth" | "shoulderWidth" | "waistWidth" | "feetSpan";
export type FitMeasure = "bboxWidth" | "bboxHeight" | "openingWidth";
export type OriginRule =
  "bottom-center" | "top-center" | "hairline-center" | "neck-cut-center";

export interface PgComponentSpec {
  readonly idStem: string;
  readonly kind: CharacterComponentKind;
  readonly family: string;
  readonly masterFile: string;
  readonly masterSet: string;
  readonly masterAssetId: string;
  /** Body families this master is fitted to; garments produce one derivative per family. */
  readonly bodyFamilies: readonly PgBodyFamilyId[];
  readonly headFamilies?: readonly string[];
  readonly fit: {
    readonly reference: FitReference;
    readonly measure: FitMeasure;
    readonly ratio: number;
  };
  readonly attachesTo: "head" | "torso" | "hips" | "feet";
  readonly origin: OriginRule;
  /** Fraction of the fitted component height added to the origin y (visual estimate). */
  readonly originOffsetY?: number;
  /** Cap-style hair without a face gap: width ratio to head width and origin y on the brow. */
  readonly fallbackFit?: { readonly ratio: number; readonly originY: number };
  /**
   * Authored origin for masters whose face position cannot be measured
   * (asymmetric cap styles): normalized in the cropped master, visual estimate.
   */
  readonly originOverride?: { readonly x: number; readonly y: number };
  readonly layer: number;
  readonly keying: KeyingProfile;
  readonly perFamilyDerivative: boolean;
}

const HEAD_FIT = {
  reference: "headHeight" as const,
  measure: "bboxHeight" as const,
  ratio: 1.0,
};
const HAIR_FIT = {
  reference: "headWidth" as const,
  measure: "openingWidth" as const,
  ratio: 1.0,
};
const TOP_FIT = {
  reference: "shoulderWidth" as const,
  measure: "bboxWidth" as const,
  ratio: 1.06,
};
const BOTTOM_FIT = {
  reference: "waistWidth" as const,
  measure: "bboxWidth" as const,
  ratio: 1.18,
};
const SHOE_FIT = {
  reference: "feetSpan" as const,
  measure: "bboxWidth" as const,
  ratio: 1.12,
};

function head(
  idStem: string,
  family: string,
  file: string,
  set: string,
  masterAssetId: string,
  bodyFamilies: readonly PgBodyFamilyId[],
): PgComponentSpec {
  return {
    idStem,
    kind: "head",
    family,
    masterFile: `heads/${file}`,
    masterSet: set,
    masterAssetId,
    bodyFamilies,
    fit: HEAD_FIT,
    attachesTo: "head",
    origin: "neck-cut-center",
    layer: 30,
    keying: COMPONENT_KEYING,
    perFamilyDerivative: false,
  };
}
function hair(
  idStem: string,
  family: string,
  file: string,
  masterAssetId: string,
): PgComponentSpec {
  return {
    idStem,
    kind: "hair-front",
    family,
    masterFile: `hair/${file}`,
    masterSet: "PG_BLACK_FEMALE_HAIR_MASTERS_v1",
    masterAssetId,
    bodyFamilies: ["pg-female-lean"],
    headFamilies: ["pg-head-f-01"],
    fit: HAIR_FIT,
    attachesTo: "brow",
    origin: "hairline-center",
    layer: 40,
    keying: COMPONENT_KEYING,
    perFamilyDerivative: false,
  };
}
function top(
  idStem: string,
  family: string,
  file: string,
  masterAssetId: string,
): PgComponentSpec {
  return {
    idStem,
    kind: "top",
    family,
    masterFile: `tops/${file}`,
    masterSet: "PG_TOP_GARMENT_MASTERS_v1",
    masterAssetId,
    bodyFamilies: ["pg-female-lean", "pg-male-lean"],
    fit: TOP_FIT,
    attachesTo: "torso",
    origin: "top-center",
    layer: 25,
    keying: COMPONENT_KEYING,
    perFamilyDerivative: true,
  };
}
function bottom(
  idStem: string,
  family: string,
  file: string,
  masterAssetId: string,
): PgComponentSpec {
  return {
    idStem,
    kind: "bottom",
    family,
    masterFile: `bottoms/${file}`,
    masterSet: "PG_BOTTOM_GARMENT_MASTERS_v1",
    masterAssetId,
    bodyFamilies: ["pg-female-lean", "pg-male-lean"],
    fit: BOTTOM_FIT,
    attachesTo: "hips",
    origin: "top-center",
    layer: 22,
    keying: COMPONENT_KEYING,
    perFamilyDerivative: true,
  };
}
function shoe(
  idStem: string,
  family: string,
  file: string,
  masterAssetId: string,
): PgComponentSpec {
  return {
    idStem,
    kind: "footwear",
    family,
    masterFile: `footwear/${file}`,
    masterSet: "PG_FOOTWEAR_MASTERS_v1",
    masterAssetId,
    bodyFamilies: ["pg-female-lean", "pg-male-lean"],
    fit: SHOE_FIT,
    attachesTo: "feet",
    origin: "bottom-center",
    layer: 21,
    keying: COMPONENT_KEYING,
    perFamilyDerivative: true,
  };
}

export const PG_COMPONENT_SPECS: readonly PgComponentSpec[] = [
  head(
    "pg_head_f_01_bald_neutral",
    "pg-head-f-01",
    "pg_master_head_05_bald_neutral.png",
    "PG_MODULAR_FIT_PROOF_INPUT_PACK_v1",
    "01_HEAD_SAMPLE",
    ["pg-female-lean"],
  ),
  head(
    "pg_head_m_001_black_young_adult",
    "pg-head-m-001",
    "pg_master_head_01_bald_neutral.png",
    "PG_MASCULINE_FACE_MASTERS_v1",
    "PG_FACE_M_001",
    ["pg-male-lean"],
  ),
  head(
    "pg_head_m_002_white_adult",
    "pg-head-m-002",
    "pg_master_head_02_bald_neutral.png",
    "PG_MASCULINE_FACE_MASTERS_v1",
    "PG_FACE_M_002",
    ["pg-male-lean"],
  ),
  head(
    "pg_head_m_004_east_asian_young_adult",
    "pg-head-m-004",
    "pg_master_head_03_bald_neutral.png",
    "PG_MASCULINE_FACE_MASTERS_v1",
    "PG_FACE_M_004",
    ["pg-male-lean"],
  ),
  head(
    "pg_head_m_005_black_older_adult",
    "pg-head-m-005",
    "pg_master_head_04_bald_neutral.png",
    "PG_MASCULINE_FACE_MASTERS_v1",
    "PG_FACE_M_005",
    ["pg-male-lean"],
  ),
  {
    ...hair(
      "pg_hair_f_black_001_short_tapered_afro",
      "pg-hair-f-black-001",
      "pg_master_hair_01_short_tapered_afro.png",
      "PG_HAIR_F_BLACK_001",
    ),
    fit: { reference: "headWidth", measure: "bboxWidth", ratio: 1.12 },
    attachesTo: "brow",
    origin: "bottom-center",
    originOverride: { x: 0.6, y: 0.62 },
  },
  hair(
    "pg_hair_f_black_002_rounded_medium_afro",
    "pg-hair-f-black-002",
    "pg_master_hair_02_rounded_medium_afro.png",
    "PG_HAIR_F_BLACK_002",
  ),
  hair(
    "pg_hair_f_black_004_shoulder_natural_curls",
    "pg-hair-f-black-004",
    "pg_master_hair_03_shoulder_natural_curls.png",
    "PG_HAIR_F_BLACK_004",
  ),
  {
    ...hair(
      "pg_hair_f_black_005_high_puff",
      "pg-hair-f-black-005",
      "pg_master_hair_04_high_puff.png",
      "PG_HAIR_F_BLACK_005",
    ),
    fit: { reference: "headWidth", measure: "bboxWidth", ratio: 1.15 },
    attachesTo: "brow",
    origin: "bottom-center",
    originOverride: { x: 0.55, y: 0.64 },
  },
  hair(
    "pg_hair_f_black_007_shoulder_box_braids",
    "pg-hair-f-black-007",
    "pg_master_hair_05_shoulder_box_braids.png",
    "PG_HAIR_F_BLACK_007",
  ),
  hair(
    "pg_hair_f_black_008_long_box_braids",
    "pg-hair-f-black-008",
    "pg_master_hair_06_long_box_braids.png",
    "PG_HAIR_F_BLACK_008",
  ),
  hair(
    "pg_hair_f_black_010_cornrows_low_bun",
    "pg-hair-f-black-010",
    "pg_master_hair_07_cornrows_low_bun.png",
    "PG_HAIR_F_BLACK_010",
  ),
  hair(
    "pg_hair_f_black_012_shoulder_locs",
    "pg-hair-f-black-012",
    "pg_master_hair_08_shoulder_locs.png",
    "PG_HAIR_F_BLACK_012",
  ),
  top(
    "pg_top_001_short_sleeve_crew_tee",
    "pg-top-001",
    "pg_master_top_01_short_sleeve_crew_tee.png",
    "PG_TOP_001",
  ),
  top(
    "pg_top_005_long_sleeve_button_shirt",
    "pg-top-005",
    "pg_master_top_02_long_sleeve_button_shirt.png",
    "PG_TOP_005",
  ),
  top(
    "pg_top_006_pullover_sweater",
    "pg-top-006",
    "pg_master_top_03_pullover_sweater.png",
    "PG_TOP_006",
  ),
  top(
    "pg_top_011_structured_blazer",
    "pg-top-011",
    "pg_master_top_04_structured_blazer.png",
    "PG_TOP_011",
  ),
  bottom(
    "pg_bottom_001_straight_leg_blue_jeans",
    "pg-bottom-001",
    "pg_master_bottom_01_straight_leg_jeans.png",
    "PG_BOTTOM_001",
  ),
  bottom(
    "pg_bottom_005_dress_trousers",
    "pg-bottom-005",
    "pg_master_bottom_02_dress_trousers.png",
    "PG_BOTTOM_005",
  ),
  bottom(
    "pg_bottom_010_a_line_knee_skirt",
    "pg-bottom-010",
    "pg_master_bottom_03_a_line_knee_skirt.png",
    "PG_BOTTOM_010",
  ),
  shoe(
    "pg_shoe_001_low_top_sneakers",
    "pg-shoe-001",
    "pg_master_footwear_01_low_top_sneakers.png",
    "PG_SHOE_001",
  ),
  shoe(
    "pg_shoe_004_leather_loafers",
    "pg-shoe-004",
    "pg_master_footwear_02_leather_loafers.png",
    "PG_SHOE_004",
  ),
  shoe(
    "pg_shoe_009_low_practical_flats",
    "pg-shoe-009",
    "pg_master_footwear_03_low_practical_flats.png",
    "PG_SHOE_009",
  ),
];

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

export interface PgIntakeOutput {
  readonly assetId: string;
  readonly kind: CharacterComponentKind;
  readonly repositoryPath: string;
  readonly hash: string;
  readonly definition: CharacterComponentCandidateDefinition;
  readonly master: {
    readonly repositoryPath: string;
    readonly hash: string;
    readonly set: string;
    readonly assetId: string;
    readonly width: number;
    readonly height: number;
  };
  readonly normalization: {
    readonly keying: KeyingProfile;
    readonly crop: OpaqueBounds;
    readonly scale: number;
    readonly fit?: PgComponentSpec["fit"];
    readonly rig?: BodyRigMeasurement;
  };
}

async function readPng(filePath: string): Promise<Bitmap> {
  return PImage.decodePNGFromStream(fs.createReadStream(filePath));
}

async function writePng(filePath: string, bitmap: Bitmap): Promise<void> {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const stream = fs.createWriteStream(filePath);
  const finished = new Promise<void>((resolve, reject) => {
    stream.on("finish", () => resolve());
    stream.on("error", reject);
  });
  await PImage.encodePNGToStream(bitmap, stream);
  await finished;
}

function scaled(bitmap: Bitmap, scale: number): Bitmap {
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  return resampleLanczos(bitmap, width, height, PG_LANCZOS_LOBES);
}

interface NormalizedBody {
  readonly spec: PgBodySpec;
  readonly bitmap: Bitmap;
  readonly rig: BodyRigMeasurement;
  readonly anchors: readonly CharacterAttachmentAnchor[];
}

async function normalizeBody(
  repositoryRoot: string,
  spec: PgBodySpec,
  outputDirectory: string,
): Promise<{ output: PgIntakeOutput; body: NormalizedBody }> {
  const masterPath = path.join(
    repositoryRoot,
    PG_MASTER_SOURCE_DIRECTORY,
    spec.masterFile,
  );
  const master = await readPng(masterPath);
  const keyed = keyNeutralBackground(master, BODY_KEYING);
  const crop = opaqueBounds(keyed);
  const cropped = cropBitmap(keyed, crop);
  const scale = PG_BODY_RUNTIME_HEIGHT / cropped.height;
  const runtime = scaled(cropped, scale);
  const rig = measureBodyRig(runtime);
  const anchors: CharacterAttachmentAnchor[] = [
    {
      id: "crown",
      x: rig.centerX / runtime.width,
      y: rig.headTop / runtime.height,
    },
    {
      id: "brow",
      x: rig.centerX / runtime.width,
      y: (rig.headTop + rig.headHeight * 0.36) / runtime.height,
    },
    {
      id: "head",
      x: rig.centerX / runtime.width,
      y: rig.neckRow / runtime.height,
    },
    {
      id: "torso",
      x: rig.centerX / runtime.width,
      y: rig.shoulderRow / runtime.height,
    },
    {
      id: "hips",
      x: rig.centerX / runtime.width,
      y: rig.waistRow / runtime.height,
    },
    {
      id: "feet",
      x: rig.centerX / runtime.width,
      y: rig.soleRow / runtime.height,
    },
  ];
  const assetId = `pg_body_${spec.suffix}_standing_v1`;
  const fileName = `${assetId}.png`;
  const outputPath = path.join(repositoryRoot, outputDirectory, fileName);
  await writePng(outputPath, runtime);
  const definition: CharacterComponentCandidateDefinition = {
    kind: "body",
    family: spec.familyId,
    layer: 20,
    canvas: { width: runtime.width, height: runtime.height },
    pose_family: "standing-neutral",
    head_orientation: "front",
    root: {
      convention: "pelvis-hip-center",
      x: rig.centerX / runtime.width,
      y: rig.crotchRow / runtime.height,
    },
    attachment_anchors: anchors,
    // No `contacts`. The gray geometry masters carry a baked contact shadow
    // that keys as opaque, so the lowest opaque rows of the normalized raster
    // are the shadow rather than the soles. A sole measurement taken off them
    // would be a fabricated number, and a missing measurement stays missing.
  };
  return {
    body: { spec, bitmap: runtime, rig, anchors },
    output: {
      assetId,
      kind: "body",
      repositoryPath: `${outputDirectory}/${fileName}`,
      hash: hashArtFile(outputPath),
      definition,
      master: {
        repositoryPath: `${PG_MASTER_SOURCE_DIRECTORY}/${spec.masterFile}`,
        hash: hashArtFile(masterPath),
        set: spec.masterSet,
        assetId: spec.familyId,
        width: master.width,
        height: master.height,
      },
      normalization: { keying: BODY_KEYING, crop, scale, rig },
    },
  };
}

function referenceValue(
  rig: BodyRigMeasurement,
  reference: FitReference,
): number {
  switch (reference) {
    case "headHeight":
      return rig.headHeight;
    case "headWidth":
      return rig.headWidth;
    case "shoulderWidth":
      return rig.shoulderWidth;
    case "waistWidth":
      return rig.waistWidth;
    case "feetSpan":
      return rig.feetSpan;
  }
}

async function normalizeComponent(
  repositoryRoot: string,
  spec: PgComponentSpec,
  body: NormalizedBody,
  outputDirectory: string,
): Promise<PgIntakeOutput> {
  const masterPath = path.join(
    repositoryRoot,
    PG_MASTER_SOURCE_DIRECTORY,
    spec.masterFile,
  );
  const master = await readPng(masterPath);
  const keyed = keyNeutralBackground(master, spec.keying);
  let crop = opaqueBounds(keyed);
  let cropped = cropBitmap(keyed, crop);
  if (spec.origin === "neck-cut-center") {
    const cut = neckCutRow(cropped);
    crop = { ...crop, height: cut + 1 };
    cropped = cropBitmap(keyed, crop);
  }
  let measure: number;
  let opening: FaceGap | null = null;
  let attachesTo: string = spec.attachesTo;
  let originRule: OriginRule = spec.origin;
  let ratio = spec.fit.ratio;
  let reference = spec.fit.reference;
  let capOriginY: number | null = null;
  switch (spec.fit.measure) {
    case "bboxWidth":
      measure = cropped.width;
      break;
    case "bboxHeight":
      measure = cropped.height;
      break;
    case "openingWidth":
      opening = measureFaceGap(cropped);
      if (opening) {
        measure = opening.width;
      } else {
        // Cap-style hair with no face gap: fit its full width to the head
        // width with the spec's fallback ratio and seat it on the brow.
        const fallback = spec.fallbackFit ?? { ratio: 1.15, originY: 0.9 };
        measure = cropped.width;
        reference = "headWidth";
        ratio = fallback.ratio;
        attachesTo = "brow";
        originRule = "bottom-center";
        capOriginY = fallback.originY;
      }
      break;
  }
  const scale = (referenceValue(body.rig, reference) * ratio) / measure;
  const runtime = scaled(cropped, scale);
  let originX: number;
  let originY: number;
  switch (originRule) {
    case "bottom-center":
    case "neck-cut-center":
      originX = 0.5;
      originY = capOriginY ?? 1;
      break;
    case "top-center":
      originX = 0.5;
      originY = 0;
      break;
    case "hairline-center":
      originX = opening!.centerX / cropped.width;
      originY = opening!.topY / cropped.height;
      break;
  }
  if (originRule === "hairline-center") {
    originY = Math.min(1, Math.max(0, originY + (spec.originOffsetY ?? 0)));
  }
  if (spec.originOverride) {
    originX = spec.originOverride.x;
    originY = spec.originOverride.y;
  }

  const assetId = spec.perFamilyDerivative
    ? `${spec.idStem}_${body.spec.suffix}_v1`
    : `${spec.idStem}_v1`;
  const fileName = `${assetId}.png`;
  const outputPath = path.join(repositoryRoot, outputDirectory, fileName);
  await writePng(outputPath, runtime);

  const compatibleBodies = spec.perFamilyDerivative
    ? [body.spec.familyId]
    : [...spec.bodyFamilies];
  const definition: CharacterComponentCandidateDefinition = {
    kind: spec.kind,
    family: spec.family,
    layer: spec.layer,
    canvas: { width: runtime.width, height: runtime.height },
    attaches_to: attachesTo,
    origin: { x: originX, y: originY },
    ...(spec.kind === "head" ||
    spec.kind === "top" ||
    spec.kind === "bottom" ||
    spec.kind === "footwear"
      ? { compatible_body_families: compatibleBodies }
      : {}),
    ...(spec.headFamilies
      ? { compatible_head_families: [...spec.headFamilies] }
      : {}),
    ...(spec.kind === "head" || spec.kind === "hair-front"
      ? { compatible_head_orientations: ["front"] }
      : {}),
    ...(spec.kind === "top" ||
    spec.kind === "bottom" ||
    spec.kind === "footwear"
      ? { compatible_pose_families: ["standing-neutral"] }
      : {}),
  };
  return {
    assetId,
    kind: spec.kind,
    repositoryPath: `${outputDirectory}/${fileName}`,
    hash: hashArtFile(outputPath),
    definition,
    master: {
      repositoryPath: `${PG_MASTER_SOURCE_DIRECTORY}/${spec.masterFile}`,
      hash: hashArtFile(masterPath),
      set: spec.masterSet,
      assetId: spec.masterAssetId,
      width: master.width,
      height: master.height,
    },
    normalization: {
      keying: spec.keying,
      crop,
      scale,
      fit: { reference, measure: spec.fit.measure, ratio },
    },
  };
}

/**
 * Runs the full intake. Deterministic: same masters and spec produce
 * byte-identical derivatives, which the validator and tests verify by hash.
 */
export async function runPgModularIntake(
  repositoryRoot: string,
  outputDirectory = PG_MODULAR_OUTPUT_DIRECTORY,
): Promise<readonly PgIntakeOutput[]> {
  const outputs: PgIntakeOutput[] = [];
  const bodies: NormalizedBody[] = [];
  for (const spec of PG_BODY_SPECS) {
    const { output, body } = await normalizeBody(
      repositoryRoot,
      spec,
      outputDirectory,
    );
    outputs.push(output);
    bodies.push(body);
  }
  for (const spec of PG_COMPONENT_SPECS) {
    const targets = spec.perFamilyDerivative
      ? bodies.filter((body) => spec.bodyFamilies.includes(body.spec.familyId))
      : [bodies.find((body) => body.spec.familyId === spec.bodyFamilies[0])!];
    for (const body of targets) {
      outputs.push(
        await normalizeComponent(repositoryRoot, spec, body, outputDirectory),
      );
    }
  }
  return outputs;
}
