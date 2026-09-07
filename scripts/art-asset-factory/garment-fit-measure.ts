import fs from "fs";
import path from "path";
import { PNG } from "pngjs";

import {
  createCharacterComponentLibrary,
  projectCharacterLayers,
  type CharacterComponentDefinition,
  type CharacterComponentLibrary,
  type CharacterComponentManifestRecord,
  type CharacterRecipe,
  type ProjectedCharacterLayer,
} from "../../src/presentation/character-components";
import {
  createGarmentFitBank,
  deriveAffineFit,
  deriveBoundedWarpFit,
  GARMENT_FIT_CATEGORY_ANCHORS,
  GARMENT_FIT_DEFAULT_BOUNDS,
  isGarmentFitGoverned,
  type BodyFitReference,
  type GarmentFitBankData,
  type GarmentFitClass,
  type GarmentFitGovernedKind,
  type GarmentFitTransform,
} from "../../src/presentation/garment-fit";

/**
 * Measuring what a fit actually buys, in pixels, against the real compositor.
 *
 * The rule this file exists to keep honest: no claim about a fit is made from
 * the transform's own arithmetic. Every number below is read off the alpha of
 * the rasters, after `projectCharacterLayers` — the ONE compositor — has placed
 * them. If the fit layer had a bug, this harness would report the bug rather
 * than the intention, because it never asks the fit what it did.
 *
 * The number a fit is JUDGED on is the PER-SIDE PLACEMENT RESIDUAL against the
 * garment's own ease, defined row by row as follows.
 *
 * On the SOURCE body (the one the garment was drawn for), at each row y, read
 * the body's painted edges `Bs = [bLo, bHi)` and the garment's `Gs = [gLo, gHi)`
 * and record the two eases, in units of the body span at that row:
 *
 *     easeLeft(y)  = (bLo - gLo) / |Bs|        (garment past the body, left)
 *     easeRight(y) = (gHi - bHi) / |Bs|        (garment past the body, right)
 *
 * On the TARGET body, at the same normalized row, read its edges `Bt` and the
 * fitted garment's `Gt`, and ask where the garment's edges SHOULD be if it
 * carried the same ease scaled to this body:
 *
 *     expectedLo = bLo_t - easeLeft(y)  * |Bt|
 *     expectedHi = bHi_t + easeRight(y) * |Bt|
 *     residual(y) = max(|gLo_t - expectedLo|, |gHi_t - expectedHi|)
 *
 * The judged number is the largest residual over the category's row window.
 * It is zero for a perfect fit whatever the drape, so ease is preserved rather
 * than demanded away; and it is NOT zero for a garment of the right width in
 * the wrong place, because each edge is held to its own expected position.
 * That last property is the one the first head lacked: it compared spans, so
 * a garment shifted twelve pixels sideways scored a perfect zero while hanging
 * off one side of the body and leaving the other bare.
 *
 * No data is not a perfect fit. Every measurement carries a status, and a
 * window with too few comparable rows — a blank raster, a body with no paint
 * where the garment sits, a garment that never overlaps the body — is
 * `insufficient-coverage` or `invalid-geometry`, never a zero. Classification
 * refuses on either.
 *
 * The raw overhang and undercoverage against the body's own edge are still
 * reported, because they are what 76A section 5.3 quoted and continuity with
 * that pass is worth keeping. They are descriptive; they are not the verdict.
 *
 * Both are read over a CATEGORY-SPECIFIC row window rather than over every row
 * the two share, because a single window produces nonsense. 76A counted a
 * shoe's whole span as overhang, since the body is absent below the ankle, and
 * so reported footwear at 105 px — the worst number in the bank for the safest
 * thing in it. The same mistake reads a knit top as failing because its hem
 * overhangs the gap between two legs, which is what a hem does. So each
 * category names the rows it is judged over and how; see
 * `METRIC_WINDOW_ANCHORS`.
 */

/* -------------------------------------------------------------------------- */
/* Raster reading                                                              */
/* -------------------------------------------------------------------------- */

export interface RowSpan {
  readonly lo: number;
  readonly hi: number;
}

export interface RasterSpans {
  readonly width: number;
  readonly height: number;
  /** Painted extent of each row, or null where the row is empty. */
  readonly rows: readonly (RowSpan | null)[];
}

const ALPHA_FLOOR = 8;

export function readRasterSpans(file: string): RasterSpans {
  const png = PNG.sync.read(fs.readFileSync(file));
  const { width, height, data } = png;
  const rows: (RowSpan | null)[] = [];
  for (let y = 0; y < height; y += 1) {
    let lo = -1;
    let hi = -1;
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3]! <= ALPHA_FLOOR) continue;
      if (lo < 0) lo = x;
      hi = x;
    }
    rows.push(lo < 0 ? null : { lo, hi });
  }
  return { width, height, rows };
}

