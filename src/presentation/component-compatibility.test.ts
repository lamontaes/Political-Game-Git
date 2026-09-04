import { describe, expect, it } from "vitest";

import {
  computeCharacterGenerationSignature,
  createCharacterComponentLibrary,
  resolveCharacterRecipe,
  validateCharacterComponentLibrary,
  type CharacterCatalogData,
  type CharacterComponentDefinition,
  type CharacterComponentManifestRecord,
} from "./character-components";

/**
 * Adversarial compatibility. Every case here is a combination that would
 * previously have rendered as a plausible-looking person while being wrong:
 * a head painted in one complexion on a body painted in another, a front head
 * on a three-quarter body, a figure with no shoes, two garments occupying the
 * same space. The contract's job is to refuse them, by name.
 */

function record(
  assetId: string,
  component: CharacterComponentDefinition,
  released = true,
): CharacterComponentManifestRecord {
  return {
    asset_id: assetId,
    asset_type: "character-component",
    fixed_or_modular: "modular",
    generation_status: released ? "approved" : "draft",
    qa_status: released ? "approved" : "pending",
    runtime_release_status: released ? "released" : "unreleased",
    final_path: `art/test/${assetId}.png`,
    hash: `${assetId}`.padEnd(64, "0"),
    component,
  };
}

const BODY_ANCHORS = [
  { id: "head", x: 0.5, y: 0.12 },
  { id: "torso", x: 0.5, y: 0.16 },
  { id: "hips", x: 0.5, y: 0.54 },
  { id: "feet", x: 0.5, y: 0.95 },
] as const;

function body(
  assetId: string,
  overrides: Partial<CharacterComponentDefinition> = {},
): CharacterComponentManifestRecord {
  return record(assetId, {
    kind: "body",
    family: "test-body",
    catalog_generation: 1,
    layer: 20,
    canvas: { width: 400, height: 800 },
    pose_family: "standing-neutral",
    head_orientation: "front",
    complexion: "medium-warm",
    root: { convention: "pelvis-hip-center", x: 0.5, y: 0.55 },
    attachment_anchors: [...BODY_ANCHORS],
    contacts: {
      leftFoot: { x: 0.4, y: 0.98 },
      rightFoot: { x: 0.6, y: 0.98 },
    },
    ...overrides,
  });
}

function head(
  assetId: string,
  overrides: Partial<CharacterComponentDefinition> = {},
): CharacterComponentManifestRecord {
  return record(assetId, {
    kind: "head",
    family: "test-head",
    catalog_generation: 1,
    layer: 30,
    canvas: { width: 200, height: 200 },
    attaches_to: "head",
    origin: { x: 0.5, y: 0.95 },
    complexion: "medium-warm",
    compatible_body_families: ["test-body"],
    compatible_head_orientations: ["front"],
    ...overrides,
  });
}

function garment(
  assetId: string,
  kind: "top" | "bottom" | "footwear" | "accessory",
  layer: number,
  overrides: Partial<CharacterComponentDefinition> = {},
): CharacterComponentManifestRecord {
  return record(assetId, {
    kind,
    family: `test-${kind}`,
    catalog_generation: 1,
    layer,
    canvas: { width: 400, height: 300 },
    attaches_to:
      kind === "footwear" ? "feet" : kind === "bottom" ? "hips" : "torso",
    origin: { x: 0.5, y: 0 },
    compatible_body_families: ["test-body"],
    compatible_head_orientations: ["front"],
    ...overrides,
  });
}

const SLOTS: CharacterCatalogData["slots"] = [
  { slot_id: "body", kind: "body", required: true },
  { slot_id: "head", kind: "head", required: true },
  { slot_id: "top", kind: "top", required: true },
  { slot_id: "bottom", kind: "bottom", required: true },
  { slot_id: "footwear", kind: "footwear", required: true },
  {
    slot_id: "accessory",
    kind: "accessory",
    required: false,
    presence_rate: 1,
  },
];

