import assetManifest from "../../art/manifest/asset_manifest.json";
import characterCatalog from "../../art/manifest/character_catalog.json";
import garmentFitProfiles from "../../art/manifest/garment_fit_profiles.json";
import poseFamilies from "../../art/manifest/pose_families.json";
import {
  derivePersonAppearance,
  type PersonAppearance,
} from "../simulation/person-appearance";
import {
  createCharacterComponentLibrary,
  liftCandidatesForReview,
  type CharacterAttachmentAnchor,
  type CharacterCatalogData,
  type CharacterComponentLibrary,
  type CharacterComponentManifestRecord,
} from "./character-components";
import {
  buildCharacterRenderPlan,
  type CharacterRenderPlan,
} from "./character-render-plan";
import { createGarmentFitBank, type GarmentFitBankData } from "./garment-fit";
import type {
  RunBSceneAnchorId,
  RunBScenePersonContext,
  RunBScenePersonVariant,
} from "./run-b-fixture";
import {
  createRasterTierLadder,
  type RasterTier,
  type RasterTierLadder,
} from "./raster-tiers";
import {
  OFFICE_FIXTURE_SCENE_ID,
  requireScene,
  SCENE_REGISTRY,
  type RegisteredScene,
} from "./scene-registry";
import {
  createPoseFamilyRegistry,
  indexPoseArt,
  type PoseFamilyRegistryData,
} from "./pose-families";
import { resolvePerspectiveScale } from "./scene-placement";
import type {
  SceneCameraPolicy,
  SceneRect,
  SceneSize,
} from "./scene-transform";

type RuntimeAssetStatus = "draft" | "approved" | "rejected" | "pending";
type QaStatus = "approved" | "rejected" | "pending";
type ReleaseStatus = "released" | "unreleased";

export interface RuntimeRasterTierRecord {
  readonly width: number;
  readonly height: number;
  readonly path: string;
  readonly hash: string;
  readonly derivation: RasterTier["derivation"];
  readonly native_detail_width?: number;
}

export interface RuntimeVisualAssetRecord {
  readonly asset_id: string;
  readonly generation_status: RuntimeAssetStatus;
  readonly qa_status: QaStatus;
  readonly runtime_release_status: ReleaseStatus;
  readonly final_path?: string;
  readonly hash?: string;
  readonly raster_tiers?: readonly RuntimeRasterTierRecord[];
}

/** One tier of an asset, with its runtime URL resolved. */
export interface RuntimeRasterTier extends RasterTier {
  readonly url: string;
}

export interface RuntimeVisualAsset {
  readonly assetId: string;
  readonly finalPath: string;
  readonly hash: string;
  readonly url: string;
  /**
   * Ordered tier ladder, when this asset registers one. Assets that ship a
   * single raster leave it null rather than pretending to a ladder they do not
   * have; the runtime then paints `url` and reports the shortfall honestly.
   */
  readonly tierLadder: RasterTierLadder | null;
  readonly tierUrls: ReadonlyMap<number, string>;
}

export type RuntimeVisualLibrary = ReadonlyMap<string, RuntimeVisualAsset>;

export interface CharacterRoot {
  readonly convention: "pelvis-hip-center";
  readonly x: number;
  readonly y: number;
}

export interface SeatedContact {
  readonly convention: "seat-plane-at-pelvis";
  readonly root: CharacterRoot;
}

/**
 * A flattened authored outfit has no rig: every garment is already painted
 * into the single raster, so it exposes no attachment anchors. The type is the
 * real attachment contract so a modular recipe can use the same field.
 */
export interface AuthoredWardrobeCompatibility {
  readonly mode: "authored-outfit";
  readonly attachmentSlots: readonly CharacterAttachmentAnchor[];
}

/**
 * A modular composition owns a body rig whose attachment anchors are metadata
 * on the body component. Declared here as the second wardrobe mode; the scene
 * compositor does not yet consume it.
 */
export interface ModularWardrobeCompatibility {
  readonly mode: "modular-composition";
  readonly bodyFamily: string;
  readonly attachmentSlots: readonly CharacterAttachmentAnchor[];
}

export type WardrobeCompatibility =
  AuthoredWardrobeCompatibility | ModularWardrobeCompatibility;

