import { describe, expect, it } from "vitest";

import {
  createCharacterComponentLibrary,
  projectCharacterLayers,
  type CharacterCatalogData,
  type CharacterComponentDefinition,
  type CharacterComponentManifestRecord,
  type CharacterRecipe,
} from "./character-components";
import {
  boundsViolations,
  compileGarmentFitMatrix,
  compileWarpBands,
  createGarmentFitBank,
  transformShapeErrors,
  validateGarmentFitBounds,
  deriveAffineFit,
  deriveBoundedWarpFit,
  GARMENT_FIT_CATEGORY_ANCHORS,
  GARMENT_FIT_DEFAULT_BOUNDS,
  GARMENT_FIT_WARP_BAND_COUNT,
  isGarmentFitGoverned,
  resolveGarmentFit,
  validateGarmentFitBank,
  type BodyFitReference,
  type GarmentFitBankData,
  type GarmentFitBoundedWarp,
  GARMENT_FIT_BOUNDS_ENVELOPE,
} from "./garment-fit";

/**
 * The fit contract, checked without any pixels.
 *
 * `tests/garment-fit.test.ts` is the other half: it puts real rasters through
 * the real compositor and measures what came out. This file is the rules —
 * what resolves, what refuses, what is out of bounds — because a rule that is
 * only checked through a raster is a rule nobody can read.
 */

const CATALOG: CharacterCatalogData = {
  catalog_generation: 1,
  slots: [
    { slot_id: "body", kind: "body", required: true },
    { slot_id: "top", kind: "top", required: false },
    { slot_id: "footwear", kind: "footwear", required: false },
  ],
  generations: [],
};

const BODY_CANVAS = { width: 400, height: 800 } as const;
const ANCHORS = [
  { id: "head", x: 0.5, y: 0.12 },
  { id: "torso", x: 0.5, y: 0.16 },
  { id: "hips", x: 0.5, y: 0.54 },
  { id: "feet", x: 0.5, y: 0.955 },
];

function bodyDefinition(family: string): CharacterComponentDefinition {
  return {
    kind: "body",
    family,
    catalog_generation: 1,
    layer: 20,
    canvas: BODY_CANVAS,
    pose_family: "standing-neutral",
    head_orientation: "front",
    root: { convention: "pelvis-hip-center", x: 0.5, y: 0.55 },
    attachment_anchors: ANCHORS,
  };
}

const TOP: CharacterComponentDefinition = {
  kind: "top",
  family: "test-top",
  catalog_generation: 1,
  layer: 25,
  canvas: { width: 400, height: 320 },
  attaches_to: "torso",
  origin: { x: 0.5, y: 0 },
  compatible_body_families: ["fam-source", "fam-target"],
  compatible_pose_families: ["standing-neutral"],
};

const FOOTWEAR: CharacterComponentDefinition = {
  kind: "footwear",
  family: "test-footwear",
  catalog_generation: 1,
  layer: 21,
  canvas: { width: 400, height: 60 },
  attaches_to: "feet",
  origin: { x: 0.5, y: 0.25 },
  compatible_body_families: ["fam-source", "fam-target"],
  compatible_pose_families: ["standing-neutral"],
};

function record(
  assetId: string,
  component: CharacterComponentDefinition,
): CharacterComponentManifestRecord {
  return {
    asset_id: assetId,
    asset_type: "character-component",
    generation_status: "approved",
    qa_status: "approved",
    runtime_release_status: "released",
    component,
  };
}

const RECORDS: readonly CharacterComponentManifestRecord[] = [
  record("body_source", bodyDefinition("fam-source")),
  record("body_target", bodyDefinition("fam-target")),
  record("top_v1", TOP),
  record("footwear_v1", FOOTWEAR),
];

function recipeOn(bodyFamily: string, bodyAssetId: string): CharacterRecipe {
  return {
    appearanceSeed: "seed",
    recipeVersion: "v1",
    catalogGeneration: 1,
    identity: {
      bodyFamily,
      headFamily: "none",
      complexion: null,
      slots: {},
    },
    context: {
      poseFamily: "standing-neutral",
      headOrientation: "front",
      components: [
        {
          slotId: "body",
          kind: "body",
          family: bodyFamily,
          assetId: bodyAssetId,
          layer: 20,
          released: true,
        },
        {
          slotId: "footwear",
          kind: "footwear",
          family: "test-footwear",
          assetId: "footwear_v1",
          layer: 21,
          released: true,
        },
        {
          slotId: "top",
          kind: "top",
          family: "test-top",
          assetId: "top_v1",
          layer: 25,
          released: true,
        },
      ],
      diagnostics: [],
    },
  };
}

