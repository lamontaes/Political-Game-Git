import fs from "node:fs";
import path from "node:path";

import * as PImage from "pureimage";

import {
  composeOver,
  createRaster,
  fitLayer,
  measureFigure,
  placeOnCanvas,
  rowRuns,
  armLengthRatio,
  type FigureMeasurement,
  type RgbaRaster,
} from "../../src/presentation/contour-fit";
import { readPng, writePng } from "./pg-modular-intake";

/**
 * Contour-fit preview on the repository's own art.
 *
 * For each sex, one outfit derived for the AVERAGE Wave A body is fitted by
 * the engine onto every other Wave A standing body, and shown beside the
 * wardrobe the offline derivation already wrote for that body. Nothing is
 * written into `art/`; the sheets and the numbers go to the output folder.
 *
 *   node --import tsx scripts/art-asset-factory/contour-fit-preview.ts [out]
 *   node --import tsx scripts/art-asset-factory/contour-fit-preview.ts [out] \
 *     --dressed <folder> --sex masc|fem
 *
 * The second form is the intended intake: a folder holding `dressed.png` (a
 * painted, dressed figure on a transparent canvas) and one PNG per garment
 * layer on that same canvas (the garment's pixels, everything else clear),
 * such as Art's ownership-masked sources. Layers are drawn in file-name
 * order, so prefix them (`1-shoes.png`, `2-pants.png`, `3-shirt.png`). The
 * dressed figure itself is measured as the source body. Private packs stay
 * where they are; only the output folder is written.
 *
 * Two numbers per fitted garment, both from alpha:
 * - `uncovered`: body pixels, on the rows the garment spans, that no garment
 *   pixel covers although the garment covers that part (torso or arm) on the
 *   row. Skin showing through where cloth should be.
 * - `overhang`: garment pixels more than 12 px outside the body silhouette.
 *   Cloth floating in the air.
 */

const REGISTRY = "art/manifest/character_candidate_wardrobe_registry.json";

interface Anchor {
  readonly id: string;
  readonly x: number;
  readonly y: number;
}
interface RegistryAsset {
  readonly asset_id: string;
  readonly final_path: string;
  readonly candidate_component: {
    readonly kind: string;
    readonly family: string;
    readonly layer: number;
    readonly attaches_to?: string;
    readonly origin?: { readonly x: number; readonly y: number };
    readonly compatible_body_families?: readonly string[];
    readonly attachment_anchors?: readonly Anchor[];
  };
}

const BODIES = {
  masc: ["average_man", "skinny_man", "fat_man"],
  fem: ["average_woman", "skinny_woman", "older_woman"],
} as const;
const OUTFITS = {
  masc: [
    "pg_top_005_long_sleeve_button_shirt",
    "pg_bottom_005_dress_trousers",
    "pg_shoe_004_leather_loafers",
  ],
  fem: [
    "pg_top_001_short_sleeve_crew_tee",
    "pg_bottom_001_straight_leg_blue_jeans",
    "pg_shoe_009_low_practical_flats",
  ],
} as const;

function toRaster(bitmap: PImage.Bitmap): RgbaRaster {
  return {
    width: bitmap.width,
    height: bitmap.height,
    data: new Uint8ClampedArray(bitmap.data),
  };
}

function toBitmap(raster: RgbaRaster): PImage.Bitmap {
  const bitmap = PImage.make(raster.width, raster.height);
  bitmap.data.set(raster.data);
  return bitmap;
}

function bodyAsset(assets: RegistryAsset[], name: string): RegistryAsset {
  const found = assets.find(
    (a) =>
      a.candidate_component.kind === "body" &&
      a.asset_id === `wave_a_${name}_standing_neutral_front_a_v1_rt960`,
  );
  if (!found) throw new Error(`no body ${name}`);
  return found;
}

function garmentAsset(
  assets: RegistryAsset[],
  garment: string,
  name: string,
): RegistryAsset {
  const found = assets.find(
    (a) => a.asset_id === `${garment}_wave_a_${name}_rt960_standing_neutral_v1`,
  );
  if (!found) throw new Error(`no ${garment} for ${name}`);
  return found;
}

async function placed(
  asset: RegistryAsset,
  body: RegistryAsset,
  canvas: RgbaRaster,
): Promise<RgbaRaster> {
  const c = asset.candidate_component;
  const anchor = body.candidate_component.attachment_anchors?.find(
    (a) => a.id === c.attaches_to,
  );
  if (!anchor || !c.origin) throw new Error(`no anchor for ${asset.asset_id}`);
  return placeOnCanvas(
    toRaster(await readPng(asset.final_path)),
    canvas,
    anchor,
    c.origin,
  );
}

function score(
  layer: RgbaRaster,
  body: FigureMeasurement,
): { uncovered: number; overhang: number } {
  let uncovered = 0;
  let overhang = 0;
  for (let y = 0; y < body.height; y += 1) {
    const garment = rowRuns(layer, y, 128);
    if (!garment.length) continue;
    const covered = (x: number) =>
      layer.data[(y * layer.width + x) * 4 + 3] >= 128;
    body.rows[y].forEach((run, i) => {
      // Only parts the garment reaches on this row: a sleeve row counts the arm.
      if (!garment.some((g) => g.hi >= run.lo && g.lo <= run.hi)) return;
      for (let x = run.lo; x <= run.hi; x += 1) if (!covered(x)) uncovered += 1;
      void i;
    });
    for (const g of garment)
      for (let x = g.lo; x <= g.hi; x += 1) {
        const inside = body.rows[y].some(
          (r) => x >= r.lo - 12 && x <= r.hi + 12,
        );
        if (!inside) overhang += 1;
      }
  }
  return { uncovered, overhang };
}

