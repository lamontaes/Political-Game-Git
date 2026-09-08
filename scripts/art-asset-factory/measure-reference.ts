import fs from "fs";
import jpeg from "jpeg-js";
import { PNG } from "pngjs";

/**
 * Measuring a raster so a generation prompt can quote it.
 *
 * Packet 76 asks for a Measurement Card per reference, and for every number on
 * it to carry a confidence. That second half is the important one. An
 * illustration is not a perspective construction, so "the horizon is at y=1290"
 * can be a real reading of the image or an invented precision, and a prompt
 * that quotes the second kind teaches the next generation to reproduce a
 * mistake.
 *
 * So everything here reports what it actually did:
 *
 * - `MEASURED` — read from the pixels by an operation with no free parameters:
 *   dimensions from the container, a bounding box from alpha, a cell grid from
 *   an alpha projection.
 * - `STRONG_VISUAL_ESTIMATE` — derived from the pixels by a heuristic with a
 *   clear signal behind it, such as a horizon taken from the strongest
 *   horizontal luminance transition across the middle of the frame.
 * - `WEAK_VISUAL_ESTIMATE` — the same kind of heuristic where the signal was
 *   weak or ambiguous.
 * - `UNKNOWN` — not derivable from this raster. Left as null rather than
 *   guessed.
 *
 * Nothing in this file infers semantics. It does not know a podium from a
 * table; it finds rectangles of flat low-variance colour and reports where they
 * are, and a human or a prompt author says what they are. Calling a rectangle a
 * lectern is exactly the invention the project refuses elsewhere.
 */

export type MeasurementConfidence =
  "MEASURED" | "STRONG_VISUAL_ESTIMATE" | "WEAK_VISUAL_ESTIMATE" | "UNKNOWN";

export interface Measured<T> {
  readonly value: T | null;
  readonly confidence: MeasurementConfidence;
  readonly note: string;
}

function measured<T>(value: T, note: string): Measured<T> {
  return { value, confidence: "MEASURED", note };
}
function estimate<T>(
  value: T | null,
  strong: boolean,
  note: string,
): Measured<T> {
  return {
    value,
    confidence:
      value === null
        ? "UNKNOWN"
        : strong
          ? "STRONG_VISUAL_ESTIMATE"
          : "WEAK_VISUAL_ESTIMATE",
    note,
  };
}
function unknown<T>(note: string): Measured<T> {
  return { value: null, confidence: "UNKNOWN", note };
}

export interface RasterPixels {
  readonly width: number;
  readonly height: number;
  /** RGBA, 4 bytes per pixel. */
  readonly data: Buffer;
  readonly container: "png" | "jpeg";
  readonly hasRealAlpha: boolean;
}

/**
 * Reads a raster from its magic bytes rather than its extension.
 *
 * This project has been handed JPEG streams named `.png` before, which is why
 * `scene-master-derive.ts` already does the same thing.
 */
export function readRaster(file: string): RasterPixels {
  const bytes = fs.readFileSync(file);
  if (bytes[0] === 0x89 && bytes[1] === 0x50) {
    const png = PNG.sync.read(bytes);
    let min = 255;
    let max = 0;
    for (let index = 0; index < png.width * png.height; index += 1) {
      const alpha = png.data[index * 4 + 3]!;
      if (alpha < min) min = alpha;
      if (alpha > max) max = alpha;
    }
    return {
      width: png.width,
      height: png.height,
      data: png.data,
      container: "png",
      hasRealAlpha: min < max,
    };
  }
  const decoded = jpeg.decode(bytes, { useTArray: true, formatAsRGBA: true });
  return {
    width: decoded.width,
    height: decoded.height,
    data: Buffer.from(
      decoded.data.buffer,
      decoded.data.byteOffset,
      decoded.data.length,
    ),
    container: "jpeg",
    hasRealAlpha: false,
  };
}

export interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

const luminance = (data: Buffer, offset: number): number =>
  0.2126 * data[offset]! +
  0.7152 * data[offset + 1]! +
  0.0722 * data[offset + 2]!;

/* -------------------------------------------------------------------------- */
/* Scene cards                                                                 */
/* -------------------------------------------------------------------------- */