const AFFINE_BANK: GarmentFitBankData = {
  schema: "garment-fit-profiles-v1",
  garments: [
    {
      component_family: "test-top",
      kind: "top",
      classification: "affine-reusable",
      authored_for_body_family: "fam-source",
      basis: "Test fixture.",
      profiles: [
        {
          target_body_family: "fam-target",
          pose_family: "standing-neutral",
          transform: {
            kind: "affine",
            scaleX: 0.85,
            scaleY: 1,
            translateX: 0,
            translateY: 0,
          },
        },
      ],
    },
    {
      component_family: "test-footwear",
      kind: "footwear",
      classification: "safe-direct-reuse",
      authored_for_body_family: null,
      basis: "A shoe never meets the part of the silhouette that varies.",
      profiles: [],
    },
  ],
};

function libraryWith(bank: GarmentFitBankData | null) {
  return createCharacterComponentLibrary(
    RECORDS,
    CATALOG,
    bank ? createGarmentFitBank(bank) : null,
  );
}

describe("garment fit — resolution", () => {
  it("returns the unfitted placement when no bank is supplied at all", () => {
    const projected = projectCharacterLayers(
      recipeOn("fam-target", "body_target"),
      libraryWith(null),
    )!;
    const top = projected.layers.find((layer) => layer.kind === "top")!;
    expect(top.width).toBe(1);
    expect(top.fit).toBeNull();
    expect(top.fitRefusal).toBeNull();
    expect(projected.fitRefusals).toEqual([]);
  });

  it("applies the authored scale about the anchor on the target family", () => {
    const projected = projectCharacterLayers(
      recipeOn("fam-target", "body_target"),
      libraryWith(AFFINE_BANK),
    )!;
    const top = projected.layers.find((layer) => layer.kind === "top")!;
    expect(top.width).toBeCloseTo(0.85, 10);
    // The origin (0.5, 0) still lands on the torso anchor (0.5, 0.16).
    expect(top.left + 0.5 * top.width).toBeCloseTo(0.5, 10);
    expect(top.top).toBeCloseTo(0.16, 10);
    expect(top.fit).toEqual({
      classification: "affine-reusable",
      transformKind: "affine",
      matrix: [0.85, 0, 0, 1, 0.075, 0],
      bands: null,
    });
  });

  it("leaves the garment untransformed on the family it was authored for", () => {
    const projected = projectCharacterLayers(
      recipeOn("fam-source", "body_source"),
      libraryWith(AFFINE_BANK),
    )!;
    const top = projected.layers.find((layer) => layer.kind === "top")!;
    expect(top.width).toBe(1);
    expect(top.fit?.transformKind).toBe("direct");
    expect(top.fit?.matrix).toEqual([1, 0, 0, 1, 0, 0]);
  });

  it("keeps a safe-share component free of any transform", () => {
    const projected = projectCharacterLayers(
      recipeOn("fam-target", "body_target"),
      libraryWith(AFFINE_BANK),
    )!;
    const shoe = projected.layers.find((layer) => layer.kind === "footwear")!;
    const unfitted = projectCharacterLayers(
      recipeOn("fam-target", "body_target"),
      libraryWith(null),
    )!.layers.find((layer) => layer.kind === "footwear")!;
    expect(shoe.left).toBe(unfitted.left);
    expect(shoe.top).toBe(unfitted.top);
    expect(shoe.width).toBe(unfitted.width);
    expect(shoe.height).toBe(unfitted.height);
    expect(shoe.fit?.classification).toBe("safe-direct-reuse");
    expect(shoe.fit?.transformKind).toBe("direct");
  });

  it("never fits the body itself", () => {
    const projected = projectCharacterLayers(
      recipeOn("fam-target", "body_target"),
      libraryWith(AFFINE_BANK),
    )!;
    const body = projected.layers.find((layer) => layer.kind === "body")!;
    expect(body).toMatchObject({ left: 0, top: 0, width: 1, height: 1 });
    expect(body.fit).toBeNull();
  });

  it("preserves z-order after fitting", () => {
    const projected = projectCharacterLayers(
      recipeOn("fam-target", "body_target"),
      libraryWith(AFFINE_BANK),
    )!;
    expect(projected.layers.map((layer) => layer.layer)).toEqual([20, 21, 25]);
  });
});

