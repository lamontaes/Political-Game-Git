import { describe, expect, it } from "vitest";

import {
  armLengthRatio,
  cleanOutline,
  composeOver,
  createRaster,
  fitLayer,
  measureFigure,
  placeOnCanvas,
  recolorRegion,
  rgbToLab,
  rowRuns,
  type RgbaRaster,
} from "../src/presentation/contour-fit";
import {
  contourFitBodies,
  contourFitPacks,
} from "../src/presentation/contour-fit-packs";

/**
 * Synthetic figures with known geometry: a round head, a neck, a torso, two
 * arms that join the torso at the shoulder and hang clear of it below, and two
 * legs. Every width is a parameter so the same shapes can be made lean or wide.
 */
interface Shape {
  readonly torso: readonly [number, number];
  readonly leftArm: readonly [number, number];
  readonly rightArm: readonly [number, number];
  readonly leftLeg: readonly [number, number];
  readonly rightLeg: readonly [number, number];
}

const W = 220;
const H = 400;

function paint(
  raster: RgbaRaster,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  rgba: readonly [number, number, number, number],
) {
  for (let y = y0; y < y1; y += 1)
    for (let x = x0; x <= x1; x += 1) {
      const i = (y * raster.width + x) * 4;
      (raster.data as Uint8ClampedArray).set(rgba, i);
    }
}

function figure(shape: Shape): RgbaRaster {
  const r = createRaster(W, H);
  const skin = [200, 150, 110, 255] as const;
  for (let y = 12; y < 48; y += 1) {
    const half = Math.floor(Math.sqrt(Math.max(0, 18 ** 2 - (y - 30) ** 2)));
    paint(r, 110 - half, 110 + half, y, y + 1, skin);
  }
  paint(r, 102, 118, 48, 60, skin);
  paint(r, shape.leftArm[0], shape.rightArm[1], 60, 80, skin);
  paint(r, shape.torso[0], shape.torso[1], 80, 200, skin);
  paint(r, shape.leftArm[0], shape.leftArm[1], 80, 230, skin);
  paint(r, shape.rightArm[0], shape.rightArm[1], 80, 230, skin);
  paint(r, shape.leftLeg[0], shape.leftLeg[1], 200, 390, skin);
  paint(r, shape.rightLeg[0], shape.rightLeg[1], 200, 390, skin);
  return r;
}

const AVERAGE: Shape = {
  torso: [70, 150],
  leftArm: [50, 64],
  rightArm: [156, 170],
  leftLeg: [72, 107],
  rightLeg: [113, 148],
};
const WIDE: Shape = {
  torso: [55, 165],
  leftArm: [20, 36],
  rightArm: [184, 200],
  leftLeg: [58, 106],
  rightLeg: [114, 162],
};

/** A shirt painted on AVERAGE: torso plus sleeves to row 150, 4 px of ease. */
function shirtOn(shape: Shape): RgbaRaster {
  const r = createRaster(W, H);
  const cloth = [40, 60, 110, 255] as const;
  paint(r, shape.leftArm[0] - 4, shape.rightArm[1] + 4, 58, 80, cloth);
  paint(r, shape.torso[0] - 4, shape.torso[1] + 4, 80, 190, cloth);
  paint(r, shape.leftArm[0] - 4, shape.leftArm[1] + 4, 80, 150, cloth);
  paint(r, shape.rightArm[0] - 4, shape.rightArm[1] + 4, 80, 150, cloth);
  return r;
}

function opaqueSpan(raster: RgbaRaster, y: number) {
  const runs = rowRuns(raster, y);
  return runs;
}

