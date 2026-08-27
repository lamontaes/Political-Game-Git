import assetManifest from "../../art/manifest/asset_manifest.json";
import type {
  RunBSceneAnchorId,
  RunBScenePersonContext,
} from "./run-b-fixture";

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
  readonly assetId: string;
  readonly bodyVisualFamily: "adult-authored-illustration";
  readonly poseFamily: "seated-at-desk" | "seated-in-guest-chair";
  readonly compatibleSceneAnchors: readonly RunBSceneAnchorId[];
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

export interface OfficeVisualSceneConfiguration {
  readonly environmentAssetId: string;
  readonly plate: { readonly width: 1024; readonly height: 572 };
  readonly anchors: Readonly<Record<RunBSceneAnchorId, SceneVisualAnchor>>;
  readonly occluders: readonly SceneOccluder[];
  readonly appearanceByAnchor: Readonly<
    Record<RunBSceneAnchorId, CharacterVisualRecipe>
  >;
}

export interface ComposedCharacterVisual {
  readonly personId: string;
  readonly anchorId: RunBSceneAnchorId;
  readonly visualVariant: RunBScenePersonContext["visualVariant"];
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
  [
    "../../art/global/**/*.{png,jpg,jpeg,webp}",
    "../../art/families/**/*.{png,jpg,jpeg,webp}",
    "../../art/jurisdictions/**/*.{png,jpg,jpeg,webp}",
    "../../art/hero/**/*.{png,jpg,jpeg,webp}",
    "../../art/generated/approved/**/*.{png,jpg,jpeg,webp}",
  ],
  { eager: true, query: "?url", import: "default" },
);

export function createRuntimeVisualLibrary(
  records: readonly RuntimeVisualAssetRecord[],
  urlsByRepositoryPath: Readonly<Record<string, string>>,
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
        `Runtime-released visual asset '${record.asset_id}' lacks a final path or hash.`,
      );
    }
    const url = urlsByRepositoryPath[record.final_path];
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
    appearanceRecipeId: "appearance:anonymous:primary-desk-seated:v1",
    assetId: "human_candidate_A01_primary_desk_seated_v1",
    bodyVisualFamily: "adult-authored-illustration",
    poseFamily: "seated-at-desk",
    compatibleSceneAnchors: ["primary-desk-chair"],
    root: { convention: "pelvis-hip-center", x: 0.56, y: 0.6 },
    seatedContact: {
      convention: "seat-plane-at-pelvis",
      root: { convention: "pelvis-hip-center", x: 0.56, y: 0.6 },
    },
    visualBounds: {
      sourceAspectRatio: 765 / 1024,
      widthPercent: 28,
      interaction: { x: 0.25, y: 0.05, width: 0.68, height: 0.48 },
    },
    allowedScale: { minimum: 0.9, maximum: 1.08 },
    deterministicSelectionKey: "office:primary-desk-chair:seated:v1",
    wardrobe: { mode: "authored-outfit", attachmentSlots: [] },
  },
  leftGuestSeated: {
    appearanceRecipeId: "appearance:anonymous:left-guest-seated:v1",
    assetId: "human_candidate_B01_left_guest_seated_v1",
    bodyVisualFamily: "adult-authored-illustration",
    poseFamily: "seated-in-guest-chair",
    compatibleSceneAnchors: ["left-guest-chair"],
    root: { convention: "pelvis-hip-center", x: 0.55, y: 0.61 },
    seatedContact: {
      convention: "seat-plane-at-pelvis",
      root: { convention: "pelvis-hip-center", x: 0.55, y: 0.61 },
    },
    visualBounds: {
      sourceAspectRatio: 765 / 1024,
      widthPercent: 22,
      interaction: { x: 0.25, y: 0.05, width: 0.68, height: 0.48 },
    },
    allowedScale: { minimum: 0.85, maximum: 1 },
    deterministicSelectionKey: "office:left-guest-chair:seated:v1",
    wardrobe: { mode: "authored-outfit", attachmentSlots: [] },
  },
} as const satisfies Readonly<Record<string, CharacterVisualRecipe>>;

export const OFFICE_VISUAL_SCENE: OfficeVisualSceneConfiguration = {
  environmentAssetId: "env_lexington_council_staff_office_prompt30_v1",
  plate: { width: 1024, height: 572 },
  anchors: {
    "primary-desk-chair": {
      id: "primary-desk-chair",
      xPercent: 77.7,
      yPercent: 66.5,
      scale: 0.9,
      poseFamily: "seated-at-desk",
      depth: 2,
    },
    "left-guest-chair": {
      id: "left-guest-chair",
      xPercent: 29.5,
      yPercent: 70,
      scale: 0.92,
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
  appearanceByAnchor: {
    "primary-desk-chair": CHARACTER_VISUAL_RECIPES.primaryDeskSeated,
    "left-guest-chair": CHARACTER_VISUAL_RECIPES.leftGuestSeated,
  },
};

export function validateOfficeVisualScene(
  scene: OfficeVisualSceneConfiguration,
): readonly string[] {
  const issues: string[] = [];
  for (const anchor of Object.values(scene.anchors)) {
    const recipe = scene.appearanceByAnchor[anchor.id];
    if (!recipe.compatibleSceneAnchors.includes(anchor.id)) {
      issues.push(
        `Appearance '${recipe.appearanceRecipeId}' is incompatible with anchor '${anchor.id}'.`,
      );
    }
    if (recipe.poseFamily !== anchor.poseFamily) {
      issues.push(
        `Appearance '${recipe.appearanceRecipeId}' pose '${recipe.poseFamily}' does not match anchor '${anchor.id}' pose '${anchor.poseFamily}'.`,
      );
    }
    if (
      anchor.scale < recipe.allowedScale.minimum ||
      anchor.scale > recipe.allowedScale.maximum
    ) {
      issues.push(
        `Appearance '${recipe.appearanceRecipeId}' scale is outside its allowed range.`,
      );
    }
  }
  return issues;
}

function requireAsset(
  library: RuntimeVisualLibrary,
  assetId: string,
): RuntimeVisualAsset {
  const asset = library.get(assetId);
  if (!asset)
    throw new Error(
      `Required runtime visual asset '${assetId}' is unavailable.`,
    );
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
      const recipe = scene.appearanceByAnchor[person.anchorId];
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