describe("garment fit — failing closed", () => {
  const withoutTop: GarmentFitBankData = {
    ...AFFINE_BANK,
    garments: AFFINE_BANK.garments.filter(
      (garment) => garment.component_family !== "test-top",
    ),
  };

  it("refuses a garment the bank has never heard of", () => {
    const projected = projectCharacterLayers(
      recipeOn("fam-target", "body_target"),
      libraryWith(withoutTop),
    )!;
    const top = projected.layers.find((layer) => layer.kind === "top")!;
    expect(top.released).toBe(false);
    expect(top.fitRefusal?.code).toBe("fit-garment-unknown");
    expect(projected.fitRefusals).toHaveLength(1);
    expect(projected.fullyReleased).toBe(false);
  });

  it("refuses rather than borrowing another family's profile", () => {
    const otherFamily: GarmentFitBankData = {
      ...AFFINE_BANK,
      garments: AFFINE_BANK.garments.map((garment) =>
        garment.component_family === "test-top"
          ? {
              ...garment,
              profiles: [
                {
                  ...garment.profiles[0]!,
                  target_body_family: "fam-elsewhere",
                },
              ],
            }
          : garment,
      ),
    };
    const projected = projectCharacterLayers(
      recipeOn("fam-target", "body_target"),
      libraryWith(otherFamily),
    )!;
    const top = projected.layers.find((layer) => layer.kind === "top")!;
    expect(top.fitRefusal?.code).toBe("fit-profile-missing");
    // The refused layer keeps its unfitted geometry so a debug view can show
    // where it WOULD have gone, but it is not runtime eligible.
    expect(top.released).toBe(false);
  });

  it("refuses rather than reusing another pose's fit", () => {
    const wrongPose: GarmentFitBankData = {
      ...AFFINE_BANK,
      garments: AFFINE_BANK.garments.map((garment) =>
        garment.component_family === "test-top"
          ? {
              ...garment,
              profiles: [
                { ...garment.profiles[0]!, pose_family: "seated-at-desk" },
              ],
            }
          : garment,
      ),
    };
    const projected = projectCharacterLayers(
      recipeOn("fam-target", "body_target"),
      libraryWith(wrongPose),
    )!;
    expect(
      projected.layers.find((layer) => layer.kind === "top")!.fitRefusal?.code,
    ).toBe("fit-profile-missing");
  });

  it("refuses a morphology-specific garment on any other family", () => {
    const specific: GarmentFitBankData = {
      ...AFFINE_BANK,
      garments: AFFINE_BANK.garments.map((garment) =>
        garment.component_family === "test-top"
          ? {
              ...garment,
              classification: "morphology-specific" as const,
              profiles: [],
            }
          : garment,
      ),
    };
    const projected = projectCharacterLayers(
      recipeOn("fam-target", "body_target"),
      libraryWith(specific),
    )!;
    expect(
      projected.layers.find((layer) => layer.kind === "top")!.fitRefusal?.code,
    ).toBe("fit-morphology-specific");
    // ...and still draws on the one it was authored for.
    const home = projectCharacterLayers(
      recipeOn("fam-source", "body_source"),
      libraryWith(specific),
    )!;
    expect(
      home.layers.find((layer) => layer.kind === "top")!.fitRefusal,
    ).toBeNull();
  });

  it("refuses a profile that exceeds the declared bounds", () => {
    const wild: GarmentFitBankData = {
      ...AFFINE_BANK,
      garments: AFFINE_BANK.garments.map((garment) =>
        garment.component_family === "test-top"
          ? {
              ...garment,
              profiles: [
                {
                  ...garment.profiles[0]!,
                  transform: {
                    kind: "affine" as const,
                    scaleX: 3,
                    scaleY: 1,
                    translateX: 0,
                    translateY: 0,
                  },
                },
              ],
            }
          : garment,
      ),
    };
    const projected = projectCharacterLayers(
      recipeOn("fam-target", "body_target"),
      libraryWith(wild),
    )!;
    expect(
      projected.layers.find((layer) => layer.kind === "top")!.fitRefusal?.code,
    ).toBe("fit-profile-out-of-bounds");
  });
});