/**
 * The named rows a body reference is read at, as fractions of the body canvas.
 *
 * Chosen to sit inside the region each one names rather than on its boundary:
 * `hip` is a few rows above where the legs separate, because a row read on the
 * split measures the distance between two outer thighs and calls it a hip.
 *
 * They are declared per POSE, because a seated body's waist and knee are not at
 * the fractions a standing body's are, and reading a seated raster at standing
 * fractions produces confident numbers about the wrong rows. This is also why a
 * fit is never carried between poses: the rows it was derived from do not exist
 * in the other one.
 */
export const BODY_REFERENCE_ROWS_BY_POSE: Readonly<
  Record<string, Readonly<Record<string, number>>>
> = {
  "standing-neutral": {
    shoulder: 136 / 840,
    chest: 215 / 840,
    waist: 330 / 840,
    hip: 455 / 840,
    crotch: 470 / 840,
    knee: 630 / 840,
    ankle: 785 / 840,
    sole: 812 / 840,
    torso: 200 / 840,
  },
  // Read off the seated generation-2 rig: torso 130-404, thighs 404-486,
  // shins 486-626, feet 626-650. Each row is placed clear of a boundary,
  // because a row read ON one measures two things and averages them.
  "seated-at-desk": {
    shoulder: 145 / 660,
    chest: 210 / 660,
    waist: 300 / 660,
    hip: 380 / 660,
    crotch: 430 / 660,
    knee: 540 / 660,
    ankle: 610 / 660,
    sole: 638 / 660,
    torso: 220 / 660,
  },
};

export const BODY_REFERENCE_ROWS =
  BODY_REFERENCE_ROWS_BY_POSE["standing-neutral"]!;

export function referenceRowsFor(
  poseFamily: string,
): Readonly<Record<string, number>> {
  const rows = BODY_REFERENCE_ROWS_BY_POSE[poseFamily];
  if (!rows) {
    throw new Error(
      `No body reference rows are declared for pose '${poseFamily}'. A fit cannot be derived from rows nobody has chosen for this viewpoint.`,
    );
  }
  return rows;
}

/**
 * Reads a body's painted spans at the named rows.
 *
 * Rows where nothing is painted are omitted rather than recorded as zero: a
 * missing measurement and a measurement of nothing are different facts, and
 * `deriveAffineFit` drops the first and would divide by the second.
 */
export function measureBodyFitReference(
  file: string,
  bodyFamily: string,
  poseFamily: string,
  rows: Readonly<Record<string, number>> = referenceRowsFor(poseFamily),
): BodyFitReference {
  const raster = readRasterSpans(file);
  const spans: Record<string, number> = {};
  const takenRows: Record<string, number> = {};
  for (const [name, fraction] of Object.entries(rows)) {
    const y = Math.round(fraction * raster.height);
    const span = raster.rows[Math.min(raster.height - 1, Math.max(0, y))];
    if (!span) continue;
    spans[name] = (span.hi - span.lo + 1) / raster.width;
    takenRows[name] = fraction;
  }
  return { bodyFamily, poseFamily, spans, rows: takenRows };
}

/* -------------------------------------------------------------------------- */
/* Composing through the real compositor                                       */
/* -------------------------------------------------------------------------- */

export interface FitSubject {
  readonly assetId: string;
  readonly definition: CharacterComponentDefinition;
  readonly file: string;
}

function asRecord(subject: FitSubject): CharacterComponentManifestRecord {
  return {
    asset_id: subject.assetId,
    asset_type: "character-component",
    generation_status: "approved",
    qa_status: "approved",
    runtime_release_status: "released",
    component: subject.definition,
  };
}

/**
 * Builds a recipe naming exactly these components.
 *
 * Constructed rather than resolved from a seed on purpose: this harness is
 * measuring GEOMETRY, and routing through identity resolution would make the
 * numbers depend on which person the seed happened to produce.
 */
function recipeFor(
  bodyFamily: string,
  poseFamily: string,
  subjects: readonly FitSubject[],
): CharacterRecipe {
  return {
    appearanceSeed: `fit-measure:${bodyFamily}`,
    recipeVersion: "fit-measure-v1",
    catalogGeneration: 1,
    identity: {
      bodyFamily,
      headFamily: "fit-measure-no-head",
      complexion: null,
      slots: {},
    },
    context: {
      poseFamily,
      headOrientation: null,
      components: subjects.map((subject) => ({
        slotId: `${subject.definition.kind}-slot`,
        kind: subject.definition.kind,
        family: subject.definition.family,
        assetId: subject.assetId,
        layer: subject.definition.layer,
        released: true,
      })),
      diagnostics: [],
    },
  };
}

