import { describe, expect, it } from "vitest";

import {
  clipToShoreline,
  RingIndex,
  toMultiPolygon,
} from "../../scripts/maps/district-outlines-2026";
import type { Ring } from "../../scripts/maps/shapefile";

/** Shapefile winding: exteriors clockwise, holes counterclockwise. */
const clockwise = (x0: number, y0: number, x1: number, y1: number): Ring =>
  Float64Array.from([x0, y0, x0, y1, x1, y1, x1, y0, x0, y0]);
const counterclockwise = (
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): Ring => Float64Array.from([x0, y0, x1, y0, x1, y1, x0, y1, x0, y0]);

/** Area by the shoelace sum, positive for either winding. */
function area(rings: readonly Ring[]): number {
  let total = 0;
  for (const ring of rings) {
    let sum = 0;
    for (let at = 0; at + 3 < ring.length; at += 2)
      sum +=
        (ring[at] as number) * (ring[at + 3] as number) -
        (ring[at + 2] as number) * (ring[at + 1] as number);
    total += sum / 2;
  }
  return Math.abs(total);
}

describe("district outlines dissolved from blocks", () => {
  it("nests a hole inside the exterior that holds it", () => {
    const polygons = toMultiPolygon([
      clockwise(0, 0, 10, 10),
      counterclockwise(2, 2, 4, 4),
      clockwise(20, 0, 30, 10),
    ]);
    expect(
      polygons.map((polygon: readonly unknown[]) => polygon.length).sort(),
    ).toEqual([1, 2]);
  });

  it("cuts district color that runs past the shoreline", () => {
    const shoreline = toMultiPolygon([clockwise(0, 0, 10, 10)]);
    const district = [clockwise(5, 5, 15, 12)];
    const clipped = clipToShoreline(district, shoreline);
    expect(area(clipped)).toBeCloseTo(25, 9);
    const inside = new RingIndex(clipped);
    expect(inside.contains(7, 7)).toBe(true);
    expect(inside.contains(12, 7)).toBe(false);
  });

  it("returns a district wholly inside the shoreline unchanged in area", () => {
    const shoreline = toMultiPolygon([clockwise(0, 0, 10, 10)]);
    const district = [clockwise(1, 1, 4, 4), counterclockwise(2, 2, 3, 3)];
    expect(area(clipToShoreline(district, shoreline))).toBeCloseTo(8, 9);
  });

  it("keeps a lake the shoreline leaves inside the state", () => {
    const shoreline = toMultiPolygon([clockwise(0, 0, 10, 10)]);
    const clipped = clipToShoreline(
      [clockwise(0, 0, 10, 10), counterclockwise(4, 4, 6, 6)],
      shoreline,
    );
    expect(area(clipped)).toBeCloseTo(100 - 4, 9);
  });
});
