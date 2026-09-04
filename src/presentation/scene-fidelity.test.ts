import { describe, expect, it } from "vitest";

import {
  createRasterTierLadder,
  ENVIRONMENT_TIER_LADDER,
  selectRasterTier,
  tierDetailWidth,
  withinFidelityEnvelope,
  type RasterTierLadder,
} from "./raster-tiers";
import { OFFICE_FIXTURE_SCENE } from "./visual-integration";
import { resolveSceneTransform } from "./scene-transform";

/**
 * FIDELITY acceptance, kept deliberately separate from GEOMETRY acceptance.
 *
 * `scene-transform.test.ts` proves the camera: uniform scale, safe areas,
 * anchors, physical-pixel snapping. It passes at every preset and always has.
 * This file proves something the camera cannot fix — whether the RASTER being
 * painted actually carries the pixels the screen asked for.
 *
 * The distinction matters because the shipped office plate fails fidelity while
 * passing geometry, and conflating the two is how a plate spent months looking
 * soft with a green test suite.
 */

/** Every preset the production envelope must account for. */
const VIEWPORT_MATRIX = [
  { id: "1280x720", width: 1_280, height: 720 },
  { id: "1366x768", width: 1_366, height: 768 },
  { id: "1440x900", width: 1_440, height: 900 },
  { id: "1512x982-retina", width: 1_512, height: 982 },
  { id: "1600x900", width: 1_600, height: 900 },
  { id: "1920x1080", width: 1_920, height: 1_080 },
  { id: "1920x1200", width: 1_920, height: 1_200 },
  { id: "2560x1440", width: 2_560, height: 1_440 },
  { id: "2560x1600", width: 2_560, height: 1_600 },
  { id: "2560x1080-ultrawide", width: 2_560, height: 1_080 },
  { id: "3440x1440-ultrawide", width: 3_440, height: 1_440 },
  { id: "3840x2160-4k", width: 3_840, height: 2_160 },
] as const;

const DPR_MATRIX = [1, 1.25, 1.5, 2] as const;

/**
 * Phone portrait is a documented COMPATIBILITY OBSERVATION, not a shipping
 * target. It is asserted separately, below, so it can never be mistaken for a
 * supported preset by being sat in the main matrix.
 */
const PHONE_COMPATIBILITY_VIEWPORT = { width: 390, height: 844 } as const;

const PLATE = OFFICE_FIXTURE_SCENE.plate;
const CAMERA = OFFICE_FIXTURE_SCENE.camera;
const PLATE_ASPECT = PLATE.width / PLATE.height;

/**
 * The ladder a production plate of this aspect would register: four
 * deterministic downscales of one master, 1024 through 4096.
 */
const PRODUCTION_LADDER: RasterTierLadder = createRasterTierLadder(
  "env_production_office_v1",
  ENVIRONMENT_TIER_LADDER.map((width) => ({
    width,
    height: Math.round(width / PLATE_ASPECT),
    path: `art/families/council-staff-office/production_${width}.webp`,
    hash: `${width}`.padStart(64, "0"),
    derivation: width === 4_096 ? "native-master" : "deterministic-downscale",
  })),
);

/** The ladder the repository actually ships today, told truthfully. */
const FIXTURE_LADDER = OFFICE_FIXTURE_SCENE.raster!.ladder;

function paintedPlateCssWidth(viewport: {
  width: number;
  height: number;
}): number {
  return resolveSceneTransform(viewport, PLATE, CAMERA).renderedSceneWidth;
}