function half(r: RgbaRaster): RgbaRaster {
  const out = createRaster(Math.floor(r.width / 2), Math.floor(r.height / 2));
  for (let y = 0; y < out.height; y += 1)
    for (let x = 0; x < out.width; x += 1)
      for (let c = 0; c < 4; c += 1) {
        let s = 0;
        for (const [dx, dy] of [
          [0, 0],
          [1, 0],
          [0, 1],
          [1, 1],
        ])
          s += r.data[((2 * y + dy) * r.width + 2 * x + dx) * 4 + c];
        (out.data as Uint8ClampedArray)[(y * out.width + x) * 4 + c] = s / 4;
      }
  return out;
}

function onStage(r: RgbaRaster): RgbaRaster {
  const bg = createRaster(r.width, r.height);
  const d = bg.data as Uint8ClampedArray;
  for (let i = 0; i < d.length; i += 4) d.set([30, 26, 24, 255], i);
  return composeOver(bg, r);
}

async function dressedMode(
  outDir: string,
  folder: string,
  sex: "masc" | "fem",
) {
  const assets = (
    JSON.parse(fs.readFileSync(REGISTRY, "utf8")) as { assets: RegistryAsset[] }
  ).assets;
  const dressed = toRaster(await readPng(path.join(folder, "dressed.png")));
  const source = measureFigure(dressed);
  const ratio = armLengthRatio(source) ?? undefined;
  const files = fs
    .readdirSync(folder)
    .filter((f) => f.endsWith(".png") && f !== "dressed.png")
    .sort();
  const layers = await Promise.all(
    files.map(async (f) => toRaster(await readPng(path.join(folder, f)))),
  );
  const columns: RgbaRaster[] = [];
  for (const name of BODIES[sex]) {
    const body = toRaster(await readPng(bodyAsset(assets, name).final_path));
    const target = measureFigure(body, { armLengthRatio: ratio });
    const dressedBody = layers.reduce(
      (acc, layer) =>
        composeOver(acc, fitLayer(layer, source, target, { ease: 4 })),
      body,
    );
    columns.push(onStage(body), onStage(dressedBody));
  }
  await writeSheet(
    columns,
    path.join(outDir, `contour-fit-dressed-${sex}.png`),
  );
  console.log(`wrote ${files.length} layers onto ${BODIES[sex].length} bodies`);
}

async function writeSheet(columns: RgbaRaster[], file: string) {
  const gap = 6;
  const height = Math.max(...columns.map((c) => c.height));
  const width = columns.reduce((w, c) => w + c.width + gap, 0);
  const sheet = createRaster(width, height);
  const d = sheet.data as Uint8ClampedArray;
  let x = 0;
  for (const c of columns) {
    for (let y = 0; y < c.height; y += 1)
      d.set(
        c.data.subarray(y * c.width * 4, (y + 1) * c.width * 4),
        (y * width + x) * 4,
      );
    x += c.width + gap;
  }
  await writePng(file, toBitmap(sheet));
}

async function main() {
  const outDir = process.argv[2] ?? "test-results/contour-fit";
  const dressedAt = process.argv.indexOf("--dressed");
  if (dressedAt > 0) {
    const sexAt = process.argv.indexOf("--sex");
    const sex = sexAt > 0 && process.argv[sexAt + 1] === "fem" ? "fem" : "masc";
    await dressedMode(outDir, process.argv[dressedAt + 1], sex);
    return;
  }
  const assets = (
    JSON.parse(fs.readFileSync(REGISTRY, "utf8")) as { assets: RegistryAsset[] }
  ).assets;
  const report: Record<string, unknown> = {};
  for (const sex of ["masc", "fem"] as const) {
    const [sourceName] = BODIES[sex];
    const sourceBody = bodyAsset(assets, sourceName);
    const sourceRaster = toRaster(await readPng(sourceBody.final_path));
    const source = measureFigure(sourceRaster);
    const ratio = armLengthRatio(source) ?? undefined;
    const sourceLayers = await Promise.all(
      OUTFITS[sex].map((g) =>
        placed(garmentAsset(assets, g, sourceName), sourceBody, sourceRaster),
      ),
    );
    const columns: RgbaRaster[] = [];
    for (const name of BODIES[sex]) {
      const bodyA = bodyAsset(assets, name);
      const bodyR = toRaster(await readPng(bodyA.final_path));
      const target = measureFigure(bodyR, { armLengthRatio: ratio });
      const derived = await Promise.all(
        OUTFITS[sex].map((g) =>
          placed(garmentAsset(assets, g, name), bodyA, bodyR),
        ),
      );
      const fitted = sourceLayers.map((layer) =>
        fitLayer(layer, source, target, { ease: 5 }),
      );
      // Draw order: shoes, bottom, top (outfit lists top, bottom, shoes).
      const dress = (layers: RgbaRaster[]) =>
        [2, 1, 0].reduce((acc, i) => composeOver(acc, layers[i]), bodyR);
      const entry: Record<string, unknown> = {
        landmarks: {
          top: target.top,
          neckBase: target.neckBase,
          armSplit: target.armSplit,
          crotch: target.crotch,
          handTip: target.handTip,
          ankle: target.ankle,
          sole: target.sole,
        },
      };
      OUTFITS[sex].forEach((g, i) => {
        entry[g] = {
          derived: score(derived[i], target),
          engine: score(fitted[i], target),
        };
      });
      report[`${sex}:${name}`] = entry;
      for (const r of [bodyR, dress(derived), dress(fitted)])
        columns.push(onStage(half(r)));
    }
    await writeSheet(columns, path.join(outDir, `contour-fit-${sex}.png`));
  }
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, "contour-fit-report.json"),
    JSON.stringify(report, null, 1),
  );
  console.log(JSON.stringify(report, null, 1));
}

void main();
