import { describe, expect, it } from "vitest";

import { createRunBFixture } from "./run-b-fixture";
import {
  composeOfficeVisuals,
  createRuntimeVisualLibrary,
  OFFICE_VISUAL_SCENE,
  PRODUCTION_VISUAL_LIBRARY,
  validateOfficeVisualScene,
  type OfficeVisualSceneConfiguration,
  type RuntimeVisualAssetRecord,
} from "./visual-integration";

describe("Stage 6.5 visual integration contract", () => {
  const fixture = createRunBFixture();

  it("composes approved released runtime visual assets deterministically", () => {
    const composition = composeOfficeVisuals(
      fixture.scenePeople,
      PRODUCTION_VISUAL_LIBRARY,
    );

    expect(composition.environment.assetId).toBe(
      "env_lexington_council_staff_office_prompt30_v1",
    );
    expect(composition.environment.finalPath).toBe(
      "art/families/council-staff-office/env_lexington_council_staff_office_prompt30_runtime_2x_v1.png",
    );
    expect(composition.environment.hash).toBe(
      "66678f0e91c52ca86f851ae4ba73d1a736a56be9cb7875512ab6bd1235de07f0",
    );
    expect(composition.environment.url).toContain(
      "env_lexington_council_staff_office_prompt30_runtime_2x_v1",
    );

    expect(composition.occluders).toHaveLength(1);
    expect(composition.occluders[0]?.id).toBe("office-furniture-foreground");
    expect(composition.occluders[0]?.asset.assetId).toBe(
      "env_lexington_council_staff_office_prompt30_foreground_mask_v1",
    );
    expect(composition.occluders[0]?.asset.finalPath).toBe(
      "art/families/council-staff-office/env_lexington_council_staff_office_prompt30_foreground_mask_2x_v1.png",
    );
    expect(composition.occluders[0]?.asset.hash).toBe(
      "11a1420a6c5663ae13b744372e81558576bfb314fa5d665a1404fa677d7456fe",
    );
    expect(composition.occluders[0]?.depth).toBe(4);

    expect(composition.characters).toHaveLength(2);

    const primary = composition.characters.find(
      (c) => c.anchorId === "primary-desk-chair",
    );
    expect(primary).toBeDefined();
    expect(primary!.appearanceRecipeId).toBe(
      "appearance:candidate-A01:primary-desk-seated:v1",
    );
    expect(primary!.asset.assetId).toBe(
      "human_candidate_A01_primary_desk_seated_v1",
    );
    expect(primary!.asset.hash).toBe(
      "8e5882e26eab1c6cf966cff188bfebd4e40cd117804e87930a0b06d67ca66e43",
    );
    expect(primary!.depth).toBe(2);
    expect(primary!.widthPercent).toBeCloseTo(24.225, 2);
    expect(primary!.heightPercent).toBeCloseTo(58.051, 2);
    expect(primary!.leftPercent).toBeCloseTo(64.027, 2);
    expect(primary!.topPercent).toBeCloseTo(32.153, 2);
    expect(primary!.hitbox.leftPercent).toBeCloseTo(72.506, 2);
    expect(primary!.hitbox.topPercent).toBeCloseTo(35.055, 2);
    expect(primary!.hitbox.widthPercent).toBeCloseTo(13.324, 2);
    expect(primary!.hitbox.heightPercent).toBeCloseTo(29.025, 2);

    const guest = composition.characters.find(
      (c) => c.anchorId === "left-guest-chair",
    );
    expect(guest).toBeDefined();
    expect(guest!.appearanceRecipeId).toBe(
      "appearance:candidate-B01:left-guest-seated:v1",
    );
    expect(guest!.asset.assetId).toBe(
      "human_candidate_B01_left_guest_seated_v1",
    );
    expect(guest!.asset.hash).toBe(
      "fd880e52fb191d6c32019ba451d006176ebc7762db89590c437c67586906be8d",
    );
    expect(guest!.depth).toBe(3);
    expect(guest!.widthPercent).toBeCloseTo(17.575, 2);
    expect(guest!.heightPercent).toBeCloseTo(42.117, 2);
    expect(guest!.leftPercent).toBeCloseTo(19.915, 2);
    expect(guest!.topPercent).toBeCloseTo(41.52, 2);
    expect(guest!.hitbox.leftPercent).toBeCloseTo(20.794, 2);
    expect(guest!.hitbox.topPercent).toBeCloseTo(42.363, 2);
    expect(guest!.hitbox.widthPercent).toBeCloseTo(15.817, 2);
    expect(guest!.hitbox.heightPercent).toBeCloseTo(21.059, 2);
  });

  it("validates that approved scene geometry maintains non-occluded interaction safe areas", () => {
    expect(validateOfficeVisualScene(OFFICE_VISUAL_SCENE)).toEqual([]);
    expect(OFFICE_VISUAL_SCENE.safeArea.width).toBeLessThanOrEqual(
      OFFICE_VISUAL_SCENE.plate.width,
    );
    expect(OFFICE_VISUAL_SCENE.safeArea.height).toBeLessThanOrEqual(
      OFFICE_VISUAL_SCENE.plate.height,
    );
    expect(
      OFFICE_VISUAL_SCENE.documentAnchors["working-draft"].xPercent,
    ).toBeGreaterThan(50);
    expect(
      OFFICE_VISUAL_SCENE.documentAnchors["working-draft"].yPercent,
    ).toBeGreaterThan(45);
    expect(
      OFFICE_VISUAL_SCENE.documentAnchors["briefing-memo"].xPercent,
    ).toBeGreaterThan(45);
    expect(
      OFFICE_VISUAL_SCENE.documentAnchors["civic-marker"].xPercent,
    ).toBeGreaterThan(50);
  });

  it("rejects unreleased or missing assets from runtime release gate", () => {
    const records: readonly RuntimeVisualAssetRecord[] = [
      {
        asset_id: "draft_asset",
        generation_status: "draft",
        qa_status: "pending",
        runtime_release_status: "unreleased",
        final_path: "art/generated/draft/draft_asset.png",
        hash: "abc",
      },
      {
        asset_id: "missing_file_asset",
        generation_status: "approved",
        qa_status: "approved",
        runtime_release_status: "released",
        final_path: "art/does_not_exist.png",
        hash: "def",
      },
    ];

    expect(() =>
      createRuntimeVisualLibrary(records, { "art/exists.png": "/url" }),
    ).toThrow("cannot resolve");

    const library = createRuntimeVisualLibrary(
      [
        {
          asset_id: "approved_asset",
          generation_status: "approved",
          qa_status: "approved",
          runtime_release_status: "released",
          final_path: "art/exists.png",
          hash: "def",
        },
      ],
      { "art/exists.png": "/resolved-url" },
    );
    expect(library.get("draft_asset")).toBeUndefined();
    expect(library.get("approved_asset")).toEqual({
      assetId: "approved_asset",
      finalPath: "art/exists.png",
      hash: "def",
      url: "/resolved-url",
    });
  });

  it("rejects scene configurations where anchor scale violates allowed recipe scale", () => {
    const brokenScene: OfficeVisualSceneConfiguration = {
      ...OFFICE_VISUAL_SCENE,
      anchors: {
        ...OFFICE_VISUAL_SCENE.anchors,
        "primary-desk-chair": {
          ...OFFICE_VISUAL_SCENE.anchors["primary-desk-chair"],
          scale: 1.5,
        },
      },
    };
    const issues = validateOfficeVisualScene(brokenScene);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]).toContain("scale is outside its allowed range");
  });
});
