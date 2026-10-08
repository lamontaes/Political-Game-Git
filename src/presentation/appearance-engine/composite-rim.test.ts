import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import { describe, expect, it, vi } from "vitest";
import { composeEnginePerson, type PeoplePackManifest } from "./pack";
import type { Raster } from "./raster";
import type * as RasterModule from "./raster";

// Keep the straight-alpha canvas before any final rim derivative. The old
// compositor returns this canvas itself; a rim derivative must not mutate it.
const canvases = vi.hoisted(() => [] as Raster[]);
vi.mock("./raster", async (importOriginal) => {
  const original = await importOriginal<typeof RasterModule>();
  return {
    ...original,
    createRaster(width: number, height: number): Raster {
      const raster = original.createRaster(width, height);
      canvases.push(raster);
      return raster;
    },
  };
});

/** Count near-white pixels after drawing onto RGB(12,12,12), in a two-pixel
 * ring beside empty alpha. Interior highlights are outside the measured ring. */
function nearWhiteEdgePixels(raster: Raster): number {
  const { width, height, data } = raster;
  let count = 0;
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1) {
      const at = (y * width + x) * 4;
      const alpha = data[at + 3]! / 255;
      if (
        alpha === 0 ||
        [0, 1, 2].some((c) => data[at + c]! * alpha + 12 * (1 - alpha) < 235)
      )
        continue;
      let edge = false;
      for (let dy = -2; dy <= 2 && !edge; dy += 1)
        for (let dx = -2; dx <= 2; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (
            nx < 0 ||
            ny < 0 ||
            nx >= width ||
            ny >= height ||
            data[(ny * width + nx) * 4 + 3] === 0
          ) {
            edge = true;
            break;
          }
        }
      if (edge) count += 1;
    }
  return count;
}

const root = process.env.PEOPLE_PACK_ROOT ?? "art/people-engine/v1";
const manifest = JSON.parse(
  readFileSync(join(root, "manifest.json"), "utf8"),
) as PeoplePackManifest;
const decoded = new Map<string, Raster>();
function image(file: string): Raster {
  const cached = decoded.get(file);
  if (cached) return cached;
  const png = PNG.sync.read(readFileSync(join(root, file)));
  // Tests use the supplied pixels at their native size, never an enlarged proxy.
  expect([png.width, png.height], file).toEqual([
    manifest.canvas.width,
    manifest.canvas.height,
  ]);
  const raster = {
    width: png.width,
    height: png.height,
    data: new Uint8ClampedArray(png.data),
  };
  decoded.set(file, raster);
  return raster;
}

const smallSet = (["feminine", "masculine"] as const).flatMap((presentation) =>
  (["front", "three-quarter"] as const).flatMap((view) =>
    (["standing", "seated"] as const).map((pose) => ({
      presentation,
      view,
      pose,
    })),
  ),
);

describe("people pack composite rim on a dark background", () => {
  it.each(smallSet)("$presentation average $view $pose", (cell) => {
    canvases.length = 0;
    const result = composeEnginePerson(manifest, image, {
      ...cell,
      build: "average",
      shade: 4,
      face: "",
      hair: "",
      hairColor: "natural",
      outfit: "casual",
    });
    // A front-view fallback is not evidence about a three-quarter cut-out.
    expect(
      { pose: result.pose, view: result.view },
      `Missing drawable pack cell: ${cell.presentation}/average/casual/${cell.view}/${cell.pose}`,
    ).toEqual({ pose: cell.pose, view: cell.view });
    const before = nearWhiteEdgePixels(canvases.at(-1)!);
    const after = nearWhiteEdgePixels(result.raster);
    // Permit strictly less than 1% of the old count (round up by one pixel).
    // The checked-in front cells have before=0, so their tight bound is <1.
    const bound = Math.floor(before * 0.01) + 1;
    console.info(
      `rim ${cell.presentation}/average/casual/${cell.view}/${cell.pose}: before=${before} after=${after} bound<${bound}`,
    );
    expect(after).toBeLessThan(bound);
  });
});