describe("measureFigure", () => {
  it("reads the landmarks and follows each arm from the silhouette", () => {
    const m = measureFigure(figure(AVERAGE));
    // Row 12 is the head's one-pixel tip, under the four-pixel minimum run.
    expect(m.top).toBe(13);
    expect(m.sole).toBe(389);
    expect(m.neckBase).toBe(60);
    expect(m.armSplit).toBe(80);
    expect(m.crotch).toBe(200);
    expect(m.handTip).toBe(229);
    const kinds = m.kinds[120];
    expect(kinds).toEqual(["L", "C", "R"]);
    expect(m.rows[120][0]).toEqual({ lo: 50, hi: 64 });
    // Below the hands only the legs remain, and they are body, not arm.
    expect(m.kinds[300]).toEqual(["C", "C"]);
  });

  it("keeps an arm's width where it touches the body for a few rows", () => {
    const r = figure(AVERAGE);
    // Close the gap between the left arm and the torso for 10 rows.
    paint(r, 64, 70, 140, 150, [200, 150, 110, 255]);
    const m = measureFigure(r);
    const at = m.rows[145].map((run, i) => ({ run, kind: m.kinds[145][i] }));
    const left = at.find((p) => p.kind === "L");
    expect(left?.run.hi).toBeLessThan(70);
    expect(at.some((p) => p.kind === "C" && p.run.lo <= 72)).toBe(true);
  });

  it("reports the hand length so touching hands can be followed", () => {
    const ratio = armLengthRatio(measureFigure(figure(AVERAGE)));
    expect(ratio).toBeCloseTo((229 - 80) / (200 - 80), 5);
  });
});

describe("fitLayer", () => {
  it("fits a shirt painted on one body to a wider body, torso and sleeves", () => {
    const source = measureFigure(figure(AVERAGE));
    const target = measureFigure(figure(WIDE));
    const fitted = fitLayer(shirtOn(AVERAGE), source, target, { ease: 4 });
    const row = opaqueSpan(fitted, 120);
    // Left sleeve on the left arm, torso on the torso, right sleeve on the right arm.
    expect(row).toHaveLength(3);
    expect(Math.abs(row[0].lo - (WIDE.leftArm[0] - 4))).toBeLessThanOrEqual(1);
    expect(Math.abs(row[0].hi - (WIDE.leftArm[1] + 4))).toBeLessThanOrEqual(1);
    expect(Math.abs(row[1].lo - (WIDE.torso[0] - 4))).toBeLessThanOrEqual(1);
    expect(Math.abs(row[1].hi - (WIDE.torso[1] + 4))).toBeLessThanOrEqual(1);
    expect(Math.abs(row[2].hi - (WIDE.rightArm[1] + 4))).toBeLessThanOrEqual(1);
    // Nothing is painted in the open gap between arm and torso.
    const gapX = Math.round((WIDE.leftArm[1] + WIDE.torso[0]) / 2);
    expect(fitted.data[(120 * W + gapX) * 4 + 3]).toBe(0);
    // Sleeves end where the painted sleeves end; the forearm stays bare.
    expect(opaqueSpan(fitted, 200)).toHaveLength(0);
  });

  it("carries the painted detail with the geometry", () => {
    const source = measureFigure(figure(AVERAGE));
    const target = measureFigure(figure(WIDE));
    const shirt = shirtOn(AVERAGE);
    // A pocket: a lighter square at the torso center.
    paint(shirt, 100, 119, 100, 120, [200, 210, 230, 255]);
    const fitted = fitLayer(shirt, source, target, { ease: 4 });
    const center = (110 * W + 110) * 4;
    expect(fitted.data[center]).toBeGreaterThan(150);
    const edge = (110 * W + WIDE.torso[0] + 5) * 4;
    expect(fitted.data[edge]).toBeLessThan(80);
  });

  it("refuses a layer that is not on the source body canvas", () => {
    const source = measureFigure(figure(AVERAGE));
    expect(() => fitLayer(createRaster(10, 10), source, source)).toThrow(
      /source body canvas/,
    );
  });
});

