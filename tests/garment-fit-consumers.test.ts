import { describe, expect, it } from "vitest";

import assetManifest from "../art/manifest/asset_manifest.json";
import characterCatalog from "../art/manifest/character_catalog.json";
import fitBank from "../art/manifest/garment_fit_profiles.json";
import {
  createCharacterComponentLibrary,
  projectCharacterLayers,
  type CharacterCatalogData,
  type CharacterComponentManifestRecord,
} from "../src/presentation/character-components";
import {
  buildCharacterRenderPlan,
  resolvePersonCharacterRecipe,
} from "../src/presentation/character-render-plan";
import {
  createGarmentFitBank,
  type GarmentFitBankData,
  type GarmentFitBoundedWarp,
} from "../src/presentation/garment-fit";
import { composePoseProof } from "../src/presentation/pose-proof";
import { composeSceneCharacter } from "../src/presentation/scene-composition";
import { createSceneProofWorld } from "../src/presentation/scene-proof";
import {
  requireScene,
  SCENE_REGISTRY,
} from "../src/presentation/scene-registry";
import {
  PRODUCTION_POSE_ART,
  PRODUCTION_POSE_REGISTRY,
  PRODUCTION_VISUAL_LIBRARY,
} from "../src/presentation/visual-integration";

/**
 * Adversarial regressions for EVERY consumer of projected character layers.
 *
 * The independent audit of the first head built a structurally valid
 * sixteen-band warp, pushed it through scene composition and the pose proof,
 * and got back drawable top and trouser rectangles with no bands and no
 * refusal — because the only guard lived in the render plan, and those two
 * consumers never went through it. The repair moved the refusal into the
 * projection, which every consumer passes through. These tests replay the
 * audit's probe against each consumer and assert that no garment resolving to
 * a warp comes back with a URL anywhere.
 */

const WARP: GarmentFitBoundedWarp = {
  kind: "bounded-warp",
  scaleY: 1,
  translateY: 0,
  controlPoints: [
    { at: 0, scaleX: 0.9, offsetX: 0 },
    { at: 0.5, scaleX: 0.86, offsetX: 0 },
    { at: 1, scaleX: 0.88, offsetX: 0 },
  ],
};

/** The shipped bank with every affine profile swapped for a valid warp. */
const WARP_BANK: GarmentFitBankData = {
  ...(fitBank as GarmentFitBankData),
  garments: (fitBank as GarmentFitBankData).garments.map((garment) =>
    garment.classification === "affine-reusable"
      ? {
          ...garment,
          classification: "bounded-warp-reusable" as const,
          profiles: garment.profiles.map((profile) => ({
            ...profile,
            transform: WARP,
          })),
        }
      : garment,
  ),
};

const RECORDS =
  assetManifest.assets as readonly CharacterComponentManifestRecord[];
const CATALOG = characterCatalog as CharacterCatalogData;
const WARP_LIBRARY = createCharacterComponentLibrary(
  RECORDS,
  CATALOG,
  createGarmentFitBank(WARP_BANK),
);
const WARPED_KINDS = new Set(["top", "bottom"]);

/** People whose body family is the one the warp targets. */
function slimPeople() {
  const world = createSceneProofWorld(WARP_LIBRARY);
  return {
    world,
    people: world.personOrder
      .map((id) => world.people[id]!)
      .filter((person) => person.appearance !== undefined),
  };
}

