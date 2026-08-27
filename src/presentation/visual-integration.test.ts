import { describe, expect, it } from "vitest";
import { createRunBFixture } from "./run-b-fixture";
import {
  CHARACTER_VISUAL_RECIPES,
  composeOfficeVisuals,
  createRuntimeVisualLibrary,
  OFFICE_VISUAL_SCENE,
  PRODUCTION_VISUAL_LIBRARY,
  validateOfficeVisualScene,
  type OfficeVisualSceneConfiguration,
  type RuntimeVisualAssetRecord,
} from "./visual-integration";

describe("Stage 6.5 production visual integration", () => {
  it("resolves every released production image through the existing manifest", () => {
    expect([...PRODUCTION_VISUAL_LIBRARY.keys()].sort()).toEqual([
      "env_lexington_council_staff_office_prompt30_foreground_mask_v1",
      "env_lexington_council_staff_office_prompt30_v1",
      "human_candidate_A01_primary_desk_seated_v1",
      "human_candidate_B01_left_guest_seated_v1",
    ]);
    for (const asset of PRODUCTION_VISUAL_LIBRARY.values()) {
      expect(asset.url).toMatch(/^\/|^data:|^file:|^[a-z]+:/i);
      expect(asset.hash).toMatch(/^[a-f0-9]{64}$/);
    }
    expect(
      PRODUCTION_VISUAL_LIBRARY.get(
        "env_lexington_council_staff_office_prompt30_v1",
      )?.finalPath,
    ).toBe(
      "art/families/council-staff-office/env_lexington_council_staff_office_prompt30_runtime_2x_v1.png",
    );
  });

  it("admits only generation-approved, QA-approved, runtime-released records", () => {
    const released: RuntimeVisualAssetRecord = {
      asset_id: "released",
      generation_status: "approved",
      qa_status: "approved",
      runtime_release_status: "released",
      final_path: "art/released.png",
      hash: "a".repeat(64),
    };
    const library = createRuntimeVisualLibrary(
      [
        released,
        {
          ...released,
          asset_id: "unreleased",
          runtime_release_status: "unreleased",
        },
        { ...released, asset_id: "qa-pending", qa_status: "pending" },
        {
          ...released,
          asset_id: "generation-pending",
          generation_status: "pending",
        },
      ],
      { "art/released.png": "/released.png" },
    );
    expect([...library.keys()]).toEqual(["released"]);
  });

  it("fails closed for a missing runtime image", () => {
    const fixture = createRunBFixture();
    expect(() => composeOfficeVisuals(fixture.scenePeople, new Map())).toThrow(
      "Required runtime visual asset",
    );
  });

  it("rejects an invalid anchor and pose combination", () => {
    const invalidScene: OfficeVisualSceneConfiguration = {
      ...OFFICE_VISUAL_SCENE,
      appearanceByAnchor: {
        ...OFFICE_VISUAL_SCENE.appearanceByAnchor,
        "primary-desk-chair": CHARACTER_VISUAL_RECIPES.leftGuestSeated,
      },
    };
    expect(validateOfficeVisualScene(invalidScene).join("\n")).toContain(
      "incompatible with anchor 'primary-desk-chair'",
    );
    expect(validateOfficeVisualScene(invalidScene).join("\n")).toContain(
      "does not match anchor 'primary-desk-chair' pose",
    );
  });

  it("uses measured chair anchors and one released furniture-only foreground mask", () => {
    expect(OFFICE_VISUAL_SCENE.anchors).toMatchObject({
      "primary-desk-chair": {
        xPercent: 77.7,
        yPercent: 67.5,
        scale: 1.05,
      },
      "left-guest-chair": {
        xPercent: 29.5,
        yPercent: 70.0,
        scale: 0.85,
      },
    });
    expect(OFFICE_VISUAL_SCENE.occluders).toEqual([
      {
        id: "office-furniture-foreground",
        assetId:
          "env_lexington_council_staff_office_prompt30_foreground_mask_v1",
        depth: 4,
      },
    ]);
    const composition = composeOfficeVisuals(
      createRunBFixture().scenePeople,
      PRODUCTION_VISUAL_LIBRARY,
    );
    expect(composition.occluders).toHaveLength(1);
    expect(composition.occluders[0]?.asset.assetId).toBe(
      "env_lexington_council_staff_office_prompt30_foreground_mask_v1",
    );
  });

  it("repeats deterministically without mutating canonical people or World", () => {
    const fixture = createRunBFixture();
    const before = JSON.stringify(fixture.world);
    const first = composeOfficeVisuals(
      fixture.scenePeople,
      PRODUCTION_VISUAL_LIBRARY,
    );
    const second = composeOfficeVisuals(
      fixture.scenePeople,
      PRODUCTION_VISUAL_LIBRARY,
    );
    expect(second).toEqual(first);
    expect(JSON.stringify(fixture.world)).toBe(before);
    expect(
      fixture.scenePeople.every((person) => !("appearanceRecipeId" in person)),
    ).toBe(true);
  });

  it("composes an alternate valid people order from anchors rather than names", () => {
    const fixture = createRunBFixture();
    const alternate = composeOfficeVisuals(
      [...fixture.scenePeople].reverse(),
      PRODUCTION_VISUAL_LIBRARY,
    );
    expect(alternate.characters.map((character) => character.anchorId)).toEqual(
      ["left-guest-chair", "primary-desk-chair"],
    );
    expect(
      alternate.characters.map((character) => character.asset.assetId),
    ).toEqual([
      "human_candidate_B01_left_guest_seated_v1",
      "human_candidate_A01_primary_desk_seated_v1",
    ]);
  });
});
