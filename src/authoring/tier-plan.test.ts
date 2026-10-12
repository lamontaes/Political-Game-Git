import { describe, expect, it } from "vitest";

import { createRasterTierLadder } from "../presentation/raster-tiers";
import { toCanonicalJson } from "./canonical-json";
import {
  planEnlargesAnything,
  planRuntimeTiers,
  tierHeightFor,
  type TierPlanMaster,
} from "./tier-plan";

function master(
  width: number,
  overrides: Partial<TierPlanMaster> = {},
): TierPlanMaster {
  return {
    assetId: "env_generic_hearing_room_01",
    width,
    height: Math.round((width * 9) / 16),
    nativeDetailWidth: width,
    masterPath: `art/masters/env_generic_hearing_room_01.png`,
    ...overrides,
  };
}

function plan(width: number, overrides: Partial<TierPlanMaster> = {}) {
  return planRuntimeTiers({
    master: master(width, overrides),
    outputDirectory: "art/generated/env_generic_hearing_room_01",
  });
}

describe("runtime tier derivation", () => {
  it("derives the full ladder from a master above the top tier", () => {
    const result = plan(5_120);
    expect(result.tiers.map((tier) => tier.width)).toEqual([
      1_024, 2_048, 3_072, 4_096,
    ]);
    expect(result.skipped).toHaveLength(0);
    expect(
      result.tiers.every((t) => t.derivation === "deterministic-downscale"),
    ).toBe(true);
  });

  it("preserves the source aspect at every tier", () => {
    const result = plan(5_120, { height: 2_160 }); // 21:9-ish
    const sourceAspect = 5_120 / 2_160;
    for (const tier of result.tiers) {
      expect(tier.width / tier.height).toBeCloseTo(sourceAspect, 2);
    }
    // And the ladder validator agrees, which is the contract that matters.
    expect(() =>
      createRasterTierLadder(
        result.assetId,
        result.tiers.map((tier) => ({
          width: tier.width,
          height: tier.height,
          path: tier.path,
          hash: "a".repeat(64),
          derivation: tier.derivation,
          ...(tier.nativeDetailWidth !== undefined
            ? { nativeDetailWidth: tier.nativeDetailWidth }
            : {}),
        })),
      ),
    ).not.toThrow();
  });

  it("never enlarges: a tier above the master is skipped, not synthesized", () => {
    const result = plan(3_000);
    expect(result.tiers.map((tier) => tier.width)).toEqual([
      1_024, 2_048, 3_000,
    ]);
    expect(result.skipped.map((tier) => tier.width)).toEqual([3_072, 4_096]);
    expect(result.skipped[0]!.reason).toBe("would-enlarge-master");
    expect(planEnlargesAnything(result)).toBe(false);
  });

  it("states the enlargement it declined to perform", () => {
    const result = plan(2_048);
    const skipped4k = result.skipped.find((tier) => tier.width === 4_096);
    expect(skipped4k?.enlargementFactorAvoided).toBeCloseTo(2, 5);
    expect(skipped4k?.message).toContain("2.00x");
  });

  it("reports the missing fidelity honestly when the ladder tops out low", () => {
    const result = plan(3_000);
    const warning = result.warnings.find(
      (entry) => entry.code === "ladder-top-below-envelope",
    );
    expect(warning).toBeDefined();
    expect(warning!.message).toContain("3000px");
  });

  it("keeps the master's own detail rather than discarding it for a round number", () => {
    // A 3000px master would otherwise top out at 2048 and throw away 950px.
    const result = plan(3_000);
    const top = result.tiers[result.tiers.length - 1]!;
    expect(top.width).toBe(3_000);
    expect(top.derivation).toBe("native-master");
  });

  it("derives no standard tier from a master below the smallest one", () => {
    const result = plan(800);
    // The master's own pixels, and nothing enlarged to meet a round number.
    expect(result.tiers.map((tier) => tier.width)).toEqual([800]);
    expect(result.tiers[0]!.derivation).toBe("native-master");
    expect(result.skipped.map((tier) => tier.width)).toEqual([
      1_024, 2_048, 3_072, 4_096,
    ]);
    expect(result.warnings.map((w) => w.code)).toContain(
      "master-below-smallest-tier",
    );
    expect(planEnlargesAnything(result)).toBe(false);
  });
});

