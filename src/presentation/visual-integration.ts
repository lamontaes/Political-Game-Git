import assetManifest from "../../art/manifest/asset_manifest.json";
import characterCatalog from "../../art/manifest/character_catalog.json";
import {
  derivePersonAppearance,
  type PersonAppearance,
} from "../simulation/person-appearance";
import {
  createCharacterComponentLibrary,
  type CharacterAttachmentAnchor,
  type CharacterCatalogData,
  type CharacterComponentManifestRecord,
} from "./character-components";
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
}

export interface ComposedCharacterVisual {
  readonly personId: string;
  readonly anchorId: RunBSceneAnchorId;
  readonly visualVariant: RunBScenePersonVariant;
  readonly asset: RuntimeVisualAsset | null;
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

const runtimeUrls = import.meta.glob<string>(
  "../../art/**/*.{png,jpg,jpeg,webp}",
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
    root: { convention: "pelvis-hip-center", x: 0.68, y: 0.54 },
    seatedContact: {
      convention: "seat-plane-at-pelvis",
      root: { convention: "pelvis-hip-center", x: 0.68, y: 0.54 },
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
    root: { convention: "pelvis-hip-center", x: 0.46, y: 0.51 },
    seatedContact: {
      convention: "seat-plane-at-pelvis",
      root: { convention: "pelvis-hip-center", x: 0.46, y: 0.51 },
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
    documentAnchors: OFFICE_DOCUMENT_ANCHORS,
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
  };
}

/**
 * Interactive document positions on the fixture plate. These are UI entry
 * points rather than scene surface slots: the scene's `surface_slots` say where
 * a document would be PAINTED, while these say where the player clicks.
 */
const OFFICE_DOCUMENT_ANCHORS = {
  "working-draft": { xPercent: 67.0, yPercent: 55.5 },
  "briefing-memo": { xPercent: 53.5, yPercent: 55.8 },
  "civic-marker": { xPercent: 60.5, yPercent: 56.8 },
} as const;

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
        const leftPercent = anchor.xPercent - recipe.root.x * widthPercent;
        const topPercent = anchor.yPercent - recipe.root.y * heightPercent;
        const interaction = recipe.visualBounds.interaction;
        return {
          personId: person.personId,
          anchorId: person.anchorId,
          visualVariant: person.visualVariant,
          asset: requireAsset(library, recipe.assetId),
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
 * Modular component library from the same manifest plus the character catalog
 * ledger. Empty until component art is released through the ordinary gate.
 */
export const PRODUCTION_CHARACTER_LIBRARY = createCharacterComponentLibrary(
  assetManifest.assets as readonly CharacterComponentManifestRecord[],
  characterCatalog as CharacterCatalogData,
);
