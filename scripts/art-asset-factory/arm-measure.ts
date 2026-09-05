import fs from "fs";
import { PNG } from "pngjs";

import { hashArtFile } from "./content-hash";

/**
 * Measuring arms from a body raster's alpha, and saying exactly what could not
 * be measured.
 *
 * The garment fit contract (D-074) answers tops, bottoms, footwear and
 * accessories and leaves sleeves open, because its fixtures are armless and
 * nothing in the repository measured an arm. This is the measurement, and the
 * rule it works under is the one every measurement here works under: a number
 * comes from the pixels or it is not written down.
 *
 * What alpha can and cannot say about an arm decides the whole shape of the
 * output:
 *
 * - Where an arm hangs CLEAR of the torso there is transparent canvas between
 *   them, so a row carries a separate opaque run on that side. Both edges of
 *   the arm are then real silhouette edges and its width, its axis and its
 *   wrist can be read.
 * - Where an arm lies AGAINST the torso — the upper arm on almost every pose,
 *   the whole arm on a seated pose with hands on the thighs — the row is one
 *   opaque run. The outer edge of that run is a silhouette edge; the inner
 *   edge of the arm is not in the alpha at all. It is painted as a line and
 *   a shading change, which is colour, and reading it would be a heuristic on
 *   colour that this file does not attempt. Those rows are reported FUSED and
 *   every inner measurement over them is `occluded`, not estimated.
 *
 * So every landmark, width and segment carries a status and an evidence
 * class. `measured` is a reading of the silhouette. `partially-measured` is a
 * reading that locates a region rather than a joint — an elbow found as the
 * bow of the outer contour is on the skin, not at the joint centre.
 * `ambiguous` means the silhouette was read and did not decide the question.
 * `occluded` means the silhouette does not contain the edge. `unavailable`
 * means a prerequisite was missing. Nothing is filled in from proportion.
 *
 * Sides are IMAGE sides — `left` is the smaller x — which is the convention
 * the pose registry's `shoulder-left` / `shoulder-right` landmarks already
 * use. A front-facing figure's image-left arm is its anatomical right; the
 * file does not infer facing and so does not translate. The two sides are
 * measured independently and are never mirrored into each other.
 *
 * Pose is part of the identity of every measurement. The report is keyed by
 * asset, body family and pose family, and `assessSleeveFitReadiness` refuses
 * to compare arms across poses unless the caller states they are compatible.
 */

export const ARM_MEASUREMENT_TOOL = "arm-measure-v1";

/** Same alpha floor `garment-fit-measure.ts` reads spans at. */
export const ARM_ALPHA_FLOOR = 8;

export const ARM_SIDES = ["left", "right"] as const;
export type ArmSide = (typeof ARM_SIDES)[number];

export const ARM_MEASUREMENT_STATUSES = [
  "measured",
  "partially-measured",
  "occluded",
  "ambiguous",
  "unavailable",
] as const;
export type ArmMeasurementStatus = (typeof ARM_MEASUREMENT_STATUSES)[number];

/**
 * How a value was obtained.
 *
 * - `alpha-silhouette`: read from the alpha with no free parameter beyond the
 *   alpha floor — a row's extent, a component's pixels, a bounding row.
 * - `silhouette-rule`: derived from the silhouette by a stated rule with a
 *   stated parameter (the neck as the narrowest row in a band, the wrist as
 *   the narrowest cross-section before a widening). The rule is quoted in the
 *   note so a reviewer can disagree with the rule rather than the number.
 * - `none`: nothing was read; the value is null.
 */
export type ArmEvidenceClass = "alpha-silhouette" | "silhouette-rule" | "none";

export interface ArmPoint {
  readonly x: number;
  readonly y: number;
}

export interface ArmLandmark {
  readonly status: ArmMeasurementStatus;
  readonly evidence: ArmEvidenceClass;
  /** Canvas pixels, or null when the status carries no value. */
  readonly px: ArmPoint | null;
  /** The same point normalized 0..1 in the canvas, 4 places. */
  readonly normalized: ArmPoint | null;
  readonly note: string;
}

export interface ArmWidth {
  readonly status: ArmMeasurementStatus;
  readonly evidence: ArmEvidenceClass;
  /** Cross-section perpendicular to the separated segment's axis, in pixels. */
  readonly px: number | null;
  /** The same width as a fraction of the canvas width, 4 places. */
  readonly ofCanvasWidth: number | null;
  readonly note: string;
}

export interface ArmSegment {
  readonly status: ArmMeasurementStatus;
  readonly from: "shoulder" | "elbow";
  readonly to: "elbow" | "wrist";
  /** Pixel vector from `from` to `to`. */
  readonly vectorPx: ArmPoint | null;
  readonly lengthPx: number | null;
  /** Length as a fraction of the figure height (crown to sole), 4 places. */
  readonly ofFigureHeight: number | null;
  /**
   * Signed angle in degrees between this segment and the torso axis, which
   * points down the body. 0 is parallel to the torso; positive turns toward
   * the image right.
   */
  readonly angleFromTorsoAxisDeg: number | null;
  readonly note: string;
}

export interface ArmContourSample {
  readonly y: number;
  readonly x: number;
  /** True where the row is one opaque run and this edge is the silhouette's, not proven to be the arm's. */
  readonly fusedWithTorso: boolean;
}

export interface ArmSeparation {
  /** Rows between the shoulder row and the arm's last row where the side has its own opaque run. */
  readonly separatedRowCount: number;
  /** Rows in the same span where the side is one run with the torso. */
  readonly fusedRowCount: number;
  readonly firstSeparatedRow: number | null;
  readonly lastSeparatedRow: number | null;
  readonly componentPixels: number;
  /** Principal axis of the separated component, degrees from vertical; null without a component. */
  readonly axisAngleFromVerticalDeg: number | null;
  readonly axisLengthPx: number | null;
  /**
   * Lateral components on this side that were NOT taken as the arm — a foot's
   * shadow, a knee in three-quarter view. Reported so nothing is silently
   * dropped.
   */
  readonly unassignedLateralComponents: readonly {
    readonly pixels: number;
    readonly topRow: number;
    readonly bottomRow: number;
  }[];
  /** Unassigned components too small to list one by one — a cast shadow's specks. */
  readonly smallFragments: { readonly count: number; readonly pixels: number };
}

export type ArmPosture = "hanging" | "raised-or-forward" | "fused" | "absent";

export interface ArmSideMeasurement {
  readonly side: ArmSide;
  readonly status: ArmMeasurementStatus;
  /** What the separated segment's axis says about the arm's carriage. */
  readonly posture: ArmPosture;
  readonly shoulder: ArmLandmark;
  readonly elbow: ArmLandmark;
  readonly wrist: ArmLandmark;
  /** The far end of the separated segment: the hand's tip where a wrist was found, otherwise just the end. */
  readonly extremity: ArmLandmark;
  readonly upperArm: ArmSegment;
  readonly forearm: ArmSegment;
  readonly elbowBendDeg: {
    readonly status: ArmMeasurementStatus;
    readonly value: number | null;
    readonly note: string;
  };
  readonly widths: {
    readonly upperArmNearShoulder: ArmWidth;
    readonly upperArmMid: ArmWidth;
    readonly elbow: ArmWidth;
    readonly forearmMid: ArmWidth;
    readonly wrist: ArmWidth;
  };
  readonly outerContour: {
    readonly status: ArmMeasurementStatus;
    readonly samples: readonly ArmContourSample[];
    readonly note: string;
  };
  readonly innerContour: {
    readonly status: ArmMeasurementStatus;
    readonly samples: readonly ArmContourSample[];
    readonly note: string;
  };
  readonly separation: ArmSeparation;
  readonly layering: {
    readonly status: "unavailable";
    readonly note: string;
  };
  /** Measured landmarks against the pose registry's nominal ones, when the pose is registered. */
  readonly registryDeviation: Readonly<
    Record<"shoulder" | "elbow" | "wrist", ArmPoint | null>
  > | null;
}

export interface ArmSubject {
  readonly assetId: string;
  /** Repository-relative path, recorded verbatim in the report. */
  readonly file: string;
  readonly bodyFamily: string;
  readonly poseFamily: string;
  readonly source:
    | "manifest-component"
    | "manifest-candidate"
    | "p71-candidate"
    | "test-fixture";
  /** Nominal landmarks from the pose registry, normalized, when the pose is registered. */
  readonly nominalLandmarks?: Readonly<Record<string, ArmPoint>>;
}