describe("garment fit — determinism", () => {
  it("produces identical geometry for identical inputs", () => {
    const first = projectCharacterLayers(
      recipeOn("fam-target", "body_target"),
      libraryWith(AFFINE_BANK),
    );
    const second = projectCharacterLayers(
      recipeOn("fam-target", "body_target"),
      libraryWith(AFFINE_BANK),
    );
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });

  it("compiles the same bands from the same control points every time", () => {
    const warp: GarmentFitBoundedWarp = {
      kind: "bounded-warp",
      scaleY: 1,
      translateY: 0,
      controlPoints: [
        { at: 0, scaleX: 1.1, offsetX: 0 },
        { at: 0.55, scaleX: 1.29, offsetX: 0.01 },
        { at: 1, scaleX: 1.2, offsetX: 0 },
      ],
    };
    const once = compileWarpBands(warp);
    expect(once).toHaveLength(GARMENT_FIT_WARP_BAND_COUNT);
    expect(compileWarpBands(warp)).toEqual(once);
    // Every compiled number is rounded, so no float tail can differ between
    // a build machine and a reviewer's.
    for (const band of once) {
      expect(band.scaleX).toBe(Number(band.scaleX.toFixed(6)));
      expect(band.offsetX).toBe(Number(band.offsetX.toFixed(6)));
    }
  });

  it("compiles an anchor-relative matrix that fixes the anchor point", () => {
    const matrix = compileGarmentFitMatrix(0.8, 1.2, 0, 0, 0.5, 0.16);
    const [a, b, c, d, e, f] = matrix;
    expect(b).toBe(0);
    expect(c).toBe(0);
    expect(a * 0.5 + c * 0.16 + e).toBeCloseTo(0.5, 10);
    expect(b * 0.5 + d * 0.16 + f).toBeCloseTo(0.16, 10);
  });
});

describe("garment fit — bounds", () => {
  it("accepts a transform inside the declared limits", () => {
    expect(
      boundsViolations(
        {
          kind: "affine",
          scaleX: 0.85,
          scaleY: 1,
          translateX: 0,
          translateY: 0,
        },
        GARMENT_FIT_DEFAULT_BOUNDS,
      ),
    ).toEqual([]);
  });

  it("rejects a scale outside the limits", () => {
    expect(
      boundsViolations(
        {
          kind: "affine",
          scaleX: 0.5,
          scaleY: 1,
          translateX: 0,
          translateY: 0,
        },
        GARMENT_FIT_DEFAULT_BOUNDS,
      ).join(" "),
    ).toContain("outside the permitted");
  });

  it("rejects a warp whose bands step too far at a seam", () => {
    const kinked: GarmentFitBoundedWarp = {
      kind: "bounded-warp",
      scaleY: 1,
      translateY: 0,
      controlPoints: [
        { at: 0, scaleX: 0.75, offsetX: 0 },
        { at: 0.5, scaleX: 0.75, offsetX: 0 },
        { at: 0.51, scaleX: 1.4, offsetX: 0 },
        { at: 1, scaleX: 1.4, offsetX: 0 },
      ],
    };
    expect(
      boundsViolations(kinked, GARMENT_FIT_DEFAULT_BOUNDS).join(" "),
    ).toContain("that seam would be visible");
  });

  it("rejects a warp that does not cover the whole component", () => {
    expect(
      boundsViolations(
        {
          kind: "bounded-warp",
          scaleY: 1,
          translateY: 0,
          controlPoints: [
            { at: 0.2, scaleX: 1, offsetX: 0 },
            { at: 0.8, scaleX: 1, offsetX: 0 },
          ],
        },
        GARMENT_FIT_DEFAULT_BOUNDS,
      ).join(" "),
    ).toContain("must start at 0 and end at 1");
  });

  it("refuses a mesh dressed up as a warp", () => {
    const points = Array.from({ length: 12 }, (_, index) => ({
      at: index / 11,
      scaleX: 1,
      offsetX: 0,
    }));
    expect(
      boundsViolations(
        {
          kind: "bounded-warp",
          scaleY: 1,
          translateY: 0,
          controlPoints: points,
        },
        GARMENT_FIT_DEFAULT_BOUNDS,
      ).join(" "),
    ).toContain("at most 8 control points");
  });
});