/**
 * How a category is judged, and over which rows.
 *
 * One metric for every kind was the first mistake here and it produced
 * nonsense: it read a badge as a 98-px failure because a badge does not cover
 * a torso, and it read a knit top as failing because its hem overhangs the gap
 * between two legs, which is what a hem does.
 *
 * - `edge-match` — the garment follows the body's outline over this row
 *   window, so both directions are errors: hanging past the body, and leaving
 *   the body sticking out. Judged proportionally (see the file header).
 * - `coverage` — the component must CONTAIN the body over this window but is
 *   free to be larger. This is footwear. A shoe is not scaled by the width of
 *   the ankle above it: two people with different builds wear a similar shoe,
 *   and 76A section 5.4 reached the same conclusion from the other direction —
 *   the shoe never competes with the part of the silhouette that varies. A foot
 *   poking out of a shoe is a defect; a shoe wider than the ankle is a shoe.
 * - `containment` — the component sits INSIDE the silhouette and nothing more.
 *   This is an accessory. Only hanging past the body is an error; the body
 *   extending well beyond a lapel pin is the pin doing its job.
 */
export type FitMetricMode = "edge-match" | "coverage" | "containment";

export interface FitMetric {
  readonly mode: FitMetricMode;
  /** Inclusive body-canvas row window, chosen from the category's anchors. */
  readonly fromRow: number;
  readonly toRow: number;
  readonly anchors: readonly string[];
}

/**
 * Whether a measurement is evidence at all.
 *
 * - `measured` — enough comparable rows to say something.
 * - `insufficient-coverage` — rasters are valid, but fewer comparable rows
 *   than `MINIMUM_COMPARABLE_ROWS` / `MINIMUM_COMPARABLE_FRACTION` of the
 *   window. Nothing is concluded.
 * - `invalid-geometry` — a raster carries no paint at all, or the window is
 *   empty. Nothing is concluded and the input is wrong.
 */
export type FitMeasurementStatus =
  "measured" | "insufficient-coverage" | "invalid-geometry";

/** A window is evidence only when at least this many rows compare... */
export const MINIMUM_COMPARABLE_ROWS = 4;
/** ...and at least this share of the rows in the window compare. */
export const MINIMUM_COMPARABLE_FRACTION = 0.25;

export interface EdgeError {
  readonly status: FitMeasurementStatus;
  /** Why the status is not `measured`, when it is not. */
  readonly statusReason: string | null;
  readonly mode: FitMetricMode;
  readonly fromRow: number;
  readonly toRow: number;
  /** Worst distance the garment hangs past the body, in body-canvas pixels. */
  readonly overhangPx: number;
  readonly overhangAtRow: number;
  /** Worst distance the body sticks out past the garment. */
  readonly undercoveragePx: number;
  readonly undercoverageAtRow: number;
  /**
   * The worst error the mode counts, and its share of the body's span there.
   *
   * For `edge-match` this is the per-side PLACEMENT residual against the
   * garment's own ease (see the file header): each edge held to where it would
   * sit carrying the same ease on this body, so a garment's drape is not an
   * error but a garment of the right width in the wrong place is. For
   * `coverage` it is the undercoverage and for `containment` the overhang,
   * because in neither case is there an ease to keep.
   *
   * Meaningful only when `status` is `measured`; otherwise carried as zero and
   * must not be read as a fit.
   */
  readonly worstPx: number;
  readonly worstAtRow: number;
  readonly worstFractionOfBodySpan: number;
  readonly rowsCompared: number;
  readonly rowsInWindow: number;
}

/**
 * The rows each category is judged over, taken from the category's own anchors
 * and clipped to the rows the component actually covers.
 *
 * A `top` is judged from the shoulder to the hip and no further: below the hip
 * the body is two separated legs, and the distance from a hem to the outside of
 * a leg is not a fit error.
 */
const METRIC_WINDOW_ANCHORS: Readonly<
  Record<
    string,
    {
      readonly mode: FitMetricMode;
      readonly rows: readonly string[];
      readonly extendToBottom?: boolean;
    }
  >
