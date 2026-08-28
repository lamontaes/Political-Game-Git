import assetManifest from "../../art/manifest/asset_manifest.json";
import type {
  RunBSceneAnchorId,
  RunBScenePersonContext,
  RunBScenePersonVariant,
} from "./run-b-fixture";
import type {
  SceneCameraPolicy,
  SceneRect,
  SceneSize,
} from "./scene-transform";

type RuntimeAssetStatus = "draft" | "approved" | "rejected" | "pending";
type QaStatus = "approved" | "rejected" | "pending";
type ReleaseStatus = "released" | "unreleased";

export interface RuntimeVisualAssetRecord {
  readonly asset_id: string;
  readonly generation_status: RuntimeAssetStatus;
  readonly qa_status: QaStatus;
  readonly runtime_release_status: ReleaseStatus;
  readonly final_path?: string;
  readonly hash?: string;
}

export interface RuntimeVisualAsset {
  readonly assetId: string;
  readonly finalPath: string;
  readonly hash: string;
  readonly url: string;
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

export interface AuthoredWardrobeCompatibility {
  readonly mode: "authored-outfit";
  readonly attachmentSlots: readonly [];
}

export interface CharacterVisualRecipe {
  readonly appearanceRecipeId: string;
  readonly personaId: "candidate-A01" | "candidate-B01";
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
  readonly wardrobe: AuthoredWardrobeCompatibility;
}

export interface SceneVisualAnchor {
  readonly id: RunBSceneAnchorId;
  readonly xPercent: number;
  readonly yPercent: number;
  readonly scale: number;
  readonly poseFamily: CharacterVisualRecipe["poseFamily"];
  readonly depth: number;
}

export interface SceneOccluder {
  readonly id: string;
  readonly assetId: string;
  readonly depth: number;
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
  readonly asset: RuntimeVisualAsset;
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
  readonly depth: number;
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
    library.set(record.asset_id, {
      assetId: record.asset_id,
      finalPath: record.final_path,
      hash: record.hash,
      url,
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

export const CHARACTER_VISUAL_RECIPES = {
  primaryDeskSeated: {
    appearanceRecipeId: "appearance:candidate-A01:primary-desk-seated:v1",
    personaId: "candidate-A01",
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
    personaId: "candidate-B01",
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

export const OFFICE_VISUAL_SCENE: OfficeVisualSceneConfiguration = {
  environmentAssetId: "env_lexington_council_staff_office_prompt30_v1",
  plate: { width: 1024, height: 572 },
  camera: {
    minimumAspectRatio: 1.5,
    maximumAspectRatio: 12 / 5,
    horizontalFocus: 0.5,
    verticalFocus: 0.75,
  },
  safeArea: { x: 86, y: 112, width: 850, height: 421 },
  essentialContentArea: { x: 185, y: 165, width: 730, height: 353.75 },
  uiSafeZones: [
    {
      id: "lower-shell",
      edge: "bottom-left",
      width: 620,
      height: 120,
    },
    {
      id: "navigation-flyout",
      edge: "top-left",
      width: 320,
      height: 300,
    },
  ],
  documentAnchors: {
    "working-draft": { xPercent: 67.0, yPercent: 55.5 },
    "briefing-memo": { xPercent: 53.5, yPercent: 55.8 },
    "civic-marker": { xPercent: 60.5, yPercent: 56.8 },
  },
  anchors: {
    "primary-desk-chair": {
      id: "primary-desk-chair",
      xPercent: 80.5,
      yPercent: 63.5,
      scale: 0.95,
      poseFamily: "seated-at-desk",
      depth: 2,
    },
    "left-guest-chair": {
      id: "left-guest-chair",
      xPercent: 28.0,
      yPercent: 63.0,
      scale: 0.95,
      poseFamily: "seated-in-guest-chair",
      depth: 3,
    },
  },
  occluders: [
    {
      id: "office-furniture-foreground",
      assetId: "env_lexington_council_staff_office_prompt30_foreground_mask_v1",
      depth: 4,
    },
  ],
  visualRecipes: [
    CHARACTER_VISUAL_RECIPES.primaryDeskSeated,
    CHARACTER_VISUAL_RECIPES.leftGuestSeated,
  ],
};

/**
 * Resolves a visual recipe matching the scene anchor's required pose family.
 *
 * Person identity remains strictly person-owned (derived from person ID);
 * scene anchors own pose, contact, depth, and occlusion constraints.
 */
export function resolvePersonVisualRecipe(
  person: RunBScenePersonContext,
  anchor: SceneVisualAnchor,
  scene: OfficeVisualSceneConfiguration = OFFICE_VISUAL_SCENE,
): CharacterVisualRecipe {
  const matchingRecipe = scene.visualRecipes.find(
    (recipe) => recipe.poseFamily === anchor.poseFamily,
  );
  if (!matchingRecipe) {
    throw new Error(
      `Person '${person.personId}' lacks an approved visual recipe compatible with anchor '${anchor.id}' (poseFamily '${anchor.poseFamily}').`,
    );
  }
  return matchingRecipe;
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
        depth: anchor.depth,
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
