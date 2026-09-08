import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import * as PImage from "pureimage";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createCharacterComponentLibrary,
  projectCharacterLayers,
  type CharacterComponentDefinition,
  type CharacterComponentManifestRecord,
  type CharacterRecipe,
  type ProjectedCharacterLayer,
} from "../src/presentation/character-components";
import {
  FIT_GARMENT_EXTENTS,
  FIT_TOP_FAMILY,
  FIT_FOOTWEAR_FAMILY,
  GARMENT_FIT_FIXTURES,
  GARMENT_FIT_FIXTURE_DIRECTORY,
} from "../scripts/art-asset-factory/garment-fit-fixtures";
import {
  measureBodyFitReference,
  measureEdgeError,
  measureFitCase,
  measureSourceProportion,
  metricFor,
  MINIMUM_COMPARABLE_ROWS,
  readRasterSpans,
  type FitSubject,
  type RasterSpans,
} from "../scripts/art-asset-factory/garment-fit-measure";

/**
 * Adversarial tests for the measurement.
 *
 * The independent audit of the first head found two ways the harness could
 * certify a fit that was not there: a window with nothing comparable in it
 * scored zero, and a garment of the right width in the wrong place scored
 * zero because only spans were compared. Every case below is one of those
 * shapes, or a legitimate shape that must NOT be caught by the repair.
 */

const ROOT = path.resolve(__dirname, "..");
const CANVAS = { width: 420, height: 840 };
let tmp: string;

function fixture(assetId: string): FitSubject {
  const found = GARMENT_FIT_FIXTURES.find(
    (candidate) => candidate.assetId === assetId,
  )!;
  return {
    assetId,
    definition: found.definition,
    file: path.join(ROOT, GARMENT_FIT_FIXTURE_DIRECTORY, `${assetId}.png`),
  };
}

const AVERAGE = fixture("fit_body_adult_average_standing_v1");
const LEAN = fixture("fit_body_adult_lean_standing_v1");
const TOP = fixture("fit_top_knit_average_standing_v1");
const DERBY = fixture("fit_footwear_derby_standing_v1");

async function writePng(
  file: string,
  width: number,
  height: number,
  draw: (
    context: ReturnType<ReturnType<typeof PImage.make>["getContext"]>,
  ) => void,
): Promise<void> {
  const image = PImage.make(width, height);
  image.data.fill(0);
  draw(image.getContext("2d"));
  const stream = fs.createWriteStream(file);
  const done = new Promise<void>((resolve, reject) => {
    stream.on("finish", () => resolve());
    stream.on("error", reject);
  });
  await PImage.encodePNGToStream(image, stream);
  await done;
}

/** The knit raster shifted horizontally by `dx`, or reshaped per row. */
async function transformedTop(
  file: string,
  perRow: (
    row: { lo: number; hi: number },
    y: number,
  ) => { lo: number; hi: number } | null,
): Promise<void> {
  const source = readRasterSpans(TOP.file);
  await writePng(file, source.width, source.height, (context) => {
    context.fillStyle = "#6d7a4e";
    source.rows.forEach((row, y) => {
      if (!row) return;
      const mapped = perRow(row, y);
      if (!mapped) return;
      const lo = Math.max(0, Math.round(mapped.lo));
      const hi = Math.min(source.width - 1, Math.round(mapped.hi));
      if (hi < lo) return;
      context.fillRect(lo, y, hi - lo + 1, 1);
    });
  });
}

function record(subject: FitSubject): CharacterComponentManifestRecord {
  return {
    asset_id: subject.assetId,
    asset_type: "character-component",
    generation_status: "approved",
    qa_status: "approved",
    runtime_release_status: "released",
    component: subject.definition as CharacterComponentDefinition,
  };
}

function projectTopOn(body: FitSubject): ProjectedCharacterLayer {
  const library = createCharacterComponentLibrary([record(body), record(TOP)], {
    catalog_generation: 1,
    slots: [],
    generations: [],
  });
  const recipe: CharacterRecipe = {
    appearanceSeed: "measure-test",
    recipeVersion: "v1",
    catalogGeneration: 1,
    identity: {
      bodyFamily: body.definition.family,
      headFamily: "none",
      complexion: null,
      slots: {},
    },
    context: {
      poseFamily: "standing-neutral",
      headOrientation: null,
      components: [
        {
          slotId: "body",
          kind: "body",
          family: body.definition.family,
          assetId: body.assetId,
          layer: 20,
          released: true,
        },
        {
          slotId: "top",
          kind: "top",
          family: FIT_TOP_FAMILY,
          assetId: TOP.assetId,
          layer: 25,
          released: true,
        },
      ],
      diagnostics: [],
    },
  };
  return projectCharacterLayers(recipe, library)!.layers.find(
    (layer) => layer.kind === "top",
  )!;
}

