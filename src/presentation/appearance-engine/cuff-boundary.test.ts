import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  composeEnginePerson,
  posedPieces,
  type BodyPose,
  type EngineRecipe,
  type PeoplePackManifest,
} from "./pack";
import type { Raster } from "./raster";

const PNG = createRequire(import.meta.url)("pngjs").PNG as {
  readonly sync: {
    read(bytes: Buffer): { width: number; height: number; data: Buffer };
  };
};
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

// Actual one-output main measurements, ae27b4da, not a fabricated old renderer.
// These probe a broader cloth/skin junction; they do not prove cuff alpha QA.
const cells = [
  ["feminine", "casual", "standing", "bottom", null],
  ["feminine", "casual", "seated", "bottom", 39.192972560922875],
  ["feminine", "formal", "standing", "suit", 31.15072945410575],
  ["feminine", "formal", "seated", "suit", 36.871675311065495],
  ["feminine", "blouse-skirt", "standing", "top", 62.52536426167078],
  ["feminine", "blouse-skirt", "seated", "top", 47.266803982461575],
  ["feminine", "dress-blazer", "standing", "jacket", 52.11001019318381],
  ["feminine", "dress-blazer", "seated", "jacket", 40.63664018249631],
  ["masculine", "casual", "standing", "bottom", 24.121721541969254],
  ["masculine", "casual", "seated", "bottom", 36.273414192659914],
  ["masculine", "casual", "hands-in-pockets", "bottom", 37.199411406464215],
  ["masculine", "formal", "standing", "suit", 38.58498068607713],
  ["masculine", "formal", "seated", "suit", 35.117521623986825],
  ["masculine", "formal", "hands-in-pockets", "suit", 44.77803149296081],
] as const;
// Measured maximum 62.525...; allow less than ceil(max)+1, rather than a
// palette-wide allowance. Original ink/shading remains in this metric.
const bound = 64;

function boundary(
  garment: Raster,
  masks: readonly Raster[],
  part: Raster,
  shoulderRow: number,
): number[] {
  const points: number[] = [];
  for (let y = shoulderRow; y < garment.height; y += 1)
    for (let x = 0; x < garment.width; x += 1) {
      const at = (y * garment.width + x) * 4;
      if (part.data[at + 3]! <= 128 || garment.data[at + 3]! < 250) continue;
      let touchesSkin = false;
      for (let dy = -2; dy <= 2; dy += 1)
        for (let dx = -2; dx <= 2; dx += 1) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= garment.width || yy >= garment.height)
            continue;
          const neighbor = (yy * garment.width + xx) * 4;
          const [r, g, b, alpha] = garment.data.subarray(
            neighbor,
            neighbor + 4,
          );
          // Warm source pixels outside ALL declared cloth parts. Otherwise
          // cream fabric would be mistaken for skin and fill the whole sleeve.
          touchesSkin ||=
            masks.every((mask) => mask.data[neighbor + 3]! <= 128) &&
            alpha! > 16 &&
            r! >= g! &&
            g! >= b! &&
            r! - b! > 18 &&
            0.2126 * r! + 0.7152 * g! + 0.0722 * b! > 40;
        }
      if (touchesSkin) points.push(at);
    }
  return points;
}

describe("native cloth boundaries beside exposed skin (cuff probe)", () => {
  for (const [presentation, outfit, pose, part, before] of cells) {
    const recipe: EngineRecipe = {
      presentation,
      outfit,
      pose: pose as BodyPose,
      build: "average",
      shade: 4,
      face: "20s30s-01",
      hair: "",
      hairColor: "natural",
      view: "front",
    };
    it(`${presentation} average front ${pose} ${outfit} ${part}`, () => {
      const pieces = posedPieces(manifest.presentations[presentation], recipe);
      expect({ pose: pieces.pose, view: pieces.view }).toEqual({
        pose,
        view: "front",
      });
      const garment = image(pieces.outfit!.file);
      const immutable = new Uint8ClampedArray(garment.data);
      const regions = pieces.outfit!.regions!;
      const points = boundary(
        garment,
        Object.values(regions).map(image),
        image(regions[part]!),
        pieces.body.anchors.shoulderRow,
      );
      const colors = Object.fromEntries(
        Object.keys(regions).map((id) => [id, "navy"]),
      );
      const result = composeEnginePerson(manifest, image, {
        ...recipe,
        colors,
      });
      const dark = composeEnginePerson(manifest, image, {
        ...recipe,
        colors,
        shade: 7,
      });
      const light = composeEnginePerson(manifest, image, {
        ...recipe,
        colors,
        shade: 1,
      });
      let total = 0;
      let shadeDifference = 0;
      for (const at of points) {
        total += Math.hypot(
          result.raster.data[at]! - 37,
          result.raster.data[at + 1]! - 52,
          result.raster.data[at + 2]! - 89,
        );
        for (let c = 0; c < 3; c += 1)
          shadeDifference += Math.abs(
            dark.raster.data[at + c]! - light.raster.data[at + c]!,
          );
      }
      const after = points.length ? total / points.length : null;
      process.stdout.write(
        `cloth-boundary ${presentation}/average/front/${pose}/${outfit}/${part}: recorded-main-before=${before ?? "input-gap"} current-after=${after ?? "input-gap"} samples=${points.length} mean-bound<${bound} shade-difference=${shadeDifference}\n`,
      );
      expect(
        Buffer.compare(Buffer.from(garment.data), Buffer.from(immutable)),
      ).toBe(0);
      expect(
        points.length,
        "Input gap: no native cloth/skin junction samples; this cell is not cuff proof",
      ).toBeGreaterThan(0);
      expect(after!).toBeLessThan(bound);
      expect(
        shadeDifference,
        "Cloth junction pixels must not follow the skin shade",
      ).toBe(0);
    });
    it(`${presentation} average three-quarter ${pose} ${outfit} requires native art`, () => {
      const result = composeEnginePerson(manifest, image, {
        ...recipe,
        view: "three-quarter",
      });
      expect(
        { pose: result.pose, view: result.view },
        "Missing turned native cell: front fallback is not cuff proof",
      ).toEqual({ pose, view: "three-quarter" });
    });
  }
});
