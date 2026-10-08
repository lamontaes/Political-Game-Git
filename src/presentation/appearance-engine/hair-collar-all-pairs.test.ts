import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  assemblePerson,
  COLLAR_BAND_SHARE,
  LAYER_ORDER,
  placeLayers,
  type PersonLayer,
  type PlacedLayer,
} from "./assemble";
import {
  POSES_BY_PRESENTATION,
  poseFallbacks,
  posedPieces,
  type PeoplePackManifest,
} from "./pack";
import type { Raster } from "./raster";
import { hairWithFaceWindow } from "./hair-face-window";
import { withoutWhiteMatte } from "./white-matte";

const PNG = createRequire(import.meta.url)("pngjs").PNG as {
  readonly sync: {
    read(bytes: Buffer): {
      readonly width: number;
      readonly height: number;
      readonly data: Buffer;
    };
  };
};
const root = process.env.PEOPLE_PACK_ROOT ?? "art/people-engine/v1";
const manifest = JSON.parse(
  readFileSync(join(root, "manifest.json"), "utf8"),
) as PeoplePackManifest;
const cache = new Map<string, Raster>();
function image(file: string): Raster {
  const found = cache.get(file);
  if (found) {
    cache.delete(file);
    cache.set(file, found);
    return found;
  }
  const png = PNG.sync.read(readFileSync(join(root, file)));
  expect([png.width, png.height], file).toEqual([
    manifest.canvas.width,
    manifest.canvas.height,
  ]);
  const raster = {
    width: png.width,
    height: png.height,
    data: new Uint8ClampedArray(png.data),
  };
  cache.set(file, raster);
  if (cache.size > 192) cache.delete(cache.keys().next().value!);
  return raster;
}

function collarBand(
  garment: PlacedLayer,
  neckRow: number,
  neckline: number,
): Raster {
  const data = new Uint8ClampedArray(garment.raster.data.length);
  const first = Math.max(0, neckRow - garment.dy);
  const last = Math.min(garment.raster.height - 1, neckline - garment.dy);
  for (let y = first; y <= last; y += 1) {
    const start = y * garment.raster.width * 4;
    data.set(
      garment.raster.data.subarray(start, start + garment.raster.width * 4),
      start,
    );
  }
  return { ...garment.raster, data };
}

function opaqueOverlap(
  output: Raster,
  hair: PlacedLayer,
  garment: Raster,
): { readonly overlap: number; readonly coveredByGarment: number } {
  let overlap = 0;
  let coveredByGarment = 0;
  for (let y = 0; y < hair.raster.height; y += 1)
    for (let x = 0; x < hair.raster.width; x += 1) {
      const tx = x + hair.dx;
      const ty = y + hair.dy;
      if (tx < 0 || ty < 0 || tx >= output.width || ty >= output.height)
        continue;
      const source = (y * hair.raster.width + x) * 4;
      const target = (ty * output.width + tx) * 4;
      if (
        hair.raster.data[source + 3] !== 255 ||
        garment.data[target + 3] !== 255
      )
        continue;
      overlap += 1;
      if (
        [0, 1, 2].some(
          (channel) =>
            output.data[target + channel] !==
            hair.raster.data[source + channel],
        )
      )
        coveredByGarment += 1;
    }
  return { overlap, coveredByGarment };
}

describe("every current front hair, outfit and pose collar composition", () => {
  let combinations = 0;
  let collarOverlaps = 0;
  let poseFallbacksUsed = 0;

  afterAll(() => {
    expect(combinations).toBeGreaterThan(0);
    expect(
      collarOverlaps,
      "the audit must exercise real hair/collar pixels",
    ).toBeGreaterThan(0);
    process.stdout.write(
      `Rendered ${combinations} hair/outfit/requested-pose combinations; ${poseFallbacksUsed} used a declared pose fallback.\n`,
    );
  });

  for (const presentation of ["feminine", "masculine"] as const) {
    const pack = manifest.presentations[presentation];
    for (const pose of POSES_BY_PRESENTATION[presentation])
      for (const outfit of pack.outfits)
        it(`${presentation}/${pose}/${outfit.id}: every hairstyle stays aligned and above the collar`, () => {
          for (const hair of pack.hair) {
            const resolved = posedPieces(pack, {
              presentation,
              pose,
              view: "front",
              build: "average",
              shade: 4,
              face: pack.faces[0]!.id,
              hair: hair.id,
              hairColor: "natural",
              outfit: outfit.id,
            });
            expect(
              poseFallbacks(pose),
              `${presentation}/${pose}/${outfit.id}/${hair.id}: resolved pose must be a declared fallback`,
            ).toContain(resolved.pose);
            if (resolved.pose !== pose) poseFallbacksUsed += 1;

            const face = image(resolved.face.file);
            const layers: PersonLayer[] = [
              {
                slot: "back-hair",
                raster: image(resolved.hair.back),
                authoredFor: resolved.canonical,
              },
              { slot: "body", raster: image(resolved.body.file) },
              { slot: "outfit", raster: image(resolved.outfit!.file) },
              {
                slot: "head",
                raster: face,
                authoredFor: resolved.canonical,
              },
              {
                slot: "front-hair",
                raster: hairWithFaceWindow(
                  image(resolved.hair.front),
                  face,
                  resolved.hair.front,
                  resolved.hair.faceWindow,
                ),
                authoredFor: resolved.canonical,
              },
            ];
            const output = assemblePerson(resolved.body.anchors, layers);
            const placed = placeLayers(
              resolved.body.anchors,
              layers.map((layer) => ({
                ...layer,
                raster: withoutWhiteMatte(layer.raster),
              })),
            );
            const head = placed.find((layer) => layer.slot === "head")!;
            const back = placed.find((layer) => layer.slot === "back-hair")!;
            const front = placed.find((layer) => layer.slot === "front-hair")!;
            const garment = placed.find((layer) => layer.slot === "outfit");

            expect(back.dx, `${hair.id} back hair x anchor`).toBe(head.dx);
            expect(back.dy, `${hair.id} back hair y anchor`).toBe(head.dy);
            expect(front.dx, `${hair.id} front hair x anchor`).toBe(head.dx);
            expect(front.dy, `${hair.id} front hair y anchor`).toBe(head.dy);
            expect(
              LAYER_ORDER.indexOf("back-hair"),
              "back hair must be behind the outfit",
            ).toBeLessThan(LAYER_ORDER.indexOf("outfit"));
            expect(
              LAYER_ORDER.indexOf("front-hair"),
              "front hair must be over the outfit collar",
            ).toBeGreaterThan(LAYER_ORDER.indexOf("outfit"));

            combinations += 1;
            if (!garment) continue;
            const collar = collarBand(
              garment,
              resolved.body.anchors.neck.row,
              resolved.body.anchors.neck.row +
                Math.round(
                  (resolved.body.anchors.feet - resolved.body.anchors.top) *
                    COLLAR_BAND_SHARE,
                ),
            );
            const overlap = opaqueOverlap(output, front, collar);
            collarOverlaps += overlap.overlap;
            expect(
              overlap.coveredByGarment,
              `${presentation}/${pose}/${outfit.id}/${hair.id}: collar crossed fully opaque front hair`,
            ).toBe(0);
          }
        });
  }
});