describe("garment fit — deriving from measured anchors", () => {
  const source: BodyFitReference = {
    bodyFamily: "fam-source",
    poseFamily: "standing-neutral",
    spans: { shoulder: 0.548, waist: 0.429, hip: 0.457 },
    rows: { shoulder: 0.162, waist: 0.393, hip: 0.542 },
  };
  const target: BodyFitReference = {
    bodyFamily: "fam-target",
    poseFamily: "standing-neutral",
    spans: { shoulder: 0.495, waist: 0.352, hip: 0.4 },
    rows: { shoulder: 0.162, waist: 0.393, hip: 0.542 },
  };

  it("derives one scale that minimises the worst anchor error", () => {
    const derived = deriveAffineFit(source, target, "top");
    expect(derived.anchors).toEqual(["shoulder", "waist", "hip"]);
    const values = Object.values(derived.ratios);
    const minimax = Math.sqrt(Math.min(...values) * Math.max(...values));
    expect(derived.transform.scaleX).toBeCloseTo(minimax, 5);
    // The chosen scale sits between the smallest and largest required ratio,
    // which is what "minimise the worst" means and what an average does not
    // guarantee.
    expect(derived.transform.scaleX).toBeGreaterThan(Math.min(...values));
    expect(derived.transform.scaleX).toBeLessThan(Math.max(...values));
  });

  it("derives a warp control point per measured anchor row", () => {
    const derived = deriveBoundedWarpFit(source, target, "top", {
      topY: 0.16,
      bottomY: 0.56,
    });
    expect(derived.transform.controlPoints[0]!.at).toBe(0);
    expect(
      derived.transform.controlPoints[
        derived.transform.controlPoints.length - 1
      ]!.at,
    ).toBe(1);
    expect(
      boundsViolations(derived.transform, GARMENT_FIT_DEFAULT_BOUNDS),
    ).toEqual([]);
  });

  it("drops anchors the component does not reach", () => {
    const derived = deriveAffineFit(source, target, "top", {
      topY: 0.16,
      bottomY: 0.45,
    });
    expect(derived.anchors).toEqual(["shoulder", "waist"]);
  });

  it("refuses to derive a fit across two poses", () => {
    expect(() =>
      deriveAffineFit(
        source,
        { ...target, poseFamily: "seated-at-desk" },
        "top",
      ),
    ).toThrow(/never one viewpoint to another/);
  });

  it("refuses a warp with fewer than two measured rows inside the component", () => {
    expect(() =>
      deriveBoundedWarpFit(source, target, "top", {
        topY: 0.16,
        bottomY: 0.2,
      }),
    ).toThrow(/A warp needs at least two measured rows/);
  });

  it("names the anchors each category is fitted against", () => {
    expect(GARMENT_FIT_CATEGORY_ANCHORS.top).toContain("shoulder");
    expect(GARMENT_FIT_CATEGORY_ANCHORS.top).toContain("waist");
    expect(GARMENT_FIT_CATEGORY_ANCHORS.bottom).toContain("waist");
    expect(GARMENT_FIT_CATEGORY_ANCHORS.bottom).toContain("crotch");
    expect(GARMENT_FIT_CATEGORY_ANCHORS.bottom).toContain("ankle");
    expect(GARMENT_FIT_CATEGORY_ANCHORS.footwear).toContain("heel");
    expect(GARMENT_FIT_CATEGORY_ANCHORS.footwear).toContain("toe");
  });

  it("holds head-attached kinds outside the fit contract", () => {
    for (const kind of [
      "head",
      "hair-front",
      "hair-back",
      "eyewear",
    ] as const) {
      expect(isGarmentFitGoverned(kind)).toBe(false);
    }
    for (const kind of ["top", "bottom", "footwear", "accessory"] as const) {
      expect(isGarmentFitGoverned(kind)).toBe(true);
    }
    const bank = createGarmentFitBank(AFFINE_BANK);
    expect(
      resolveGarmentFit(
        {
          componentAssetId: "hair_v1",
          componentFamily: "not-in-the-bank",
          kind: "hair-front",
          targetBodyFamily: "fam-target",
          poseFamily: "standing-neutral",
        },
        bank,
      ),
    ).toMatchObject({ ok: true, direct: true });
  });
});