export interface ArmFigureRows {
  readonly headTopRow: number;
  readonly neckRow: number;
  readonly shoulderRow: number;
  readonly midFigureRow: number;
  readonly soleRow: number;
  readonly figureHeightPx: number;
  /** Midline column at the neck; the per-row midline is `midlineColumn`. */
  readonly centerX: number;
  /** Neck centre to mid-figure centre, in pixels. */
  readonly torsoAxis: { readonly from: ArmPoint; readonly to: ArmPoint };
}

export interface ArmMeasurementEntry {
  readonly assetId: string;
  readonly file: string;
  readonly sha256: string;
  readonly source: ArmSubject["source"];
  readonly bodyFamily: string;
  readonly poseFamily: string;
  readonly canvas: { readonly width: number; readonly height: number };
  readonly figure: ArmFigureRows | null;
  readonly sides: Readonly<Record<ArmSide, ArmSideMeasurement>>;
}

/* -------------------------------------------------------------------------- */
/* Raster reading                                                              */
/* -------------------------------------------------------------------------- */

export interface Run {
  readonly lo: number;
  readonly hi: number;
}

export interface RasterRuns {
  readonly width: number;
  readonly height: number;
  /** Opaque runs per row, ascending by x; an empty array where nothing is painted. */
  readonly rows: readonly (readonly Run[])[];
}

export function runsFromRgba(
  width: number,
  height: number,
  data: Uint8Array | Buffer,
  alphaFloor = ARM_ALPHA_FLOOR,
): RasterRuns {
  const rows: Run[][] = [];
  for (let y = 0; y < height; y += 1) {
    const runs: Run[] = [];
    let start = -1;
    for (let x = 0; x <= width; x += 1) {
      const opaque =
        x < width && (data[(y * width + x) * 4 + 3] ?? 0) > alphaFloor;
      if (opaque && start < 0) start = x;
      if (!opaque && start >= 0) {
        runs.push({ lo: start, hi: x - 1 });
        start = -1;
      }
    }
    rows.push(runs);
  }
  return { width, height, rows };
}

export function readRasterRuns(file: string): RasterRuns {
  const png = PNG.sync.read(fs.readFileSync(file));
  return runsFromRgba(png.width, png.height, png.data);
}

const runLength = (run: Run): number => run.hi - run.lo + 1;
const paintedWidth = (runs: readonly Run[]): number =>
  runs.reduce((sum, run) => sum + runLength(run), 0);

function extent(runs: readonly Run[]): Run | null {
  if (runs.length === 0) return null;
  return { lo: runs[0]!.lo, hi: runs[runs.length - 1]!.hi };
}

/* -------------------------------------------------------------------------- */
/* Figure rows                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * The rows the arm measurement hangs from, by the same rules
 * `measureBodyRig` in `pg-modular-intake.ts` uses for the accepted body rig:
 * the neck is the narrowest row in the band 6%–20% of figure height below the
 * crown, the shoulder row is the first row at or below the neck reaching 92%
 * of the widest painted width within 15% of figure height, and the midline is
 * the centre of the widest row. Restated here on run data rather than a
 * pureimage bitmap; the rules are the same and are quoted in every note that
 * depends on them.
 */
export function measureFigureRows(raster: RasterRuns): ArmFigureRows | null {
  const painted = raster.rows.map(paintedWidth);
  const headTopRow = painted.findIndex((w) => w > 0);
  if (headTopRow < 0) return null;
  let soleRow = raster.height - 1;
  while (soleRow > headTopRow && painted[soleRow] === 0) soleRow -= 1;
  const figureHeightPx = soleRow - headTopRow + 1;

  const band = (fraction: number): number =>
    Math.min(soleRow, headTopRow + Math.round(figureHeightPx * fraction));

  // The neck is the narrowest painted row in its band. Its centre is the
  // body's midline column: `measureBodyRig` takes the centre of the WIDEST
  // row instead, which on a hanging-arm body is the same column and on a
  // gesturing body is pulled toward the raised arm — far enough, on a
  // synthetic test figure, to land inside one leg and turn the other leg
  // into "lateral material".
  let neckRow = band(0.06);
  for (let y = band(0.06); y <= band(0.2); y += 1) {
    if (painted[y]! > 0 && painted[y]! < painted[neckRow]!) neckRow = y;
  }
  const neck = extent(raster.rows[neckRow]!)!;
  const centerX = Math.round((neck.lo + neck.hi) / 2);
  const midFigureRow = band(0.5);
  const midCentral = centralExtent(raster.rows[midFigureRow]!, centerX);
  const midSpan = midCentral ??
    extent(raster.rows[midFigureRow]!) ?? { lo: centerX, hi: centerX };
  const torsoAxis = {
    from: { x: round2((neck.lo + neck.hi) / 2), y: neckRow },
    to: { x: round2((midSpan.lo + midSpan.hi) / 2), y: midFigureRow },
  };
  const column = (y: number): number => midlineColumnOf(torsoAxis, y);

  // The shoulder rule reads the width of the run at the midline, not the
  // whole row: a hand raised beside the chest is its own run on that row,
  // and counting it would move the shoulder row down to wherever the hand
  // is. (`measureBodyRig` reads the whole row; on its hanging-arm subjects
  // the two agree.)
  const widths = raster.rows.map((runs, y) => {
    const central = centralExtent(runs, column(y));
    return central ? runLength(central) : paintedWidth(runs);
  });
  const shoulderTo = Math.min(
    soleRow,
    neckRow + Math.round(figureHeightPx * 0.15),
  );
  let peak = 0;
  for (let y = neckRow; y <= shoulderTo; y += 1) {
    peak = Math.max(peak, widths[y]!);
  }
  let shoulderRow = neckRow;
  for (let y = neckRow; y <= shoulderTo; y += 1) {
    if (widths[y]! >= peak * 0.92) {
      shoulderRow = y;
      break;
    }
  }
  return {
    headTopRow,
    neckRow,
    shoulderRow,
    midFigureRow,
    soleRow,
    figureHeightPx,
    centerX,
    torsoAxis,
  };
}

/**
 * The midline column at a row: the torso axis, extended above the neck and
 * below the mid-figure row. Below the hips it runs between the legs, so the
 * central extent there spans both of them and neither leg is lateral.
 */
function midlineColumnOf(
  torsoAxis: ArmFigureRows["torsoAxis"],
  y: number,
): number {
  const { from, to } = torsoAxis;
  if (to.y === from.y) return Math.round(from.x);
  return Math.round(
    from.x + ((to.x - from.x) * (y - from.y)) / (to.y - from.y),
  );
}

export function midlineColumn(figure: ArmFigureRows, y: number): number {
  return midlineColumnOf(figure.torsoAxis, y);
}

/**
 * The run a row carries at the midline, or, below the crotch where the
 * midline falls between two legs, the span from the run just left of it to
 * the run just right of it. Everything outside this is lateral material.
 */
function centralExtent(runs: readonly Run[], centerX: number): Run | null {
  if (runs.length === 0) return null;
  const containing = runs.find((run) => run.lo <= centerX && centerX <= run.hi);
  if (containing) return containing;
  let leftOf: Run | null = null;
  let rightOf: Run | null = null;
  for (const run of runs) {
    if (run.hi < centerX) leftOf = run;
    else if (run.lo > centerX && rightOf === null) rightOf = run;
  }
  if (leftOf && rightOf) return { lo: leftOf.lo, hi: rightOf.hi };
  return null;
}

/* -------------------------------------------------------------------------- */
/* Lateral components                                                          */
/* -------------------------------------------------------------------------- */

interface LateralRun extends Run {
  readonly y: number;
}

interface LateralComponent {
  readonly runs: readonly LateralRun[];
  readonly pixels: number;
  readonly topRow: number;
  readonly bottomRow: number;
}

/**
 * Connected components of the opaque runs that lie strictly outside the
 * central extent on one side, between the shoulder row and the sole. Two
 * runs on adjacent rows join when they overlap or touch diagonally
 * (8-connectivity).
 */
