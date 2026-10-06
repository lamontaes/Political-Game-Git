import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";
import type * as Assemble from "./assemble";
import { COLLAR_BAND_SHARE, composite, placeLayers } from "./assemble";
import { composeEnginePerson, type PeoplePackManifest } from "./pack";
import type { Raster } from "./raster";
import { withoutWhiteMatte } from "./white-matte";

const PNG = createRequire(import.meta.url)("pngjs").PNG as {
  readonly sync: {
    read(bytes: Buffer): { width: number; height: number; data: Buffer };
  };
};
const captured = vi.hoisted(() => ({
  args: undefined as Parameters<typeof Assemble.assemblePerson> | undefined,
}));
vi.mock("./assemble", async (importOriginal) => {
  const original = await importOriginal<typeof Assemble>();
  return {
    ...original,
    assemblePerson(...args: Parameters<typeof Assemble.assemblePerson>) {
      captured.args = args;
      return original.assemblePerson(...args);
    },
  };
});
const root = process.env.PEOPLE_PACK_ROOT ?? "art/people-engine/v1";
const manifest = JSON.parse(
  readFileSync(join(root, "manifest.json"), "utf8"),
) as PeoplePackManifest;
const cache = new Map<string, Raster>();
function image(file: string): Raster {
  const cached = cache.get(file);
  if (cached) return cached;
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
  return raster;
}

/** Count garment contamination where the authored front hair is fully opaque.
 * Translucent hair legitimately mixes colors and is outside this strict mask. */
function overpaint(
  raster: Raster,
  hair: Assemble.PlacedLayer,
  collar: Raster,
): { tested: number; contaminated: number } {
  let tested = 0;
  let contaminated = 0;
  for (let y = 0; y < hair.raster.height; y += 1)
    for (let x = 0; x < hair.raster.width; x += 1) {
      const tx = x + hair.dx;
      const ty = y + hair.dy;
      if (tx < 0 || ty < 0 || tx >= raster.width || ty >= raster.height)
        continue;
      const src = (y * hair.raster.width + x) * 4;
      const dst = (ty * raster.width + tx) * 4;
      if (hair.raster.data[src + 3] !== 255 || collar.data[dst + 3] === 0)
        continue;
      tested += 1;
      if (
        [0, 1, 2].some(
          (channel) =>
            raster.data[dst + channel] !== hair.raster.data[src + channel],
        )
      )
        contaminated += 1;
    }
  return { tested, contaminated };
}

describe("native collars and hoods stay behind front hair", () => {
  let measuredOverlap = 0;
  let legacyContamination = 0;
  afterAll(() => {
    expect(
      measuredOverlap,
      "Native hair must actually overlap the measured collar band",
    ).toBeGreaterThan(0);
    expect(
      legacyContamination,
      "The legacy collar-last reconstruction must expose overpainting",
    ).toBeGreaterThan(0);
  });
  for (const presentation of ["feminine", "masculine"] as const)
    for (const pose of ["standing", "seated"] as const)
      for (const outfit of ["formal", "hoodie-jeans"] as const) {
        const pack = manifest.presentations[presentation];
        for (const hair of pack.hair)
          it(`${presentation} average front ${pose} ${outfit} ${hair.id}`, () => {
            const result = composeEnginePerson(manifest, image, {
              presentation,
              pose,
              outfit,
              hair: hair.id,
              view: "front",
              build: "average",
              shade: 4,
              face: "20s30s-01",
              hairColor: "natural",
            });
            expect({ pose: result.pose, view: result.view }).toEqual({
              pose,
              view: "front",
            });
            const [body, layers] = captured.args!;
            const placed = placeLayers(
              body,
              layers.map((layer) =>
                layer.slot === "outfit"
                  ? { ...layer, raster: withoutWhiteMatte(layer.raster) }
                  : layer,
              ),
            );
            const front = placed.find((layer) => layer.slot === "front-hair")!;
            const clothing = placed.find((layer) => layer.slot === "outfit")!;
            const bytes = new Uint8ClampedArray(clothing.raster.data.length);
            const lastRow =
              body.neck.row +
              Math.round((body.feet - body.top) * COLLAR_BAND_SHARE);
            for (
              let y = Math.max(0, body.neck.row);
              y <= Math.min(lastRow, clothing.raster.height - 1);
              y += 1
            ) {
              const start = y * clothing.raster.width * 4;
              bytes.set(
                clothing.raster.data.subarray(
                  start,
                  start + clothing.raster.width * 4,
                ),
                start,
              );
            }
            const band = { ...clothing.raster, data: bytes };
            // Explicit legacy-order reconstruction, not an alleged defect in
            // current main: append the collar over the existing composite.
            const legacy = composite(
              result.raster.width,
              result.raster.height,
              [
                { slot: "body", raster: result.raster, dx: 0, dy: 0 },
                { ...clothing, raster: band },
              ],
            );
            const before = overpaint(legacy, front, band);
            const after = overpaint(result.raster, front, band);
            process.stdout.write(
              `collar ${presentation}/average/front/${pose}/${outfit}/${hair.id}: legacy-order-before=${before.contaminated} current-after=${after.contaminated} tested=${after.tested} bound=0\n`,
            );
            measuredOverlap += after.tested;
            legacyContamination += before.contaminated;
            expect(after.contaminated).toBe(0);
          });
        it(`${presentation} average three-quarter ${pose} ${outfit} requires native art`, () => {
          const result = composeEnginePerson(manifest, image, {
            presentation,
            pose,
            outfit,
            view: "three-quarter",
            hair: "",
            build: "average",
            shade: 4,
            face: "20s30s-01",
            hairColor: "natural",
          });
          expect(
            { pose: result.pose, view: result.view },
            "Missing native turned cell: front fallback is not collar QA",
          ).toEqual({ pose, view: "three-quarter" });
        });
      }
});
