import { describe, expect, it } from "vitest";
import { createRaster } from "./raster";
import { cleanPaintedLayer, withoutWhiteMatte } from "./white-matte";

describe("white matte rendering derivative", () => {
  it("keeps source and silhouette while removing a faint white halo beside colored cloth", () => {
    const source = createRaster(5, 1);
    source.data.set([
      40, 70, 110, 255, 255, 255, 255, 80, 250, 250, 250, 20, 255, 255, 255,
      255, 255, 255, 255, 0,
    ]);
    const original = new Uint8ClampedArray(source.data);
    const out = withoutWhiteMatte(source);
    expect(Array.from(out.data.slice(4, 8))).toEqual([40, 70, 110, 80]);
    // Equally close opaque neighbors resolve consistently; opaque white is preserved.
    expect(Array.from(out.data.slice(8, 12))).toEqual([255, 255, 255, 20]);
    expect(Array.from(out.data.slice(12))).toEqual(
      Array.from(original.slice(12)),
    );
    expect(source.data).toEqual(original);
    expect([3, 7, 11, 15, 19].map((at) => out.data[at])).toEqual([
      255, 80, 20, 255, 0,
    ]);
    expect(withoutWhiteMatte(source)).toBe(out);
  });

  it("removes a mostly opaque white fringe before it is composited over a dark scene", () => {
    const source = createRaster(3, 1);
    source.data.set([24, 52, 88, 255, 250, 250, 250, 192, 0, 0, 0, 0]);

    const cleaned = withoutWhiteMatte(source);
    expect(Array.from(cleaned.data.slice(4, 8))).toEqual([24, 52, 88, 192]);

    const darkScene = [16, 20, 28];
    const coverage = cleaned.data[7]! / 255;
    const displayed = darkScene.map((channel, index) =>
      Math.round(
        cleaned.data[4 + index]! * coverage + channel * (1 - coverage),
      ),
    );
    expect(displayed).toEqual([22, 44, 73]);
  });

  it("does not guess colors for isolated edges or alter colored antialiasing", () => {
    const source = createRaster(4, 1);
    source.data.set([
      255, 255, 255, 80, 20, 40, 60, 80, 255, 255, 255, 200, 0, 0, 0, 0,
    ]);
    expect(withoutWhiteMatte(source)).toBe(source);
  });
});

describe("pack source edge cleanup", () => {
  it("insets every layer silhouette and recolors retained light-gray edge paint", () => {
    const source = createRaster(7, 7);
    for (let y = 1; y < 6; y += 1)
      for (let x = 1; x < 6; x += 1) {
        const at = (y * source.width + x) * 4;
        source.data.set([232, 232, 232, 255], at);
      }
    source.data.set([35, 72, 116, 255], (3 * source.width + 3) * 4);

    const cleaned = cleanPaintedLayer(source);
    expect(cleaned.data[(1 * source.width + 1) * 4 + 3]).toBe(0);
    expect(cleaned.data[(2 * source.width + 2) * 4 + 3]).toBe(255);
    expect(
      Array.from(
        cleaned.data.slice(
          (2 * source.width + 2) * 4,
          (2 * source.width + 2) * 4 + 3,
        ),
      ),
    ).toEqual([35, 72, 116]);
    expect(source.data[(1 * source.width + 1) * 4 + 3]).toBe(255);
  });

  it("does not assign a color to a light layer without nearby non-matte paint", () => {
    const source = createRaster(5, 5);
    for (let y = 1; y < 4; y += 1)
      for (let x = 1; x < 4; x += 1)
        source.data.set([242, 242, 242, 255], (y * source.width + x) * 4);
    const cleaned = cleanPaintedLayer(source);
    expect(
      Array.from(
        cleaned.data.slice(
          (2 * source.width + 2) * 4,
          (2 * source.width + 2) * 4 + 4,
        ),
      ),
    ).toEqual([242, 242, 242, 255]);
  });
});
