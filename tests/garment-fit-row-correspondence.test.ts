import { describe, expect, it } from "vitest";

import type { ProjectedCharacterLayer } from "../src/presentation/character-components";
import { GARMENT_FIT_DEFAULT_BOUNDS } from "../src/presentation/garment-fit";
import {
  measureEdgeError,
  measureSourceProportion,
  type FitMetric,
  type FitRowCorrespondence,
  type RasterSpans,
} from "../scripts/art-asset-factory/garment-fit-measure";

const CANVAS = { width: 200, height: 1000 };
const SOURCE_TOP = 100;
const TARGET_TOP = 600;
const PAINT_HEIGHT = 200;

// The same visible shape appears in two canvases with different top padding.
// Its changing width makes the source ease row-dependent, rather than a single
// constant that could conceal a wrong row lookup.
function body(top: number): RasterSpans {
  return {
    ...CANVAS,
    rows: Array.from({ length: CANVAS.height }, (_, y) => {
      const within = y - top;
      if (within < 0 || within >= PAINT_HEIGHT) return null;
      const half = 40 + Math.floor(within / 50) * 5;
      return { lo: 100 - half, hi: 100 + half - 1 };
    }),
  };
}

const GARMENT: RasterSpans = {
  width: 140,
  height: PAINT_HEIGHT,
  rows: Array.from({ length: PAINT_HEIGHT }, () => ({ lo: 0, hi: 139 })),
};

function layer(top: number, dx = 0): ProjectedCharacterLayer {
  return {
    assetId: "row-map-control-top",
    kind: "top",
    slotId: "top",
    layer: 25,
    released: false,
    attachmentAnchorId: "torso",
    left: (30 + dx) / CANVAS.width,
    top: top / CANVAS.height,
    width: GARMENT.width / CANVAS.width,
    height: GARMENT.height / CANVAS.height,
    fit: null,
    fitRefusal: null,
  };
}

const MAPPING: FitRowCorrespondence = {
  sourcePoseFamily: "standing-neutral",
  targetPoseFamily: "standing-neutral",
  points: [
    { anchor: "shoulder", sourceY: 0.1, targetY: 0.6 },
    { anchor: "waist", sourceY: 0.2, targetY: 0.7 },
    { anchor: "hip", sourceY: 0.3, targetY: 0.8 },
  ],
};
const METRIC: FitMetric = {
  mode: "edge-match",
  fromRow: TARGET_TOP,
  toRow: TARGET_TOP + PAINT_HEIGHT - 1,
  anchors: ["shoulder", "waist", "hip"],
};
const SOURCE_EASE = measureSourceProportion(
  layer(SOURCE_TOP),
  GARMENT,
  body(SOURCE_TOP),
  CANVAS,
);

function measure(mapping: FitRowCorrespondence | undefined, dx = 0) {
  return measureEdgeError(
    layer(TARGET_TOP, dx),
    GARMENT,
    body(TARGET_TOP),
    CANVAS,
    METRIC,
    SOURCE_EASE,
    mapping,
  );
}