function catalogFor(
  records: readonly CharacterComponentManifestRecord[],
  slots: CharacterCatalogData["slots"] = SLOTS,
): CharacterCatalogData {
  return {
    catalog_generation: 1,
    slots,
    generations: [
      {
        generation: 1,
        component_ids: records.map((entry) => entry.asset_id).sort(),
        signature: computeCharacterGenerationSignature(
          records.map((entry) => ({
            assetId: entry.asset_id,
            definition: entry.component!,
          })),
        ),
      },
    ],
  };
}

function errorsFor(
  records: readonly CharacterComponentManifestRecord[],
  slots?: CharacterCatalogData["slots"],
): readonly string[] {
  return validateCharacterComponentLibrary(records, catalogFor(records, slots));
}

const BASELINE = [
  body("b_body"),
  head("b_head"),
  garment("b_top", "top", 25),
  garment("b_bottom", "bottom", 22),
  garment("b_shoe", "footwear", 21),
];

describe("complexion agreement", () => {
  it("accepts a head and body painted in the same band", () => {
    expect(
      errorsFor(BASELINE).filter((error) => error.includes("complexion")),
    ).toEqual([]);
  });

  /** ACCEPTANCE: mismatched head/body complexion is rejected. */
  it("rejects a head whose complexion no body in its family carries", () => {
    const errors = errorsFor([
      body("b_body"),
      head("b_head", { complexion: "deep-rich" }),
      ...BASELINE.slice(2),
    ]);
    expect(
      errors.some(
        (error) =>
          error.includes("b_head") &&
          error.includes("deep-rich") &&
          error.includes("head and body complexion must match"),
      ),
    ).toBe(true);
  });

  it("rejects one head family painted in two different bands", () => {
    const errors = errorsFor([
      body("b_body"),
      body("b_body_deep", { complexion: "deep-rich" }),
      head("b_head"),
      head("b_head_2", { complexion: "deep-rich" }),
      ...BASELINE.slice(2),
    ]);
    expect(
      errors.some((error) =>
        error.includes("one head family is one complexion"),
      ),
    ).toBe(true);
  });

  it("rejects a complexion outside the declared art bands", () => {
    const errors = errorsFor([
      body("b_body", {
        complexion: "porcelain" as never,
      }),
      ...BASELINE.slice(1),
    ]);
    expect(
      errors.some((error) => error.includes("declares complexion 'porcelain'")),
    ).toBe(true);
  });

  it("refuses complexion on anything that is not source skin art", () => {
    const errors = errorsFor([
      ...BASELINE.slice(0, 2),
      garment("b_top", "top", 25, { complexion: "light" }),
      ...BASELINE.slice(3),
    ]);
    expect(
      errors.some((error) =>
        error.includes("complexion is source art on bodies and heads only"),
      ),
    ).toBe(true);
  });

  it("picks a body whose complexion matches the head the identity chose", () => {
    const records = [
      body("b_body_warm"),
      body("b_body_deep", { complexion: "deep-rich" }),
      head("b_head_warm"),
      head("b_head_deep", {
        family: "test-head-deep",
        complexion: "deep-rich",
      }),
      ...BASELINE.slice(2),
    ];
    expect(errorsFor(records)).toEqual([]);
    const library = createCharacterComponentLibrary(
      records,
      catalogFor(records),
    );
    for (let index = 0; index < 24; index += 1) {
      const recipe = resolveCharacterRecipe(
        {
          appearance: {
            seed: `app_probe_${index}`,
            recipeVersion: "appearance-recipe-v1",
          },
          poseFamily: "standing-neutral",
        },
        library,
      );
      const bodyLayer = recipe.context.components.find(
        (entry) => entry.kind === "body",
      );
      const chosen = library.components.get(bodyLayer!.assetId)!;
      expect(chosen.definition.complexion, `probe ${index}`).toBe(
        recipe.identity.complexion,
      );
    }
  });
});

