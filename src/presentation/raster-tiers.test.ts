import { describe, expect, it } from "vitest";

import {
  advanceTierHysteresis,
  commitDecodedTier,
  createRasterTierLadder,
  createTierHysteresisState,
  createTierPaintState,
  ENVIRONMENT_TIER_LADDER,
  FIDELITY_ENVELOPE_MAX_PHYSICAL_WIDTH,
  isTierSwapPending,
  requestTierPaint,
  requiredDeviceWidthFor,
  requiresNativeDetailWidth,
  selectRasterTier,
  tierDetailWidth,
  TIER_STEP_DOWN_DELAY_MS,
  withinFidelityEnvelope,
  type RasterTier,
} from "./raster-tiers";

const ASPECT = 16 / 9;

function tier(width: number, extra: Partial<RasterTier> = {}): RasterTier {
  return {
    width,
    height: Math.round(width / ASPECT),
    path: `art/fake/plate_${width}.webp`,
    hash: `${width}`.padStart(64, "0"),
    derivation: "deterministic-downscale",
    ...extra,
  };
}

/** A complete production ladder: 1024 / 2048 / 3072 / 4096, one aspect. */
const PRODUCTION_LADDER = createRasterTierLadder(
  "env_production_plate_v1",
  ENVIRONMENT_TIER_LADDER.map((width) =>
    width === 4_096
      ? tier(width, { derivation: "native-master" })
      : tier(width),
  ),
);

describe("raster tier ladder", () => {
  it("orders tiers ascending regardless of how they were declared", () => {
    const ladder = createRasterTierLadder("env_x", [
      tier(3_072),
      tier(1_024),
      tier(2_048),
    ]);
    expect(ladder.tiers.map((entry) => entry.width)).toEqual([
      1_024, 2_048, 3_072,
    ]);
  });

  it("refuses a ladder whose tiers do not share one source aspect", () => {
    expect(() =>
      createRasterTierLadder("env_x", [
        tier(1_024),
        { ...tier(2_048), height: 1_144 },
      ]),
    ).toThrow("source aspect");
  });

  it("refuses two tiers at the same width", () => {
    expect(() =>
      createRasterTierLadder("env_x", [tier(2_048), tier(2_048)]),
    ).toThrow("two tiers at width");
  });

  it("refuses an upscale that will not say what detail it really carries", () => {
    expect(() =>
      createRasterTierLadder("env_x", [
        tier(2_048, { derivation: "upscaled-development-fixture" }),
      ]),
    ).toThrow("nativeDetailWidth");
  });

  it("refuses a downscale that claims to carry less detail than its pixels", () => {
    expect(() =>
      createRasterTierLadder("env_x", [
        tier(2_048, { nativeDetailWidth: 1_024 }),
      ]),
    ).toThrow("claims full native detail");
  });

  it("reports an upscale's real detail rather than its pixel width", () => {
    const upscale = tier(2_048, {
      derivation: "upscaled-development-fixture",
      nativeDetailWidth: 1_024,
    });
    expect(tierDetailWidth(upscale)).toBe(1_024);
    expect(tierDetailWidth(tier(2_048))).toBe(2_048);
  });

  it("accepts an external upscale derivative that declares its real detail", () => {
    // A master enlarged OUTSIDE this repository and knowingly approved. The
    // pixels are real and shippable; the detail behind them is not, and the
    // tier says where it stops.
    const ladder = createRasterTierLadder("env_x", [
      tier(2_048, {
        derivation: "external-upscale-derivative",
        nativeDetailWidth: 1_024,
      }),
    ]);
    expect(tierDetailWidth(ladder.tiers[0]!)).toBe(1_024);
  });

  it("refuses an external upscale derivative that will not say where detail stops", () => {
    expect(() =>
      createRasterTierLadder("env_x", [
        tier(2_048, { derivation: "external-upscale-derivative" }),
      ]),
    ).toThrow("nativeDetailWidth");
  });

  it("knows which derivations must declare their real detail", () => {
    expect(requiresNativeDetailWidth("external-upscale-derivative")).toBe(true);
    expect(requiresNativeDetailWidth("upscaled-development-fixture")).toBe(
      true,
    );
    expect(requiresNativeDetailWidth("deterministic-downscale")).toBe(false);
    expect(requiresNativeDetailWidth("native-master")).toBe(false);
  });
});