function lateralComponents(
  raster: RasterRuns,
  figure: ArmFigureRows,
  side: ArmSide,
): LateralComponent[] {
  const lateral: LateralRun[][] = [];
  for (let y = figure.shoulderRow; y <= figure.soleRow; y += 1) {
    const runs = raster.rows[y]!;
    const central = centralExtent(runs, midlineColumn(figure, y));
    const picked = central
      ? runs.filter((run) =>
          side === "left" ? run.hi < central.lo : run.lo > central.hi,
        )
      : [];
    lateral.push(picked.map((run) => ({ ...run, y })));
  }
  const parent = new Map<LateralRun, LateralRun>();
  const find = (run: LateralRun): LateralRun => {
    let root = run;
    while (parent.get(root) !== root) root = parent.get(root)!;
    let cursor = run;
    while (parent.get(cursor) !== root) {
      const next = parent.get(cursor)!;
      parent.set(cursor, root);
      cursor = next;
    }
    return root;
  };
  const union = (a: LateralRun, b: LateralRun): void => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };
  for (const row of lateral) for (const run of row) parent.set(run, run);
  for (let index = 1; index < lateral.length; index += 1) {
    for (const run of lateral[index]!) {
      for (const above of lateral[index - 1]!) {
        if (above.hi + 1 >= run.lo && above.lo - 1 <= run.hi) union(run, above);
      }
    }
  }
  const groups = new Map<LateralRun, LateralRun[]>();
  for (const row of lateral) {
    for (const run of row) {
      const root = find(run);
      const group = groups.get(root) ?? [];
      group.push(run);
      groups.set(root, group);
    }
  }
  return [...groups.values()]
    .map((runs) => ({
      runs,
      pixels: runs.reduce((sum, run) => sum + runLength(run), 0),
      topRow: Math.min(...runs.map((run) => run.y)),
      bottomRow: Math.max(...runs.map((run) => run.y)),
    }))
    .sort(
      (a, b) =>
        b.pixels - a.pixels ||
        a.topRow - b.topRow ||
        a.runs[0]!.lo - b.runs[0]!.lo,
    );
}

/* -------------------------------------------------------------------------- */
/* Axis and cross-sections                                                     */
/* -------------------------------------------------------------------------- */

interface SegmentAxis {
  /** Unit vector from the root end toward the extremity. */
  readonly direction: ArmPoint;
  /** On the axis line; used for every slice and projection. */
  readonly root: ArmPoint;
  readonly extremity: ArmPoint;
  /** The component's own pixels farthest along the axis in each direction; what is reported. */
  readonly rootPixel: ArmPoint;
  readonly extremityPixel: ArmPoint;
  readonly lengthPx: number;
  /** Cross-sections at 33 evenly spaced positions from root (0) to extremity (1). */
  readonly profile: readonly CrossSection[];
  readonly angleFromVerticalDeg: number;
}

const WIDTH_PROFILE_SAMPLES = 33;

/**
 * One slice through the silhouette perpendicular to the segment axis.
 *
 * The walk starts on the axis and steps outward in both directions until it
 * meets transparency. Alpha cannot say where an arm stops and a torso starts
 * inside one opaque run, so the slice is declared FUSED — no width — on any
 * sign that it left the arm without passing an edge: it stepped into the run
 * that carries the body's midline on that row, it crossed the torso axis, or
 * it grew longer than any arm is thick (`ARM_SLICE_MAX_FRACTION` of figure
 * height, a stated ceiling that fails closed).
 *
 * The midline-run test is deliberately strict. A forearm carried across the
 * body joins the torso along its upper rows, and a slice through it that
 * climbs into those rows is declared fused even though both of the forearm's
 * edges may be visible there — because on those rows the alpha holds one run
 * and nothing in it says which pixels are forearm. That arm is reported
 * occluded rather than measured from a guess about where the torso ends.
 */
const ARM_SLICE_MAX_FRACTION = 0.2;

function insideMidlineRun(mask: SilhouetteMask, x: number, y: number): boolean {
  if (y < 0 || y >= mask.raster.height) return false;
  const column = midlineColumn(mask.figure, y);
  const central = mask.raster.rows[y]!.find(
    (run) => run.lo <= column && column <= run.hi,
  );
  return central !== undefined && central.lo <= x && x <= central.hi;
}
interface CrossSection {
  readonly t: number;
  readonly centre: ArmPoint;
  /** Pixels across the slice, or null where the slice is fused or off the figure. */
  readonly widthPx: number | null;
  readonly fused: boolean;
  /** Silhouette edge farther from the torso axis, or null. */
  readonly outer: ArmPoint | null;
  /** Silhouette edge nearer the torso axis, or null. */
  readonly inner: ArmPoint | null;
}

interface SilhouetteMask {
  readonly raster: RasterRuns;
  readonly figure: ArmFigureRows;
}

function opaqueAt(mask: SilhouetteMask, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= mask.raster.width || y >= mask.raster.height) {
    return false;
  }
  return mask.raster.rows[y]!.some((run) => run.lo <= x && x <= run.hi);
}

/** Signed distance from the torso axis line; the sign says which side of the body a point is on. */
function torsoAxisSide(mask: SilhouetteMask, p: ArmPoint): number {
  const from = mask.figure.torsoAxis.from;
  const to = mask.figure.torsoAxis.to;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  return ((p.x - from.x) * dy - (p.y - from.y) * dx) / length;
}

function walkCrossSection(
  mask: SilhouetteMask,
  t: number,
  centre: ArmPoint,
  direction: ArmPoint,
): CrossSection {
  const normal = { x: -direction.y, y: direction.x };
  const start = { x: Math.round(centre.x), y: Math.round(centre.y) };
  if (!opaqueAt(mask, start.x, start.y)) {
    return { t, centre, widthPx: null, fused: false, outer: null, inner: null };
  }
  if (insideMidlineRun(mask, start.x, start.y)) {
    return { t, centre, widthPx: null, fused: true, outer: null, inner: null };
  }
  const startSide = torsoAxisSide(mask, start);
  const limit = Math.ceil(mask.figure.figureHeightPx * ARM_SLICE_MAX_FRACTION);
  const walk = (
    sign: 1 | -1,
  ): {
    readonly steps: number;
    readonly edge: ArmPoint;
    readonly fused: boolean;
  } => {
    let steps = 0;
    let last = start;
    for (let k = 1; k <= limit + 1; k += 1) {
      const x = Math.round(centre.x + sign * normal.x * k);
      const y = Math.round(centre.y + sign * normal.y * k);
      if (!opaqueAt(mask, x, y)) return { steps, edge: last, fused: false };
      if (
        insideMidlineRun(mask, x, y) ||
        torsoAxisSide(mask, { x, y }) * startSide < 0
      ) {
        return { steps, edge: last, fused: true };
      }
      last = { x, y };
      steps = k;
    }
    // Ran past the ceiling without meeting transparency.
    return { steps, edge: last, fused: true };
  };
  const plus = walk(1);
  const minus = walk(-1);
  const fused =
    plus.fused || minus.fused || plus.steps + minus.steps + 1 > limit;
  if (fused) {
    return { t, centre, widthPx: null, fused: true, outer: null, inner: null };
  }
  const plusIsOuter =
    Math.abs(torsoAxisSide(mask, plus.edge)) >=
    Math.abs(torsoAxisSide(mask, minus.edge));
  return {
    t,
    centre,
    widthPx: plus.steps + minus.steps + 1,
    fused: false,
    outer: plusIsOuter ? plus.edge : minus.edge,
    inner: plusIsOuter ? minus.edge : plus.edge,
  };
}

/**
 * Principal axis of the component's pixels, oriented so it runs from the end
 * nearer the shoulder tip to the other end, and the cross-section through the
 * FULL silhouette perpendicular to that axis at even steps along it. The
 * component decides where the axis is; the silhouette decides what the arm
 * is wide, because the component holds only the rows where the arm clears the
 * torso and a forearm carried across the body clears it on only some of its
 * rows.
 */