> = {
  top: { mode: "edge-match", rows: ["shoulder", "chest", "waist", "hip"] },
  bottom: {
    mode: "edge-match",
    rows: ["waist", "hip", "crotch", "knee", "ankle"],
  },
  // Footwear is judged from the contact row DOWN, not from the ankle. Above the
  // contact a shoe is a rounded upper that is narrower than the shin behind it
  // by construction, and counting that as undercoverage measures the shape of a
  // shoe rather than whether it holds a foot.
  footwear: { mode: "coverage", rows: ["sole"], extendToBottom: true },
  accessory: { mode: "containment", rows: [] },
};

export function metricFor(
  kind: string,
  reference: BodyFitReference,
  extent: { readonly topY: number; readonly bottomY: number },
  bodyHeight: number,
): FitMetric {
  const spec = METRIC_WINDOW_ANCHORS[kind];
  if (!spec) throw new Error(`No fit metric declared for kind '${kind}'.`);
  const topRow = Math.round(extent.topY * bodyHeight);
  const bottomRow = Math.round(extent.bottomY * bodyHeight);
  if (spec.rows.length === 0) {
    return {
      mode: spec.mode,
      fromRow: topRow,
      toRow: bottomRow,
      anchors: [],
    };
  }
  const inside = spec.rows.filter((anchor) => {
    const row = reference.rows[anchor];
    return row !== undefined && row >= extent.topY && row <= extent.bottomY;
  });
  if (inside.length === 0) {
    return { mode: spec.mode, fromRow: topRow, toRow: bottomRow, anchors: [] };
  }
  const rows = inside.map((anchor) =>
    Math.round(reference.rows[anchor]! * bodyHeight),
  );
  return {
    mode: spec.mode,
    fromRow: Math.min(...rows),
    toRow: spec.extendToBottom
      ? Math.min(bottomRow, bodyHeight - 1)
      : Math.max(...rows),
    anchors: inside,
  };
}

function emptyEdgeError(
  metric: FitMetric,
  status: Exclude<FitMeasurementStatus, "measured">,
  statusReason: string,
  rowsCompared = 0,
  rowsInWindow = 0,
): EdgeError {
  return {
    status,
    statusReason,
    mode: metric.mode,
    fromRow: metric.fromRow,
    toRow: metric.toRow,
    overhangPx: 0,
    overhangAtRow: -1,
    undercoveragePx: 0,
    undercoverageAtRow: -1,
    worstPx: 0,
    worstAtRow: -1,
    worstFractionOfBodySpan: 0,
    rowsCompared,
    rowsInWindow,
  };
}

/**
 * Where a projected layer paints, at one body-canvas row.
 *
 * A banded layer is asked band by band: each band draws the source rows it
 * reveals, at its own horizontal scale, so the sampled source row has to be
 * found inside the band rather than across the whole layer.
 */
function garmentSpanAtRow(
  layer: ProjectedCharacterLayer,
  garment: RasterSpans,
  bodyCanvas: { width: number; height: number },
  y: number,
): { lo: number; hi: number } | null {
  const boxes = layer.fit?.bands?.map((band) => ({
    left: band.left,
    top: band.top,
    width: band.width,
    height: band.height,
    sourceTop: band.sourceTopFraction,
    sourceBottom: band.sourceBottomFraction,
  })) ?? [
    {
      left: layer.left,
      top: layer.top,
      width: layer.width,
      height: layer.height,
      sourceTop: 0,
      sourceBottom: 1,
    },
  ];
  for (const box of boxes) {
    const topPx = box.top * bodyCanvas.height;
    const heightPx = box.height * bodyCanvas.height;
    if (y < topPx || y >= topPx + heightPx) continue;
    const withinBand = (y - topPx) / heightPx;
    const sourceFraction =
      box.sourceTop + withinBand * (box.sourceBottom - box.sourceTop);
    const sourceRow = Math.min(
      garment.height - 1,
      Math.max(0, Math.floor(sourceFraction * garment.height)),
    );
    const span = garment.rows[sourceRow];
    if (!span) return null;
    const leftPx = box.left * bodyCanvas.width;
    const widthPx = box.width * bodyCanvas.width;
    const scale = widthPx / garment.width;
    return { lo: leftPx + span.lo * scale, hi: leftPx + (span.hi + 1) * scale };
  }
  return null;
}

/** The garment's ease on each side, as a share of the body span at that row. */
export interface SourceEase {
  readonly left: number;
  readonly right: number;
}

/**
 * How the garment sits on the body it was drawn for, row by row.
 *
 * Keyed by normalized y so it can be read against a target body of a different
 * canvas height. Rows where either the garment or the source body is unpainted
 * are absent, and a target row with no entry is not judged.
 */
export type SourceProportion = ReadonlyMap<number, SourceEase>;