describe("raster tier selection", () => {
  const select = (paintedPlateCssWidth: number, devicePixelRatio: number) =>
    selectRasterTier(PRODUCTION_LADDER, {
      paintedPlateCssWidth,
      devicePixelRatio,
      viewport: { width: paintedPlateCssWidth, height: 1_080 },
    });

  it("chooses the smallest tier at or above the required device width", () => {
    expect(select(1_000, 1).tier.width).toBe(1_024);
    expect(select(1_100, 1).tier.width).toBe(2_048);
    expect(select(2_100, 1).tier.width).toBe(3_072);
    expect(select(3_100, 1).tier.width).toBe(4_096);
  });

  it("treats an exact tier width as sufficient rather than stepping up", () => {
    for (const width of ENVIRONMENT_TIER_LADDER) {
      const selection = select(width, 1);
      expect(selection.tier.width, `exact ${width}`).toBe(width);
      expect(selection.requiredDeviceWidth).toBe(width);
      expect(selection.effectiveSourceCoverage).toBe(1);
      expect(selection.sufficient).toBe(true);
      expect(selection.warnings).toEqual([]);
    }
  });

  it("steps up for one device pixel beyond a tier boundary", () => {
    const selection = select(1_024 + 1 / 1_000, 1);
    expect(selection.tier.width).toBe(2_048);
  });

  it("multiplies by the device pixel ratio, including fractional ratios", () => {
    expect(select(1_440, 1).tier.width).toBe(2_048);
    expect(select(1_440, 1.25).tier.width).toBe(2_048); // 1800
    expect(select(1_440, 1.5).tier.width).toBe(3_072); // 2160
    expect(select(1_440, 2).tier.width).toBe(3_072); // 2880
    expect(select(1_440, 2).requiredDeviceWidth).toBe(2_880);
  });

  it("covers a 4K panel from the top tier without a warning", () => {
    // A 3840-wide panel needs ~3867 device px through the office camera; the
    // 4096 tier is exactly why 4096 is the top of the ladder.
    const selection = select(3_867, 1);
    expect(selection.tier.width).toBe(4_096);
    expect(selection.sufficient).toBe(true);
    expect(selection.warnings).toEqual([]);
  });

  it("warns with the shortfall, viewport and DPR when nothing reaches the requirement", () => {
    const selection = selectRasterTier(PRODUCTION_LADDER, {
      paintedPlateCssWidth: 2_580,
      devicePixelRatio: 2,
      viewport: { width: 2_560, height: 1_440 },
    });
    expect(selection.tier.width).toBe(4_096);
    expect(selection.sufficient).toBe(false);
    const warning = selection.warnings.find(
      (entry) => entry.code === "raster-tier-under-resolved",
    );
    expect(warning).toBeDefined();
    expect(warning!.assetId).toBe("env_production_plate_v1");
    expect(warning!.shortfallRatio).toBeCloseTo(5_160 / 4_096, 6);
    expect(warning!.viewport).toEqual({ width: 2_560, height: 1_440 });
    expect(warning!.devicePixelRatio).toBe(2);
    expect(warning!.message).toContain("2560x1440");
    expect(warning!.message).toContain("DPR 2");
  });

  it("warns when the chosen tier carries less detail than its pixel width claims", () => {
    // The shipped office fixture: a 2048 file that is a 2x resample of 1024.
    const fixtureLadder = createRasterTierLadder("env_office_fixture_v1", [
      tier(1_024, { derivation: "native-master" }),
      tier(2_048, {
        derivation: "upscaled-development-fixture",
        nativeDetailWidth: 1_024,
      }),
    ]);
    const selection = selectRasterTier(fixtureLadder, {
      paintedPlateCssWidth: 1_611,
      devicePixelRatio: 1,
      viewport: { width: 1_440, height: 900 },
    });
    expect(selection.tier.width).toBe(2_048);
    // The ladder "qualifies" on pixel width, so there is no W7 shortfall...
    expect(
      selection.warnings.some(
        (entry) => entry.code === "raster-tier-under-resolved",
      ),
    ).toBe(false);
    // ...but the plate is genuinely soft, and the runtime says so.
    const honest = selection.warnings.find(
      (entry) => entry.code === "raster-tier-detail-below-declared-width",
    );
    expect(honest).toBeDefined();
    expect(honest!.message).toContain("1024px of real detail");
    expect(selection.effectiveSourceCoverage).toBeCloseTo(1_024 / 1_611, 6);
    expect(selection.sufficient).toBe(false);
  });

  it("rejects a non-positive painted width or device pixel ratio", () => {
    expect(() =>
      selectRasterTier(PRODUCTION_LADDER, {
        paintedPlateCssWidth: 0,
        devicePixelRatio: 1,
      }),
    ).toThrow("positive painted width");
  });
});