function segmentAxis(
  component: LateralComponent,
  shoulderTip: ArmPoint,
  mask: SilhouetteMask,
): SegmentAxis {
  let sumX = 0;
  let sumY = 0;
  let count = 0;
  for (const run of component.runs) {
    for (let x = run.lo; x <= run.hi; x += 1) {
      sumX += x;
      sumY += run.y;
      count += 1;
    }
  }
  const meanX = sumX / count;
  const meanY = sumY / count;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const run of component.runs) {
    for (let x = run.lo; x <= run.hi; x += 1) {
      const dx = x - meanX;
      const dy = run.y - meanY;
      sxx += dx * dx;
      syy += dy * dy;
      sxy += dx * dy;
    }
  }
  // Eigenvector of the larger eigenvalue of [[sxx, sxy], [sxy, syy]].
  const trace = sxx + syy;
  const det = sxx * syy - sxy * sxy;
  const lambda = trace / 2 + Math.sqrt(Math.max(0, (trace * trace) / 4 - det));
  let ux: number;
  let uy: number;
  if (Math.abs(sxy) > 1e-9) {
    ux = lambda - syy;
    uy = sxy;
  } else if (sxx >= syy) {
    ux = 1;
    uy = 0;
  } else {
    ux = 0;
    uy = 1;
  }
  const norm = Math.hypot(ux, uy) || 1;
  ux /= norm;
  uy /= norm;

  // The ends are the component's own pixels farthest along the axis in each
  // direction, so both endpoints are on the silhouette by construction; the
  // axis line itself can leave a tapered tip. Ties go to the earlier run and
  // the lower x so the choice is stable.
  let minU = Number.POSITIVE_INFINITY;
  let maxU = Number.NEGATIVE_INFINITY;
  let endA: ArmPoint = { x: 0, y: 0 };
  let endB: ArmPoint = { x: 0, y: 0 };
  for (const run of component.runs) {
    for (const x of [run.lo, run.hi]) {
      const u = (x - meanX) * ux + (run.y - meanY) * uy;
      if (u < minU) {
        minU = u;
        endA = { x, y: run.y };
      }
      if (u > maxU) {
        maxU = u;
        endB = { x, y: run.y };
      }
    }
  }
  // The axis line itself runs through the mean along the principal
  // direction; the pixel ends are only where it is REPORTED, so the slices
  // are taken along the true axis and not along a line tilted by whichever
  // pixel happened to sit farthest out.
  const axisA = { x: meanX + ux * minU, y: meanY + uy * minU };
  const axisB = { x: meanX + ux * maxU, y: meanY + uy * maxU };
  const distance = (p: ArmPoint): number =>
    Math.hypot(p.x - shoulderTip.x, p.y - shoulderTip.y);
  const rootIsA = distance(axisA) <= distance(axisB);
  const root = rootIsA ? axisA : axisB;
  const extremity = rootIsA ? axisB : axisA;
  const rootPixel = rootIsA ? endA : endB;
  const extremityPixel = rootIsA ? endB : endA;
  const lengthPx = maxU - minU;
  const dir = {
    x: (extremity.x - root.x) / (lengthPx || 1),
    y: (extremity.y - root.y) / (lengthPx || 1),
  };

  const profile: CrossSection[] = [];
  for (let sample = 0; sample < WIDTH_PROFILE_SAMPLES; sample += 1) {
    const t = sample / (WIDTH_PROFILE_SAMPLES - 1);
    const centre = {
      x: root.x + dir.x * t * lengthPx,
      y: root.y + dir.y * t * lengthPx,
    };
    profile.push(walkCrossSection(mask, t, centre, dir));
  }
  const angle = (Math.atan2(dir.x, dir.y) * 180) / Math.PI;
  return {
    direction: dir,
    root,
    extremity,
    rootPixel,
    extremityPixel,
    lengthPx,
    profile,
    angleFromVerticalDeg: round2(
      Math.abs(angle) > 90 ? 180 - Math.abs(angle) : Math.abs(angle),
    ),
  };
}

function projectOntoAxis(axis: SegmentAxis, point: ArmPoint): number {
  const u =
    (point.x - axis.root.x) * axis.direction.x +
    (point.y - axis.root.y) * axis.direction.y;
  return axis.lengthPx === 0 ? 0 : u / axis.lengthPx;
}

function axisPoint(axis: SegmentAxis, t: number): ArmPoint {
  return {
    x: axis.root.x + axis.direction.x * t * axis.lengthPx,
    y: axis.root.y + axis.direction.y * t * axis.lengthPx,
  };
}

/* -------------------------------------------------------------------------- */
/* Rounding and helpers                                                        */
/* -------------------------------------------------------------------------- */

const round2 = (value: number): number => Math.round(value * 100) / 100 + 0;
const round4 = (value: number): number => Math.round(value * 10000) / 10000 + 0;
const roundPoint = (point: ArmPoint): ArmPoint => ({
  x: round2(point.x),
  y: round2(point.y),
});

function landmark(
  status: ArmMeasurementStatus,
  evidence: ArmEvidenceClass,
  px: ArmPoint | null,
  canvas: { width: number; height: number },
  note: string,
): ArmLandmark {
  const rounded = px ? roundPoint(px) : null;
  return {
    status,
    evidence,
    px: rounded,
    normalized: rounded
      ? {
          x: round4(rounded.x / canvas.width),
          y: round4(rounded.y / canvas.height),
        }
      : null,
    note,
  };
}

const absent = (
  canvas: { width: number; height: number },
  status: ArmMeasurementStatus,
  note: string,
): ArmLandmark => landmark(status, "none", null, canvas, note);

function widthValue(
  status: ArmMeasurementStatus,
  evidence: ArmEvidenceClass,
  px: number | null,
  canvasWidth: number,
  note: string,
): ArmWidth {
  return {
    status,
    evidence,
    px: px === null ? null : round2(px),
    ofCanvasWidth: px === null ? null : round4(px / canvasWidth),
    note,
  };
}

function segment(
  from: "shoulder" | "elbow",
  to: "elbow" | "wrist",
  a: ArmLandmark,
  b: ArmLandmark,
  figure: ArmFigureRows,
): ArmSegment {
  if (!a.px || !b.px) {
    return {
      status: "unavailable",
      from,
      to,
      vectorPx: null,
      lengthPx: null,
      ofFigureHeight: null,
      angleFromTorsoAxisDeg: null,
      note: `No vector: '${!a.px ? from : to}' carries no point (${!a.px ? a.status : b.status}).`,
    };
  }
  const status: ArmMeasurementStatus =
    a.status === "measured" && b.status === "measured"
      ? "measured"
      : "partially-measured";
  const vector = { x: b.px.x - a.px.x, y: b.px.y - a.px.y };
  const length = Math.hypot(vector.x, vector.y);
  const torso = {
    x: figure.torsoAxis.to.x - figure.torsoAxis.from.x,
    y: figure.torsoAxis.to.y - figure.torsoAxis.from.y,
  };
  const angle =
    ((Math.atan2(vector.x, vector.y) - Math.atan2(torso.x, torso.y)) * 180) /
    Math.PI;
  const wrapped = ((angle + 540) % 360) - 180;
  return {
    status,
    from,
    to,
    vectorPx: roundPoint(vector),
    lengthPx: round2(length),
    ofFigureHeight: round4(length / figure.figureHeightPx),
    angleFromTorsoAxisDeg: round2(wrapped),
    note:
      status === "measured"
        ? "Both endpoints are measured silhouette points."
        : `Carries a ${a.status === "measured" ? to : from} endpoint that is ${a.status === "measured" ? b.status : a.status}; the length is a bound on the segment, not the joint-to-joint distance.`,
  };
}

/* -------------------------------------------------------------------------- */
/* One side                                                                    */
/* -------------------------------------------------------------------------- */

const CONTOUR_SAMPLES = 16;
/** A separated segment within this many degrees of vertical, running downward, is a hanging arm. */
const HANGING_MAX_ANGLE_DEG = 35;
/** A bow of at least this share of the shoulder–wrist chord is read as an elbow region. */
const ELBOW_BOW_MIN_FRACTION = 0.02;
/** The far end must widen by at least this ratio past the narrowest cross-section to be read as a hand beyond a wrist. */
const WRIST_WIDENING_MIN_RATIO = 1.12;
/** The arm component must begin above this share of figure height; anything lower is a leg or a shadow. */
const ARM_COMPONENT_MAX_START_FRACTION = 0.55;
/**
 * A component whose bottom row comes within this share of figure height of
 * the sole stands on the floor: it is a leg, a foot or a cast shadow, never a
 * hand. An arm's separated segment ends at the hand, well above the sole.
 */
const ARM_COMPONENT_SOLE_CLEARANCE_FRACTION = 0.05;
/**
 * The separated segment's axis must be at least this share of figure height
 * to carry landmarks. A forearm is roughly 15% of stature and a hand roughly
 * 10%; a component shorter than 10% is a fragment — a hand beside a hip, the
 * strip of forearm above a thigh — and a wrist or elbow read from it would be
 * read from a shape that does not contain one.
 */
const ARM_COMPONENT_MIN_AXIS_FRACTION = 0.1;
/** Unassigned lateral components at or above this many pixels are listed individually; smaller ones are counted. */
const UNASSIGNED_LISTING_MIN_PIXELS = 50;