/** Measures a garment raster on the average body against the knit's own ease. */
function residualOnAverage(garmentFile: string) {
  const layer = projectTopOn(AVERAGE);
  const body = readRasterSpans(AVERAGE.file);
  const reference = measureBodyFitReference(
    AVERAGE.file,
    AVERAGE.definition.family,
    "standing-neutral",
  );
  const metric = metricFor(
    "top",
    reference,
    FIT_GARMENT_EXTENTS[FIT_TOP_FAMILY]!,
    CANVAS.height,
  );
  const ease = measureSourceProportion(
    layer,
    readRasterSpans(TOP.file),
    body,
    CANVAS,
  );
  return measureEdgeError(
    layer,
    readRasterSpans(garmentFile),
    body,
    CANVAS,
    metric,
    ease,
  );
}

beforeAll(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "garment-fit-measure-"));
});
afterAll(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe("no data is not a perfect fit", () => {
  it("a blank garment raster is invalid geometry, not a zero", async () => {
    const blank = path.join(tmp, "blank-top.png");
    await writePng(blank, 420, 340, () => {});
    const error = residualOnAverage(blank);
    expect(error.status).toBe("invalid-geometry");
    expect(error.rowsCompared).toBe(0);
    expect(error.statusReason).toMatch(/no paint/);
  });

  it("a blank footwear raster refuses classification", async () => {
    const blank = path.join(tmp, "blank-footwear.png");
    await writePng(blank, 420, 64, () => {});
    const result = measureFitCase({
      garment: { ...DERBY, file: blank },
      sourceBody: AVERAGE,
      targetBody: LEAN,
      poseFamily: "standing-neutral",
      extent: FIT_GARMENT_EXTENTS[FIT_FOOTWEAR_FAMILY]!,
    });
    expect(result.unfitted.status).toBe("invalid-geometry");
    expect(result.evidence).toBe("insufficient");
    expect(result.classification).toBe("morphology-specific");
    expect(result.reason).toMatch(/Not measurable/);
  });

  it("a body with no painted rows in the window is not compared", async () => {
    const blankBody = path.join(tmp, "blank-body.png");
    await writePng(blankBody, 420, 840, () => {});
    const layer = projectTopOn(AVERAGE);
    const reference = measureBodyFitReference(
      AVERAGE.file,
      AVERAGE.definition.family,
      "standing-neutral",
    );
    const metric = metricFor(
      "top",
      reference,
      FIT_GARMENT_EXTENTS[FIT_TOP_FAMILY]!,
      CANVAS.height,
    );
    const error = measureEdgeError(
      layer,
      readRasterSpans(TOP.file),
      readRasterSpans(blankBody),
      CANVAS,
      metric,
      new Map(),
    );
    expect(error.status).toBe("invalid-geometry");
    expect(error.worstPx).toBe(0);
    expect(error.rowsCompared).toBe(0);
  });

  it("too few comparable rows is insufficient coverage, not a fit", () => {
    // Keep the garment, erase the body everywhere but a couple of rows inside
    // the window: real paint, real geometry, nothing to conclude from.
    const layer = projectTopOn(AVERAGE);
    const body = readRasterSpans(AVERAGE.file);
    const reference = measureBodyFitReference(
      AVERAGE.file,
      AVERAGE.definition.family,
      "standing-neutral",
    );
    const metric = metricFor(
      "top",
      reference,
      FIT_GARMENT_EXTENTS[FIT_TOP_FAMILY]!,
      CANVAS.height,
    );
    const sparse: RasterSpans = {
      ...body,
      rows: body.rows.map((row, y) =>
        y === metric.fromRow || y === metric.fromRow + 1 ? row : null,
      ),
    };
    const ease = measureSourceProportion(
      layer,
      readRasterSpans(TOP.file),
      body,
      CANVAS,
    );
    const error = measureEdgeError(
      layer,
      readRasterSpans(TOP.file),
      sparse,
      CANVAS,
      metric,
      ease,
    );
    expect(error.status).toBe("insufficient-coverage");
    expect(error.rowsCompared).toBeLessThan(MINIMUM_COMPARABLE_ROWS);
    expect(error.statusReason).toMatch(/rows in the edge-match window/);
  });

  it("an unmeasurable fitted transform is never within bound", async () => {
    const blank = path.join(tmp, "blank-top-2.png");
    await writePng(blank, 420, 340, () => {});
    const result = measureFitCase({
      garment: { ...TOP, file: blank },
      sourceBody: AVERAGE,
      targetBody: LEAN,
      poseFamily: "standing-neutral",
      extent: FIT_GARMENT_EXTENTS[FIT_TOP_FAMILY]!,
    });
    expect(result.affine?.withinBound ?? false).toBe(false);
    expect(result.boundedWarp?.withinBound ?? false).toBe(false);
    expect(result.classification).toBe("morphology-specific");
    expect(result.evidence).toBe("insufficient");
  });
});

describe("placement, not just width", () => {
  it("the knit on its own body scores zero, ease and all", () => {
    const error = residualOnAverage(TOP.file);
    expect(error.status).toBe("measured");
    expect(error.worstPx).toBe(0);
    // ...while the raw overhang against the body edge is the ease itself,
    // which is reported and is not the verdict.
    expect(error.overhangPx).toBeGreaterThan(0);
  });

  it("an equal-width garment shifted 12 px scores 12 px", async () => {
    const shifted = path.join(tmp, "shifted-12.png");
    await transformedTop(shifted, (row) => ({
      lo: row.lo + 12,
      hi: row.hi + 12,
    }));
    const error = residualOnAverage(shifted);
    expect(error.status).toBe("measured");
    expect(error.worstPx).toBeCloseTo(12, 0);
  });

  it("left-only displacement is caught on the left edge", async () => {
    const file = path.join(tmp, "left-only.png");
    await transformedTop(file, (row) => ({ lo: row.lo - 9, hi: row.hi }));
    const error = residualOnAverage(file);
    expect(error.worstPx).toBeCloseTo(9, 0);
  });

  it("right-only displacement is caught on the right edge", async () => {
    const file = path.join(tmp, "right-only.png");
    await transformedTop(file, (row) => ({ lo: row.lo, hi: row.hi + 7 }));
    const error = residualOnAverage(file);
    expect(error.worstPx).toBeCloseTo(7, 0);
  });

  it("symmetric overhang is caught even though the garment stays centred", async () => {
    const file = path.join(tmp, "symmetric-over.png");
    await transformedTop(file, (row) => ({ lo: row.lo - 10, hi: row.hi + 10 }));
    const error = residualOnAverage(file);
    expect(error.worstPx).toBeCloseTo(10, 0);
  });

  it("undercoverage is caught even though the garment stays centred", async () => {
    const file = path.join(tmp, "under.png");
    await transformedTop(file, (row) => ({ lo: row.lo + 10, hi: row.hi - 10 }));
    const error = residualOnAverage(file);
    expect(error.worstPx).toBeCloseTo(10, 0);
    expect(error.undercoveragePx).toBeGreaterThan(0);
  });

  it("a garment with deliberate ease is not penalised on a body it fits", () => {
    // The knit carries 6 px of ease per side over the average body. Measured
    // against its own ease, that is a zero; measured against the body's bare
    // edge it would never be, and that was the mistake the residual avoids.
    const error = residualOnAverage(TOP.file);
    expect(error.worstPx).toBe(0);
    expect(error.overhangPx).toBeGreaterThanOrEqual(5);
  });

  it("the production affine examples still improve under the placement residual", () => {
    for (const target of [LEAN, fixture("fit_body_adult_heavy_standing_v1")]) {
      const result = measureFitCase({
        garment: TOP,
        sourceBody: AVERAGE,
        targetBody: target,
        poseFamily: "standing-neutral",
        extent: FIT_GARMENT_EXTENTS[FIT_TOP_FAMILY]!,
      });
      expect(result.unfitted.status).toBe("measured");
      expect(result.evidence).toBe("measured");
      expect(result.affine!.result.worstPx).toBeLessThan(
        result.unfitted.worstPx / 2,
      );
    }
  });
});