describe("supported fidelity envelope", () => {
  it("guarantees no-upscale fidelity through 4096 required device pixels", () => {
    expect(FIDELITY_ENVELOPE_MAX_PHYSICAL_WIDTH).toBe(4_096);
    expect(withinFidelityEnvelope(3_840)).toBe(true);
    expect(withinFidelityEnvelope(4_096)).toBe(true);
    expect(withinFidelityEnvelope(5_120)).toBe(false);
  });

  /**
   * The envelope is a statement about the plate the camera paints, not about
   * the panel. On a viewport taller than the plate aspect the cover-fit camera
   * paints wider than the screen, so a 3840-wide panel can still fall outside.
   */
  it("measures the requirement from the painted plate, not from the panel", () => {
    expect(requiredDeviceWidthFor(1_933, 2)).toBe(3_866);
    expect(withinFidelityEnvelope(requiredDeviceWidthFor(1_933, 2))).toBe(true);
    expect(requiredDeviceWidthFor(2_148, 2)).toBe(4_296);
    expect(withinFidelityEnvelope(requiredDeviceWidthFor(2_148, 2))).toBe(
      false,
    );
  });

  /**
   * Every mainstream display the game meets is served by the same 4096 file,
   * whatever mix of CSS size and DPR the operating system chooses, because the
   * physical pixel count is what the requirement is made of.
   */
  it("serves one panel from one tier however its DPR is spent", () => {
    const panel = 3_840;
    for (const [cssWidth, dpr] of [
      [3_840, 1],
      [1_920, 2],
      [2_560, 1.5],
    ] as const) {
      expect(cssWidth * dpr).toBe(panel);
      const selection = selectRasterTier(PRODUCTION_LADDER, {
        paintedPlateCssWidth: cssWidth,
        devicePixelRatio: dpr,
      });
      expect(selection.tier.width, `${cssWidth}@${dpr}`).toBe(4_096);
      expect(selection.sufficient).toBe(true);
    }
  });
});

describe("tier hysteresis", () => {
  it("steps up immediately", () => {
    const state = createTierHysteresisState(1_024);
    const next = advanceTierHysteresis(state, 2_048, 1_000);
    expect(next.committedWidth).toBe(2_048);
    expect(next.stepDownSince).toBeNull();
  });

  it("holds the larger tier until the smaller one has been enough for 250 ms", () => {
    let state = createTierHysteresisState(2_048);
    state = advanceTierHysteresis(state, 1_024, 1_000);
    expect(state.committedWidth).toBe(2_048);
    state = advanceTierHysteresis(
      state,
      1_024,
      1_000 + TIER_STEP_DOWN_DELAY_MS - 1,
    );
    expect(state.committedWidth).toBe(2_048);
    state = advanceTierHysteresis(
      state,
      1_024,
      1_000 + TIER_STEP_DOWN_DELAY_MS,
    );
    expect(state.committedWidth).toBe(1_024);
  });

  it("restarts the step-down clock when the window stops shrinking", () => {
    let state = createTierHysteresisState(2_048);
    state = advanceTierHysteresis(state, 1_024, 1_000);
    state = advanceTierHysteresis(state, 2_048, 1_100);
    expect(state.stepDownSince).toBeNull();
    state = advanceTierHysteresis(state, 1_024, 1_150);
    state = advanceTierHysteresis(
      state,
      1_024,
      1_150 + TIER_STEP_DOWN_DELAY_MS - 1,
    );
    expect(state.committedWidth).toBe(2_048);
  });

  it("does not thrash while a window is dragged across a boundary", () => {
    let state = createTierHysteresisState(2_048);
    let now = 0;
    const committed: number[] = [];
    for (let frame = 0; frame < 20; frame += 1) {
      now += 16;
      state = advanceTierHysteresis(
        state,
        frame % 2 === 0 ? 1_024 : 2_048,
        now,
      );
      committed.push(state.committedWidth);
    }
    expect(new Set(committed)).toEqual(new Set([2_048]));
  });
});

describe("decode before swap", () => {
  it("keeps painting the current raster until the replacement decodes", () => {
    let paint = createTierPaintState(1_024);
    paint = requestTierPaint(paint, 2_048);
    expect(paint.paintedWidth).toBe(1_024);
    expect(paint.requestedWidth).toBe(2_048);
    expect(isTierSwapPending(paint)).toBe(true);

    paint = commitDecodedTier(paint, 2_048);
    expect(paint.paintedWidth).toBe(2_048);
    expect(isTierSwapPending(paint)).toBe(false);
  });

  it("ignores a decode the runtime has already moved past", () => {
    let paint = createTierPaintState(1_024);
    paint = requestTierPaint(paint, 2_048);
    paint = requestTierPaint(paint, 3_072);
    paint = commitDecodedTier(paint, 2_048);
    expect(paint.paintedWidth).toBe(1_024);
    paint = commitDecodedTier(paint, 3_072);
    expect(paint.paintedWidth).toBe(3_072);
  });

  it("never reports an empty raster mid-resize", () => {
    let paint = createTierPaintState(1_024);
    for (const width of [2_048, 3_072, 4_096, 2_048]) {
      paint = requestTierPaint(paint, width);
      expect(paint.paintedWidth).toBeGreaterThan(0);
    }
  });
});
