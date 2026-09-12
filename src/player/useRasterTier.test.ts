import { describe, expect, it } from "vitest";

import { rasterPaintIsAvailable } from "./useRasterTier";
import { createRasterTierLadder } from "../presentation/raster-tiers";

describe("rasterPaintIsAvailable", () => {
  it("is false when the scene has no ladder, so a previous plate must not stay", () => {
    const urls = new Map([[1024, "/plate.png"]]);
    expect(rasterPaintIsAvailable(null, urls)).toBe(false);
    expect(rasterPaintIsAvailable(null, null)).toBe(false);
  });

  it("is true only when both the ladder and the resolved tier URLs exist", () => {
    const ladder = createRasterTierLadder("env_test_v1", [
      {
        width: 1024,
        height: 576,
        path: "art/fake/plate_1024.webp",
        hash: "0".repeat(64),
        derivation: "deterministic-downscale",
      },
    ]);
    expect(rasterPaintIsAvailable(ladder, null)).toBe(false);
    expect(
      rasterPaintIsAvailable(ladder, new Map([[1024, "/plate.png"]])),
    ).toBe(true);
  });
});