function measureSide(
  raster: RasterRuns,
  figure: ArmFigureRows,
  side: ArmSide,
  nominal: Readonly<Record<string, ArmPoint>> | undefined,
): ArmSideMeasurement {
  const canvas = { width: raster.width, height: raster.height };
  const outerX = (y: number): number | null => {
    const span = extent(raster.rows[y]!);
    if (!span) return null;
    return side === "left" ? span.lo : span.hi;
  };
  const central = (y: number): Run | null =>
    centralExtent(raster.rows[y]!, midlineColumn(figure, y));
  const rowIsFused = (y: number): boolean => {
    const span = extent(raster.rows[y]!);
    const centre = central(y);
    if (!span || !centre) return true;
    return side === "left" ? span.lo >= centre.lo : span.hi <= centre.hi;
  };

  // Shoulder tip: the silhouette's outer edge at the shoulder row.
  const shoulderX = outerX(figure.shoulderRow);
  if (shoulderX === null) {
    return unavailableSide(
      side,
      canvas,
      "The shoulder row carries no silhouette.",
    );
  }
  const shoulderPx = { x: shoulderX, y: figure.shoulderRow };
  const shoulder = landmark(
    "measured",
    "silhouette-rule",
    shoulderPx,
    canvas,
    "Outer silhouette edge at the shoulder row — the first row at or below the neck reaching 92% of the widest painted width within 15% of figure height, the rule the accepted body rig uses. A silhouette shoulder, not the joint centre; on a pose whose upper arm lifts above the shoulder line the row moves with it.",
  );

  // The separated arm component, if the side has one.
  const components = lateralComponents(raster, figure, side);
  const startLimit =
    figure.headTopRow +
    Math.round(figure.figureHeightPx * ARM_COMPONENT_MAX_START_FRACTION);
  const soleLimit =
    figure.soleRow -
    Math.round(figure.figureHeightPx * ARM_COMPONENT_SOLE_CLEARANCE_FRACTION);
  const eligible = components.filter(
    (c) => c.topRow <= startLimit && c.bottomRow < soleLimit,
  );
  const largest = eligible[0] ?? null;
  const mask: SilhouetteMask = { raster, figure };
  const largestAxis = largest ? segmentAxis(largest, shoulderPx, mask) : null;
  const fragment =
    largest !== null &&
    largestAxis !== null &&
    largestAxis.lengthPx <
      figure.figureHeightPx * ARM_COMPONENT_MIN_AXIS_FRACTION;
  const arm = fragment ? null : largest;
  const leftovers = components.filter((c) => c !== arm);
  const unassigned = leftovers
    .filter((c) => c.pixels >= UNASSIGNED_LISTING_MIN_PIXELS)
    .map((c) => ({
      pixels: c.pixels,
      topRow: c.topRow,
      bottomRow: c.bottomRow,
    }));
  const smallFragments = leftovers.filter(
    (c) => c.pixels < UNASSIGNED_LISTING_MIN_PIXELS,
  );
  const smallFragmentSummary = {
    count: smallFragments.length,
    pixels: smallFragments.reduce((sum, c) => sum + c.pixels, 0),
  };

  const lastArmRow = arm ? arm.bottomRow : figure.midFigureRow;
  const outerSamples: ArmContourSample[] = [];
  for (let sample = 0; sample < CONTOUR_SAMPLES; sample += 1) {
    const y = Math.round(
      figure.shoulderRow +
        ((lastArmRow - figure.shoulderRow) * sample) / (CONTOUR_SAMPLES - 1),
    );
    const x = outerX(y);
    if (x === null) continue;
    outerSamples.push({ y, x, fusedWithTorso: rowIsFused(y) });
  }
  let separatedRows = 0;
  let fusedRows = 0;
  for (let y = figure.shoulderRow; y <= lastArmRow; y += 1) {
    if (extent(raster.rows[y]!) === null) continue;
    if (rowIsFused(y)) fusedRows += 1;
    else separatedRows += 1;
  }

  const layering = {
    status: "unavailable" as const,
    note: "Alpha carries no depth. Whether this arm passes in front of or behind the torso where they overlap is not in the silhouette and is not inferred.",
  };

  if (!arm) {
    const empty = absent(
      canvas,
      "occluded",
      fragment && largest && largestAxis
        ? `Only a fragment of this arm clears the torso: ${largest.bottomRow - largest.topRow + 1} rows, ${round2(largestAxis.lengthPx)}px along its axis, under ${ARM_COMPONENT_MIN_AXIS_FRACTION} of figure height. A fragment that short does not contain a wrist or an elbow, so none is read from it; the rest of the arm lies against the torso and its inner edge is not in the alpha.`
        : "No row between the shoulder and the mid-figure carries an opaque run of its own on this side: the arm lies against the torso (or is hidden) and its inner edge is not in the alpha. Nothing is estimated from proportion.",
    );
    return {
      side,
      status: "occluded",
      posture: separatedRows + fusedRows === 0 ? "absent" : "fused",
      shoulder,
      elbow: empty,
      wrist: empty,
      extremity: empty,
      upperArm: segment("shoulder", "elbow", shoulder, empty, figure),
      forearm: segment("elbow", "wrist", empty, empty, figure),
      elbowBendDeg: {
        status: "unavailable",
        value: null,
        note: "No elbow and no wrist.",
      },
      widths: {
        upperArmNearShoulder: widthValue(
          "occluded",
          "none",
          null,
          raster.width,
          "Fused row: the inner edge is not in the alpha.",
        ),
        upperArmMid: widthValue(
          "occluded",
          "none",
          null,
          raster.width,
          "Fused row: the inner edge is not in the alpha.",
        ),
        elbow: widthValue(
          "occluded",
          "none",
          null,
          raster.width,
          "Fused row: the inner edge is not in the alpha.",
        ),
        forearmMid: widthValue(
          "occluded",
          "none",
          null,
          raster.width,
          "Fused row: the inner edge is not in the alpha.",
        ),
        wrist: widthValue(
          "occluded",
          "none",
          null,
          raster.width,
          "Fused row: the inner edge is not in the alpha.",
        ),
      },
      outerContour: {
        status: "partially-measured",
        samples: outerSamples,
        note: "Silhouette outer edge from the shoulder row to the mid-figure row. Every sample is a fused row, so this is the outline of arm-and-torso together; which of the two it belongs to at any row is not decided here.",
      },
      innerContour: {
        status: "occluded",
        samples: [],
        note: "No separated rows: there is no inner arm edge in the alpha.",
      },
      separation: {
        separatedRowCount: separatedRows,
        fusedRowCount: fusedRows,
        firstSeparatedRow: null,
        lastSeparatedRow: null,
        componentPixels: 0,
        axisAngleFromVerticalDeg: null,
        axisLengthPx: null,
        unassignedLateralComponents: unassigned,
        smallFragments: smallFragmentSummary,
      },
      layering,
      registryDeviation: deviation(
        nominal,
        side,
        canvas,
        shoulder,
        empty,
        empty,
      ),
    };
  }

  const axis = largestAxis!;
  const hanging =
    axis.angleFromVerticalDeg <= HANGING_MAX_ANGLE_DEG && axis.direction.y > 0;
  const posture: ArmPosture = hanging ? "hanging" : "raised-or-forward";

  // Wrist: narrowest cross-section in the far half of the segment, followed
  // by a widening (the hand).
  let wrist: ArmLandmark;
  let wristT: number | null = null;
  {
    // A wrist is a narrowing followed by a widening: the cross-section
    // shrinks along the forearm and grows again into the hand. Every position
    // in the far half whose cross-section is exceeded by the segment beyond
    // it is a candidate, and the narrowest candidate is the wrist. Fingertips
    // taper too, but nothing beyond them widens, so they are never candidates.
    // Fused slices carry no width and take no part.
    const profile = axis.profile.map((slice) => slice.widthPx ?? 0);
    const last = profile.length - 1;
    const widestBeyond: number[] = new Array(profile.length).fill(0);
    for (let index = last - 1; index >= 0; index -= 1) {
      widestBeyond[index] = Math.max(
        widestBeyond[index + 1]!,
        profile[index + 1]!,
      );
    }
    let bestIndex = -1;
    let narrowestAny = Number.POSITIVE_INFINITY;
    let narrowestAnyIndex = -1;
    for (
      let index = Math.floor(last * 0.45);
      index <= Math.floor(last * 0.95);
      index += 1
    ) {
      const width = profile[index]!;
      if (width <= 0) continue;
      if (width < narrowestAny) {
        narrowestAny = width;
        narrowestAnyIndex = index;
      }
      if (widestBeyond[index]! < width * WRIST_WIDENING_MIN_RATIO) continue;
      if (bestIndex < 0 || width < profile[bestIndex]!) bestIndex = index;
    }
    if (bestIndex >= 0) {
      const narrowest = profile[bestIndex]!;
      wristT = bestIndex / last;
      wrist = landmark(
        "measured",
        "silhouette-rule",
        axisPoint(axis, wristT),
        canvas,
        `Narrowest cross-section (${narrowest}px) in the far half of the separated segment that is followed by a widening of at least ${WRIST_WIDENING_MIN_RATIO}x (to ${widestBeyond[bestIndex]}px, the hand). The point is the axis centre of that cross-section.`,
      );
    } else if (narrowestAnyIndex < 0) {
      wrist = absent(
        canvas,
        "ambiguous",
        "The far half of the separated segment has no cross-section to read.",
      );
    } else {
      wrist = absent(
        canvas,
        "ambiguous",
        `No cross-section in the far half of the separated segment (narrowest ${narrowestAny}px) is followed by a widening of at least ${WRIST_WIDENING_MIN_RATIO}x: the segment ends without a hand the silhouette can distinguish, so no wrist is placed.`,
      );
    }
  }

  const extremity = landmark(
    wrist.status === "measured" ? "measured" : "partially-measured",
    "alpha-silhouette",
    axis.extremityPixel,
    canvas,
    wrist.status === "measured"
      ? "Far end of the separated segment along its principal axis; the hand's tip."
      : "Far end of the separated segment along its principal axis. Not shown to be a hand.",
  );

  // Elbow.
  let elbow: ArmLandmark;
  if (hanging && wrist.px) {
    const wristRow = Math.round(wrist.px.y);
    const chordEnd = { x: outerX(wristRow) ?? wrist.px.x, y: wristRow };
    const chord = {
      x: chordEnd.x - shoulderPx.x,
      y: chordEnd.y - shoulderPx.y,
    };
    const chordLength = Math.hypot(chord.x, chord.y) || 1;
    let bestRow = -1;
    let bestDistance = 0;
    for (let y = figure.shoulderRow + 1; y < wristRow; y += 1) {
      const x = outerX(y);
      if (x === null) continue;
      // Signed distance from the chord, positive toward the outside.
      const raw =
        ((x - shoulderPx.x) * chord.y - (y - shoulderPx.y) * chord.x) /
        chordLength;
      const outward = side === "left" ? -raw : raw;
      if (outward > bestDistance) {
        bestDistance = outward;
        bestRow = y;
      }
    }
    if (bestRow >= 0 && bestDistance / chordLength >= ELBOW_BOW_MIN_FRACTION) {
      elbow = landmark(
        "partially-measured",
        "silhouette-rule",
        { x: outerX(bestRow)!, y: bestRow },
        canvas,
        `Point of greatest outward bow of the outer silhouette between the shoulder tip and the wrist row (${round2(bestDistance)}px, ${round4(bestDistance / chordLength)} of the chord). This is the elbow REGION on the outer contour, not the joint centre, which sits inside the fused upper arm; a reviewer should confirm it.`,
      );
    } else {
      elbow = absent(
        canvas,
        "ambiguous",
        `The outer silhouette between the shoulder tip and the wrist row bows by ${round2(bestDistance)}px, under ${ELBOW_BOW_MIN_FRACTION} of the chord: the arm reads as straight and the silhouette does not locate the elbow along it.`,
      );
    }
  } else if (!hanging) {
    elbow = landmark(
      "partially-measured",
      "alpha-silhouette",
      axis.rootPixel,
      canvas,
      "Root end of the separated segment where it meets the fused silhouette. The arm is carried forward or raised, so the segment that clears the torso is the forearm and the joint lies at or inside the fused boundary; this is the nearest the alpha gets to it.",
    );
  } else {
    elbow = absent(
      canvas,
      "unavailable",
      "No wrist was found, so the shoulder–wrist chord the elbow is read against does not exist.",
    );
  }

  const upperArm = segment("shoulder", "elbow", shoulder, elbow, figure);
  const forearm = segment("elbow", "wrist", elbow, wrist, figure);
  const elbowBendDeg = bend(shoulder, elbow, wrist);

  // Widths, each at a point on or off the separated segment.
  const widthAt = (
    label: string,
    point: ArmPoint | null,
    missing: string,
    upperArm = false,
  ): ArmWidth => {
    if (!point) {
      return widthValue("unavailable", "none", null, raster.width, missing);
    }
    if (upperArm && !hanging) {
      return widthValue(
        "occluded",
        "none",
        null,
        raster.width,
        `${label} lies inside the fused silhouette above the separated forearm: the upper arm of a raised or forward-carried arm is against the torso and its edges are not in the alpha.`,
      );
    }
    // Sliced where the point projects onto the segment's axis line, so a
    // landmark on the outer contour is measured across the arm rather than
    // from its own edge. The line is the SEPARATED segment's; on an arm that
    // is raised or carried forward that segment is the forearm, its line
    // does not pass through the upper arm at all, and a slice taken "at the
    // upper arm" would cut through whatever the line crosses there — the
    // shoulder, the chest. So the upper arm is occluded by construction on
    // those postures, and only landmarks on the segment itself are sliced.
    // A hanging arm's upper-arm landmarks sit on the outer contour, above
    // the separated segment; the slice starts on the contour pixel of the
    // landmark's row and walks inward, so a fused upper arm runs into the
    // torso and is reported so, instead of being read along an axis line
    // that may pass beside it.
    const t = projectOntoAxis(axis, point);
    const contourStart = (): ArmPoint | null => {
      const row = Math.round(point.y);
      const x = outerX(row);
      return x === null ? null : { x, y: row };
    };
    const start = upperArm ? contourStart() : axisPoint(axis, t);
    if (!start) {
      return widthValue(
        "unavailable",
        "none",
        null,
        raster.width,
        `${label} lies on a row with no silhouette.`,
      );
    }
    const slice = walkCrossSection(mask, t, start, axis.direction);
    if (slice.fused) {
      return widthValue(
        "occluded",
        "none",
        null,
        raster.width,
        `The slice through ${label} runs into the torso before it meets transparency: the inner edge is not in the alpha, so no width is read.`,
      );
    }
    if (slice.widthPx === null) {
      return widthValue(
        "ambiguous",
        "none",
        null,
        raster.width,
        `${label} projects onto the axis line where the silhouette is transparent; the axis does not pass through the arm there.`,
      );
    }
    return widthValue(
      "measured",
      "alpha-silhouette",
      slice.widthPx,
      raster.width,
      `Slice through the silhouette perpendicular to the separated segment's axis at ${label}, transparency to transparency.`,
    );
  };
  const between = (
    a: ArmLandmark,
    b: ArmLandmark,
    f: number,
  ): ArmPoint | null =>
    a.px && b.px
      ? { x: a.px.x + (b.px.x - a.px.x) * f, y: a.px.y + (b.px.y - a.px.y) * f }
      : null;
  const widths = {
    upperArmNearShoulder: widthAt(
      "the upper arm near the shoulder",
      between(shoulder, elbow, 0.2),
      "No elbow to place the upper arm against.",
      true,
    ),
    upperArmMid: widthAt(
      "the upper arm midpoint",
      between(shoulder, elbow, 0.5),
      "No elbow to place the upper arm against.",
      true,
    ),
    elbow: widthAt("the elbow", elbow.px, "No elbow.", true),
    forearmMid: widthAt(
      "the forearm midpoint",
      between(elbow, wrist, 0.5),
      "No elbow or no wrist to place the forearm between.",
    ),
    wrist: widthAt("the wrist", wrist.px, "No wrist."),
  };

  const innerSamples: ArmContourSample[] = axis.profile
    .filter((slice) => slice.inner !== null)
    .map((slice) => ({
      y: slice.inner!.y,
      x: slice.inner!.x,
      fusedWithTorso: false,
    }));
  const fusedSlices = axis.profile.filter((slice) => slice.fused).length;

  const status: ArmMeasurementStatus =
    wrist.status === "measured" && elbow.px !== null
      ? "measured"
      : "partially-measured";

  return {
    side,
    status,
    posture,
    shoulder,
    elbow,
    wrist,
    extremity,
    upperArm,
    forearm,
    elbowBendDeg,
    widths,
    outerContour: {
      status: "measured",
      samples: outerSamples,
      note: "Silhouette outer edge from the shoulder row to the last row of the separated segment. Samples flagged fusedWithTorso are the outline of arm-and-torso together.",
    },
    innerContour: {
      status: innerSamples.length > 0 ? "measured" : "occluded",
      samples: innerSamples,
      note: `Torso-facing silhouette edge at each slice along the separated segment's axis where the slice met transparency on both sides (${innerSamples.length} of ${axis.profile.length} slices; ${fusedSlices} ran into the torso and are not reported).`,
    },
    separation: {
      separatedRowCount: separatedRows,
      fusedRowCount: fusedRows,
      firstSeparatedRow: arm.topRow,
      lastSeparatedRow: arm.bottomRow,
      componentPixels: arm.pixels,
      axisAngleFromVerticalDeg: axis.angleFromVerticalDeg,
      axisLengthPx: round2(axis.lengthPx),
      unassignedLateralComponents: unassigned,
      smallFragments: smallFragmentSummary,
    },
    layering,
    registryDeviation: deviation(nominal, side, canvas, shoulder, elbow, wrist),
  };
}

