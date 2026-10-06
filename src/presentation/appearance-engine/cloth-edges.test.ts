import { describe, expect, it } from "vitest";
import { clothEdgeMask } from "./cloth-edges";
import { createRaster } from "./raster";

describe("cloth perimeter membership", () => {
  it("includes a partial cloth edge but preserves source alpha and isolated pixels", () => {
    const layer = createRaster(5, 5);
    const mask = createRaster(5, 5);
    const center = (2 * 5 + 2) * 4 + 3;
    mask.data[center] = 255;
    layer.data[center] = 255;
    layer.data[center + 4] = 18;
    layer.data[3] = 18;
    const original = new Uint8ClampedArray(layer.data);
    const expanded = clothEdgeMask(layer, mask, undefined, []);
    expect(expanded.data[center + 4]).toBe(255);
    expect(expanded.data[3]).toBe(0);
    expect(layer.data).toEqual(original);
    expect(mask.data[center + 4]).toBe(0);
  });

  it.each(["skin", "other cloth"])(
    "keeps partial edges next to %s out of the selected part",
    (kind) => {
      const layer = createRaster(5, 5);
      const mask = createRaster(5, 5);
      const protectedMask = createRaster(5, 5);
      const center = (2 * 5 + 2) * 4 + 3;
      mask.data[center] = 255;
      layer.data[center + 4] = 18;
      protectedMask.data[center + 8] = 255;
      const result = clothEdgeMask(
        layer,
        mask,
        kind === "skin" ? protectedMask : undefined,
        kind === "other cloth" ? [protectedMask] : [],
      );
      expect(result.data[center + 4]).toBe(0);
    },
  );

  it("preserves fully painted unassigned fabric, including white cuffs", () => {
    const layer = createRaster(3, 3);
    const mask = createRaster(3, 3);
    mask.data[4 * 4 + 3] = 255;
    layer.data[5 * 4 + 3] = 255;
    expect(clothEdgeMask(layer, mask, undefined, []).data[5 * 4 + 3]).toBe(0);
  });
});