export interface CharacterVisualRecipe {
  readonly appearanceRecipeId: string;
  /**
   * Canonical person-owned appearance seed this visual recipe satisfies.
   */
  readonly appearanceSeed: string;
  /**
   * Explicit label indicating development/test fixture provenance (e.g. historical A01/B01),
   * strictly distinct from canonical Person identity.
   */
  readonly devFixtureTag?: string;
  readonly assetId: string;
  readonly bodyVisualFamily: "adult-authored-illustration";
  readonly poseFamily: "seated-at-desk" | "seated-in-guest-chair";
  readonly root: CharacterRoot;
  readonly seatedContact: SeatedContact;
  readonly visualBounds: {
    readonly sourceAspectRatio: number;
    readonly widthPercent: number;
    readonly interaction: {
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
    };
  };
  readonly allowedScale: { readonly minimum: number; readonly maximum: number };
  readonly deterministicSelectionKey: string;
  readonly wardrobe: WardrobeCompatibility;
}

export interface SceneVisualAnchor {
  readonly id: RunBSceneAnchorId;
  readonly xPercent: number;
  /** The seat plane this anchor's pose contacts, in plate percent. */
  readonly yPercent: number;
  /** Derived from the scene's floor calibration; never tuned per sprite. */
  readonly scale: number;
  readonly poseFamily: CharacterVisualRecipe["poseFamily"];
  /** Paint order. Perspective depth is `contactFloorYPercent`, not this. */
  readonly zOrder: number;
  /** Where on the floor this anchor sits, which is what scale is derived from. */
  readonly contactFloorYPercent: number;
}

export interface SceneOccluder {
  readonly id: string;
  readonly assetId: string;
  /** Paint order. Named occluders each keep their own. */
  readonly zOrder: number;
}

export interface ComposedSceneOccluder extends SceneOccluder {
  readonly asset: RuntimeVisualAsset;
}

export interface SceneUiSafeZone {
  readonly id: string;
  readonly edge: "bottom-left" | "top-left" | "bottom-right" | "top-right";
  readonly width: number;
  readonly height: number;
}

export type OfficeDocumentAnchorId =
  "working-draft" | "briefing-memo" | "civic-marker";

export interface OfficeVisualSceneConfiguration {
  readonly environmentAssetId: string;
  readonly plate: SceneSize;
  readonly camera: SceneCameraPolicy;
  readonly safeArea: SceneRect;
  readonly essentialContentArea: SceneRect;
  readonly uiSafeZones: readonly SceneUiSafeZone[];
  readonly documentAnchors: Readonly<
    Record<
      OfficeDocumentAnchorId,
      { readonly xPercent: number; readonly yPercent: number }
    >
  >;
  readonly anchors: Readonly<Record<RunBSceneAnchorId, SceneVisualAnchor>>;
  readonly occluders: readonly SceneOccluder[];
  readonly visualRecipes: readonly CharacterVisualRecipe[];
  /**
   * How wide a normalized modular body canvas paints on this plate at scale 1,
   * as a percentage of plate width. It belongs to the SCENE, not to an anchor:
   * perspective already varies with the floor line, and giving each seat its
   * own body width is how hand-tuned sprites drift apart.
   */
  readonly standardBodyWidthPercent: number;
}

export interface ComposedCharacterVisual {
  readonly personId: string;
  readonly anchorId: RunBSceneAnchorId;
  readonly visualVariant: RunBScenePersonVariant;
  /** Authored flattened raster, when an explicit recipe matched. */
  readonly asset: RuntimeVisualAsset | null;
  /** Modular render plan, when no authored recipe matched but a body resolved. */
  readonly modular: CharacterRenderPlan | null;
  readonly isPlaceholder: boolean;
  readonly appearanceRecipeId: string;
  readonly leftPercent: number;
  readonly topPercent: number;
  readonly widthPercent: number;
  readonly heightPercent: number;
  readonly hitbox: {
    readonly leftPercent: number;
    readonly topPercent: number;
    readonly widthPercent: number;
    readonly heightPercent: number;
  };
  readonly zOrder: number;
}

export interface OfficeVisualComposition {
  readonly environment: RuntimeVisualAsset;
  readonly characters: readonly ComposedCharacterVisual[];
  readonly occluders: readonly ComposedSceneOccluder[];
}

/**
 * Every raster the runtime may paint.
 *
 * `art/references/masters/**` is excluded on purpose. Those files are banked
 * provenance — the 5504x3072 originals every runtime tier is reduced from —
 * and nothing selects them: a released asset's `final_path` is always a tier.
 * Globbing them anyway put tens of megabytes of source master into the shipped
 * bundle to satisfy URLs no page ever asks for.
 */