export function measureSourceProportion(
  layerOnSource: ProjectedCharacterLayer,
  garment: RasterSpans,
  sourceBody: RasterSpans,
  sourceCanvas: { width: number; height: number },
): SourceProportion {
  const proportion = new Map<number, SourceEase>();
  for (let y = 0; y < sourceCanvas.height; y += 1) {
    const drawn = garmentSpanAtRow(layerOnSource, garment, sourceCanvas, y);
    if (!drawn) continue;
    const painted = sourceBody.rows[y];
    if (!painted) continue;
    const bodySpan = painted.hi + 1 - painted.lo;
    if (bodySpan <= 0) continue;
    proportion.set(y / sourceCanvas.height, {
      left: (painted.lo - drawn.lo) / bodySpan,
      right: (drawn.hi - (painted.hi + 1)) / bodySpan,
    });
  }
  return proportion;
}

function proportionAt(
  proportion: SourceProportion,
  normalizedY: number,
): SourceEase | null {
  let best: SourceEase | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const [y, value] of proportion) {
    const distance = Math.abs(y - normalizedY);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = value;
    }
  }
  // Half a row of tolerance: the nearest source row, or nothing.
  return bestDistance <= 0.002 ? best : null;
}

function hasAnyPaint(raster: RasterSpans): boolean {
  return raster.rows.some((row) => row !== null);
}

export function measureEdgeError(
  layer: ProjectedCharacterLayer,
  garment: RasterSpans,
  body: RasterSpans,
  bodyCanvas: { width: number; height: number },
  metric: FitMetric,
  sourceProportion: SourceProportion | null,
): EdgeError {
  let overhang = 0;
  let overhangAt = -1;
  let under = 0;
  let underAt = -1;
  let worst = 0;
  let worstAt = -1;
  let worstFraction = 0;
  let rowsCompared = 0;
  const from = Math.max(0, metric.fromRow);
  const to = Math.min(bodyCanvas.height - 1, metric.toRow);
  const rowsInWindow = Math.max(0, to - from + 1);
  if (rowsInWindow === 0) {
    return emptyEdgeError(
      metric,
      "invalid-geometry",
      "The measurement window is empty: the category's rows do not fall inside this body canvas.",
    );
  }
  if (!hasAnyPaint(garment)) {
    return emptyEdgeError(
      metric,
      "invalid-geometry",
      "The garment raster carries no paint at all; there is no garment to measure.",
      0,
      rowsInWindow,
    );
  }
  if (!hasAnyPaint(body)) {
    return emptyEdgeError(
      metric,
      "invalid-geometry",
      "The body raster carries no paint at all; there is no silhouette to measure against.",
      0,
      rowsInWindow,
    );
  }
  for (let y = from; y <= to; y += 1) {
    const drawn = garmentSpanAtRow(layer, garment, bodyCanvas, y);
    if (!drawn) continue;
    const painted = body.rows[y];
    if (!painted) continue;
    const bodySpan = painted.hi + 1 - painted.lo;
    const over = Math.max(painted.lo - drawn.lo, drawn.hi - (painted.hi + 1));
    const below = Math.max(drawn.lo - painted.lo, painted.hi + 1 - drawn.hi);
    if (over > overhang) {
      overhang = over;
      overhangAt = y;
    }
    if (below > under) {
      under = below;
      underAt = y;
    }

    let counted: number;
    if (metric.mode === "containment") {
      // Nothing proportional about a badge. It must stay inside the outline.
      counted = over;
    } else if (metric.mode === "coverage") {
      // Nothing proportional about a shoe. It must contain the foot.
      counted = below;
    } else {
      const ease = sourceProportion
        ? proportionAt(sourceProportion, y / bodyCanvas.height)
        : null;
      if (ease === null) continue;
      // Each edge is held to where it would sit carrying the source ease on
      // THIS body. Width alone is not enough: a garment of the right width in
      // the wrong place is a garment hanging off one side of the body.
      const expectedLo = painted.lo - ease.left * bodySpan;
      const expectedHi = painted.hi + 1 + ease.right * bodySpan;
      counted = Math.max(
        Math.abs(drawn.lo - expectedLo),
        Math.abs(drawn.hi - expectedHi),
      );
    }
    rowsCompared += 1;
    if (counted > worst) {
      worst = counted;
      worstAt = y;
      worstFraction = counted / bodySpan;
    }
  }
  if (
    rowsCompared < MINIMUM_COMPARABLE_ROWS ||
    rowsCompared < rowsInWindow * MINIMUM_COMPARABLE_FRACTION
  ) {
    return emptyEdgeError(
      metric,
      "insufficient-coverage",
      `Only ${rowsCompared} of ${rowsInWindow} rows in the ${metric.mode} window had both the garment and the body painted; at least ${MINIMUM_COMPARABLE_ROWS} rows and ${Math.round(MINIMUM_COMPARABLE_FRACTION * 100)}% of the window are needed before a number means anything.`,
      rowsCompared,
      rowsInWindow,
    );
  }
  return {
    status: "measured",
    statusReason: null,
    mode: metric.mode,
    fromRow: metric.fromRow,
    toRow: metric.toRow,
    overhangPx: round2(Math.max(0, overhang)),
    overhangAtRow: overhangAt,
    undercoveragePx: round2(Math.max(0, under)),
    undercoverageAtRow: underAt,
    worstPx: round2(Math.max(0, worst)),
    worstAtRow: worstAt,
    worstFractionOfBodySpan: round4(Math.max(0, worstFraction)),
    rowsCompared,
    rowsInWindow,
  };
}

