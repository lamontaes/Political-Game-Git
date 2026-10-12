import { describe, expect, it } from "vitest";

import {
  ENVIRONMENT_MASTER_MINIMUM_WIDTH,
  ENVIRONMENT_MASTER_RECOMMENDED_WIDTH,
  evaluateEnvironmentMaster,
  evaluateMasterDimensions,
  masterRequirementFor,
  SEATED_BODY_MASTER_MINIMUM,
  STANDING_BODY_MASTER_MINIMUM,
} from "./component-masters";

describe("component master minimums", () => {
  it("holds a standing body to 1696x2528 and a seated body to 1530x2048", () => {
    expect(masterRequirementFor("body", "standing-neutral")).toBe(
      STANDING_BODY_MASTER_MINIMUM,
    );
    expect(masterRequirementFor("body", "seated-at-desk")).toBe(
      SEATED_BODY_MASTER_MINIMUM,
    );
  });

  it("accepts a master that meets its class contract", () => {
    const verdict = evaluateMasterDimensions(
      "body",
      { width: 1_696, height: 2_528, hasAlpha: true },
      "standing-neutral",
    );
    expect(verdict.accepted).toBe(true);
    expect(verdict.reasons).toEqual([]);
    expect(verdict.requiredUpscaleFactor).toBe(1);
  });

  /**
   * ACCEPTANCE: a deliberately undersized garment or hair source is rejected by
   * intake. The pipeline never enlarges a master; it says how far short the
   * file falls and refuses it.
   */
  it("rejects an undersized garment master instead of enlarging it", () => {
    const verdict = evaluateMasterDimensions("top", {
      width: 243,
      height: 218,
      hasAlpha: true,
    });
    expect(verdict.accepted).toBe(false);
    expect(verdict.reasons.join(" ")).toContain("long edge 243px");
    expect(verdict.reasons.join(" ")).toContain("1024px minimum");
    expect(verdict.requiredUpscaleFactor).toBeCloseTo(1_024 / 243, 6);
  });

  /**
   * The nine banked PG-HAIR_SHORT_* authorities measure 247-318px on the long
   * edge. They were hoped to close the masculine-hair gap by intake alone; at
   * this size they cannot, and the contract says so rather than upscaling them
   * into the library.
   */
  it("rejects the banked short-hair authorities at their measured size", () => {
    for (const [label, width, height] of [
      ["BUZZ", 247, 204],
      ["SIDE_PART", 265, 226],
      ["SHORT_AFRO", 318, 294],
    ] as const) {
      const verdict = evaluateMasterDimensions("hair-front", {
        width,
        height,
        hasAlpha: true,
      });
      expect(verdict.accepted, label).toBe(false);
      expect(verdict.requiredUpscaleFactor, label).toBeGreaterThan(3);
    }
  });

  /** The banked wavy front/back pair measures 1001x1024 and does clear it. */
  it("accepts the banked wavy hair pair at its measured size", () => {
    for (const kind of ["hair-front", "hair-back"] as const) {
      const verdict = evaluateMasterDimensions(kind, {
        width: 1_001,
        height: 1_024,
        hasAlpha: true,
      });
      expect(verdict.accepted, kind).toBe(true);
    }
  });

  it("rejects a standing body master that is wide enough but too short", () => {
    // PG-P01_STANDING_A_POSE_TRANSPARENT_MASTER measures 1926x2048.
    const verdict = evaluateMasterDimensions(
      "body",
      { width: 1_926, height: 2_048, hasAlpha: true },
      "standing-neutral",
    );
    expect(verdict.accepted).toBe(false);
    expect(verdict.reasons).toHaveLength(1);
    expect(verdict.reasons[0]).toContain("height 2048px");
    expect(verdict.reasons[0]).toContain("2528px minimum");
  });

  it("rejects a head that is large enough but not square", () => {
    const verdict = evaluateMasterDimensions("head", {
      width: 1_536,
      height: 1_024,
      hasAlpha: true,
    });
    expect(verdict.accepted).toBe(false);
    expect(verdict.reasons.join(" ")).toContain("aspect");
  });

  it("rejects a master with no usable alpha where transparency is required", () => {
    // PG-RIGFIT_B_AVERAGE_MASCULINE_PASS is RGB with no alpha channel.
    const verdict = evaluateMasterDimensions(
      "body",
      { width: 1_024, height: 1_536, hasAlpha: false },
      "standing-neutral",
    );
    expect(verdict.accepted).toBe(false);
    expect(verdict.reasons.join(" ")).toContain("transparent background");
  });

  it("says nothing about alpha when alpha was not measured", () => {
    const verdict = evaluateMasterDimensions("footwear", {
      width: 2_048,
      height: 1_024,
    });
    expect(verdict.accepted).toBe(true);
  });
});

describe("environment master minimums", () => {
  it("refuses a background master below the absolute floor", () => {
    const verdict = evaluateEnvironmentMaster({ width: 1_376, height: 768 });
    expect(verdict.accepted).toBe(false);
    expect(verdict.reasons.join(" ")).toContain(
      `${ENVIRONMENT_MASTER_MINIMUM_WIDTH}px absolute minimum`,
    );
  });

  it("accepts a master above the floor and flags whether it meets the recommendation", () => {
    const marginal = evaluateEnvironmentMaster({ width: 4_800, height: 2_700 });
    expect(marginal.accepted).toBe(true);
    expect(marginal.meetsRecommendation).toBe(false);

    // The banked 5376x3024 title tableaux and the 5568x3008 Firefly office.
    for (const width of [5_376, 5_568]) {
      const good = evaluateEnvironmentMaster({ width, height: 3_024 });
      expect(good.accepted, `${width}`).toBe(true);
      expect(good.meetsRecommendation, `${width}`).toBe(true);
      expect(width).toBeGreaterThanOrEqual(
        ENVIRONMENT_MASTER_RECOMMENDED_WIDTH,
      );
    }
  });

  it("refuses the prompt30 office lineage as a production master", () => {
    expect(
      evaluateEnvironmentMaster({ width: 1_024, height: 572 }).accepted,
    ).toBe(false);
    // ...including the 2048 file, which carries no more real detail.
    expect(
      evaluateEnvironmentMaster({ width: 2_048, height: 1_144 }).accepted,
    ).toBe(false);
  });
});
