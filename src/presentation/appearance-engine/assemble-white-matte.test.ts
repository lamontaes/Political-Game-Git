import { describe, expect, it } from "vitest";
import { measureBodyAnchors } from "./anchors";
import { assemblePerson, LAYER_ORDER } from "./assemble";
import { createRaster } from "./raster";

function fill(
  raster: ReturnType<typeof createRaster>,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: readonly [number, number, number, number],
) {
  for (let y = y0; y <= y1; y += 1)
    for (let x = x0; x <= x1; x += 1)
      raster.data.set(color, (y * raster.width + x) * 4);
}

function bodyRaster() {
  const raster = createRaster(60, 100);
  fill(raster, 22, 5, 37, 22, [214, 153, 102, 255]);
  fill(raster, 27, 23, 32, 27, [214, 153, 102, 255]);
  fill(raster, 12, 28, 47, 70, [214, 153, 102, 255]);
  fill(raster, 20, 55, 39, 65, [128, 128, 128, 255]);
  fill(raster, 20, 71, 39, 95, [170, 110, 70, 255]);
  return raster;
}

describe("person assembly white-matte cleanup", () => {
  it("cleans each body, clothing, hair, face, and accessory layer", () => {
    const body = bodyRaster();
    const anchors = measureBodyAnchors(body);

    for (const slot of LAYER_ORDER) {
      const source = createRaster(body.width, body.height);
      if (slot === "body") source.data.set(body.data);
      source.data.set([30, 20, 10, 255], (10 * source.width + 10) * 4);
      source.data.set([255, 255, 255, 80], (10 * source.width + 11) * 4);
      // Keep the head's bottom feather away from the sample edge.
      source.data.set([30, 20, 10, 255], (95 * source.width + 10) * 4);

      const assembled = assemblePerson(
        anchors,
        slot === "body"
          ? [{ slot, raster: source }]
          : [
              { slot: "body", raster: body },
              { slot, raster: source },
            ],
      );
      const at = (10 * assembled.width + 11) * 4;
      expect(
        Array.from(assembled.data.slice(at, at + 4)),
        `${slot} retains a faint white matte`,
      ).toEqual([30, 20, 10, 80]);
    }
  });
});