const round2 = (value: number): number => Math.round(value * 100) / 100;
const round4 = (value: number): number => Math.round(value * 10000) / 10000;

/* -------------------------------------------------------------------------- */
/* One garment against one body                                                */
/* -------------------------------------------------------------------------- */

export interface FitCaseResult {
  readonly garmentAssetId: string;
  readonly garmentFamily: string;
  readonly kind: string;
  readonly sourceBodyFamily: string;
  readonly targetBodyFamily: string;
  readonly poseFamily: string;
  readonly metric: FitMetric;
  readonly unfitted: EdgeError;
  readonly affine: {
    readonly transform: GarmentFitTransform;
    readonly anchors: readonly string[];
    readonly ratios: Readonly<Record<string, number>>;
    readonly result: EdgeError;
    readonly withinBound: boolean;
  } | null;
  readonly boundedWarp: {
    readonly transform: GarmentFitTransform;
    readonly anchors: readonly string[];
    readonly result: EdgeError;
    readonly withinBound: boolean;
  } | null;
  readonly classification: GarmentFitClass;
  /**
   * Whether the classification rests on measured rows. False when the
   * unfitted measurement was not `measured`; the classification is then the
   * fail-closed `morphology-specific` and must not be read as a verdict about
   * the art, only as a refusal to conclude.
   */
  readonly evidence: "measured" | "insufficient";
  readonly reason: string;
}

function projectOne(
  body: FitSubject,
  garment: FitSubject,
  poseFamily: string,
  transform: GarmentFitTransform | null,
): ProjectedCharacterLayer {
  const bank: GarmentFitBankData = {
    schema: "garment-fit-profiles-v1",
    garments: [
      {
        component_family: garment.definition.family,
        kind: garment.definition.kind,
        classification: transform ? "affine-reusable" : "safe-direct-reuse",
        authored_for_body_family: transform ? "fit-measure-source" : null,
        basis: "Measurement harness probe.",
        profiles: transform
          ? [
              {
                target_body_family: body.definition.family,
                pose_family: poseFamily,
                transform,
              },
            ]
          : [],
      },
    ],
  };
  const library: CharacterComponentLibrary = createCharacterComponentLibrary(
    [asRecord(body), asRecord(garment)],
    { catalog_generation: 1, slots: [], generations: [] },
    createGarmentFitBank(bank),
  );
  // The harness is the one caller allowed to see a warp as drawable geometry:
  // it measures what the warp WOULD do and records that as evidence. Nothing
  // that renders passes this option, and a test keeps it out of `src/`.
  const projected = projectCharacterLayers(
    recipeFor(body.definition.family, poseFamily, [body, garment]),
    library,
    { admitUnrenderableWarps: true },
  );
  if (!projected) {
    throw new Error(
      `Measurement projection produced nothing for '${garment.assetId}' on '${body.assetId}'.`,
    );
  }
  const layer = projected.layers.find(
    (candidate) => candidate.assetId === garment.assetId,
  );
  if (!layer) {
    throw new Error(
      `Measurement projection dropped '${garment.assetId}' on '${body.assetId}'.`,
    );
  }
  if (layer.fitRefusal) {
    throw new Error(
      `Measurement projection refused '${garment.assetId}' on '${body.assetId}': ${layer.fitRefusal.message}`,
    );
  }
  return layer;
}

export interface MeasureCaseRequest {
  readonly garment: FitSubject;
  readonly sourceBody: FitSubject;
  readonly targetBody: FitSubject;
  readonly poseFamily: string;
  /** The garment's own extent in body-canvas normalized units. */
  readonly extent: { readonly topY: number; readonly bottomY: number };
  readonly maxEdgeErrorFraction?: number;
}