function bend(
  shoulder: ArmLandmark,
  elbow: ArmLandmark,
  wrist: ArmLandmark,
): ArmSideMeasurement["elbowBendDeg"] {
  if (!shoulder.px || !elbow.px || !wrist.px) {
    return {
      status: "unavailable",
      value: null,
      note: "Needs a shoulder, an elbow and a wrist.",
    };
  }
  const a = { x: shoulder.px.x - elbow.px.x, y: shoulder.px.y - elbow.px.y };
  const b = { x: wrist.px.x - elbow.px.x, y: wrist.px.y - elbow.px.y };
  const dot = a.x * b.x + a.y * b.y;
  const mag = (Math.hypot(a.x, a.y) || 1) * (Math.hypot(b.x, b.y) || 1);
  const degrees =
    (Math.acos(Math.max(-1, Math.min(1, dot / mag))) * 180) / Math.PI;
  return {
    status: elbow.status === "measured" ? "measured" : "partially-measured",
    value: round2(degrees),
    note: "Interior angle at the elbow point between the shoulder and the wrist; 180 is a straight arm. Inherits the elbow's status.",
  };
}

function deviation(
  nominal: Readonly<Record<string, ArmPoint>> | undefined,
  side: ArmSide,
  canvas: { width: number; height: number },
  shoulder: ArmLandmark,
  elbow: ArmLandmark,
  wrist: ArmLandmark,
): ArmSideMeasurement["registryDeviation"] {
  if (!nominal) return null;
  const compare = (
    id: "shoulder" | "elbow" | "wrist",
    measured: ArmLandmark,
  ): ArmPoint | null => {
    const point = nominal[`${id}-${side}`];
    if (!point || !measured.normalized) return null;
    return {
      x: round4(measured.normalized.x - point.x),
      y: round4(measured.normalized.y - point.y),
    };
  };
  void canvas;
  return {
    shoulder: compare("shoulder", shoulder),
    elbow: compare("elbow", elbow),
    wrist: compare("wrist", wrist),
  };
}

