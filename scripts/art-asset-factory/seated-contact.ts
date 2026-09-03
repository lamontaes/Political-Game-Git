import fs from "fs";
import * as PImage from "pureimage";

/**
 * Seat-contact measurement for an authored seated character raster.
 *
 * The pelvis-hip-center root of a seated figure must sit on the chair's seat
 * plane. That plane is where the figure's back silhouette turns forward into
 * the underside of the thighs: the lowest row whose leftmost opaque pixel is
 * still within a small margin of the raster's overall back point. The hip
 * center is a fixed fraction of the seat-row run behind the knee, a visual
 * estimate recorded here rather than guessed in a recipe.
 */
export interface SeatedContactMeasurement {
  readonly backX: number;
  readonly seatRow: number;
  readonly runStart: number;
  readonly runEnd: number;
  /** Normalized pelvis-hip-center in the raster (x from back point, y at seat row). */
  readonly root: { readonly x: number; readonly y: number };
}

export const SEAT_BACK_MARGIN_FRACTION = 0.06;
export const HIP_CENTER_RUN_FRACTION = 0.28;

export async function measureSeatedContact(
  filePath: string,
  alphaThreshold = 24,
): Promise<SeatedContactMeasurement> {
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