describe("required slots", () => {
  /** ACCEPTANCE: missing required footwear is rejected. */
  it("names an empty required footwear slot rather than drawing bare ankles", () => {
    const records = [
      ...BASELINE.slice(0, 4),
      // Shoes exist, but only for a pose this figure is not in.
      garment("b_shoe", "footwear", 21, {
        compatible_pose_families: ["seated-at-desk"],
      }),
      body("b_body_seated", {
        pose_family: "seated-at-desk",
        canvas: { width: 400, height: 640 },
      }),
    ];
    const library = createCharacterComponentLibrary(
      records,
      catalogFor(records),
    );
    const recipe = resolveCharacterRecipe(
      {
        appearance: { seed: "app_x", recipeVersion: "appearance-recipe-v1" },
        poseFamily: "standing-neutral",
      },
      library,
    );
    expect(
      recipe.context.components.some((entry) => entry.kind === "footwear"),
    ).toBe(false);
    const diagnostic = recipe.context.diagnostics.find(
      (entry) => entry.slotId === "footwear",
    );
    expect(diagnostic?.code).toBe("required-slot-empty");
    expect(diagnostic?.message).toContain("standing-neutral");
  });

  /**
   * Pose and facing are different reasons for a slot to come up empty, and the
   * diagnostic says which. Here one body family is drawn in two poses with
   * different head orientations, so the pose fixes the facing deterministically
   * and the accessory is available in exactly one of them.
   */
  it("distinguishes an unavailable pose from an unavailable facing", () => {
    const bothFacings = ["front", "three-quarter-left"];
    const records = [
      body("b_body"),
      body("b_body_tq", {
        pose_family: "standing-turned",
        head_orientation: "three-quarter-left",
      }),
      head("b_head", { compatible_head_orientations: bothFacings }),
      garment("b_top", "top", 25, {
        compatible_head_orientations: bothFacings,
      }),
      garment("b_bottom", "bottom", 22, {
        compatible_head_orientations: bothFacings,
      }),
      garment("b_shoe", "footwear", 21, {
        compatible_head_orientations: bothFacings,
      }),
      // Drawn for the turned facing only.
      garment("b_pin", "accessory", 26, {
        compatible_head_orientations: ["three-quarter-left"],
      }),
    ];
    expect(errorsFor(records)).toEqual([]);
    const library = createCharacterComponentLibrary(
      records,
      catalogFor(records),
    );
    const appearance = {
      seed: "app_y",
      recipeVersion: "appearance-recipe-v1",
    };

    const front = resolveCharacterRecipe(
      { appearance, poseFamily: "standing-neutral" },
      library,
    );
    expect(front.context.headOrientation).toBe("front");
    const facingGap = front.context.diagnostics.find(
      (entry) => entry.slotId === "accessory",
    );
    expect(facingGap?.code).toBe("slot-family-has-no-art-for-facing");
    expect(facingGap?.message).toContain("facing 'front'");

    const turned = resolveCharacterRecipe(
      { appearance, poseFamily: "standing-turned" },
      library,
    );
    expect(turned.context.headOrientation).toBe("three-quarter-left");
    expect(
      turned.context.diagnostics.some((entry) => entry.slotId === "accessory"),
    ).toBe(false);
    expect(
      turned.context.components.some((entry) => entry.kind === "accessory"),
    ).toBe(true);

    // The identity is the same person in both; only the art differs.
    expect(turned.identity).toEqual(front.identity);
  });

  it("reports every required slot when no body resolves for the pose", () => {
    const library = createCharacterComponentLibrary(
      BASELINE,
      catalogFor(BASELINE),
    );
    const recipe = resolveCharacterRecipe(
      {
        appearance: { seed: "app_z", recipeVersion: "appearance-recipe-v1" },
        poseFamily: "seated-at-desk",
      },
      library,
    );
    expect(recipe.context.components).toEqual([]);
    expect(
      recipe.context.diagnostics.map((entry) => entry.slotId).sort(),
    ).toEqual(["body", "bottom", "footwear", "head", "top"]);
  });
});