function unavailableSide(
  side: ArmSide,
  canvas: { width: number; height: number },
  why: string,
): ArmSideMeasurement {
  const none = absent(canvas, "unavailable", why);
  const noWidth = widthValue("unavailable", "none", null, canvas.width, why);
  const figure: ArmFigureRows = {
    headTopRow: 0,
    neckRow: 0,
    shoulderRow: 0,
    midFigureRow: 0,
    soleRow: 0,
    figureHeightPx: 1,
    centerX: 0,
    torsoAxis: { from: { x: 0, y: 0 }, to: { x: 0, y: 1 } },
  };
  return {
    side,
    status: "unavailable",
    posture: "absent",
    shoulder: none,
    elbow: none,
    wrist: none,
    extremity: none,
    upperArm: segment("shoulder", "elbow", none, none, figure),
    forearm: segment("elbow", "wrist", none, none, figure),
    elbowBendDeg: { status: "unavailable", value: null, note: why },
    widths: {
      upperArmNearShoulder: noWidth,
      upperArmMid: noWidth,
      elbow: noWidth,
      forearmMid: noWidth,
      wrist: noWidth,
    },
    outerContour: { status: "unavailable", samples: [], note: why },
    innerContour: { status: "unavailable", samples: [], note: why },
    separation: {
      separatedRowCount: 0,
      fusedRowCount: 0,
      firstSeparatedRow: null,
      lastSeparatedRow: null,
      componentPixels: 0,
      axisAngleFromVerticalDeg: null,
      axisLengthPx: null,
      unassignedLateralComponents: [],
      smallFragments: { count: 0, pixels: 0 },
    },
    layering: { status: "unavailable", note: why },
    registryDeviation: null,
  };
}

/* -------------------------------------------------------------------------- */
/* Entry points                                                                */
/* -------------------------------------------------------------------------- */

export function measureArmsFromRuns(
  subject: ArmSubject,
  raster: RasterRuns,
  sha256: string,
): ArmMeasurementEntry {
  const canvas = { width: raster.width, height: raster.height };
  const figure = measureFigureRows(raster);
  const sides = figure
    ? {
        left: measureSide(raster, figure, "left", subject.nominalLandmarks),
        right: measureSide(raster, figure, "right", subject.nominalLandmarks),
      }
    : {
        left: unavailableSide(
          "left",
          canvas,
          "The raster carries no opaque pixel.",
        ),
        right: unavailableSide(
          "right",
          canvas,
          "The raster carries no opaque pixel.",
        ),
      };
  return {
    assetId: subject.assetId,
    file: subject.file,
    sha256,
    source: subject.source,
    bodyFamily: subject.bodyFamily,
    poseFamily: subject.poseFamily,
    canvas,
    figure,
    sides,
  };
}

/**
 * Measures one body raster. Reads the file, never writes it; the sha256 in
 * the entry is of the bytes as found, so a report can be checked against the
 * raster it was made from.
 */
export function measureArms(
  subject: ArmSubject,
  absoluteFile: string,
): ArmMeasurementEntry {
  return measureArmsFromRuns(
    subject,
    readRasterRuns(absoluteFile),
    hashArtFile(absoluteFile),
  );
}

/* -------------------------------------------------------------------------- */
/* Sleeve fit readiness                                                        */
/* -------------------------------------------------------------------------- */

export const SLEEVE_FIT_REFUSAL_CODES = [
  "sleeve-pose-mismatch",
  "sleeve-side-mismatch",
  "sleeve-arm-occluded",
  "sleeve-landmarks-incomplete",
  "sleeve-posture-mismatch",
] as const;
export type SleeveFitRefusalCode = (typeof SLEEVE_FIT_REFUSAL_CODES)[number];

export interface SleeveFitArm {
  readonly assetId: string;
  readonly bodyFamily: string;
  readonly poseFamily: string;
  readonly arm: ArmSideMeasurement;
}

export interface SleeveFitComparison {
  readonly upperArm: {
    readonly lengthRatio: number;
    readonly angleDeltaDeg: number;
    readonly status: ArmMeasurementStatus;
  };
  readonly forearm: {
    readonly lengthRatio: number;
    readonly angleDeltaDeg: number;
    readonly status: ArmMeasurementStatus;
  };
  readonly elbowBendDeltaDeg: number | null;
  /** Target over source, for each width both sides measured. */
  readonly widthRatios: Readonly<
    Partial<Record<keyof ArmSideMeasurement["widths"], number>>
  >;
}

export type SleeveFitReadiness =
  | {
      readonly status: "refused";
      readonly code: SleeveFitRefusalCode;
      readonly reasons: readonly string[];
    }
  | {
      readonly status: "ready";
      readonly comparison: SleeveFitComparison;
      readonly note: string;
    };

/**
 * Whether two measured arms carry enough to derive a sleeve fit between them.
 *
 * This derives nothing and applies nothing. It is the gate in front of a
 * sleeve transform that does not exist yet, and it fails closed for every
 * reason the torso fit fails closed: a different pose, an arm the alpha could
 * not separate, a landmark that was not found. When it passes it returns the
 * ratios a per-segment transform would be built from, so the decision about
 * whether such a transform is worth building can be made from numbers rather
 * than from the assumption that arms scale like torsos.
 */