export interface SceneMeasurementCard {
  readonly file: string;
  readonly container: string;
  readonly width: number;
  readonly height: number;
  readonly aspectRatio: string;
  readonly horizonY: Measured<{
    readonly px: number;
    readonly percent: number;
  }>;
  readonly floorRegion: Measured<Box>;
  readonly dynamicSurfaceCandidates: Measured<readonly Box[]>;
  readonly characterZones: Measured<{
    readonly foreground: Box;
    readonly midground: Box;
    readonly background: Box;
  }>;
  readonly cameraHeightClass: Measured<string>;
  readonly furnitureCount: Measured<number>;
  readonly chairTableTopology: Measured<string>;
  readonly standingAnchors: Measured<readonly { x: number; y: number }[]>;
  readonly seatedAnchors: Measured<readonly { x: number; y: number }[]>;
  readonly occluderBounds: Measured<readonly Box[]>;
}

/**
 * The strongest horizontal edge in the middle two thirds of the frame.
 *
 * A room's horizon usually coincides with the longest continuous horizontal
 * luminance step in the image — a wall meeting a floor, a rail, a desk line.
 * That is a real signal and it is also frequently the wrong one, so the reading
 * is only called strong when the winning row beats the runner-up by a clear
 * margin. Where it does not, the number still comes back with the weak label
 * rather than being dropped, because a weak reading a prompt author can sanity
 * check beats no reading at all.
 */
function findHorizon(raster: RasterPixels): Measured<{
  px: number;
  percent: number;
}> {
  const { width, height, data } = raster;
  const step = Math.max(1, Math.floor(width / 640));
  const scores: number[] = new Array(height).fill(0);
  const top = Math.floor(height * 0.15);
  const bottom = Math.floor(height * 0.85);
  for (let y = top; y < bottom; y += 1) {
    let score = 0;
    for (let x = 0; x < width; x += step) {
      const here = luminance(data, (y * width + x) * 4);
      const below = luminance(data, ((y + 1) * width + x) * 4);
      score += Math.abs(here - below);
    }
    scores[y] = score;
  }
  let bestY = -1;
  let best = 0;
  for (let y = top; y < bottom; y += 1) {
    if (scores[y]! > best) {
      best = scores[y]!;
      bestY = y;
    }
  }
  if (bestY < 0 || best === 0) {
    return unknown("No horizontal luminance step stood out.");
  }
  // Runner-up outside a 32px neighbourhood of the winner.
  let runnerUp = 0;
  for (let y = top; y < bottom; y += 1) {
    if (Math.abs(y - bestY) < 32) continue;
    if (scores[y]! > runnerUp) runnerUp = scores[y]!;
  }
  const margin = runnerUp === 0 ? Infinity : best / runnerUp;
  return estimate(
    { px: bestY, percent: Number(((bestY / height) * 100).toFixed(2)) },
    margin >= 1.35,
    `Strongest horizontal luminance transition between 15% and 85% of frame height; it beats the next candidate by ${margin === Infinity ? "an unbounded" : margin.toFixed(2) + "x"} margin. This is an illustration, not a perspective construction, so treat it as where the room reads as turning rather than as a projected horizon.`,
  );
}

/**
 * Rectangles of flat, low-variance colour large enough to be a surface.
 *
 * These are the candidates for the things this project must never bake text
 * into — monitors, whiteboards, bulletin boards, blank signage. The function
 * finds flatness; it does not name the object, because naming it from pixels
 * would be a guess.
 */