describe("blocked slots", () => {
  const BLOCKING = [
    ...BASELINE.slice(0, 2),
    garment("b_top", "top", 25, { blocked_slots: ["accessory"] }),
    ...BASELINE.slice(3),
    garment("b_pin", "accessory", 26),
  ];

  it("accepts a garment that blocks an optional slot", () => {
    expect(errorsFor(BLOCKING)).toEqual([]);
  });

  it("refuses to draw the blocked layer, and says which garment refused it", () => {
    const library = createCharacterComponentLibrary(
      BLOCKING,
      catalogFor(BLOCKING),
    );
    const recipe = resolveCharacterRecipe(
      {
        appearance: { seed: "app_b", recipeVersion: "appearance-recipe-v1" },
        poseFamily: "standing-neutral",
      },
      library,
    );
    // Identity still chose the accessory; the context refuses to paint it.
    expect(recipe.identity.slots.accessory).toBe("test-accessory");
    expect(
      recipe.context.components.some((entry) => entry.kind === "accessory"),
    ).toBe(false);
    const diagnostic = recipe.context.diagnostics.find(
      (entry) => entry.code === "slot-conflict",
    );
    expect(diagnostic?.slotId).toBe("accessory");
    expect(diagnostic?.message).toContain("blocked by the component worn in");
  });

  it("refuses a garment that would block a required slot", () => {
    const errors = errorsFor([
      ...BASELINE.slice(0, 2),
      garment("b_top", "top", 25, { blocked_slots: ["footwear"] }),
      ...BASELINE.slice(3),
    ]);
    expect(
      errors.some((error) =>
        error.includes("blocks required character slot 'footwear'"),
      ),
    ).toBe(true);
  });

  it("refuses a garment that blocks a slot the catalog does not have", () => {
    const errors = errorsFor([
      ...BASELINE.slice(0, 2),
      garment("b_top", "top", 25, { blocked_slots: ["cape"] }),
      ...BASELINE.slice(3),
    ]);
    expect(
      errors.some((error) =>
        error.includes("blocks unknown character slot 'cape'"),
      ),
    ).toBe(true);
  });

  it("refuses blocked_slots on a body, which wears nothing", () => {
    const errors = errorsFor([
      body("b_body", { blocked_slots: ["accessory"] }),
      ...BASELINE.slice(1),
    ]);
    expect(
      errors.some((error) =>
        error.includes("(body) must not declare 'blocked_slots'"),
      ),
    ).toBe(true);
  });
});

describe("body contacts", () => {
  it("refuses a contact point outside the body canvas", () => {
    const errors = errorsFor([
      body("b_body", {
        contacts: {
          leftFoot: { x: 0.4, y: 1.4 },
          rightFoot: { x: 0.6, y: 0.98 },
        },
      }),
      ...BASELINE.slice(1),
    ]);
    expect(
      errors.some((error) => error.includes("contact 'leftFoot' must be")),
    ).toBe(true);
  });

  it("refuses one foot contact without the other", () => {
    const errors = errorsFor([
      body("b_body", { contacts: { leftFoot: { x: 0.4, y: 0.98 } } }),
      ...BASELINE.slice(1),
    ]);
    expect(
      errors.some((error) => error.includes("a floor line needs both soles")),
    ).toBe(true);
  });

  it("refuses contacts on anything that is not a body", () => {
    const errors = errorsFor([
      ...BASELINE.slice(0, 1),
      head("b_head", {
        contacts: { leftFoot: { x: 0.4, y: 0.9 } },
      }),
      ...BASELINE.slice(2),
    ]);
    expect(
      errors.some((error) =>
        error.includes("must not declare body-only 'contacts'"),
      ),
    ).toBe(true);
  });
});
