import { describe, expect, it } from "vitest";
import manifest from "../../art/backdrops/manifest.json" with { type: "json" };
import surfaceData from "../../art/backdrops/surfaces.json" with { type: "json" };
import {
  PLACE_SURFACES,
  backdropSurfaceSlots,
  quadMatrix3d,
  type SurfaceQuad,
} from "./backdrop-surfaces";

/**
 * The painted-surface marks in art/backdrops/surfaces.json: every place
 * picture is covered, every mark was checked on every version of its picture,
 * and every corner lies inside the picture it was measured on.
 */

const KINDS = ["screen", "poster", "note", "paper", "brochure", "board"];
const FINISHES = ["cork", "whiteboard", "panel"];
const SHOWS = [
  "votes",
  "news",
  "candidates",
  "results",
  "plans",
  "bills",
  "programs",
];

interface ManifestRecord {
  readonly place: string;
  readonly variant: string;
  readonly file: string;
  readonly width: number;
  readonly height: number;
}

const PICTURES = (manifest.backdrops as readonly ManifestRecord[]).filter(
  (record) => !record.place.startsWith("state-capitol-"),
);
const PLACES = [...new Set(PICTURES.map((record) => record.place))].sort();

/** Twice the signed area; positive when the corners run clockwise on screen. */
function signedArea(quad: SurfaceQuad): number {
  let sum = 0;
  for (let index = 0; index < 4; index += 1) {
    const [x0, y0] = quad[index]!;
    const [x1, y1] = quad[(index + 1) % 4]!;
    sum += x0 * y1 - x1 * y0;
  }
  return sum;
}

function isConvex(quad: SurfaceQuad): boolean {
  let sign = 0;
  for (let index = 0; index < 4; index += 1) {
    const [ax, ay] = quad[index]!;
    const [bx, by] = quad[(index + 1) % 4]!;
    const [cx, cy] = quad[(index + 2) % 4]!;
    const cross = (bx - ax) * (cy - by) - (by - ay) * (cx - bx);
    if (cross === 0) continue;
    if (sign === 0) sign = Math.sign(cross);
    else if (Math.sign(cross) !== sign) return false;
  }
  return true;
}

function isRectangle(quad: SurfaceQuad): boolean {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = quad;
  return y0 === y1 && y2 === y3 && x0 === x3 && x1 === x2;
}

describe("the painted surfaces marked on the place pictures", () => {
  it("covers every place picture except the capitol exteriors, and nothing else", () => {
    expect(Object.keys(PLACE_SURFACES).sort()).toEqual(PLACES);
    expect(surfaceData.schema).toBe("ocd-place-surfaces/v1");
  });

  it("was checked on every version of each picture", () => {
    for (const place of PLACES) {
      const files = PICTURES.filter((record) => record.place === place)
        .map((record) => record.file)
        .sort();
      expect([...PLACE_SURFACES[place]!.checked].sort(), place).toEqual(files);
    }
  });

  it("gives every surface a unique id, a known kind, finish and purpose", () => {
    const ids = new Set<string>();
    for (const [place, record] of Object.entries(PLACE_SURFACES)) {
      for (const surface of record.surfaces) {
        expect(ids.has(surface.id), surface.id).toBe(false);
        ids.add(surface.id);
        expect(surface.id.startsWith(`${place}-`), surface.id).toBe(true);
        expect(KINDS, surface.id).toContain(surface.kind);
        expect(FINISHES, surface.id).toContain(surface.finish);
        for (const shows of surface.shows)
          expect(SHOWS, surface.id).toContain(shows);
        expect(surface.what.length, surface.id).toBeGreaterThan(0);
      }
    }
    expect(ids.size).toBeGreaterThan(0);
  });

  it("keeps every corner of every surface inside the picture it sits on", () => {
    let checked = 0;
    for (const picture of PICTURES) {
      for (const slot of backdropSurfaceSlots(picture.place, picture.variant)) {
        for (const [x, y] of slot.quad) {
          expect(Number.isInteger(x) && Number.isInteger(y), slot.id).toBe(
            true,
          );
          expect(x, `${slot.id} on ${picture.file}`).toBeGreaterThanOrEqual(0);
          expect(y, `${slot.id} on ${picture.file}`).toBeGreaterThanOrEqual(0);
          expect(x, `${slot.id} on ${picture.file}`).toBeLessThanOrEqual(
            picture.width,
          );
          expect(y, `${slot.id} on ${picture.file}`).toBeLessThanOrEqual(
            picture.height,
          );
        }
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("orders corners top-left, top-right, bottom-right, bottom-left around a real face", () => {
    for (const record of Object.values(PLACE_SURFACES)) {
      for (const surface of record.surfaces) {
        const quads = [surface.quad, ...Object.values(surface.variants ?? {})];
        for (const quad of quads) {
          expect(signedArea(quad), surface.id).toBeGreaterThan(0);
          expect(isConvex(quad), surface.id).toBe(true);
          const [[, topLeftY], , , [, bottomLeftY]] = quad;
          expect(topLeftY, surface.id).toBeLessThan(bottomLeftY);
        }
        // "perspective" says the face is not a plain rectangle.
        expect(surface.perspective, surface.id).toBe(
          !isRectangle(surface.quad),
        );
      }
    }
  });
});

describe("a flat card drawn onto a painted face", () => {
  /** Applies a CSS matrix3d to a point, the way the browser does. */
  function apply(matrix: string, x: number, y: number): [number, number] {
    const m = matrix
      .slice("matrix3d(".length, -1)
      .split(",")
      .map((value) => Number(value));
    const w = m[3]! * x + m[7]! * y + m[15]!;
    return [
      (m[0]! * x + m[4]! * y + m[12]!) / w,
      (m[1]! * x + m[5]! * y + m[13]!) / w,
    ];
  }

  it("lands the card's four corners on the surface's four corners", () => {
    const quads: SurfaceQuad[] = [
      [
        [244, 217],
        [334, 220],
        [334, 345],
        [244, 345],
      ],
      [
        [0, 279],
        [123, 290],
        [123, 436],
        [0, 447],
      ],
      [
        [762, 317],
        [920, 317],
        [920, 411],
        [762, 411],
      ],
    ];
    for (const quad of quads) {
      const width = 200;
      const height = 120;
      const matrix = quadMatrix3d(quad, width, height);
      const corners: [number, number][] = [
        [0, 0],
        [width, 0],
        [width, height],
        [0, height],
      ];
      corners.forEach(([x, y], index) => {
        const [px, py] = apply(matrix, x, y);
        expect(px).toBeCloseTo(quad[index]![0], 3);
        expect(py).toBeCloseTo(quad[index]![1], 3);
      });
    }
  });
});