function findFlatRegions(raster: RasterPixels, limit = 12): Box[] {
  const { width, height, data } = raster;
  const cell = Math.max(16, Math.round(Math.min(width, height) / 64));
  const cols = Math.floor(width / cell);
  const rows = Math.floor(height / cell);
  const flat: boolean[] = new Array(cols * rows).fill(false);
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      let sum = 0;
      let sumSquares = 0;
      let count = 0;
      for (let y = row * cell; y < (row + 1) * cell; y += 2) {
        for (let x = col * cell; x < (col + 1) * cell; x += 2) {
          const value = luminance(data, (y * width + x) * 4);
          sum += value;
          sumSquares += value * value;
          count += 1;
        }
      }
      const mean = sum / count;
      const variance = sumSquares / count - mean * mean;
      flat[row * cols + col] = variance < 36;
    }
  }
  // Merge flat cells into rectangles by flood fill.
  const seen = new Set<number>();
  const boxes: Box[] = [];
  for (let index = 0; index < flat.length; index += 1) {
    if (!flat[index] || seen.has(index)) continue;
    const queue = [index];
    seen.add(index);
    let minCol = cols;
    let maxCol = -1;
    let minRow = rows;
    let maxRow = -1;
    let area = 0;
    while (queue.length > 0) {
      const current = queue.pop()!;
      const col = current % cols;
      const row = Math.floor(current / cols);
      area += 1;
      minCol = Math.min(minCol, col);
      maxCol = Math.max(maxCol, col);
      minRow = Math.min(minRow, row);
      maxRow = Math.max(maxRow, row);
      for (const [dc, dr] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const nc = col + dc;
        const nr = row + dr;
        if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
        const next = nr * cols + nc;
        if (!flat[next] || seen.has(next)) continue;
        seen.add(next);
        queue.push(next);
      }
    }
    if (area < 6) continue;
    boxes.push({
      x: minCol * cell,
      y: minRow * cell,
      width: (maxCol - minCol + 1) * cell,
      height: (maxRow - minRow + 1) * cell,
    });
  }
  return boxes
    .sort((a, b) => b.width * b.height - a.width * a.height)
    .slice(0, limit);
}

export function measureScene(file: string): SceneMeasurementCard {
  const raster = readRaster(file);
  const { width, height } = raster;
  const horizon = findHorizon(raster);
  const divisor = (a: number, b: number): number =>
    b === 0 ? a : divisor(b, a % b);
  const g = divisor(width, height);
  const horizonY = horizon.value?.px ?? null;

  return {
    file,
    container: raster.container,
    width,
    height,
    aspectRatio: `${width / g}:${height / g}`,
    horizonY: horizon,
    floorRegion:
      horizonY === null
        ? unknown("Floor region follows the horizon reading, which is unknown.")
        : estimate(
            { x: 0, y: horizonY, width, height: height - horizonY },
            horizon.confidence === "STRONG_VISUAL_ESTIMATE",
            "Everything below the horizon reading. A bound on where a floor can be, not a walkable region: furniture and occluders are inside it.",
          ),
    dynamicSurfaceCandidates: estimate(
      findFlatRegions(raster),
      true,
      "Contiguous blocks of low luminance variance, largest first. These are where a monitor, whiteboard, bulletin board or blank sign is likely to be, and therefore where nothing readable may be baked. The measurement finds flatness; it does not identify the object.",
    ),
    characterZones:
      horizonY === null
        ? unknown("Character zones follow the horizon reading.")
        : estimate(
            {
              foreground: {
                x: 0,
                y: Math.round(height * 0.72),
                width,
                height: Math.round(height * 0.28),
              },
              midground: {
                x: 0,
                y: horizonY,
                width,
                height: Math.round(height * 0.72) - horizonY,
              },
              background: { x: 0, y: 0, width, height: horizonY },
            },
            false,
            "Thirds of the floor region, offered as a starting frame for anchor authoring rather than as a measurement. Real anchors are authored against the plate by hand.",
          ),
    cameraHeightClass: estimate(
      horizonY === null
        ? null
        : horizonY < height * 0.33
          ? "high / looking down into the room"
          : horizonY > height * 0.6
            ? "low / near seated eye level"
            : "standing eye level",
      horizon.confidence === "STRONG_VISUAL_ESTIMATE",
      "Read from where the horizon estimate falls in the frame.",
    ),
    furnitureCount: unknown(
      "Not derivable from pixels without object recognition. Count by eye against the acceptance checklist in the generation prompt.",
    ),
    chairTableTopology: unknown(
      "Chair and table topology is the failure mode this project cares most about and the one a luminance measurement cannot see. It is a human check, specified as an acceptance list in the prompt rather than pretended here.",
    ),
    standingAnchors: unknown(
      "Requires knowing where the floor is walkable, which needs the objects identified. Authored by hand against the plate.",
    ),
    seatedAnchors: unknown(
      "Requires a visible seat plane, which needs the seats identified. Authored by hand against the plate.",
    ),
    occluderBounds: unknown(
      "Requires foreground/background separation this raster does not carry.",
    ),
  };
}

