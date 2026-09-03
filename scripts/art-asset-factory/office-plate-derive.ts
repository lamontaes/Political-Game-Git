import fs from "fs";
import * as PImage from "pureimage";

import { resampleLanczos } from "./resample";

export const OFFICE_PLATE_SOURCE_SIZE = { width: 1024, height: 572 } as const;
export const OFFICE_PLATE_RUNTIME_SCALE = 2 as const;
export const OFFICE_PLATE_LANCZOS_LOBES = 3 as const;

interface Point {
  readonly x: number;
  readonly y: number;
}

interface ForegroundRegion {
  readonly id: string;
  readonly points: readonly Point[];
}

// Visual-estimate polygons follow only furniture that physically sits in front
// of the authored seated figures. Coordinates are source-plate pixels.
export const OFFICE_FOREGROUND_REGIONS: readonly ForegroundRegion[] = [
  {
    // Ends at the primary chair's left edge (x 748). The return worktop and
    // right cabinet beyond it sit behind the seated figure; the earlier quad
    // that ran to x 1024 swept through the chair back and seat and painted
    // the chair over the character's lap.
    id: "primary-desk-worktop",
    points: [
      { x: 648, y: 302 },
      { x: 748, y: 296 },
      { x: 748, y: 372 },
      { x: 670, y: 384 },
      { x: 648, y: 354 },
    ],
  },
  {
    id: "primary-desk-front",
    points: [
      { x: 472, y: 356 },
      { x: 671, y: 329 },
      { x: 671, y: 493 },
      { x: 472, y: 536 },
    ],
  },
  {
    id: "primary-chair-near-arm",
    points: [
      { x: 746, y: 333 },
      { x: 771, y: 329 },
      { x: 792, y: 447 },
      { x: 773, y: 454 },
    ],
  },
  {
    id: "guest-chair-near-arm",
    points: [
      { x: 322, y: 337 },
      { x: 340, y: 333 },
      { x: 351, y: 438 },
      { x: 337, y: 449 },
      { x: 327, y: 386 },
    ],
  },
] as const;

export interface OfficePlateDerivationResult {
  readonly sourceWidth: number;
  readonly sourceHeight: number;
  readonly runtimeWidth: number;
  readonly runtimeHeight: number;
  readonly foregroundPixelCount: number;
}

function pointInPolygon(point: Point, polygon: readonly Point[]): boolean {
  let inside = false;
  for (
    let current = 0, previous = polygon.length - 1;
    current < polygon.length;
    previous = current, current += 1
  ) {
    const currentPoint = polygon[current];
    const previousPoint = polygon[previous];
    if (!currentPoint || !previousPoint) continue;
    const crosses =
      currentPoint.y > point.y !== previousPoint.y > point.y &&
      point.x <
        ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)) /
          (previousPoint.y - currentPoint.y) +
          currentPoint.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

function foregroundCoverage(targetX: number, targetY: number): number {
  const offsets = [0.25, 0.75] as const;
  let covered = 0;
  for (const yOffset of offsets) {
    for (const xOffset of offsets) {
      const point = {
        x: (targetX + xOffset) / OFFICE_PLATE_RUNTIME_SCALE,
        y: (targetY + yOffset) / OFFICE_PLATE_RUNTIME_SCALE,
      };
      if (
        OFFICE_FOREGROUND_REGIONS.some((region) =>
          pointInPolygon(point, region.points),
        )
      ) {
        covered += 1;
      }
    }
  }
  return covered / 4;
}

function createForegroundMask(runtime: PImage.Bitmap): {
  readonly mask: PImage.Bitmap;
  readonly foregroundPixelCount: number;
} {
  const mask = PImage.make(runtime.width, runtime.height);
  let foregroundPixelCount = 0;
  for (let y = 0; y < runtime.height; y += 1) {
    for (let x = 0; x < runtime.width; x += 1) {
      const coverage = foregroundCoverage(x, y);
      const offset = (y * runtime.width + x) * 4;
      if (coverage === 0) {
        mask.data[offset] = 0;
        mask.data[offset + 1] = 0;
        mask.data[offset + 2] = 0;
        mask.data[offset + 3] = 0;
        continue;
      }
      mask.data[offset] = runtime.data[offset] ?? 0;
      mask.data[offset + 1] = runtime.data[offset + 1] ?? 0;
      mask.data[offset + 2] = runtime.data[offset + 2] ?? 0;
      mask.data[offset + 3] = Math.round(
        (runtime.data[offset + 3] ?? 255) * coverage,
      );
      foregroundPixelCount += 1;
    }
  }
  return { mask, foregroundPixelCount };
}

export async function deriveOfficeRuntimePlate(
  sourcePath: string,
  runtimePath: string,
  foregroundMaskPath: string,
): Promise<OfficePlateDerivationResult> {
  const source = await PImage.decodePNGFromStream(
    fs.createReadStream(sourcePath),
  );
  if (
    source.width !== OFFICE_PLATE_SOURCE_SIZE.width ||
    source.height !== OFFICE_PLATE_SOURCE_SIZE.height
  ) {
    throw new Error(
      `Office source must be ${OFFICE_PLATE_SOURCE_SIZE.width}x${OFFICE_PLATE_SOURCE_SIZE.height}; received ${source.width}x${source.height}.`,
    );
  }
  const runtime = resampleLanczos(
    source,
    source.width * OFFICE_PLATE_RUNTIME_SCALE,
    source.height * OFFICE_PLATE_RUNTIME_SCALE,
    OFFICE_PLATE_LANCZOS_LOBES,
  );
  const { mask, foregroundPixelCount } = createForegroundMask(runtime);
  await PImage.encodePNGToStream(runtime, fs.createWriteStream(runtimePath));
  await PImage.encodePNGToStream(
    mask,
    fs.createWriteStream(foregroundMaskPath),
  );
  return {
    sourceWidth: source.width,
    sourceHeight: source.height,
    runtimeWidth: runtime.width,
    runtimeHeight: runtime.height,
    foregroundPixelCount,
  };
}
