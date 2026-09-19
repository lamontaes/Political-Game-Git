import { describe, expect, it } from "vitest";
import { remapRasterMaterial } from "./raster-material";

describe("prepared raster materials", () => {
  const source = new Uint8ClampedArray([
    150, 80, 50, 128, 220, 220, 220, 255, 0, 255, 0, 0,
  ]);
  const map = new Uint8ClampedArray([
    128, 128, 128, 255, 128, 128, 128, 0, 128, 128, 128, 255,
  ]);
  it("changes painted material and preserves alpha, protected eyes and hidden RGB", () => {
    const result = remapRasterMaterial(source, map, ["#201810", "#d6a078"]);
    expect(result.slice(0, 3)).not.toEqual(source.slice(0, 3));
    expect(result[3]).toBe(128);
    expect(result.slice(4)).toEqual(source.slice(4));
    expect(source[0]).toBe(150);
  });
  it("preserves shade ordering with independent hair and skin ramps", () => {
    const p = new Uint8ClampedArray([100, 80, 60, 255, 100, 80, 60, 255]);
    const m = new Uint8ClampedArray([20, 20, 20, 255, 230, 230, 230, 255]);
    const skin = remapRasterMaterial(p, m, ["#352014", "#e9c0a0"]);
    const hair = remapRasterMaterial(p, m, ["#101010", "#777777"]);
    expect(skin[0]).toBeLessThan(skin[4]!);
    expect(hair).not.toEqual(skin);
  });
  it("refuses malformed maps and colors", () => {
    expect(() =>
      remapRasterMaterial(source, map.slice(4), ["#000000", "#ffffff"]),
    ).toThrow();
    expect(() =>
      remapRasterMaterial(source, map, ["red", "#ffffff"]),
    ).toThrow();
  });
});
