import fs from "fs";
import * as PImage from "pureimage";

import type { BodyRigMeasurement } from "./pg-modular-intake";

/**
 * Where a drawn seated figure meets the chair.
 *
 * Two measurements live here and they answer different questions, which is why
 * neither was folded into the other.
 *
 * `measureSeatPlaneFromRaster` reads a seat plane off a file: the lowest row
 * whose leftmost opaque pixel is still within a small margin of the raster's
 * back point, which is where the back silhouette turns forward into the
 * underside of the thighs. It is what the office recipes were authored
 * against and what still checks them, and it assumes a figure drawn square
 * enough that its back IS the leftmost edge.
 *
 * `measureSeatedContact` reads a contact point off an already-decoded bitmap
 * with a rig beside it, and handles the turned case the first one cannot.
 * Until it existed a seated body's pelvis came from `measureBodyRig`'s crotch
 * row, which is found by walking down from the waist to the first row where
 * the silhouette stops being one central run and becomes two. That is a
 * LEG-SEPARATION measurement. On a figure drawn square to camera it happens to
 * sit near the seat, which is why it went unquestioned; on a figure drawn
 * turned it means nothing at all, because the near leg covers the far one all
 * the way down and the walk runs on to the shin or the ankle. Those bodies
 * measured a pelvis at 0.78 to 0.96 of canvas height, and 0.777 of them is
 * inside every plausibility band anyone had written down while being visibly
 * at mid-calf. A number that is plausible and measures the wrong thing is
 * worse than a missing one.
 *
 * So the turned case is measured directly. A seated figure turned away from
 * square shows its own rear: the buttock is the lowest point of the hip mass
 * on the side opposite the knees, and that point is exactly what rests on a
 * cushion. Reading it needs no proportions and no reference body, only the
 * alpha and which way the figure is turned.
 *
 * Across the twelve propless seated crops in the bank — two source sets, both
 * sexes, four builds — this lands between 0.632 and 0.644 of canvas height,
 * against the 0.62 the pose family declares from its own authoring. Two
 * measurements that were made independently and agree within two percent are
 * the closest thing to corroboration this bank has.
 *
 * There is no fallback. A figure this cannot read returns `unmeasured` with a
 * reason, because a silent slide to some other row is how the old number
 * survived for as long as it did.
 */

/** A seat plane read from a raster file, in that raster's own pixel space. */
export interface SeatPlaneMeasurement {
  readonly backX: number;
  readonly seatRow: number;
  readonly runStart: number;
  readonly runEnd: number;
  /** Normalized pelvis-hip-center in the raster (x from back point, y at seat row). */
  readonly root: { readonly x: number; readonly y: number };
}

export const SEAT_BACK_MARGIN_FRACTION = 0.06;
export const HIP_CENTER_RUN_FRACTION = 0.28;

/**
 * The original file-path seat-plane measurement, under its own name.
 *
 * Renamed rather than replaced. It has a live consumer — the office recipe
 * check in `tests/pg-modular-intake.test.ts` asserts the authored A01 and B01
 * roots against what this reads off the approved rasters — and that assertion
 * is about the seat plane of a square figure, which is exactly what this
 * measures and is not what `measureSeatedContact` returns. Collapsing the two
 * would have meant either deleting that check or making it assert a different
 * quantity under the same name.
 */
export async function measureSeatPlaneFromRaster(
  filePath: string,
  alphaThreshold = 24,
): Promise<SeatPlaneMeasurement> {
  const image = await PImage.decodePNGFromStream(fs.createReadStream(filePath));
  const alpha = (x: number, y: number) =>
    image.data[(y * image.width + x) * 4 + 3] ?? 0;
  const leftX: number[] = [];
  for (let y = 0; y < image.height; y += 1) {
    let left = -1;
    for (let x = 0; x < image.width; x += 1) {
      if (alpha(x, y) > alphaThreshold) {
        left = x;
        break;
      }
    }
    leftX.push(left);
  }
  const backX = Math.min(...leftX.filter((value) => value >= 0));
  let seatRow = -1;
  for (let y = image.height - 1; y >= 0; y -= 1) {
    const left = leftX[y]!;
    if (left >= 0 && left <= backX + image.width * SEAT_BACK_MARGIN_FRACTION) {
      seatRow = y;
      break;
    }
  }
  if (seatRow < 0) throw new Error(`No seat row found in ${filePath}`);
  let runStart = -1;
  let runEnd = -1;
  for (let x = 0; x < image.width; x += 1) {
    if (alpha(x, seatRow) > alphaThreshold) {
      if (runStart < 0) runStart = x;
      runEnd = x;
    }
  }
  return {
    backX,
    seatRow,
    runStart,
    runEnd,
    root: {
      x:
        (runStart + HIP_CENTER_RUN_FRACTION * (runEnd - runStart)) /
        image.width,
      y: seatRow / image.height,
    },
  };
}