/* -------------------------------------------------------------------------- */
/* Figure cards                                                                */
/* -------------------------------------------------------------------------- */

export interface FigureMeasurementCard {
  readonly file: string;
  readonly width: number;
  readonly height: number;
  readonly hasRealAlpha: boolean;
  /**
   * Whether the alpha reads as a standing/seated human figure at all.
   *
   * False for footwear, props and isolated heads. Everything below that only
   * means something on a body is reported UNKNOWN rather than filled with a
   * number that happens to divide.
   */
  readonly readsAsFigure: boolean;
  readonly figureBox: Measured<Box>;
  readonly crownY: Measured<number>;
  readonly soleY: Measured<number>;
  readonly figureHeightPx: Measured<number>;
  readonly figureHeightPercentOfCanvas: Measured<number>;
  readonly widestRow: Measured<{ readonly y: number; readonly width: number }>;
  readonly shoulderY: Measured<number>;
  readonly headHeightPx: Measured<number>;
  readonly headsTall: Measured<number>;
  readonly clearance: Measured<{
    readonly left: number;
    readonly right: number;
    readonly top: number;
    readonly bottom: number;
  }>;
  readonly semanticAnchorRecommendations: Measured<
    Readonly<Record<string, { readonly x: number; readonly y: number }>>
  >;
  readonly softEdgeGreenPercent: Measured<number>;
}

/**
 * Landmarks from the alpha silhouette alone.
 *
 * The crown, the sole and the box are readings with no free parameters. The
 * shoulder line is the first row below the head whose width jumps, which is a
 * heuristic and is labelled as one — on a pose with an arm raised it will be
 * wrong, and a prompt author needs to know that rather than trust a number.
 */