describe("garment fit — bank validation", () => {
  const library = libraryWith(null);

  it("accepts a bank that covers every reachable pairing", () => {
    expect(validateGarmentFitBank(AFFINE_BANK, library)).toEqual([]);
  });

  it("names a governed family the bank never mentions", () => {
    const partial: GarmentFitBankData = {
      ...AFFINE_BANK,
      garments: AFFINE_BANK.garments.filter(
        (garment) => garment.component_family !== "test-footwear",
      ),
    };
    expect(validateGarmentFitBank(partial, library).join(" ")).toContain(
      "'test-footwear' (footwear) is fit-governed but absent from the fit bank",
    );
  });

  it("names a declared compatibility with no authored fit", () => {
    const missing: GarmentFitBankData = {
      ...AFFINE_BANK,
      garments: AFFINE_BANK.garments.map((garment) =>
        garment.component_family === "test-top"
          ? { ...garment, profiles: [] }
          : garment,
      ),
    };
    expect(validateGarmentFitBank(missing, library).join(" ")).toContain(
      "authors no fit profile for it",
    );
  });

  it("refuses a profile for a pairing the components do not declare", () => {
    const invented: GarmentFitBankData = {
      ...AFFINE_BANK,
      garments: AFFINE_BANK.garments.map((garment) =>
        garment.component_family === "test-top"
          ? {
              ...garment,
              profiles: [
                ...garment.profiles,
                {
                  target_body_family: "fam-source",
                  pose_family: "standing-neutral",
                  transform: { kind: "direct" as const },
                },
              ],
            }
          : garment,
      ),
    };
    expect(validateGarmentFitBank(invented, library).join(" ")).toContain(
      "fits the garment onto the family it was authored for",
    );
  });

  it("refuses fit profiles on a safe-share family", () => {
    const overfitted: GarmentFitBankData = {
      ...AFFINE_BANK,
      garments: AFFINE_BANK.garments.map((garment) =>
        garment.component_family === "test-footwear"
          ? {
              ...garment,
              profiles: [
                {
                  target_body_family: "fam-target",
                  pose_family: "standing-neutral",
                  transform: {
                    kind: "affine" as const,
                    scaleX: 0.9,
                    scaleY: 1,
                    translateX: 0,
                    translateY: 0,
                  },
                },
              ],
            }
          : garment,
      ),
    };
    expect(validateGarmentFitBank(overfitted, library).join(" ")).toContain(
      "safe-direct-reuse but carries fit profiles",
    );
  });

  it("refuses a warp hiding under an affine classification", () => {
    const mislabelled: GarmentFitBankData = {
      ...AFFINE_BANK,
      garments: AFFINE_BANK.garments.map((garment) =>
        garment.component_family === "test-top"
          ? {
              ...garment,
              profiles: [
                {
                  ...garment.profiles[0]!,
                  transform: {
                    kind: "bounded-warp" as const,
                    scaleY: 1,
                    translateY: 0,
                    controlPoints: [
                      { at: 0, scaleX: 0.9, offsetX: 0 },
                      { at: 1, scaleX: 0.86, offsetX: 0 },
                    ],
                  },
                },
              ],
            }
          : garment,
      ),
    };
    expect(validateGarmentFitBank(mislabelled, library).join(" ")).toContain(
      "carries a bounded warp under an 'affine-reusable' classification",
    );
  });

  it("refuses a morphology-specific family that still claims another body", () => {
    const contradictory: GarmentFitBankData = {
      ...AFFINE_BANK,
      garments: AFFINE_BANK.garments.map((garment) =>
        garment.component_family === "test-top"
          ? {
              ...garment,
              classification: "morphology-specific" as const,
              profiles: [],
            }
          : garment,
      ),
    };
    expect(validateGarmentFitBank(contradictory, library).join(" ")).toContain(
      "Withdraw the declared compatibility or author the art",
    );
  });

  it("rejects an unknown schema outright", () => {
    expect(
      validateGarmentFitBank(
        { ...AFFINE_BANK, schema: "garment-fit-profiles-v99" },
        library,
      ).join(" "),
    ).toContain("this build reads");
  });
});

/* -------------------------------------------------------------------------- */