/**
 * How far a figure's lower body sits to one side of its head, as a fraction of
 * canvas width: horizontal centroid of the bottom quarter minus that of the
 * top sixth.
 *
 * A seated figure's shins swing to one side as it turns, so this is large and
 * signed for a turned seated pose and near zero for a square one — the square
 * seated crops measure within a thousandth of zero and the turned ones between
 * 0.20 and 0.35. The SIGN is bound to a reference plate rather than to an
 * argument about whose left, exactly as the facing convention in
 * `art/manifest/pose_families.json` is: the plate Packet 71 calls three-quarter
 * right measures negative, so negative is right.
 *
 * WHAT THIS IS NOT. It is a diagnostic, not a declaration of which way a body
 * faces. The facing a component is filed under comes from a person looking at
 * the crop and writing it down; this number only chooses which seat-contact
 * measurement can be taken, because a square figure hides its own rear and a
 * turned one shows it. The review lane's own ruling on this is that centroid
 * and width asymmetry do not establish orientation, and that a contradiction
 * between a declared facing and a measured one is a flag for a person to look
 * at rather than grounds for either to overrule the other.
 *
 * It is at least immune to the obvious false positive, and that is checked
 * rather than claimed: it is a DIFFERENCE of two band centroids taken within
 * the figure's own alpha bounds, so translating an unchanged cutout moves both
 * bands by the same amount and leaves the difference where it was. See the
 * translation control in `seated-contact.test.ts`.
 *
 * It says nothing about a standing figure, whose feet stay under it however it
 * is rotated.
 */
export function turnOffsetFraction(bitmap: {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array | Uint8ClampedArray;
}): number {
  const { width, height, data } = bitmap;
  const rowSum = new Float64Array(height);
  const rowCount = new Float64Array(height);
  let top = -1;
  let bottom = -1;
  for (let y = 0; y < height; y += 1) {
    const base = y * width;
    let sum = 0;
    let count = 0;
    for (let x = 0; x < width; x += 1) {
      if ((data[(base + x) * 4 + 3] ?? 0) > 127) {
        sum += x;
        count += 1;
      }
    }
    rowSum[y] = sum;
    rowCount[y] = count;
    if (count > 0) {
      if (top < 0) top = y;
      bottom = y;
    }
  }
  if (top < 0) return 0;
  const figureHeight = bottom - top + 1;
  const bandCentre = (from: number, to: number): number => {
    const y0 = Math.max(top, Math.floor(top + from * figureHeight));
    const y1 = Math.min(bottom, Math.floor(top + to * figureHeight));
    let sum = 0;
    let count = 0;
    for (let y = y0; y <= y1; y += 1) {
      sum += rowSum[y]!;
      count += rowCount[y]!;
    }
    return count === 0 ? Number.NaN : sum / count / width;
  };
  const head = bandCentre(0, 0.18);
  const lower = bandCentre(0.75, 1);
  if (Number.isNaN(head) || Number.isNaN(lower)) return 0;
  return round6(lower - head);
}

/** Below this the figure is square enough that it shows no rear to measure. */
export const SEATED_TURN_THRESHOLD = 0.08;

/** The band a seated contact can credibly fall in; the pose registry's own. */
export const SEATED_PELVIS_PLAUSIBLE = { minimum: 0.45, maximum: 0.8 } as const;

export function measuredTurnDirection(offset: number): "left" | "right" | null {
  if (Math.abs(offset) < SEATED_TURN_THRESHOLD) return null;
  return offset < 0 ? "right" : "left";
}

export type SeatedContactBasis =
  /** The lowest point of the hip mass on the side away from the knees. */
  | "measured-rear-hip"
  /** A square figure's leg gap, which coincides with its seat. */
  | "measured-leg-gap"
  | "unmeasured";

export interface SeatedContactMeasurement {
  readonly basis: SeatedContactBasis;
  readonly x: number | null;
  readonly y: number | null;
  /** Why nothing was measured, when nothing was. */
  readonly reason: string | null;
}

interface AlphaBitmap {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array | Uint8ClampedArray;
}