describe("raster fidelity across the supported viewport and DPR matrix", () => {
  for (const viewport of VIEWPORT_MATRIX) {
    for (const devicePixelRatio of DPR_MATRIX) {
      const physicalWidth = viewport.width * devicePixelRatio;
      const label = `${viewport.id} at DPR ${devicePixelRatio} (${physicalWidth} physical px)`;
      void physicalWidth;

      it(`${label} is served by the production ladder exactly as the envelope promises`, () => {
        const transform = resolveSceneTransform(
          viewport,
          PLATE,
          CAMERA,
          devicePixelRatio,
        );
        const selection = selectRasterTier(PRODUCTION_LADDER, {
          paintedPlateCssWidth: transform.renderedSceneWidth,
          devicePixelRatio,
          viewport,
        });

        // The requirement is exactly the painted plate times the DPR. No
        // safety multiplier: the margin is already in the tier ladder.
        expect(selection.requiredDeviceWidth).toBeCloseTo(
          transform.renderedSceneWidth * devicePixelRatio,
          9,
        );

        if (withinFidelityEnvelope(selection.requiredDeviceWidth)) {
          // THE ASSERTION 10A ASKED FOR: coverage is asserted, not computed
          // and discarded, and it is measured against the tier actually
          // selected rather than against the plate's coordinate space.
          expect(selection.sufficient, label).toBe(true);
          expect(selection.effectiveSourceCoverage).toBeGreaterThanOrEqual(1);
          expect(selection.warnings, label).toEqual([]);
          expect(tierDetailWidth(selection.tier)).toBe(selection.tier.width);
        } else {
          // Above the envelope the top tier is used and the shortfall is
          // reported. That is the documented behaviour, not a silent failure.
          expect(selection.tier.width).toBe(4_096);
          expect(
            selection.warnings.some(
              (warning) => warning.code === "raster-tier-under-resolved",
            ),
            label,
          ).toBe(true);
        }
      });
    }
  }

  /**
   * Physical width, not CSS width or DPR alone, is what decides the tier. A
   * 1920 CSS viewport at DPR 2 and a 3840 CSS viewport at DPR 1 are the same
   * panel and must resolve the same file.
   */
  it("resolves one panel to one tier however the operating system spends its DPR", () => {
    const byPanel = new Map<number, Set<number>>();
    for (const viewport of VIEWPORT_MATRIX) {
      for (const devicePixelRatio of DPR_MATRIX) {
        const physicalWidth = viewport.width * devicePixelRatio;
        const transform = resolveSceneTransform(
          viewport,
          PLATE,
          CAMERA,
          devicePixelRatio,
        );
        // Compare only same-aspect viewports, since a different crop changes
        // how much plate is painted for the same panel width.
        if (Math.abs(viewport.width / viewport.height - 16 / 9) > 0.001) {
          continue;
        }
        const selection = selectRasterTier(PRODUCTION_LADDER, {
          paintedPlateCssWidth: transform.renderedSceneWidth,
          devicePixelRatio,
          viewport,
        });
        const widths = byPanel.get(physicalWidth) ?? new Set<number>();
        widths.add(selection.tier.width);
        byPanel.set(physicalWidth, widths);
      }
    }
    for (const [panel, widths] of byPanel) {
      expect(widths.size, `panel ${panel}`).toBe(1);
    }
  });
});

describe("the shipped office fixture plate, measured honestly", () => {
  it("registers a 2048 file that carries only 1024 of real detail", () => {
    expect(FIXTURE_LADDER.tiers.map((entry) => entry.width)).toEqual([
      1_024, 2_048,
    ]);
    const top = FIXTURE_LADDER.tiers[1]!;
    expect(top.derivation).toBe("upscaled-development-fixture");
    expect(tierDetailWidth(top)).toBe(1_024);
  });

  /**
   * The fixture is genuinely soft from 1440x900 at DPR 1 upward. It passes
   * geometry everywhere and fails fidelity here, which is the whole point of
   * separating the two: the camera is sound and the ASSET is the problem.
   */
  it("fails fidelity from 1440x900 at DPR 1 upward, and says why", () => {
    const soft = { width: 1_440, height: 900 };
    const selection = selectRasterTier(FIXTURE_LADDER, {
      paintedPlateCssWidth: paintedPlateCssWidth(soft),
      devicePixelRatio: 1,
      viewport: soft,
    });
    expect(selection.sufficient).toBe(false);
    expect(
      selection.warnings.some(
        (warning) => warning.code === "raster-tier-detail-below-declared-width",
      ),
    ).toBe(true);
  });

  it("still serves a small window from real detail without a warning", () => {
    const small = { width: 900, height: 506 };
    const selection = selectRasterTier(FIXTURE_LADDER, {
      paintedPlateCssWidth: paintedPlateCssWidth(small),
      devicePixelRatio: 1,
      viewport: small,
    });
    expect(selection.sufficient).toBe(true);
    expect(selection.warnings).toEqual([]);
  });
});

describe("phone portrait as a documented non-target", () => {
  /**
   * At 390x844 the camera letterboxes the scene into a small band. It does not
   * crash and it does not stretch, but that is "it loads", not "it works", and
   * nothing in the supported matrix above claims otherwise.
   */
  it("letterboxes rather than distorting, and is not treated as supported", () => {
    const transform = resolveSceneTransform(
      PHONE_COMPATIBILITY_VIEWPORT,
      PLATE,
      CAMERA,
      3,
    );
    expect(transform.constrainedAxis).toBe("vertical");
    expect(transform.scaleX).toBe(transform.scaleY);
    expect(
      VIEWPORT_MATRIX.some(
        (preset) => preset.width === PHONE_COMPATIBILITY_VIEWPORT.width,
      ),
    ).toBe(false);
  });
});