/**
 * Measures one garment on one target morphology, unfitted and then fitted.
 *
 * The classification returned is a READING, not an authoring decision: it says
 * which of the transforms actually brought the worst edge error inside the
 * bound, and the bank is then written to match. Writing the bank first and
 * measuring afterwards would let a wrong classification survive because
 * nothing contradicted it.
 */
export function measureFitCase(request: MeasureCaseRequest): FitCaseResult {
  const {
    garment,
    sourceBody,
    targetBody,
    poseFamily,
    extent,
    maxEdgeErrorFraction = GARMENT_FIT_DEFAULT_BOUNDS.maxEdgeErrorFraction,
  } = request;
  const kind = garment.definition.kind;
  if (!isGarmentFitGoverned(kind)) {
    throw new Error(`Kind '${kind}' is outside the fit contract.`);
  }
  const bodyCanvas = targetBody.definition.canvas;
  const sourceCanvas = sourceBody.definition.canvas;
  const garmentSpans = readRasterSpans(garment.file);
  const bodySpans = readRasterSpans(targetBody.file);
  const sourceBodySpans = readRasterSpans(sourceBody.file);

  const source = measureBodyFitReference(
    sourceBody.file,
    sourceBody.definition.family,
    poseFamily,
  );
  const target = measureBodyFitReference(
    targetBody.file,
    targetBody.definition.family,
    poseFamily,
  );
  const metric = metricFor(kind, target, extent, bodyCanvas.height);

  // What the garment does on the body it was drawn for. Unfitted by
  // definition: a garment always fits its own morphology, and that pairing is
  // the yardstick every fitted pairing below is held against.
  const sourceProportion = measureSourceProportion(
    projectOne(sourceBody, garment, poseFamily, null),
    garmentSpans,
    sourceBodySpans,
    sourceCanvas,
  );

  const unfitted = measureEdgeError(
    projectOne(targetBody, garment, poseFamily, null),
    garmentSpans,
    bodySpans,
    bodyCanvas,
    metric,
    sourceProportion,
  );

  // A scale is only a remedy for an edge-match category. A shoe is not sized by
  // the width of the ankle above it and a badge is not sized by the torso
  // behind it; scaling either one to chase a residual would resize the object
  // rather than fit it, so those categories are only ever safe as drawn or
  // morphology-specific.
  const fittable = metric.mode === "edge-match";

  let affine: FitCaseResult["affine"] = null;
  try {
    if (!fittable) throw new Error("not an edge-match category");
    const derived = deriveAffineFit(
      source,
      target,
      kind as GarmentFitGovernedKind,
      extent,
    );
    const result = measureEdgeError(
      projectOne(targetBody, garment, poseFamily, derived.transform),
      garmentSpans,
      bodySpans,
      bodyCanvas,
      metric,
      sourceProportion,
    );
    affine = {
      transform: derived.transform,
      anchors: derived.anchors,
      ratios: derived.ratios,
      result,
      withinBound: result.worstFractionOfBodySpan <= maxEdgeErrorFraction,
    };
  } catch {
    affine = null;
  }

  let boundedWarp: FitCaseResult["boundedWarp"] = null;
  try {
    if (!fittable) throw new Error("not an edge-match category");
    const derived = deriveBoundedWarpFit(
      source,
      target,
      kind as GarmentFitGovernedKind,
      extent,
    );
    const result = measureEdgeError(
      projectOne(targetBody, garment, poseFamily, derived.transform),
      garmentSpans,
      bodySpans,
      bodyCanvas,
      metric,
      sourceProportion,
    );
    boundedWarp = {
      transform: derived.transform,
      anchors: derived.anchors,
      result,
      withinBound: result.worstFractionOfBodySpan <= maxEdgeErrorFraction,
    };
  } catch {
    boundedWarp = null;
  }

  const fittedIsEvidence = (
    entry: { readonly result: EdgeError } | null,
  ): boolean => entry !== null && entry.result.status === "measured";
  if (affine && !fittedIsEvidence(affine)) {
    affine = { ...affine, withinBound: false };
  }
  if (boundedWarp && !fittedIsEvidence(boundedWarp)) {
    boundedWarp = { ...boundedWarp, withinBound: false };
  }

  let classification: GarmentFitClass;
  let reason: string;
  let evidence: FitCaseResult["evidence"] = "measured";
  if (unfitted.status !== "measured") {
    // No data is not a perfect fit. Nothing is concluded about the art; the
    // class is the fail-closed one and the flag says why.
    classification = "morphology-specific";
    evidence = "insufficient";
    reason = `Not measurable (${unfitted.status}): ${unfitted.statusReason ?? "no comparable rows."} No classification is drawn from an absence of evidence; this pairing is refused until it can be measured.`;
  } else if (unfitted.worstFractionOfBodySpan <= maxEdgeErrorFraction) {
    classification = "safe-direct-reuse";
    reason = `Unfitted placement already sits within ${(maxEdgeErrorFraction * 100).toFixed(1)}% of the target silhouette (worst ${unfitted.worstPx}px, ${(unfitted.worstFractionOfBodySpan * 100).toFixed(2)}%). A transform here would move art that is already where it belongs.`;
  } else if (affine?.withinBound) {
    classification = "affine-reusable";
    reason = `One axis-aligned scale brings the worst edge error from ${unfitted.worstPx}px (${(unfitted.worstFractionOfBodySpan * 100).toFixed(2)}%) to ${affine.result.worstPx}px (${(affine.result.worstFractionOfBodySpan * 100).toFixed(2)}%), inside the ${(maxEdgeErrorFraction * 100).toFixed(1)}% bound.`;
  } else if (boundedWarp?.withinBound) {
    classification = "bounded-warp-reusable";
    reason = `A single affine leaves ${affine ? `${affine.result.worstPx}px (${(affine.result.worstFractionOfBodySpan * 100).toFixed(2)}%)` : "no usable fit"}, outside the ${(maxEdgeErrorFraction * 100).toFixed(1)}% bound, because the morphology change is not uniform down the garment. The bounded warp reaches ${boundedWarp.result.worstPx}px (${(boundedWarp.result.worstFractionOfBodySpan * 100).toFixed(2)}%).`;
  } else if (!fittable) {
    classification = "morphology-specific";
    reason = `Unfitted placement misses by ${unfitted.worstPx}px (${(unfitted.worstFractionOfBodySpan * 100).toFixed(2)}%), outside the ${(maxEdgeErrorFraction * 100).toFixed(1)}% bound, and a ${metric.mode} category has no transform to reach for: scaling this component would resize the object rather than fit it. This morphology needs its own source art.`;
  } else {
    classification = "morphology-specific";
    reason = `Neither a single affine${affine ? ` (${affine.result.worstPx}px)` : ""} nor the bounded warp${boundedWarp ? ` (${boundedWarp.result.worstPx}px)` : ""} brings the worst residual inside the ${(maxEdgeErrorFraction * 100).toFixed(1)}% bound. This morphology needs its own source art.`;
  }

  return {
    garmentAssetId: garment.assetId,
    garmentFamily: garment.definition.family,
    kind,
    sourceBodyFamily: sourceBody.definition.family,
    targetBodyFamily: targetBody.definition.family,
    poseFamily,
    metric,
    unfitted,
    affine,
    boundedWarp,
    classification,
    evidence,
    reason,
  };
}