function opaqueAt(bitmap: AlphaBitmap, x: number, y: number): boolean {
  return (bitmap.data[(y * bitmap.width + x) * 4 + 3] ?? 0) > 127;
}

export function measureSeatedContact(
  bitmap: AlphaBitmap,
  rig: BodyRigMeasurement,
  turnOffset: number,
  soleRunCount: number,
): SeatedContactMeasurement {
  const { width, height } = bitmap;
  const inBand = (y: number): boolean =>
    y / height >= SEATED_PELVIS_PLAUSIBLE.minimum &&
    y / height <= SEATED_PELVIS_PLAUSIBLE.maximum;

  if (Math.abs(turnOffset) < SEATED_TURN_THRESHOLD) {
    // Square to camera: the buttock is behind the thighs and the silhouette
    // never shows it, so the leg gap is the only seat-adjacent row there is.
    // It is accepted only under the condition that makes it a leg gap at all.
    if (soleRunCount !== 2) {
      return {
        basis: "unmeasured",
        x: null,
        y: null,
        reason: `the figure reads square (turn offset ${turnOffset}) so it shows no rear to measure, and its sole band resolves ${soleRunCount} runs rather than two, so its leg gap is not a leg gap either`,
      };
    }
    if (!rig.crotchSplit) {
      return {
        basis: "unmeasured",
        x: null,
        y: null,
        reason:
          "the figure reads square so it shows no rear to measure, and its silhouette never parts into two legs, so the rig's crotch row is the waist standing in for one rather than a measured leg gap",
      };
    }
    if (!inBand(rig.crotchRow)) {
      return {
        basis: "unmeasured",
        x: null,
        y: null,
        reason: `the leg gap measures ${round6(rig.crotchRow / height)} of canvas height, outside the credible seated band ${SEATED_PELVIS_PLAUSIBLE.minimum}..${SEATED_PELVIS_PLAUSIBLE.maximum}`,
      };
    }
    return {
      basis: "measured-leg-gap",
      x: round6(rig.centerX / width),
      y: round6(rig.crotchRow / height),
      reason: null,
    };
  }

  // Turned: the rear of the hip mass is visible, and its lowest point is the
  // buttock. The hip mass is the band from the waist a third of the way to the
  // soles, which is the seat and thigh and no part of the shin.
  const hipTop = rig.waistRow;
  const hipBottom = hipTop + Math.round(0.33 * (rig.soleRow - hipTop));
  let left = width;
  let right = -1;
  for (let y = hipTop; y < hipBottom; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!opaqueAt(bitmap, x, y)) continue;
      if (x < left) left = x;
      if (x > right) right = x;
    }
  }
  if (right < left) {
    return {
      basis: "unmeasured",
      x: null,
      y: null,
      reason:
        "the hip band holds no opaque pixel, so there is no hip mass to find a rear on",
    };
  }
  // Knees to the left of frame means the seat is to the right, and the sign
  // that says which is the same one the facing convention is bound to.
  const span = right - left;
  const strip = Math.max(1, Math.round(0.22 * span));
  const fromX = turnOffset < 0 ? right - strip : left;
  const toX = turnOffset < 0 ? right : left + strip;

  let lowest = -1;
  for (let y = rig.waistRow; y < rig.soleRow; y += 1) {
    for (let x = fromX; x <= toX; x += 1) {
      if (opaqueAt(bitmap, x, y)) {
        lowest = y;
        break;
      }
    }
  }
  if (lowest < 0) {
    return {
      basis: "unmeasured",
      x: null,
      y: null,
      reason:
        "the rear strip of the hip mass holds no opaque pixel below the waist",
    };
  }
  if (!inBand(lowest)) {
    return {
      basis: "unmeasured",
      x: null,
      y: null,
      reason: `the rear of the hip mass bottoms out at ${round6(lowest / height)} of canvas height, outside the credible seated band ${SEATED_PELVIS_PLAUSIBLE.minimum}..${SEATED_PELVIS_PLAUSIBLE.maximum}`,
    };
  }
  let sum = 0;
  let count = 0;
  for (let x = fromX; x <= toX; x += 1) {
    if (opaqueAt(bitmap, x, lowest)) {
      sum += x;
      count += 1;
    }
  }
  return {
    basis: "measured-rear-hip",
    x: round6(count === 0 ? (fromX + toX) / 2 / width : sum / count / width),
    y: round6(lowest / height),
    reason: null,
  };
}

function round6(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}