const runtimeUrls = import.meta.glob<string>(
  ["../../art/**/*.{png,jpg,jpeg,webp}", "!../../art/references/masters/**"],
  {
    eager: true,
    import: "default",
    query: "?url",
  },
);

export function createRuntimeVisualLibrary(
  records: readonly RuntimeVisualAssetRecord[],
  urlIndex: Readonly<Record<string, string>>,
): RuntimeVisualLibrary {
  const library = new Map<string, RuntimeVisualAsset>();
  for (const record of records) {
    if (
      record.generation_status !== "approved" ||
      record.qa_status !== "approved" ||
      record.runtime_release_status !== "released"
    ) {
      continue;
    }
    if (!record.final_path || !record.hash) {
      throw new Error(
        `Released visual asset '${record.asset_id}' is missing its final path or sha256 hash.`,
      );
    }
    const url = urlIndex[record.final_path];
    if (!url) {
      throw new Error(
        `Runtime visual asset '${record.asset_id}' cannot resolve '${record.final_path}'.`,
      );
    }

    let tierLadder: RasterTierLadder | null = null;
    const tierUrls = new Map<number, string>();
    if (record.raster_tiers && record.raster_tiers.length > 0) {
      tierLadder = createRasterTierLadder(
        record.asset_id,
        record.raster_tiers.map((tier) => ({
          width: tier.width,
          height: tier.height,
          path: tier.path,
          hash: tier.hash,
          derivation: tier.derivation,
          ...(tier.native_detail_width !== undefined
            ? { nativeDetailWidth: tier.native_detail_width }
            : {}),
        })),
      );
      for (const tier of tierLadder.tiers) {
        const tierUrl = urlIndex[tier.path];
        if (!tierUrl) {
          throw new Error(
            `Runtime visual asset '${record.asset_id}' cannot resolve tier ${tier.width} at '${tier.path}'.`,
          );
        }
        tierUrls.set(tier.width, tierUrl);
      }
    }

    library.set(record.asset_id, {
      assetId: record.asset_id,
      finalPath: record.final_path,
      hash: record.hash,
      url,
      tierLadder,
      tierUrls,
    });
  }
  return library;
}

