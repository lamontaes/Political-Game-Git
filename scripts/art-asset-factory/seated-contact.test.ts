import { describe, expect, it } from "vitest";

import {
  SEATED_TURN_THRESHOLD,
  measuredTurnDirection,
  turnOffsetFraction,
} from "./seated-contact";

/**
 * The control the review lane asked for, as far as this repository can run it.
 *
 * Its ruling on reading a figure's facing off its own silhouette was that
 * centroid and width asymmetry are diagnostics and not orientation truth,
 * because translating an unchanged front-facing cutout moves its centroid. The
 * acceptance it asked for is a translated front pose as a negative control and
 * a genuinely authored turned pose as a positive control, in the same chair:
 * translation alone must not pass the orientation check.
 *
 * The geometric half of that runs here and is below. `turnOffsetFraction` is a
 * DIFFERENCE between two band centroids taken inside the figure's own alpha
 * bounds, so a translation moves both bands by the same number of pixels and
 * cancels. That is an argument until it is measured, so it is measured: the
 * same figure is shifted across the canvas and the offset has to come back
 * identical, not merely close.
 *
 * WHAT DOES NOT RUN HERE, said rather than quietly skipped. "In the same
 * chair" needs the chair and needs authored art, and the seated bank is
 * private to the owner's machine; these figures are drawn in code. So this
 * covers the failure mode the ruling named — a moved cutout reading as a
 * turned one — and does not cover a leaning figure, asymmetric clothing, or a
 * body whose head and shoulders communicate a turn the total centroid does not.
 * Those remain reasons the number is a diagnostic rather than a verdict, and
 * the module says so where it is defined.
 */

const WIDTH = 200;
const HEIGHT = 400;

interface Band {
  /** Rows, as fractions of canvas height. */
  readonly from: number;
  readonly to: number;
  /** Centre and width in pixels. */
  readonly centre: number;
  readonly width: number;
  /** Two runs with a gap between them, for legs. */
  readonly split?: boolean;
}

function draw(
  bands: readonly Band[],
  shiftX = 0,
): {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;
} {
  const data = new Uint8Array(WIDTH * HEIGHT * 4);
  for (const band of bands) {
    const y0 = Math.round(band.from * HEIGHT);
    const y1 = Math.round(band.to * HEIGHT);
    for (let y = y0; y < y1; y += 1) {
      for (let d = -band.width / 2; d < band.width / 2; d += 1) {
        const x = Math.round(band.centre + d + shiftX);
        if (x < 0 || x >= WIDTH) continue;
        if (band.split && Math.abs(d) < band.width / 6) continue;
        data[(y * WIDTH + x) * 4 + 3] = 255;
      }
    }
  }
  return { width: WIDTH, height: HEIGHT, data };
}

/** Head over the middle of the body; legs straight down. */
const SQUARE: readonly Band[] = [
  { from: 0, to: 0.18, centre: 100, width: 34 },
  { from: 0.18, to: 0.5, centre: 100, width: 60 },
  { from: 0.5, to: 1, centre: 100, width: 52, split: true },
];

/** The same head, with the lower body swung to one side. */
const TURNED: readonly Band[] = [
  { from: 0, to: 0.18, centre: 100, width: 34 },
  { from: 0.18, to: 0.5, centre: 112, width: 60 },
  { from: 0.5, to: 1, centre: 140, width: 52 },
];

describe("a shifted silhouette is not a turned body", () => {
  it("reads a square figure as square", () => {
    const offset = turnOffsetFraction(draw(SQUARE));
    expect(Math.abs(offset)).toBeLessThan(SEATED_TURN_THRESHOLD);
    expect(measuredTurnDirection(offset)).toBeNull();
  });

  it("NEGATIVE CONTROL: translating that figure changes nothing", () => {
    const still = turnOffsetFraction(draw(SQUARE));
    for (const shift of [-40, -12, 12, 40]) {
      const moved = turnOffsetFraction(draw(SQUARE, shift));
      // Identical, not close: a difference of centroids taken inside the
      // figure's own bounds has no term a translation can reach.
      expect(moved, `shifted ${shift}px`).toBe(still);
      expect(measuredTurnDirection(moved), `shifted ${shift}px`).toBeNull();
    }
  });

  it("POSITIVE CONTROL: a figure whose lower body swings reads as turned", () => {
    const offset = turnOffsetFraction(draw(TURNED));
    expect(Math.abs(offset)).toBeGreaterThan(SEATED_TURN_THRESHOLD);
    expect(measuredTurnDirection(offset)).not.toBeNull();
  });

  it("and stays turned, the same amount, wherever it is placed", () => {
    const still = turnOffsetFraction(draw(TURNED));
    for (const shift of [-30, 30]) {
      expect(
        turnOffsetFraction(draw(TURNED, shift)),
        `shifted ${shift}px`,
      ).toBe(still);
    }
  });
});