export function measureFigure(file: string): FigureMeasurementCard {
  const raster = readRaster(file);
  const { width, height, data } = raster;
  const rowWidth: number[] = new Array(height).fill(0);
  let minX = width;
  let maxX = -1;
  let minY = height;
  let maxY = -1;
  let soft = 0;
  let softGreen = 0;
  for (let y = 0; y < height; y += 1) {
    let lo = -1;
    let hi = -1;
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const alpha = data[offset + 3]!;
      if (alpha <= 8) continue;
      if (lo < 0) lo = x;
      hi = x;
      if (alpha >= 32 && alpha <= 200) {
        soft += 1;
        const red = data[offset]!;
        const green = data[offset + 1]!;
        const blue = data[offset + 2]!;
        if (green > red + 24 && green > blue + 24) softGreen += 1;
      }
    }
    if (lo < 0) continue;
    rowWidth[y] = hi - lo + 1;
    minX = Math.min(minX, lo);
    maxX = Math.max(maxX, hi);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  if (maxY < 0) {
    throw new Error(`${file} carries no figure: every pixel is transparent.`);
  }
  const box: Box = {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };

  // The neck, as the narrowest row in the band below the crown.
  //
  // Deliberately the same approach `pg-modular-intake.ts` already uses for its
  // accepted body rig — the neck is a local minimum between the head and the
  // shoulders, and looking for a minimum is far more stable than looking for
  // the first row below a fraction of the head's width, which on these rasters
  // fired four pixels below the crown and reported figures four hundred heads
  // tall.
  const bandFrom = minY + Math.round(box.height * 0.06);
  const bandTo = Math.min(maxY, minY + Math.round(box.height * 0.2));
  let neckY = bandFrom;
  for (let y = bandFrom; y <= bandTo; y += 1) {
    if (rowWidth[y]! > 0 && rowWidth[y]! < rowWidth[neckY]!) neckY = y;
  }
  const rawHeadHeight = neckY - minY;
  const rawHeadsTall =
    rawHeadHeight > 0 ? box.height / rawHeadHeight : Number.POSITIVE_INFINITY;
  // A human figure is between about four and nine heads tall. Outside that the
  // neck reading failed, or the asset is not a figure at all — a shoe, a prop,
  // a head on its own. Reporting the number anyway would be the invented
  // precision this file exists to avoid.
  const isFigure = rawHeadsTall >= 3.5 && rawHeadsTall <= 10;
  const headHeight = isFigure ? rawHeadHeight : null;

  let shoulderY: number | null = null;
  if (isFigure) {
    const shoulderTo = Math.min(maxY, neckY + Math.round(box.height * 0.15));
    let peak = 0;
    for (let y = neckY; y <= shoulderTo; y += 1) {
      peak = Math.max(peak, rowWidth[y]!);
    }
    for (let y = neckY; y <= shoulderTo; y += 1) {
      if (rowWidth[y]! >= peak * 0.92) {
        shoulderY = y;
        break;
      }
    }
  }

  let widestY = minY;
  for (let y = minY; y <= maxY; y += 1) {
    if (rowWidth[y]! > rowWidth[widestY]!) widestY = y;
  }

  const normalized = (x: number, y: number) => ({
    x: Number((x / width).toFixed(4)),
    y: Number((y / height).toFixed(4)),
  });

  return {
    file,
    width,
    height,
    hasRealAlpha: raster.hasRealAlpha,
    readsAsFigure: isFigure,
    figureBox: measured(box, "Tight alpha bounds at alpha > 8."),
    crownY: measured(minY, "Topmost row carrying alpha."),
    soleY: measured(maxY, "Bottommost row carrying alpha."),
    figureHeightPx: measured(box.height, "Alpha bounds."),
    figureHeightPercentOfCanvas: measured(
      Number(((box.height / height) * 100).toFixed(2)),
      "Alpha bounds against the canvas.",
    ),
    widestRow: measured(
      { y: widestY, width: rowWidth[widestY]! },
      "Row with the greatest opaque span. On a gesturing pose this is an arm, not the body.",
    ),
    shoulderY: isFigure
      ? estimate(
          shoulderY,
          shoulderY !== null,
          "First row at or below the neck reaching 92% of the widest span in the 15% of figure height beneath it. A raised arm or a wide sleeve moves it.",
        )
      : unknown("Not a figure: no shoulder line to find."),
    headHeightPx: isFigure
      ? estimate(
          headHeight,
          true,
          "Crown to the narrowest row in the band 6% to 20% of figure height below it, read as the neck.",
        )
      : unknown("Not a figure: no head to measure."),
    headsTall: isFigure
      ? estimate(
          Number((box.height / headHeight!).toFixed(2)),
          true,
          "Figure height over head height, accepted only inside the 3.5 to 10 range a human figure occupies.",
        )
      : unknown(
          `Not a figure: the neck reading gives ${rawHeadsTall === Number.POSITIVE_INFINITY ? "no head" : rawHeadsTall.toFixed(1) + " heads"} tall, outside the plausible 3.5 to 10 range. This asset is measured as a shape, not as a body.`,
        ),
    clearance: measured(
      {
        left: minX,
        right: width - 1 - maxX,
        top: minY,
        bottom: height - 1 - maxY,
      },
      "Transparent margin around the figure box.",
    ),
    semanticAnchorRecommendations: !isFigure
      ? unknown("Not a figure: semantic body anchors do not apply.")
      : estimate(
          {
            crown: normalized((minX + maxX) / 2, minY),
            head: normalized((minX + maxX) / 2, minY + (headHeight ?? 0) * 0.5),
            torso: normalized(
              (minX + maxX) / 2,
              shoulderY ?? minY + box.height * 0.2,
            ),
            hips: normalized((minX + maxX) / 2, minY + box.height * 0.52),
            feet: normalized((minX + maxX) / 2, maxY),
          },
          shoulderY !== null,
          "A STARTING POINT ONLY. D-068 requires a production body's anchors to be measured from the raster that actually ships, by a human who can see where a waistband sits. `hips` in particular has been placed on the abdomen before, which hangs every trouser off the wrong line — these numbers must be reviewed, not adopted.",
        ),
    softEdgeGreenPercent: measured(
      soft === 0 ? 0 : Number(((softGreen / soft) * 100).toFixed(2)),
      "Green-dominant share of pixels at alpha 32..200, the same metric source-sheet-chop.ts reports.",
    ),
  };
}