describe("a bounded warp cannot become a rectangle in any consumer", () => {
  it("the projection itself withholds it, once, for everyone", () => {
    const { people } = slimPeople();
    let refused = 0;
    for (const person of people) {
      for (const pose of ["standing-neutral", "seated-at-desk"]) {
        // Resolve through the same path every consumer uses.
        const recipe = resolvePersonCharacterRecipe(
          person.appearance!,
          pose,
          WARP_LIBRARY,
        );
        if (recipe.identity.bodyFamily !== "dev-g2-slim") continue;
        const projected = projectCharacterLayers(recipe, WARP_LIBRARY);
        if (!projected) continue;
        for (const layer of projected.layers) {
          if (!WARPED_KINDS.has(layer.kind)) continue;
          expect(layer.released).toBe(false);
          expect(layer.fitRefusal?.code).toBe("fit-warp-not-renderable");
          expect(layer.fit?.bands?.length).toBe(16);
          refused += 1;
        }
        expect(projected.fullyReleased).toBe(false);
      }
    }
    expect(refused).toBeGreaterThan(0);
  });

  it("composeSceneCharacter returns no drawable warp layer", () => {
    const { world, people } = slimPeople();
    const scene = requireScene(SCENE_REGISTRY, "office-council-staff-fixture");
    let seen = 0;
    for (const person of people) {
      for (const anchor of scene.anchors.values()) {
        const composed = composeSceneCharacter({
          personId: person.id,
          displayName: "probe",
          appearance: person.appearance!,
          scene,
          anchor,
          library: WARP_LIBRARY,
          visualLibrary: PRODUCTION_VISUAL_LIBRARY,
          poseRegistry: PRODUCTION_POSE_REGISTRY,
          poseArt: PRODUCTION_POSE_ART,
        });
        if (composed.recipe.identity.bodyFamily !== "dev-g2-slim") continue;
        for (const layer of composed.layers) {
          if (!WARPED_KINDS.has(layer.kind)) continue;
          seen += 1;
          expect(layer.url).toBeNull();
          expect(Number.isFinite(layer.widthPercent)).toBe(true);
        }
        expect(composed.complete).toBe(false);
        expect(
          composed.diagnostics.some(
            (diagnostic) => diagnostic.code === "asset-not-runtime-approved",
          ),
        ).toBe(true);
      }
    }
    expect(world.personOrder.length).toBeGreaterThan(0);
    expect(seen).toBeGreaterThan(0);
  });

  it("composePoseProof returns no drawable warp layer", () => {
    const { world } = slimPeople();
    const proof = composePoseProof(
      world,
      WARP_LIBRARY,
      PRODUCTION_VISUAL_LIBRARY,
      PRODUCTION_POSE_REGISTRY,
      PRODUCTION_POSE_ART,
      6,
    );
    let seen = 0;
    for (const person of proof.people) {
      if (person.bodyFamily !== "dev-g2-slim") continue;
      for (const cell of person.cells) {
        for (const layer of cell.layers) {
          if (!WARPED_KINDS.has(layer.kind)) continue;
          seen += 1;
          expect(layer.url).toBeNull();
          expect(cell.unreleasedAssetIds).toContain(layer.assetId);
        }
        if (cell.layers.some((layer) => WARPED_KINDS.has(layer.kind))) {
          expect(cell.drawn).toBe(false);
        }
      }
    }
    expect(seen).toBeGreaterThan(0);
  });

  it("buildCharacterRenderPlan returns no drawable warp layer and names why", () => {
    const { people } = slimPeople();
    let seen = 0;
    for (const person of people) {
      const plan = buildCharacterRenderPlan({
        personId: person.id,
        appearance: person.appearance!,
        anchor: {
          id: "probe",
          xPercent: 50,
          yPercent: 60,
          scale: 1,
          poseFamily: "standing-neutral",
          depth: 1,
          bodyWidthPercent: 20,
        },
        plate: { width: 1600, height: 900 },
        library: WARP_LIBRARY,
        visualLibrary: PRODUCTION_VISUAL_LIBRARY,
      });
      if (plan.identity.bodyFamily !== "dev-g2-slim") continue;
      for (const layer of plan.layers) {
        if (!WARPED_KINDS.has(layer.kind)) continue;
        seen += 1;
        expect(layer.released).toBe(false);
        expect(layer.url).toBeNull();
        expect(layer.bands?.length).toBe(16);
        expect(plan.missing).toContain(layer.assetId);
      }
      expect(plan.complete).toBe(false);
      expect(
        plan.fitRefusals
          .map((refusal) => refusal.code)
          .every((code) => code === "fit-warp-not-renderable"),
      ).toBe(true);
      expect(plan.fitRefusals.length).toBeGreaterThan(0);
    }
    expect(seen).toBeGreaterThan(0);
  });
});

describe("the production bank through every consumer", () => {
  const library = createCharacterComponentLibrary(
    RECORDS,
    CATALOG,
    createGarmentFitBank(fitBank as GarmentFitBankData),
  );

  it("still fits the slim body's garments with an affine and draws them", () => {
    const world = createSceneProofWorld(library);
    const scene = requireScene(SCENE_REGISTRY, "office-council-staff-fixture");
    let fitted = 0;
    for (const id of world.personOrder) {
      const person = world.people[id]!;
      if (!person.appearance) continue;
      for (const anchor of scene.anchors.values()) {
        const composed = composeSceneCharacter({
          personId: id,
          displayName: "probe",
          appearance: person.appearance,
          scene,
          anchor,
          library,
          visualLibrary: PRODUCTION_VISUAL_LIBRARY,
          poseRegistry: PRODUCTION_POSE_REGISTRY,
          poseArt: PRODUCTION_POSE_ART,
        });
        if (composed.recipe.identity.bodyFamily !== "dev-g2-slim") continue;
        for (const layer of composed.layers) {
          if (!WARPED_KINDS.has(layer.kind)) continue;
          expect(layer.url).not.toBeNull();
          fitted += 1;
        }
      }
    }
    expect(fitted).toBeGreaterThan(0);
  });
});