/* -------------------------------------------------------------------------- */
/* Loading the two measured sets                                               */
/* -------------------------------------------------------------------------- */

/**
 * Where a garment's own canvas sits in body-canvas normalized units.
 *
 * Derived from the component's anchor and origin rather than restated anywhere,
 * so a garment whose metadata changes cannot keep an extent that no longer
 * matches it.
 */
export function garmentExtent(
  definition: CharacterComponentDefinition,
  bodyAnchors: readonly { readonly id: string; readonly y: number }[],
  bodyHeight: number,
): { readonly topY: number; readonly bottomY: number } {
  const anchor = bodyAnchors.find(
    (candidate) => candidate.id === definition.attaches_to,
  );
  if (!anchor) {
    throw new Error(
      `Component family '${definition.family}' attaches to '${String(definition.attaches_to)}', which the body does not declare.`,
    );
  }
  const height = definition.canvas.height / bodyHeight;
  const topY = anchor.y - (definition.origin?.y ?? 0) * height;
  return { topY, bottomY: topY + height };
}

export function subjectFromManifest(
  repositoryRoot: string,
  manifestAssets: readonly {
    readonly asset_id: string;
    readonly final_path?: string;
    readonly component?: CharacterComponentDefinition;
  }[],
  assetId: string,
): FitSubject {
  const record = manifestAssets.find((asset) => asset.asset_id === assetId);
  if (!record?.component || !record.final_path) {
    throw new Error(`Manifest carries no component record for '${assetId}'.`);
  }
  return {
    assetId,
    definition: record.component,
    file: path.join(repositoryRoot, record.final_path),
  };
}

export const GARMENT_FIT_CATEGORY_ANCHOR_TABLE = GARMENT_FIT_CATEGORY_ANCHORS;