describe("garment fit — malformed bounds fail closed", () => {
  const library = libraryWith(null);
  const withBounds = (bounds: unknown): GarmentFitBankData =>
    ({ ...AFFINE_BANK, bounds }) as GarmentFitBankData;
  const millionScale: GarmentFitBankData = {
    ...AFFINE_BANK,
    garments: AFFINE_BANK.garments.map((garment) =>
      garment.component_family === "test-top"
        ? {
            ...garment,
            profiles: [
              {
                ...garment.profiles[0]!,
                transform: {
                  kind: "affine" as const,
                  scaleX: 1_000_000,
                  scaleY: 1,
                  translateX: 0,
                  translateY: 0,
                },
              },
            ],
          }
        : garment,
    ),
  };

  const MALFORMED: readonly [string, unknown][] = [
    ["a string maxScale", { maxScale: "unlimited" }],
    ["NaN", { maxScale: Number.NaN }],
    ["Infinity", { maxScale: Number.POSITIVE_INFINITY }],
    ["-Infinity", { minScale: Number.NEGATIVE_INFINITY }],
    ["null where a number is required", { maxTranslate: null }],
    ["a negative translate limit", { maxTranslate: -0.1 }],
    ["a zero edge-error bound", { maxEdgeErrorFraction: 0 }],
    ["an inverted min/max", { minScale: 1.5, maxScale: 1.2 }],
    ["a minScale at or above 1", { minScale: 1 }],
    ["a maxScale beyond the envelope", { maxScale: 50 }],
    [
      "a band step larger than the spread",
      { maxWarpBandStep: 1.9, maxWarpScaleSpread: 1.5 },
    ],
    ["an unknown limit", { maxShear: 0.3 }],
    ["a nested object where a number belongs", { maxScale: { value: 2 } }],
    ["an array instead of an object", [0.7, 1.45]],
    ["a bare string instead of an object", "loose"],
  ];

  for (const [label, bounds] of MALFORMED) {
    it(`refuses ${label} at validation`, () => {
      const checked = validateGarmentFitBounds(bounds);
      expect(checked.bounds).toBeNull();
      expect(checked.errors.length).toBeGreaterThan(0);
      const errors = validateGarmentFitBank(withBounds(bounds), library);
      expect(errors.join(" ")).toMatch(/bound|unusable/);
    });

    it(`refuses ${label} at runtime even if validation was skipped`, () => {
      const bank = createGarmentFitBank(withBounds(bounds));
      expect(bank.bounds).toBeNull();
      const resolved = resolveGarmentFit(
        {
          componentAssetId: "top_v1",
          componentFamily: "test-top",
          kind: "top",
          targetBodyFamily: "fam-target",
          poseFamily: "standing-neutral",
        },
        bank,
      );
      expect(resolved).toMatchObject({ ok: false, code: "fit-bank-invalid" });
      // Even a safe-share garment is refused under a bank nobody has read.
      expect(
        resolveGarmentFit(
          {
            componentAssetId: "footwear_v1",
            componentFamily: "test-footwear",
            kind: "footwear",
            targetBodyFamily: "fam-target",
            poseFamily: "standing-neutral",
          },
          bank,
        ),
      ).toMatchObject({ ok: false, code: "fit-bank-invalid" });
    });
  }

  it("refuses a million-fold scale under a string limit — the audit's probe", () => {
    const bank: GarmentFitBankData = {
      ...millionScale,
      bounds: { maxScale: "unlimited" as unknown as number },
    };
    expect(validateGarmentFitBank(bank, library).length).toBeGreaterThan(0);
    const resolved = resolveGarmentFit(
      {
        componentAssetId: "top_v1",
        componentFamily: "test-top",
        kind: "top",
        targetBodyFamily: "fam-target",
        poseFamily: "standing-neutral",
      },
      createGarmentFitBank(bank),
    );
    expect(resolved.ok).toBe(false);
  });

  it("refuses a million-fold scale under valid limits too", () => {
    expect(validateGarmentFitBank(millionScale, library).join(" ")).toContain(
      "outside the permitted",
    );
    const resolved = resolveGarmentFit(
      {
        componentAssetId: "top_v1",
        componentFamily: "test-top",
        kind: "top",
        targetBodyFamily: "fam-target",
        poseFamily: "standing-neutral",
      },
      createGarmentFitBank(millionScale),
    );
    expect(resolved).toMatchObject({
      ok: false,
      code: "fit-profile-out-of-bounds",
    });
  });

  it("lets a bank tighten its limits but not widen past the envelope", () => {
    expect(validateGarmentFitBounds({ maxScale: 1.2 }).bounds?.maxScale).toBe(
      1.2,
    );
    expect(
      validateGarmentFitBounds({
        maxScale: GARMENT_FIT_BOUNDS_ENVELOPE.maxScaleCeiling + 0.01,
      }).bounds,
    ).toBeNull();
    expect(validateGarmentFitBounds(undefined).bounds).toEqual(
      GARMENT_FIT_DEFAULT_BOUNDS,
    );
  });

  it("boundsViolations refuses every transform under malformed limits", () => {
    const violations = boundsViolations(
      { kind: "affine", scaleX: 1, scaleY: 1, translateX: 0, translateY: 0 },
      { ...GARMENT_FIT_DEFAULT_BOUNDS, maxScale: Number.NaN },
    );
    expect(violations.join(" ")).toContain("Cannot check this transform");
  });
});