export function assessSleeveFitReadiness(
  source: SleeveFitArm,
  target: SleeveFitArm,
  options: { readonly posesDeclaredCompatible?: boolean } = {},
): SleeveFitReadiness {
  if (source.arm.side !== target.arm.side) {
    return {
      status: "refused",
      code: "sleeve-side-mismatch",
      reasons: [
        `Source arm is the ${source.arm.side} side and target is the ${target.arm.side}; sides are measured independently and never mirrored.`,
      ],
    };
  }
  if (
    source.poseFamily !== target.poseFamily &&
    !options.posesDeclaredCompatible
  ) {
    return {
      status: "refused",
      code: "sleeve-pose-mismatch",
      reasons: [
        `Source pose '${source.poseFamily}' and target pose '${target.poseFamily}' differ. A sleeve measured in one pose is never substituted into another unless the caller declares the poses geometrically compatible.`,
      ],
    };
  }
  const occluded = [source, target].filter(
    (entry) =>
      entry.arm.status === "occluded" || entry.arm.status === "unavailable",
  );
  if (occluded.length > 0) {
    return {
      status: "refused",
      code: "sleeve-arm-occluded",
      reasons: occluded.map(
        (entry) =>
          `${entry.assetId} ${entry.arm.side}: ${entry.arm.status} — ${entry.arm.wrist.note}`,
      ),
    };
  }
  if (source.arm.posture !== target.arm.posture) {
    return {
      status: "refused",
      code: "sleeve-posture-mismatch",
      reasons: [
        `Source arm is ${source.arm.posture} and target arm is ${target.arm.posture}; the same pose family, carried differently, is not one sleeve geometry.`,
      ],
    };
  }
  const incomplete: string[] = [];
  for (const entry of [source, target]) {
    for (const id of ["shoulder", "elbow", "wrist"] as const) {
      const mark = entry.arm[id];
      if (!mark.px) {
        incomplete.push(
          `${entry.assetId} ${entry.arm.side} ${id}: ${mark.status} — ${mark.note}`,
        );
      }
    }
  }
  if (incomplete.length > 0) {
    return {
      status: "refused",
      code: "sleeve-landmarks-incomplete",
      reasons: incomplete,
    };
  }
  const ratio = (a: number | null, b: number | null): number =>
    a && b ? round4(b / a) : Number.NaN;
  const delta = (a: number | null, b: number | null): number =>
    a !== null && b !== null ? round2(b - a) : Number.NaN;
  const worse = (
    a: ArmMeasurementStatus,
    b: ArmMeasurementStatus,
  ): ArmMeasurementStatus =>
    a === "measured" && b === "measured" ? "measured" : "partially-measured";
  const widthRatios: Partial<
    Record<keyof ArmSideMeasurement["widths"], number>
  > = {};
  for (const key of Object.keys(
    source.arm.widths,
  ) as (keyof ArmSideMeasurement["widths"])[]) {
    const a = source.arm.widths[key].px;
    const b = target.arm.widths[key].px;
    if (a !== null && b !== null && a > 0) widthRatios[key] = round4(b / a);
  }
  return {
    status: "ready",
    comparison: {
      upperArm: {
        lengthRatio: ratio(
          source.arm.upperArm.lengthPx,
          target.arm.upperArm.lengthPx,
        ),
        angleDeltaDeg: delta(
          source.arm.upperArm.angleFromTorsoAxisDeg,
          target.arm.upperArm.angleFromTorsoAxisDeg,
        ),
        status: worse(source.arm.upperArm.status, target.arm.upperArm.status),
      },
      forearm: {
        lengthRatio: ratio(
          source.arm.forearm.lengthPx,
          target.arm.forearm.lengthPx,
        ),
        angleDeltaDeg: delta(
          source.arm.forearm.angleFromTorsoAxisDeg,
          target.arm.forearm.angleFromTorsoAxisDeg,
        ),
        status: worse(source.arm.forearm.status, target.arm.forearm.status),
      },
      elbowBendDeltaDeg:
        source.arm.elbowBendDeg.value !== null &&
        target.arm.elbowBendDeg.value !== null
          ? round2(
              target.arm.elbowBendDeg.value - source.arm.elbowBendDeg.value,
            )
          : null,
      widthRatios,
    },
    note: "Readiness data only. No transform is derived here and nothing is applied to any raster. Segment ratios rest on partially-measured elbows where the status says so; a transform built on them must be validated against pixels the way torso fits are.",
  };
}

/* -------------------------------------------------------------------------- */
/* Review overlay                                                              */
/* -------------------------------------------------------------------------- */

const STATUS_COLOUR: Readonly<Record<ArmMeasurementStatus, string>> = {
  measured: "#1f9d55",
  "partially-measured": "#d97706",
  ambiguous: "#7c3aed",
  occluded: "#dc2626",
  unavailable: "#6b7280",
};

/**
 * An SVG a reviewer opens beside the raster: the raster itself, the torso
 * axis, each side's contours, and each landmark coloured by its status. It
 * draws the report; it decides nothing, and it is not a compositor.
 */
export function renderArmOverlaySvg(
  entry: ArmMeasurementEntry,
  imageHref: string,
): string {
  const { width, height } = entry.canvas;
  const lines: string[] = [];
  lines.push(
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
  );
  lines.push(
    `  <title>${escapeXml(entry.assetId)} — ${escapeXml(entry.poseFamily)} — ${ARM_MEASUREMENT_TOOL}</title>`,
  );
  lines.push(
    `  <image href="${escapeXml(imageHref)}" xlink:href="${escapeXml(imageHref)}" width="${width}" height="${height}" />`,
  );
  const stroke = Math.max(1, Math.round(width / 300));
  const radius = Math.max(3, Math.round(width / 90));
  if (entry.figure) {
    const axis = entry.figure.torsoAxis;
    lines.push(
      `  <line x1="${axis.from.x}" y1="${axis.from.y}" x2="${axis.to.x}" y2="${axis.to.y}" stroke="#2563eb" stroke-width="${stroke}" stroke-dasharray="${stroke * 4} ${stroke * 3}" />`,
    );
    lines.push(
      `  <line x1="0" y1="${entry.figure.shoulderRow}" x2="${width}" y2="${entry.figure.shoulderRow}" stroke="#2563eb" stroke-width="${stroke}" opacity="0.5" />`,
    );
  }
  for (const side of ARM_SIDES) {
    const arm = entry.sides[side];
    const contour = (
      samples: readonly ArmContourSample[],
      dash: boolean,
    ): void => {
      if (samples.length < 2) return;
      const points = samples.map((s) => `${s.x},${s.y}`).join(" ");
      lines.push(
        `  <polyline points="${points}" fill="none" stroke="${dash ? "#0ea5e9" : "#111827"}" stroke-width="${stroke}"${dash ? ` stroke-dasharray="${stroke * 2} ${stroke * 2}"` : ""} />`,
      );
      for (const s of samples.filter((sample) => sample.fusedWithTorso)) {
        lines.push(
          `  <circle cx="${s.x}" cy="${s.y}" r="${Math.max(1, stroke)}" fill="#dc2626" />`,
        );
      }
    };
    contour(arm.outerContour.samples, false);
    contour(arm.innerContour.samples, true);
    const marks: (readonly [string, ArmLandmark])[] = [
      ["shoulder", arm.shoulder],
      ["elbow", arm.elbow],
      ["wrist", arm.wrist],
      ["extremity", arm.extremity],
    ];
    let previous: ArmPoint | null = null;
    for (const [id, mark] of marks) {
      if (!mark.px) continue;
      if (previous && id !== "extremity") {
        lines.push(
          `  <line x1="${previous.x}" y1="${previous.y}" x2="${mark.px.x}" y2="${mark.px.y}" stroke="${STATUS_COLOUR[mark.status]}" stroke-width="${stroke}" />`,
        );
      }
      lines.push(
        `  <circle cx="${mark.px.x}" cy="${mark.px.y}" r="${radius}" fill="${STATUS_COLOUR[mark.status]}" fill-opacity="0.85" stroke="#ffffff" stroke-width="${Math.max(1, Math.round(stroke / 2))}"><title>${escapeXml(`${side} ${id}: ${mark.status} — ${mark.note}`)}</title></circle>`,
      );
      if (id !== "extremity") previous = mark.px;
    }
  }
  const fontSize = Math.max(10, Math.round(width / 40));
  let y = fontSize * 1.4;
  const text = (content: string, colour = "#111827"): void => {
    lines.push(
      `  <text x="${Math.round(fontSize * 0.5)}" y="${Math.round(y)}" font-family="monospace" font-size="${fontSize}" fill="${colour}" stroke="#ffffff" stroke-width="${Math.max(1, Math.round(fontSize / 6))}" paint-order="stroke">${escapeXml(content)}</text>`,
    );
    y += fontSize * 1.3;
  };
  text(`${entry.assetId}`);
  text(`${entry.bodyFamily} / ${entry.poseFamily}`);
  for (const side of ARM_SIDES) {
    const arm = entry.sides[side];
    text(`${side}: ${arm.status} (${arm.posture})`, STATUS_COLOUR[arm.status]);
    text(
      `  shoulder ${arm.shoulder.status} · elbow ${arm.elbow.status} · wrist ${arm.wrist.status}`,
    );
  }
  text("fused-row samples marked red; inner contour dashed");
  lines.push("</svg>");
  return `${lines.join("\n")}\n`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