describe("declared upscale lineage carried into the ladder", () => {
  it("marks tiers above the master's real detail as external upscale derivatives", () => {
    const result = plan(5_120, { nativeDetailWidth: 2_560 });
    const byWidth = new Map(result.tiers.map((tier) => [tier.width, tier]));

    // At or below the real detail, a plain honest downscale.
    expect(byWidth.get(1_024)!.derivation).toBe("deterministic-downscale");
    expect(byWidth.get(1_024)!.nativeDetailWidth).toBeUndefined();
    expect(byWidth.get(2_048)!.derivation).toBe("deterministic-downscale");

    // Above it, real pixels but not real detail — and it says so.
    expect(byWidth.get(4_096)!.derivation).toBe("external-upscale-derivative");
    expect(byWidth.get(4_096)!.nativeDetailWidth).toBe(2_560);
    expect(byWidth.get(3_072)!.nativeDetailWidth).toBe(2_560);
  });

  it("downscaling does not launder the lineage away", () => {
    const result = plan(5_120, { nativeDetailWidth: 2_560 });
    expect(result.bestAvailableDetailWidth).toBe(2_560);
    expect(result.warnings.map((w) => w.code)).toContain(
      "tier-detail-below-width",
    );
  });

  it("produces a ladder the runtime validator accepts", () => {
    const result = plan(5_120, { nativeDetailWidth: 2_560 });
    const ladder = createRasterTierLadder(
      result.assetId,
      result.tiers.map((tier) => ({
        width: tier.width,
        height: tier.height,
        path: tier.path,
        hash: "b".repeat(64),
        derivation: tier.derivation,
        ...(tier.nativeDetailWidth !== undefined
          ? { nativeDetailWidth: tier.nativeDetailWidth }
          : {}),
      })),
    );
    expect(ladder.tiers).toHaveLength(4);
  });

  it("flags an unverified master rather than treating its pixels as detail", () => {
    const result = plan(5_120, { nativeDetailWidth: null });
    expect(result.bestAvailableDetailWidth).toBeNull();
    expect(result.warnings.map((w) => w.code)).toContain(
      "native-detail-unverified",
    );
  });
});

describe("the master is preserved separately from the ladder", () => {
  it("refuses to write runtime tiers into the master's own directory", () => {
    expect(() =>
      planRuntimeTiers({
        master: master(5_120),
        outputDirectory: "art/masters",
      }),
    ).toThrow(/preserved separately/);
  });

  it("writes tiers under their own directory, leaving the master path alone", () => {
    const result = plan(5_120);
    expect(result.masterPath).toBe(
      "art/masters/env_generic_hearing_room_01.png",
    );
    for (const tier of result.tiers) {
      expect(tier.path).toMatch(
        /^art\/generated\/env_generic_hearing_room_01\//,
      );
      expect(tier.path).not.toBe(result.masterPath);
    }
  });

  it("rejects a declared detail width above the master's own width", () => {
    expect(() => plan(4_096, { nativeDetailWidth: 5_000 })).toThrow(
      /detail behind a 4096px master/,
    );
  });
});

describe("determinism", () => {
  it("produces byte-identical plans for the same master", () => {
    expect(toCanonicalJson(plan(5_120))).toBe(toCanonicalJson(plan(5_120)));
  });

  it("computes tier height from the source aspect", () => {
    expect(tierHeightFor({ width: 5_120, height: 2_880 }, 1_024)).toBe(576);
    expect(tierHeightFor({ width: 4_608, height: 2_048 }, 2_048)).toBe(910);
  });

  it("collapses a repeated requested width to one tier", () => {
    const result = planRuntimeTiers({
      master: master(5_120),
      requestedWidths: [1_024, 1_024, 2_048],
      outputDirectory: "art/generated/x",
    });
    expect(result.tiers.map((tier) => tier.width)).toEqual([1_024, 2_048]);
    expect(result.skipped).toHaveLength(0);
  });
});