describe("placement and composition", () => {
  it("places a cropped component by anchor and origin", () => {
    const part = createRaster(20, 10);
    paint(part, 0, 19, 0, 10, [10, 20, 30, 255]);
    const placed = placeOnCanvas(
      part,
      { width: 100, height: 200 },
      { x: 0.5, y: 0.25 },
      { x: 0.5, y: 0 },
    );
    expect(rowRuns(placed, 50, 128).length).toBe(1);
    expect(rowRuns(placed, 50)[0]).toEqual({ lo: 40, hi: 59 });
    expect(placed.data[(49 * 100 + 50) * 4 + 3]).toBe(0);
  });

  it("composes straight-alpha layers in order", () => {
    const a = createRaster(2, 1);
    const b = createRaster(2, 1);
    paint(a, 0, 1, 0, 1, [255, 0, 0, 255]);
    paint(b, 0, 0, 0, 1, [0, 0, 255, 255]);
    const out = composeOver(a, b);
    expect(Array.from(out.data)).toEqual([0, 0, 255, 255, 255, 0, 0, 255]);
  });
});

describe("recolorRegion", () => {
  it("moves the base color and keeps every light and shadow and the alpha", () => {
    const r = createRaster(3, 1);
    paint(r, 0, 0, 0, 1, [90, 90, 95, 255]);
    paint(r, 1, 1, 0, 1, [120, 120, 125, 200]);
    paint(r, 2, 2, 0, 1, [160, 160, 165, 255]);
    const out = recolorRegion(r, () => true, "#8a2030");
    const l = [0, 1, 2].map(
      (i) =>
        rgbToLab(out.data[i * 4], out.data[i * 4 + 1], out.data[i * 4 + 2])[0],
    );
    expect(l[0]).toBeLessThan(l[1]);
    expect(l[1]).toBeLessThan(l[2]);
    expect(out.data[1 * 4 + 3]).toBe(200);
    // Now red, not gray.
    expect(out.data[4]).toBeGreaterThan(out.data[6] + 30);
  });
});

describe("cleanOutline", () => {
  it("darkens a light matte on the outline and never changes alpha", () => {
    const r = createRaster(20, 20);
    paint(r, 2, 17, 2, 18, [240, 240, 240, 255]);
    paint(r, 5, 14, 5, 15, [60, 40, 30, 255]);
    const out = cleanOutline(r, 3, 60);
    for (let i = 3; i < out.data.length; i += 4)
      expect(out.data[i]).toBe(r.data[i]);
    expect(out.data[(2 * 20 + 10) * 4]).toBe(60);
    expect(out.data[(10 * 20 + 10) * 4]).toBe(60);
  });
});

describe("contour-fit packs", () => {
  it("finds the Wave A runtime bodies and complete private dressed packs", () => {
    const base = "../../art/generated/candidates";
    const urls: Record<string, string> = {
      [`${base}/wave-a-runtime/wave_a_fat_man_standing_neutral_front_a_v1_rt960.png`]:
        "fat",
      [`${base}/wave-a-runtime/wave_a_skinny_man_standing_neutral_front_a_v1_rt960.png`]:
        "skinny",
      [`${base}/wave-a-runtime/wave_a_skinny_woman_standing_neutral_front_a_v1_rt960.png`]:
        "skinny-w",
      [`${base}/wave-a-runtime/wave_a_skinny_man_standing_neutral_front_b_v1_rt960.png`]:
        "b-pose",
      [`${base}/art-desk/contour-fit/navy/dressed.png`]: "dressed",
      [`${base}/art-desk/contour-fit/navy/2-shirt.png`]: "shirt",
      [`${base}/art-desk/contour-fit/navy/1-shoes.png`]: "shoes",
      [`${base}/art-desk/contour-fit/empty/dressed.png`]: "lonely",
    };
    expect(contourFitBodies(urls).map((b) => [b.label, b.sex])).toEqual([
      ["lean man", "masc"],
      ["heavy man", "masc"],
      ["lean woman", "fem"],
    ]);
    expect(contourFitPacks(urls)).toEqual([
      {
        id: "navy",
        dressedUrl: "dressed",
        layers: [
          { name: "1-shoes", url: "shoes" },
          { name: "2-shirt", url: "shirt" },
        ],
      },
    ]);
  });
});
