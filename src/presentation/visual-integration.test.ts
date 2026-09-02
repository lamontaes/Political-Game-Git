import { describe, expect, it } from "vitest";

import { derivePersonAppearance } from "../simulation/person-appearance";
import {
  createRunBFixture,
  type RunBScenePersonContext,
} from "./run-b-fixture";
import {
  CHARACTER_VISUAL_RECIPES,
  composeOfficeVisuals,
  createRuntimeVisualLibrary,
  DEV_FIXTURE_APPEARANCE_SEEDS,
  OFFICE_VISUAL_SCENE,
  PRODUCTION_VISUAL_LIBRARY,
  resolvePersonAppearance,
  resolvePersonVisualRecipe,
  validateOfficeVisualScene,
  type OfficeVisualSceneConfiguration,
  type RuntimeVisualAssetRecord,
} from "./visual-integration";

describe("Stage 6.5 visual integration contract", () => {
  const fixture = createRunBFixture();

  it("composes approved released runtime visual assets deterministically for fixture people", () => {
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
      "f2f5ae8ca3e82e13cf6fb6f8f27c654b5c95a93c6ca2c31d5c56381fdd543406",
    );
    expect(composition.occluders[0]?.depth).toBe(4);

    expect(composition.characters).toHaveLength(2);

    const primary = composition.characters.find(
      (c) => c.anchorId === "primary-desk-chair",
    );
    expect(primary).toBeDefined();
    expect(primary!.isPlaceholder).toBe(false);
    expect(primary!.appearanceRecipeId).toBe(
      "appearance:candidate-A01:primary-desk-seated:v1",
    );
    expect(primary!.asset?.assetId).toBe(
      "human_candidate_A01_primary_desk_seated_v1",
    );
    expect(primary!.asset?.hash).toBe(
      "8e5882e26eab1c6cf966cff188bfebd4e40cd117804e87930a0b06d67ca66e43",
    );
    expect(primary!.depth).toBe(2);
    expect(primary!.widthPercent).toBeCloseTo(24.225, 2);
    expect(primary!.heightPercent).toBeCloseTo(58.051, 2);
    expect(primary!.leftPercent).toBeCloseTo(66.918, 2);
    expect(primary!.topPercent).toBeCloseTo(32.876, 2);
    expect(primary!.hitbox.leftPercent).toBeCloseTo(75.397, 2);
    expect(primary!.hitbox.topPercent).toBeCloseTo(35.779, 2);
    expect(primary!.hitbox.widthPercent).toBeCloseTo(13.324, 2);
    expect(primary!.hitbox.heightPercent).toBeCloseTo(29.025, 2);

    const guest = composition.characters.find(
      (c) => c.anchorId === "left-guest-chair",
    );
    expect(guest).toBeDefined();
    expect(guest!.isPlaceholder).toBe(false);
    expect(guest!.appearanceRecipeId).toBe(
      "appearance:candidate-B01:left-guest-seated:v1",
    );
    expect(guest!.asset?.assetId).toBe(
      "human_candidate_B01_left_guest_seated_v1",
    );
    expect(guest!.asset?.hash).toBe(
      "fd880e52fb191d6c32019ba451d006176ebc7762db89590c437c67586906be8d",
    );
    expect(guest!.depth).toBe(3);
    expect(guest!.widthPercent).toBeCloseTo(17.575, 2);
    expect(guest!.heightPercent).toBeCloseTo(42.117, 2);
    expect(guest!.leftPercent).toBeCloseTo(20.365, 2);
    expect(guest!.topPercent).toBeCloseTo(39.989, 2);
    expect(guest!.hitbox.leftPercent).toBeCloseTo(21.244, 2);
    expect(guest!.hitbox.topPercent).toBeCloseTo(40.831, 2);
    expect(guest!.hitbox.widthPercent).toBeCloseTo(15.817, 2);
    expect(guest!.hitbox.heightPercent).toBeCloseTo(21.059, 2);
  });

  describe("Person-owned visual identity invariant regressions", () => {
    const personA = fixture.scenePeople[0];
    const personB = fixture.scenePeople[1];

    it("1. Reordering scene.visualRecipes cannot change a Person's appearance identity", () => {
      const reversedScene: OfficeVisualSceneConfiguration = {
        ...OFFICE_VISUAL_SCENE,
        visualRecipes: [
          CHARACTER_VISUAL_RECIPES.leftGuestSeated,
          CHARACTER_VISUAL_RECIPES.primaryDeskSeated,
        ],
      };

      const recipeAOriginal = resolvePersonVisualRecipe(
        personA,
        OFFICE_VISUAL_SCENE.anchors["primary-desk-chair"],
        OFFICE_VISUAL_SCENE,
      );
      const recipeAReversed = resolvePersonVisualRecipe(
        personA,
        reversedScene.anchors["primary-desk-chair"],
        reversedScene,
      );

      expect(recipeAOriginal).not.toBeNull();
      expect(recipeAReversed).not.toBeNull();
      expect(recipeAReversed!.appearanceSeed).toBe(
        recipeAOriginal!.appearanceSeed,
      );
      expect(recipeAReversed!.assetId).toBe(recipeAOriginal!.assetId);

      const compOriginal = composeOfficeVisuals(
        fixture.scenePeople,
        PRODUCTION_VISUAL_LIBRARY,
        OFFICE_VISUAL_SCENE,
      );
      const compReversed = composeOfficeVisuals(
        fixture.scenePeople,
        PRODUCTION_VISUAL_LIBRARY,
        reversedScene,
      );

      expect(compReversed.characters).toEqual(compOriginal.characters);
    });

    it("2. Reordering people in the fixture cannot change which appearance belongs to each Person", () => {
      const reorderedPeople: readonly [
        RunBScenePersonContext,
        RunBScenePersonContext,
      ] = [personB, personA];

      const compReordered = composeOfficeVisuals(
        reorderedPeople,
        PRODUCTION_VISUAL_LIBRARY,
        OFFICE_VISUAL_SCENE,
      );

      const resolvedPersonA = compReordered.characters.find(
        (c) => c.personId === personA.personId,
      );
      const resolvedPersonB = compReordered.characters.find(
        (c) => c.personId === personB.personId,
      );

      expect(resolvedPersonA?.appearanceRecipeId).toBe(
        "appearance:candidate-A01:primary-desk-seated:v1",
      );
      expect(resolvedPersonA?.asset?.assetId).toBe(
        "human_candidate_A01_primary_desk_seated_v1",
      );

      expect(resolvedPersonB?.appearanceRecipeId).toBe(
        "appearance:candidate-B01:left-guest-seated:v1",
      );
      expect(resolvedPersonB?.asset?.assetId).toBe(
        "human_candidate_B01_left_guest_seated_v1",
      );
    });

    it("3. Swapping two people between scene anchors does NOT swap their appearance identity", () => {
      // Create a scene with explicit multi-pose recipes for personA and personB
      const customScene: OfficeVisualSceneConfiguration = {
        ...OFFICE_VISUAL_SCENE,
        visualRecipes: [
          CHARACTER_VISUAL_RECIPES.primaryDeskSeated,
          {
            ...CHARACTER_VISUAL_RECIPES.leftGuestSeated,
            appearanceRecipeId: "appearance:candidate-A01:left-guest-seated:v1",
            appearanceSeed: DEV_FIXTURE_APPEARANCE_SEEDS.candidateA01,
            assetId: "human_candidate_A01_primary_desk_seated_v1",
          },
          {
            ...CHARACTER_VISUAL_RECIPES.primaryDeskSeated,
            appearanceRecipeId:
              "appearance:candidate-B01:primary-desk-seated:v1",
            appearanceSeed: DEV_FIXTURE_APPEARANCE_SEEDS.candidateB01,
            assetId: "human_candidate_B01_left_guest_seated_v1",
          },
          CHARACTER_VISUAL_RECIPES.leftGuestSeated,
        ],
      };

      const swappedPeople: readonly [
        RunBScenePersonContext,
        RunBScenePersonContext,
      ] = [
        {
          ...personA,
          anchorId: "left-guest-chair",
          visualVariant: "guest",
        },
        {
          ...personB,
          anchorId: "primary-desk-chair",
          visualVariant: "primary",
        },
      ];

      const compSwapped = composeOfficeVisuals(
        swappedPeople,
        PRODUCTION_VISUAL_LIBRARY,
        customScene,
      );

      const swappedA = compSwapped.characters.find(
        (c) => c.personId === personA.personId,
      );
      const swappedB = compSwapped.characters.find(
        (c) => c.personId === personB.personId,
      );

      expect(swappedA?.appearanceRecipeId).toBe(
        "appearance:candidate-A01:left-guest-seated:v1",
      );
      expect(swappedA?.anchorId).toBe("left-guest-chair");

      expect(swappedB?.appearanceRecipeId).toBe(
        "appearance:candidate-B01:primary-desk-seated:v1",
      );
      expect(swappedB?.anchorId).toBe("primary-desk-chair");
    });

    it("4. Moving the SAME Person between two compatible poses preserves that person's appearance identity", () => {
      const customScene: OfficeVisualSceneConfiguration = {
        ...OFFICE_VISUAL_SCENE,
        visualRecipes: [
          CHARACTER_VISUAL_RECIPES.primaryDeskSeated,
          {
            ...CHARACTER_VISUAL_RECIPES.leftGuestSeated,
            appearanceRecipeId: "appearance:candidate-A01:left-guest-seated:v1",
            appearanceSeed: DEV_FIXTURE_APPEARANCE_SEEDS.candidateA01,
            assetId: "human_candidate_A01_primary_desk_seated_v1",
          },
        ],
      };

      const personAtDesk: RunBScenePersonContext = {
        ...personA,
        anchorId: "primary-desk-chair",
      };
      const personAtGuest: RunBScenePersonContext = {
        ...personA,
        anchorId: "left-guest-chair",
      };

      const recipeDesk = resolvePersonVisualRecipe(
        personAtDesk,
        customScene.anchors["primary-desk-chair"],
        customScene,
      );
      const recipeGuest = resolvePersonVisualRecipe(
        personAtGuest,
        customScene.anchors["left-guest-chair"],
        customScene,
      );

      expect(recipeDesk?.appearanceSeed).toBe(
        DEV_FIXTURE_APPEARANCE_SEEDS.candidateA01,
      );
      expect(recipeGuest?.appearanceSeed).toBe(
        DEV_FIXTURE_APPEARANCE_SEEDS.candidateA01,
      );
      expect(recipeDesk?.poseFamily).toBe("seated-at-desk");
      expect(recipeGuest?.poseFamily).toBe("seated-in-guest-chair");
    });

    it("5. A person without an authored recipe resolves through the modular path, and fails closed when no body exists for the pose", () => {
      const unknownPerson: RunBScenePersonContext = {
        personId: "person_unknown_unreleased_999",
        title: "Staffer",
        role: "Visiting aide",
        qualitativeRead: "Unknown",
        inferredRead: "No notes",
        anchorId: "primary-desk-chair",
        visualVariant: "primary",
      };

      const recipe = resolvePersonVisualRecipe(
        unknownPerson,
        OFFICE_VISUAL_SCENE.anchors["primary-desk-chair"],
        OFFICE_VISUAL_SCENE,
      );
      expect(recipe).toBeNull();

      // No pin: legacy people resolve against generation 1, whose DEV
      // fixtures include a seated body, so the ordinary seam composes a
      // modular character at the same anchor with the same compositor.
      const legacy = composeOfficeVisuals(
        [unknownPerson],
        PRODUCTION_VISUAL_LIBRARY,
        OFFICE_VISUAL_SCENE,
      );
      expect(legacy.characters).toHaveLength(1);
      const modularVisual = legacy.characters[0]!;
      expect(modularVisual.asset).toBeNull();
      expect(modularVisual.modular).not.toBeNull();
      expect(modularVisual.isPlaceholder).toBe(false);
      expect(modularVisual.modular!.catalogGeneration).toBe(1);
      expect(modularVisual.modular!.poseFamily).toBe("seated-at-desk");
      expect(modularVisual.modular!.layers.map((l) => l.kind)).toContain(
        "body",
      );
      expect(modularVisual.appearanceRecipeId).toBe(
        modularVisual.modular!.recipeKey,
      );
      expect(modularVisual.hitbox.widthPercent).toBeGreaterThan(0);
      expect(modularVisual.depth).toBe(2);

      // Pinned to the production generation: the real body families have no
      // seated art yet, so the composition fails closed to the placeholder.
      const pinnedPerson: RunBScenePersonContext = {
        ...unknownPerson,
        personId: "person_pinned_gen2_999",
        appearance: derivePersonAppearance(
          "person_pinned_gen2_999",
          undefined,
          2,
        ),
      };
      const pinned = composeOfficeVisuals(
        [pinnedPerson],
        PRODUCTION_VISUAL_LIBRARY,
        OFFICE_VISUAL_SCENE,
      );
      const placeholder = pinned.characters[0]!;
      expect(placeholder.isPlaceholder).toBe(true);
      expect(placeholder.asset).toBeNull();
      expect(placeholder.modular).toBeNull();
      expect(placeholder.appearanceRecipeId).toBe(
        "placeholder:unresolved-recipe-pose",
      );
      expect(placeholder.hitbox.widthPercent).toBeGreaterThan(0);
      expect(placeholder.hitbox.heightPercent).toBeGreaterThan(0);
    });

    it("6. Composition does not mutate Person or World", () => {
      const worldJsonBefore = JSON.stringify(fixture.world);
      const peopleJsonBefore = JSON.stringify(fixture.scenePeople);

      composeOfficeVisuals(fixture.scenePeople, PRODUCTION_VISUAL_LIBRARY);

      expect(JSON.stringify(fixture.world)).toBe(worldJsonBefore);
      expect(JSON.stringify(fixture.scenePeople)).toBe(peopleJsonBefore);
    });

    it("7. Canonical appearance derivation is stable and person-owned", () => {
      const appearanceA = resolvePersonAppearance(personA);
      const appearanceB = resolvePersonAppearance(personB);

      expect(appearanceA.seed).toBe(
        derivePersonAppearance(personA.personId).seed,
      );
      expect(appearanceB.seed).toBe(
        derivePersonAppearance(personB.personId).seed,
      );
      expect(appearanceA.seed).not.toBe(appearanceB.seed);
    });
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