describe("garment fit — the transform schema is closed", () => {
  it("rejects shear, rotation and any other extra field instead of ignoring it", () => {
    for (const extra of ["shearX", "rotation", "skewY", "matrix"]) {
      const errors = transformShapeErrors({
        kind: "affine",
        scaleX: 1,
        scaleY: 1,
        translateX: 0,
        translateY: 0,
        [extra]: 0.5,
      });
      expect(errors.join(" ")).toContain(`does not carry a '${extra}' field`);
    }
  });

  it("rejects a missing field rather than defaulting it", () => {
    expect(
      transformShapeErrors({ kind: "affine", scaleX: 1 }).join(" "),
    ).toContain("is missing");
  });

  it("rejects an unknown kind and non-objects", () => {
    expect(transformShapeErrors({ kind: "perspective" })[0]).toMatch(
      /is not one of/,
    );
    expect(transformShapeErrors(null)[0]).toMatch(/must be an object/);
    expect(transformShapeErrors([1, 0, 0, 1, 0, 0])[0]).toMatch(
      /must be an object/,
    );
  });

  it("rejects extra fields on warp control points", () => {
    const errors = transformShapeErrors({
      kind: "bounded-warp",
      scaleY: 1,
      translateY: 0,
      controlPoints: [
        { at: 0, scaleX: 1, offsetX: 0, rotate: 1 },
        { at: 1, scaleX: 1, offsetX: 0 },
      ],
    });
    expect(errors.join(" ")).toContain("unknown field 'rotate'");
  });

  it("refuses a sheared profile through bank validation and at runtime", () => {
    const sheared: GarmentFitBankData = {
      ...AFFINE_BANK,
      garments: AFFINE_BANK.garments.map((garment) =>
        garment.component_family === "test-top"
          ? {
              ...garment,
              profiles: [
                {
                  ...garment.profiles[0]!,
                  transform: {
                    ...garment.profiles[0]!.transform,
                    shearX: 0.4,
                  } as never,
                },
              ],
            }
          : garment,
      ),
    };
    expect(
      validateGarmentFitBank(sheared, libraryWith(null)).join(" "),
    ).toContain("shearX");
    const resolved = resolveGarmentFit(
      {
        componentAssetId: "top_v1",
        componentFamily: "test-top",
        kind: "top",
        targetBodyFamily: "fam-target",
        poseFamily: "standing-neutral",
      },
      createGarmentFitBank(sheared),
    );
    expect(resolved).toMatchObject({
      ok: false,
      code: "fit-profile-out-of-bounds",
    });
  });
});

describe("garment fit — a bounded warp is not renderable", () => {
  const warpBank: GarmentFitBankData = {
    ...AFFINE_BANK,
    garments: AFFINE_BANK.garments.map((garment) =>
      garment.component_family === "test-top"
        ? {
            ...garment,
            classification: "bounded-warp-reusable" as const,
            profiles: [
              {
                ...garment.profiles[0]!,
                transform: {
                  kind: "bounded-warp" as const,
                  scaleY: 1,
                  translateY: 0,
                  controlPoints: [
                    { at: 0, scaleX: 0.9, offsetX: 0 },
                    { at: 1, scaleX: 0.85, offsetX: 0 },
                  ],
                },
              },
            ],
          }
        : garment,
    ),
  };

  it("is refused by bank validation so a production bank cannot depend on one", () => {
    expect(
      validateGarmentFitBank(warpBank, libraryWith(null)).join(" "),
    ).toContain("NOT RENDERABLE");
  });

  it("is withheld by the projection with its unfitted rectangle and a named reason", () => {
    const projected = projectCharacterLayers(
      recipeOn("fam-target", "body_target"),
      libraryWith(warpBank),
    )!;
    const top = projected.layers.find((layer) => layer.kind === "top")!;
    expect(top.released).toBe(false);
    expect(top.fitRefusal?.code).toBe("fit-warp-not-renderable");
    expect(top.width).toBe(1);
    expect(top.left).toBe(0);
    expect(top.fit?.transformKind).toBe("bounded-warp");
    expect(top.fit?.bands).toHaveLength(GARMENT_FIT_WARP_BAND_COUNT);
    expect(projected.fullyReleased).toBe(false);
    // The rest of the person is untouched by one garment's refusal.
    expect(
      projected.layers.find((layer) => layer.kind === "footwear")!.released,
    ).toBe(true);
  });

  it("is admitted as geometry only when the harness asks", () => {
    const projected = projectCharacterLayers(
      recipeOn("fam-target", "body_target"),
      libraryWith(warpBank),
      { admitUnrenderableWarps: true },
    )!;
    const top = projected.layers.find((layer) => layer.kind === "top")!;
    expect(top.fitRefusal).toBeNull();
    expect(top.released).toBe(true);
    expect(top.width).toBeLessThan(1);
  });
});
