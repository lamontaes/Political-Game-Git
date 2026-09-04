import crypto from "crypto";
import fs from "fs";
import path from "path";
import * as PImage from "pureimage";

/**
 * Deterministic chopping of a multi-cell source sheet.
 *
 * The owner generates dense sheets — nine hairstyles, twelve heads, eight
 * poses — and the project's rule is that nobody crops them by hand. A hand
 * crop is unreproducible, unmeasurable and quietly different every time, which
 * is exactly the property that makes a component's provenance worthless.
 *
 * The grid is NOT assumed. Sheet widths here do not divide evenly by their
 * column count (3584 / 3 is 1194.67), so a fixed lattice would shave a pixel
 * off some cells and not others. Instead the sheet segments ITSELF: alpha is
 * projected onto each axis, runs of occupied columns and rows are found, and a
 * cell is the intersection of one column band with one row band. A sheet laid
 * out differently segments differently, without a parameter changing.
 *
 * ALPHA NOISE. These sheets carry a wide band of nearly-transparent pixels —
 * roughly 22% of every sheet sits at alpha 1..8 — and measurement showed 98% of
 * it lies far from any figure. It is background haze, not the soft edge of
 * anything, so it is cleared before segmentation. The threshold is a parameter
 * and the count it removed is reported, because a cleanup nobody can see the
 * size of is a cleanup nobody can check.
 */

export const SOURCE_SHEET_CHOP_TOOL = "source-sheet-chop-v1";

export interface ChopOptions {
  /** Alpha at or below this is background haze and is zeroed. */
  readonly alphaNoiseThreshold: number;
  /** Transparent border kept around each component, in source pixels. */
  readonly paddingPixels: number;
  /**
   * Smallest gap, in fully-empty lines, that separates two cells. Below this a
   * gap is treated as a hole inside one component rather than a boundary.
   */
  readonly minimumGapPixels: number;
  /** Components smaller than this are artefacts, reported and not written. */
  readonly minimumComponentPixels: number;
}

export const DEFAULT_CHOP_OPTIONS: ChopOptions = {
  alphaNoiseThreshold: 8,
  paddingPixels: 64,
  minimumGapPixels: 24,
  minimumComponentPixels: 20_000,
};

export interface Band {
  readonly start: number;
  readonly end: number;
}

export interface ChoppedCell {
  /** Grid position in reading order, e.g. "R1C1". Never a generator id. */
  readonly cellId: string;
  readonly row: number;
  readonly column: number;
  /** Bounding box of the component in SOURCE pixels. */
  readonly sourceBox: { x: number; y: number; width: number; height: number };
  /** Centroid of opaque mass, normalized to the sheet. */
  readonly centroidNormalized: { x: number; y: number };
  readonly exportWidth: number;
  readonly exportHeight: number;
  readonly opaquePixels: number;
  /** Pixels this cell contributed to the noise cleanup. */
  readonly noisePixelsCleared: number;
  /** True where a soft edge carries a green cast the interior does not. */
  readonly greenFringePixels: number;
  readonly softEdgePixels: number;
  readonly outputPath: string;
  readonly sha256: string;
}

export interface SheetChopReport {
  readonly tool: typeof SOURCE_SHEET_CHOP_TOOL;
  readonly sourcePath: string;
  readonly sourceSha256: string;
  readonly sourceWidth: number;
  readonly sourceHeight: number;
  readonly options: ChopOptions;
  readonly columnBands: readonly Band[];
  readonly rowBands: readonly Band[];
  readonly noisePixelsCleared: number;
  readonly cells: readonly ChoppedCell[];
  /** Occupied regions too small to be a component, reported not discarded. */
  readonly rejectedFragments: readonly {
    readonly row: number;
    readonly column: number;
    readonly opaquePixels: number;
    readonly sourceBox: { x: number; y: number; width: number; height: number };
  }[];
}

function bandsFrom(occupied: readonly boolean[], minimumGap: number): Band[] {
  const bands: Band[] = [];
  let start: number | null = null;
  let gap = 0;
  for (let index = 0; index < occupied.length; index += 1) {
    if (occupied[index]) {
      if (start === null) start = index - gap > 0 ? index : index;
      gap = 0;
    } else if (start !== null) {
      gap += 1;
      if (gap >= minimumGap) {
        bands.push({ start, end: index - gap });
        start = null;
        gap = 0;
      }
    }
  }
  if (start !== null) bands.push({ start, end: occupied.length - 1 });
  return bands;
}