function repositoryUrls(): Readonly<Record<string, string>> {
  return Object.fromEntries(
    Object.entries(runtimeUrls).map(([modulePath, url]) => [
      modulePath.replace(/^\.\.\/\.\.\//, ""),
      url,
    ]),
  );
}

/**
 * Historical development fixture appearance seeds.
 *
 * Explicitly used for test and development fixtures; strictly distinct from
 * canonical Person identity.
 */
export const DEV_FIXTURE_APPEARANCE_SEEDS = {
  candidateA01: "app_02b4075ba151f919",
  candidateB01: "app_f0f2bccd24827580",
} as const;

export const CHARACTER_VISUAL_RECIPES = {
  primaryDeskSeated: {
    appearanceRecipeId: "appearance:candidate-A01:primary-desk-seated:v1",
    appearanceSeed: DEV_FIXTURE_APPEARANCE_SEEDS.candidateA01,
    devFixtureTag: "historical-candidate-A01",
    assetId: "human_candidate_A01_primary_desk_seated_v1",
    bodyVisualFamily: "adult-authored-illustration",
    poseFamily: "seated-at-desk",
    // Measured off the raster by `measureSeatedContact`, not estimated. The
    // earlier 0.68/0.54 put the seat plane through the figure's mid-torso,
    // which is why the authored sitter floated above its chair.
    root: { convention: "pelvis-hip-center", x: 0.507, y: 0.624 },
    // The rig root above is the hip JOINT. This is where the body actually
    // meets the seat: the deepest point of the buttock/thigh silhouette behind
    // the knees, measured off the raster's own alpha channel. It sits 0.0235 of
    // raster height below the joint, which is the gap that used to hang this
    // figure above her chair.
    seatedContact: {
      convention: "seat-plane-at-pelvis",
      root: { convention: "pelvis-hip-center", x: 0.4941, y: 0.6475 },
    },
    visualBounds: {
      sourceAspectRatio: 765 / 1024,
      widthPercent: 25.5,
      interaction: { x: 0.35, y: 0.05, width: 0.55, height: 0.5 },
    },
    allowedScale: { minimum: 0.9, maximum: 1.1 },
    deterministicSelectionKey: "office:primary-desk-chair:seated:v1",
    wardrobe: { mode: "authored-outfit", attachmentSlots: [] },
  },
  leftGuestSeated: {
    appearanceRecipeId: "appearance:candidate-B01:left-guest-seated:v1",
    appearanceSeed: DEV_FIXTURE_APPEARANCE_SEEDS.candidateB01,
    devFixtureTag: "historical-candidate-B01",
    assetId: "human_candidate_B01_left_guest_seated_v1",
    bodyVisualFamily: "adult-authored-illustration",
    poseFamily: "seated-in-guest-chair",
    // Measured, as above.
    root: { convention: "pelvis-hip-center", x: 0.497, y: 0.62 },
    // Measured the same way. B01 carries a deeper seat than A01 — 0.0343 of
    // raster height below its hip joint — because it is drawn sitting further
    // back into its chair.
    seatedContact: {
      convention: "seat-plane-at-pelvis",
      root: { convention: "pelvis-hip-center", x: 0.4941, y: 0.6543 },
    },
    visualBounds: {
      sourceAspectRatio: 765 / 1024,
      widthPercent: 18.5,
      interaction: { x: 0.05, y: 0.02, width: 0.9, height: 0.5 },
    },
    allowedScale: { minimum: 0.85, maximum: 1.05 },
    deterministicSelectionKey: "office:left-guest-chair:seated:v1",
    wardrobe: { mode: "authored-outfit", attachmentSlots: [] },
  },
} as const satisfies Readonly<Record<string, CharacterVisualRecipe>>;

/**
 * The office scene, projected from the registered EnvironmentSceneSpec.
 *
 * This is the migration 10A G3 asked for: the compositor's scene configuration
 * is now DERIVED from `office-council-staff-fixture` in the scene registry
 * rather than hand-written here. Anchor scale is interpolated from the scene's
 * floor calibration instead of being tuned per sprite, and paint order is
 * `zOrder` rather than a field that also meant perspective depth.
 *
 * The fixture keeps its fixture status. Its art is frozen; only where the
 * numbers live has changed.
 */
export function projectOfficeVisualScene(
  scene: RegisteredScene,
): OfficeVisualSceneConfiguration {
  const seatAnchor = (id: RunBSceneAnchorId): SceneVisualAnchor => {
    const anchor = scene.anchors.get(id);
    if (!anchor?.seatContact) {
      throw new Error(
        `Scene '${scene.sceneId}' must declare a seat anchor '${id}' for the office composition.`,
      );
    }
    const poseFamily: CharacterVisualRecipe["poseFamily"] =
      id === "primary-desk-chair" ? "seated-at-desk" : "seated-in-guest-chair";
    return {
      id,
      xPercent: anchor.xPercent,
      yPercent: anchor.seatContact.seat_plane_y_percent,
      scale: resolvePerspectiveScale(scene, anchor.contactFloorYPercent),
      poseFamily,
      zOrder: anchor.zOrder,
      contactFloorYPercent: anchor.contactFloorYPercent,
    };
  };

  if (!scene.raster) {
    throw new Error(
      `Scene '${scene.sceneId}' registers no raster, so it cannot back the office composition.`,
    );
  }

  if (scene.standardBodyWidthPercent === null) {
    throw new Error(
      `Scene '${scene.sceneId}' declares no standard body width, so modular people cannot be placed in it. Author the width rather than defaulting one.`,
    );
  }

  return {
    environmentAssetId: scene.raster.assetId,
    plate: scene.plate,
    camera: scene.camera,
    safeArea: scene.safeArea,
    essentialContentArea: scene.essentialContentArea,
    uiSafeZones: scene.uiSafeZones.map((zone) => ({
      id: zone.id,
      edge: zone.edge,
      width: zone.width,
      height: zone.height,
    })),
    documentAnchors: {
      ...OFFICE_DOCUMENT_ANCHORS,
      "working-draft": {
        xPercent: requireWorkingDocumentSlot(scene).rect_percent.x_percent,
        yPercent: requireWorkingDocumentSlot(scene).rect_percent.y_percent,
      },
    },
    anchors: {
      "primary-desk-chair": seatAnchor("primary-desk-chair"),
      "left-guest-chair": seatAnchor("left-guest-chair"),
    },
    occluders: scene.occluders
      .filter((occluder) => occluder.assetId !== null)
      .map((occluder) => ({
        id: occluder.id,
        assetId: occluder.assetId as string,
        zOrder: occluder.zOrder,
      })),
    visualRecipes: [
      CHARACTER_VISUAL_RECIPES.primaryDeskSeated,
      CHARACTER_VISUAL_RECIPES.leftGuestSeated,
    ],
    standardBodyWidthPercent: scene.standardBodyWidthPercent,
  };
}

/**
 * Remaining fixture entry points. The working draft instead shares its
 * authored surface slot with the visible dynamic paper.
 */
const OFFICE_DOCUMENT_ANCHORS = {
  "briefing-memo": { xPercent: 53.5, yPercent: 55.8 },
  "civic-marker": { xPercent: 60.5, yPercent: 56.8 },
} as const;

export function requireWorkingDocumentSlot(scene: RegisteredScene) {
  const slot = scene.surfaceSlots.find(
    (surface) => surface.slot_id === "desk-working-document",
  );
  if (!slot)
    throw new Error("Office scene requires its working-document slot.");
  return slot;
}

export const OFFICE_FIXTURE_SCENE = requireScene(
  SCENE_REGISTRY,
  OFFICE_FIXTURE_SCENE_ID,
);

export const OFFICE_VISUAL_SCENE: OfficeVisualSceneConfiguration =
  projectOfficeVisualScene(OFFICE_FIXTURE_SCENE);

export interface PersonAppearanceContext {
  readonly personId: string;
  readonly appearance?: PersonAppearance;
}

export function resolvePersonAppearance(
  person: PersonAppearanceContext,
): PersonAppearance {
  return person.appearance ?? derivePersonAppearance(person.personId);
}

/**
 * Resolves a visual recipe matching BOTH the person's owned appearance identity
 * and the scene anchor's required pose family.
 *
 * PERSON owns durable appearance identity (derived from canonical person ID or explicit appearance).
 * SCENE ANCHOR owns pose requirements, seat contact, scale, depth, and occlusion.
 *
 * If no approved recipe exists for this person's appearance in the requested pose,
 * returns null (fails closed / explicit placeholder path). Never silently substitutes
 * another person's appearance.
 */
export function resolvePersonVisualRecipe(
  person: PersonAppearanceContext,
  anchor: SceneVisualAnchor,
  scene: OfficeVisualSceneConfiguration = OFFICE_VISUAL_SCENE,
): CharacterVisualRecipe | null {
  const appearance = resolvePersonAppearance(person);
  const matchingRecipe = scene.visualRecipes.find(
    (recipe) =>
      recipe.appearanceSeed === appearance.seed &&
      recipe.poseFamily === anchor.poseFamily,
  );
  return matchingRecipe ?? null;
}

export function validateOfficeVisualScene(
  scene: OfficeVisualSceneConfiguration,
): readonly string[] {
  const issues: string[] = [];
  for (const anchor of Object.values(scene.anchors)) {
    const matchingRecipes = scene.visualRecipes.filter(
      (recipe) => recipe.poseFamily === anchor.poseFamily,
    );
    if (matchingRecipes.length === 0) {
      issues.push(
        `No approved visual recipe found for anchor '${anchor.id}' (pose '${anchor.poseFamily}').`,
      );
      continue;
    }
    for (const recipe of matchingRecipes) {
      if (
        anchor.scale < recipe.allowedScale.minimum ||
        anchor.scale > recipe.allowedScale.maximum
      ) {
        issues.push(
          `Appearance '${recipe.appearanceRecipeId}' scale is outside its allowed range for anchor '${anchor.id}'.`,
        );
      }
    }
  }
  return issues;
}

function requireAsset(
  library: RuntimeVisualLibrary,
  assetId: string,
): RuntimeVisualAsset {
  const asset = library.get(assetId);
  if (!asset) {
    throw new Error(
      `Required runtime visual asset '${assetId}' is unavailable.`,
    );
  }
  return asset;
}

export function composeOfficeVisuals(
  people: readonly RunBScenePersonContext[],
  library: RuntimeVisualLibrary,
  scene: OfficeVisualSceneConfiguration = OFFICE_VISUAL_SCENE,
  characterLibrary: CharacterComponentLibrary = PRODUCTION_CHARACTER_LIBRARY,
): OfficeVisualComposition {
  const issues = validateOfficeVisualScene(scene);
  if (issues.length > 0) throw new Error(issues.join("\n"));

  return {
    environment: requireAsset(library, scene.environmentAssetId),
    characters: people.map((person) => {
      const anchor = scene.anchors[person.anchorId];
      if (!anchor) {
        throw new Error(`Unrecognized scene anchor '${person.anchorId}'.`);
      }
      const recipe = resolvePersonVisualRecipe(person, anchor, scene);
      if (recipe && library.has(recipe.assetId)) {
        const widthPercent = recipe.visualBounds.widthPercent * anchor.scale;
        const heightPercent =
          (widthPercent / recipe.visualBounds.sourceAspectRatio) *
          (scene.plate.width / scene.plate.height);
        // Place the point that actually touches the chair, not the rig root.
        //
        // `root` is the pelvis-hip-CENTRE: a joint inside the body, a couple of
        // percent of raster height above the surface the sitter rests on. Putting
        // that joint on the seat plane hangs the body's contact surface below the
        // cushion and its visible mass above it, which is why the authored sitters
        // read as perched on their chairs rather than in them. `seatedContact.root`
        // is the measured contact itself, and the modular path in
        // `scene-placement.ts` has always placed seated bodies by their
        // `seatedPelvis` contact for exactly this reason. The two paths now agree.
        //
        // Every authored recipe is a seated one and the type requires the
        // contact, so there is no standing case to fall back to here.
        const contact = recipe.seatedContact.root;
        const leftPercent = anchor.xPercent - contact.x * widthPercent;
        const topPercent = anchor.yPercent - contact.y * heightPercent;
        const interaction = recipe.visualBounds.interaction;
        return {
          personId: person.personId,
          anchorId: person.anchorId,
          visualVariant: person.visualVariant,
          asset: requireAsset(library, recipe.assetId),
          modular: null,
          isPlaceholder: false,
          appearanceRecipeId: recipe.appearanceRecipeId,
          leftPercent,
          topPercent,
          widthPercent,
          heightPercent,
          hitbox: {
            leftPercent: leftPercent + widthPercent * interaction.x,
            topPercent: topPercent + heightPercent * interaction.y,
            widthPercent: widthPercent * interaction.width,
            heightPercent: heightPercent * interaction.height,
          },
          zOrder: anchor.zOrder,
        };
      }

      // Ordinary modular path: an established person without an authored
      // recipe composes from released components for this anchor's pose.
      // The same compositor serves every scene; a missing body for the pose
      // falls through to the explicit placeholder below.
      const modular = buildCharacterRenderPlan({
        personId: person.personId,
        appearance: resolvePersonAppearance(person),
        anchor: {
          id: anchor.id,
          xPercent: anchor.xPercent,
          yPercent: anchor.yPercent,
          scale: anchor.scale,
          poseFamily: anchor.poseFamily,
          depth: anchor.zOrder,
          bodyWidthPercent: scene.standardBodyWidthPercent,
        },
        plate: scene.plate,
        library: characterLibrary,
        visualLibrary: library,
      });
      if (modular.layers.length > 0) {
        return {
          personId: person.personId,
          anchorId: person.anchorId,
          visualVariant: person.visualVariant,
          asset: null,
          modular,
          isPlaceholder: !modular.complete,
          appearanceRecipeId: modular.recipeKey,
          leftPercent: modular.box.leftPercent,
          topPercent: modular.box.topPercent,
          widthPercent: modular.box.widthPercent,
          heightPercent: modular.box.heightPercent,
          hitbox: {
            leftPercent:
              modular.box.leftPercent + modular.box.widthPercent * 0.1,
            topPercent:
              modular.box.topPercent + modular.box.heightPercent * 0.05,
            widthPercent: modular.box.widthPercent * 0.8,
            heightPercent: modular.box.heightPercent * 0.9,
          },
          zOrder: anchor.zOrder,
        };
      }

      // Explicit fallback placeholder path: fail closed on art asset without corrupting identity
      const defaultWidthPercent = 20 * anchor.scale;
      const defaultHeightPercent =
        (defaultWidthPercent / (765 / 1024)) *
        (scene.plate.width / scene.plate.height);
      const defaultLeftPercent = anchor.xPercent - 0.5 * defaultWidthPercent;
      const defaultTopPercent = anchor.yPercent - 0.5 * defaultHeightPercent;
      return {
        personId: person.personId,
        anchorId: person.anchorId,
        visualVariant: person.visualVariant,
        asset: null,
        modular: null,
        isPlaceholder: true,
        appearanceRecipeId: "placeholder:unresolved-recipe-pose",
        leftPercent: defaultLeftPercent,
        topPercent: defaultTopPercent,
        widthPercent: defaultWidthPercent,
        heightPercent: defaultHeightPercent,
        hitbox: {
          leftPercent: defaultLeftPercent + defaultWidthPercent * 0.1,
          topPercent: defaultTopPercent + defaultHeightPercent * 0.1,
          widthPercent: defaultWidthPercent * 0.8,
          heightPercent: defaultHeightPercent * 0.8,
        },
        zOrder: anchor.zOrder,
      };
    }),
    occluders: scene.occluders.map((occluder) => ({
      ...occluder,
      asset: requireAsset(library, occluder.assetId),
    })),
  };
}

export const PRODUCTION_VISUAL_LIBRARY = createRuntimeVisualLibrary(
  assetManifest.assets as readonly RuntimeVisualAssetRecord[],
  repositoryUrls(),
);

/**
 * The morphology fit bank, derived from measured silhouettes by
 * `npm run derive:garment-fit`.
 *
 * It is loaded here rather than passed in so every consumer of the production
 * library is held to the same fit contract. A garment with no answer in it does
 * not fall back to the unfitted rectangle; it fails closed.
 */
export const PRODUCTION_GARMENT_FIT_BANK = createGarmentFitBank(
  garmentFitProfiles as GarmentFitBankData,
);

/**
 * Modular component library from the same manifest plus the character catalog
 * ledger. Empty until component art is released through the ordinary gate.
 */
export const PRODUCTION_CHARACTER_LIBRARY = createCharacterComponentLibrary(
  assetManifest.assets as readonly CharacterComponentManifestRecord[],
  characterCatalog as CharacterCatalogData,
  PRODUCTION_GARMENT_FIT_BANK,
);

/**
 * The pose-family registry and the released pose art index, from the same
 * manifest the component library reads. A scene anchor asks the registry for a
 * posture; the index answers which body families can actually be drawn in it.
 */
export const PRODUCTION_POSE_REGISTRY = createPoseFamilyRegistry(
  poseFamilies as PoseFamilyRegistryData,
);

/**
 * Control-plate URLs, keyed by repository path. They are AUTHORING artifacts,
 * never composited into a character: the developer proof shows one beside a
 * composed body so a reviewer can see that the structure and the art agree.
 */
const poseControlPlateUrls = import.meta.glob<string>(
  "../../art/pose-control-plates/*.svg",
  { eager: true, import: "default", query: "?url" },
);

export const POSE_CONTROL_PLATE_URLS: Readonly<Record<string, string>> =
  Object.fromEntries(
    Object.entries(poseControlPlateUrls).map(([modulePath, url]) => [
      modulePath.replace(/^\.\.\/\.\.\//, ""),
      url,
    ]),
  );

export const PRODUCTION_POSE_ART = indexPoseArt(
  assetManifest.assets as readonly CharacterComponentManifestRecord[],
);

/**
 * DEVELOPMENT ONLY. The banked production candidates, composed so a person can
 * look at them.
 *
 * These parts are not in any catalog generation and no player-facing surface
 * can reach them; the proof view builds people out of them purely so the art
 * can be accepted or rejected on sight. Promotion is a separate, deliberate
 * act — see `liftCandidatesForReview`.
 */
const candidateReview = liftCandidatesForReview(
  assetManifest.assets as readonly CharacterComponentManifestRecord[],
  (characterCatalog as CharacterCatalogData).slots,
);

/**
 * Candidates are reviewed UNFITTED, on purpose.
 *
 * The proof view exists so a person can decide whether banked art is good
 * enough to promote, and a fit transform would show them a garment adjusted to
 * a body rather than the garment that was drawn. No candidate has a fit profile
 * anyway — a profile is derived from two measured silhouettes, and a candidate
 * body is in no generation to be measured against.
 */
export const CANDIDATE_REVIEW_CHARACTER_LIBRARY =
  createCharacterComponentLibrary(
    candidateReview.records,
    candidateReview.catalog,
  );

export const CANDIDATE_REVIEW_VISUAL_LIBRARY = createRuntimeVisualLibrary(
  candidateReview.records as readonly RuntimeVisualAssetRecord[],
  repositoryUrls(),
);