describe("explicit authored row correspondence", () => {
  it("rejects a narrow-region proportional failure even when a wider row has more pixel error", () => {
    const canvas = { width: 600, height: 4 };
    // Two wide shoulder rows and two narrow waist rows retain the required
    // four comparable rows. The source pairing has no extra ease.
    const body: RasterSpans = {
      ...canvas,
      rows: [
        { lo: 50, hi: 549 },
        { lo: 50, hi: 549 },
        { lo: 250, hi: 349 },
        { lo: 250, hi: 349 },
      ],
    };
    const projected = { ...layer(0), left: 0, top: 0, width: 1, height: 1 };
    const displaced: RasterSpans = {
      ...canvas,
      rows: body.rows.map((span, y) => ({
        lo: span!.lo + (y < 2 ? 8 : 4),
        hi: span!.hi + (y < 2 ? 8 : 4),
      })),
    };
    const result = measureEdgeError(
      projected,
      displaced,
      body,
      canvas,
      { ...METRIC, fromRow: 0, toRow: 3 },
      measureSourceProportion(projected, body, body, canvas),
    );
    expect(result.status).toBe("measured");
    expect(result.rowsCompared).toBe(4);
    expect(result.worstPx).toBe(8);
    expect(result.worstAtRow).toBe(0);
    // The old calculation returned 8/500 = 1.6%, concealing 4/100 = 4%.
    expect(result.worstFractionOfBodySpan).toBe(0.04);
    expect(result.worstFractionOfBodySpan).toBeGreaterThan(
      GARMENT_FIT_DEFAULT_BOUNDS.maxEdgeErrorFraction,
    );
    expect(GARMENT_FIT_DEFAULT_BOUNDS.maxEdgeErrorFraction).toBe(0.03);
  });

  it("preserves ease after padding changes without changing the legacy default", () => {
    const mapped = measure(MAPPING);
    expect(mapped.status).toBe("measured");
    expect(mapped.rowsCompared).toBe(PAINT_HEIGHT);
    expect(mapped.worstFractionOfBodySpan).toBe(0);
    expect(measure(undefined).status).toBe("insufficient-coverage");

    const original = measureEdgeError(
      layer(SOURCE_TOP),
      GARMENT,
      body(SOURCE_TOP),
      CANVAS,
      { ...METRIC, fromRow: SOURCE_TOP, toRow: SOURCE_TOP + PAINT_HEIGHT - 1 },
      SOURCE_EASE,
    );
    expect(original.status).toBe("measured");
    expect(mapped.worstFractionOfBodySpan).toBe(
      original.worstFractionOfBodySpan,
    );
  });

  it("rejects a correctly sized garment displaced sideways under the unchanged bound", () => {
    const displaced = measure(MAPPING, 10);
    expect(displaced.status).toBe("measured");
    expect(displaced.worstPx).toBe(10);
    expect(displaced.worstFractionOfBodySpan).toBeGreaterThan(
      GARMENT_FIT_DEFAULT_BOUNDS.maxEdgeErrorFraction,
    );
    expect(GARMENT_FIT_DEFAULT_BOUNDS.maxEdgeErrorFraction).toBe(0.03);
  });

  it("uses the enclosing authored interval when row spacing changes", () => {
    const target = {
      ...CANVAS,
      rows: Array.from({ length: CANVAS.height }, (_, y) =>
        y >= 520 && y <= 523 ? { lo: 50, hi: 149 } : null,
      ),
    };
    const result = measureEdgeError(
      { ...layer(400), height: 0.3 },
      GARMENT,
      target,
      CANVAS,
      { ...METRIC, fromRow: 520, toRow: 523 },
      SOURCE_EASE,
      {
        ...MAPPING,
        points: [
          { anchor: "shoulder", sourceY: 0.1, targetY: 0.4 },
          { anchor: "waist", sourceY: 0.2, targetY: 0.5 },
          { anchor: "hip", sourceY: 0.3, targetY: 0.7 },
        ],
      },
    );
    // These rows correspond to source 210..211.5 (100px body), not the
    // 180..182px obtained by discarding the middle authored point (90px body).
    expect(result.status).toBe("measured");
    expect(result.rowsCompared).toBe(4);
    expect(result.worstFractionOfBodySpan).toBe(0);
  });

  it.each([
    ["cross-pose", { ...MAPPING, targetPoseFamily: "seated-at-desk" }],
    ["undeclared pose", { ...MAPPING, sourcePoseFamily: "" }],
    ["one point", { ...MAPPING, points: MAPPING.points.slice(0, 1) }],
    ["reversed rows", { ...MAPPING, points: [...MAPPING.points].reverse() }],
    [
      "reversed source only",
      {
        ...MAPPING,
        points: MAPPING.points.map((point) => ({
          ...point,
          sourceY: 1 - point.sourceY,
        })),
      },
    ],
    [
      "duplicate row",
      {
        ...MAPPING,
        points: MAPPING.points.map((point) => ({ ...point, targetY: 0.6 })),
      },
    ],
    [
      "unnamed row",
      {
        ...MAPPING,
        points: MAPPING.points.map((point) => ({ ...point, anchor: "" })),
      },
    ],
    [
      "duplicate name",
      {
        ...MAPPING,
        points: MAPPING.points.map((point) => ({ ...point, anchor: "same" })),
      },
    ],
    [
      "nonfinite coordinate",
      {
        ...MAPPING,
        points: MAPPING.points.map((point) => ({ ...point, sourceY: NaN })),
      },
    ],
    [
      "outside canvas",
      {
        ...MAPPING,
        points: MAPPING.points.map((point) => ({ ...point, targetY: -1 })),
      },
    ],
  ] satisfies readonly (readonly [string, FitRowCorrespondence])[])(
    "refuses %s correspondence as invalid geometry",
    (_, mapping) => {
      const result = measure(mapping);
      expect(result.status).toBe("invalid-geometry");
      expect(result.rowsCompared).toBe(0);
      expect(result.statusReason).toMatch(/correspondence/);
    },
  );

  it.each([
    [0.602, 3],
    [0.62, 21],
  ])("does not extrapolate a mapping ending at %s", (end, compared) => {
    const result = measure({
      ...MAPPING,
      points: [
        MAPPING.points[0]!,
        { anchor: "hip", sourceY: end - 0.5, targetY: end },
      ],
    });
    expect(result.status).toBe("insufficient-coverage");
    expect(result.rowsCompared).toBe(compared);
    expect(result.rowsInWindow).toBe(PAINT_HEIGHT);
  });

  it.each(["garment", "body"])(
    "does not turn a blank %s into evidence",
    (kind) => {
      const result = measureEdgeError(
        layer(TARGET_TOP),
        kind === "garment"
          ? { ...GARMENT, rows: GARMENT.rows.map(() => null) }
          : GARMENT,
        kind === "body"
          ? { ...CANVAS, rows: body(TARGET_TOP).rows.map(() => null) }
          : body(TARGET_TOP),
        CANVAS,
        METRIC,
        SOURCE_EASE,
        MAPPING,
      );
      expect(result.status).toBe("invalid-geometry");
      expect(result.rowsCompared).toBe(0);
    },
  );

  it("does not invent ease when source paint is absent", () => {
    const result = measureEdgeError(
      layer(TARGET_TOP),
      GARMENT,
      body(TARGET_TOP),
      CANVAS,
      METRIC,
      new Map(),
      MAPPING,
    );
    expect(result.status).toBe("insufficient-coverage");
    expect(result.rowsCompared).toBe(0);
  });
});