export async function chopSourceSheet(
  sourcePath: string,
  outputDirectory: string,
  nameCell: (row: number, column: number) => string,
  options: ChopOptions = DEFAULT_CHOP_OPTIONS,
): Promise<SheetChopReport> {
  const bytes = await fs.promises.readFile(sourcePath);
  const sheet = await PImage.decodePNGFromStream(
    fs.createReadStream(sourcePath),
  );
  const { width, height, data } = sheet;

  // 1. Clear background haze. Counted, so the cleanup is visible in the report.
  let noisePixelsCleared = 0;
  for (let index = 0; index < width * height; index += 1) {
    const offset = index * 4 + 3;
    const alpha = data[offset]!;
    if (alpha > 0 && alpha <= options.alphaNoiseThreshold) {
      data[offset] = 0;
      noisePixelsCleared += 1;
    }
  }

  // 2. Let the sheet segment itself.
  const columnOccupied = new Array<boolean>(width).fill(false);
  const rowOccupied = new Array<boolean>(height).fill(false);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3]! > 0) {
        columnOccupied[x] = true;
        rowOccupied[y] = true;
      }
    }
  }
  const columnBands = bandsFrom(columnOccupied, options.minimumGapPixels);
  const rowBands = bandsFrom(rowOccupied, options.minimumGapPixels);

  await fs.promises.mkdir(outputDirectory, { recursive: true });
  const cells: ChoppedCell[] = [];
  const rejectedFragments: SheetChopReport["rejectedFragments"] = [];

  for (let rowIndex = 0; rowIndex < rowBands.length; rowIndex += 1) {
    for (
      let columnIndex = 0;
      columnIndex < columnBands.length;
      columnIndex += 1
    ) {
      const rowBand = rowBands[rowIndex]!;
      const columnBand = columnBands[columnIndex]!;

      // Tight bounds of whatever actually occupies this cell.
      let minX = Number.POSITIVE_INFINITY;
      let minY = Number.POSITIVE_INFINITY;
      let maxX = -1;
      let maxY = -1;
      let opaquePixels = 0;
      let sumX = 0;
      let sumY = 0;
      let greenFringePixels = 0;
      let softEdgePixels = 0;
      for (let y = rowBand.start; y <= rowBand.end; y += 1) {
        for (let x = columnBand.start; x <= columnBand.end; x += 1) {
          const offset = (y * width + x) * 4;
          const alpha = data[offset + 3]!;
          if (alpha === 0) continue;
          opaquePixels += 1;
          sumX += x;
          sumY += y;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
          if (alpha >= 32 && alpha <= 200) {
            softEdgePixels += 1;
            const red = data[offset]!;
            const green = data[offset + 1]!;
            const blue = data[offset + 2]!;
            if (green > red + 24 && green > blue + 24) greenFringePixels += 1;
          }
        }
      }
      if (maxX < 0) continue;
      if (opaquePixels < options.minimumComponentPixels) {
        (rejectedFragments as ChoppedCell[] as unknown[]).push({
          row: rowIndex + 1,
          column: columnIndex + 1,
          opaquePixels,
          sourceBox: {
            x: minX,
            y: minY,
            width: maxX - minX + 1,
            height: maxY - minY + 1,
          },
        });
        continue;
      }

      const pad = options.paddingPixels;
      const exportWidth = maxX - minX + 1 + pad * 2;
      const exportHeight = maxY - minY + 1 + pad * 2;
      const out = PImage.make(exportWidth, exportHeight);
      for (let y = 0; y < exportHeight; y += 1) {
        for (let x = 0; x < exportWidth; x += 1) {
          const sourceX = minX - pad + x;
          const sourceY = minY - pad + y;
          const target = (y * exportWidth + x) * 4;
          if (
            sourceX < 0 ||
            sourceY < 0 ||
            sourceX >= width ||
            sourceY >= height
          ) {
            out.data[target + 3] = 0;
            continue;
          }
          const source = (sourceY * width + sourceX) * 4;
          out.data[target] = data[source]!;
          out.data[target + 1] = data[source + 1]!;
          out.data[target + 2] = data[source + 2]!;
          out.data[target + 3] = data[source + 3]!;
        }
      }

      const cellId = nameCell(rowIndex + 1, columnIndex + 1);
      const outputPath = path.join(outputDirectory, `${cellId}.png`);
      await new Promise<void>((resolve, reject) => {
        const stream = fs.createWriteStream(outputPath);
        stream.on("error", reject);
        PImage.encodePNGToStream(out, stream).then(resolve, reject);
      });

      cells.push({
        cellId: `R${rowIndex + 1}C${columnIndex + 1}`,
        row: rowIndex + 1,
        column: columnIndex + 1,
        sourceBox: {
          x: minX,
          y: minY,
          width: maxX - minX + 1,
          height: maxY - minY + 1,
        },
        centroidNormalized: {
          x: Number((sumX / opaquePixels / width).toFixed(6)),
          y: Number((sumY / opaquePixels / height).toFixed(6)),
        },
        exportWidth,
        exportHeight,
        opaquePixels,
        noisePixelsCleared: 0,
        greenFringePixels,
        softEdgePixels,
        outputPath,
        sha256: crypto
          .createHash("sha256")
          .update(fs.readFileSync(outputPath))
          .digest("hex"),
      });
    }
  }

  return {
    tool: SOURCE_SHEET_CHOP_TOOL,
    sourcePath,
    sourceSha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    sourceWidth: width,
    sourceHeight: height,
    options,
    columnBands,
    rowBands,
    noisePixelsCleared,
    cells,
    rejectedFragments,
  };
}
