import type { PersonAppearance } from "../simulation/person-appearance";
import {
  projectCharacterLayers,
  resolveCharacterRecipe,
  type CharacterComponentKind,
  type CharacterComponentLibrary,
  type CharacterRecipe,
  type CharacterRecipeIdentity,
} from "./character-components";
import type { SceneSize } from "./scene-transform";
import type { RuntimeVisualLibrary } from "./visual-integration";

/**
 * Pure character render plan.
 *
 * Turns a person-owned appearance plus one scene anchor into ordered,
 * positioned, runtime-eligible visual layers in virtual-plate percent units.
 * It is deterministic, React-free, and never writes simulation state.
 *
 * Anchor ownership stays separated:
 * - `ModularSceneAnchor` is scene-owned (where a character sits, how large a
 *   body renders there, depth, pose);
 * - the character root comes from the resolved body component;
 * - attachment anchors come from the body rig and are surfaced only for
 *   developer debugging.
 */

/**
 * Catalog generation used for people whose appearance predates pinning. The
 * first generation is frozen by its ledger signature, so this default can
 * never drift.
 */
export const LEGACY_APPEARANCE_CATALOG_GENERATION = 1;

export interface ModularSceneAnchor {
  readonly id: string;
  readonly xPercent: number;
  readonly yPercent: number;
  /** Multiplies `bodyWidthPercent`; mirrors the office anchor scale envelope. */
  readonly scale: number;
  readonly poseFamily: string;
  readonly depth: number;
  /**
   * Visual-estimate width of a body canvas at this anchor as a percent of the
   * plate width at scale 1. Perspective/footprint is a scene property; stature
   * differences between body families come from their canvas aspect.
   */
  readonly bodyWidthPercent: number;
}

export interface CharacterRenderLayer {
  readonly assetId: string;
  readonly kind: CharacterComponentKind;
  readonly slotId: string;
  readonly layer: number;
  readonly released: boolean;
  /** Runtime URL when the asset is runtime eligible; null fails closed. */
  readonly url: string | null;
  readonly hash: string | null;
  readonly attachmentAnchorId: string | null;
  readonly leftPercent: number;
  readonly topPercent: number;
  readonly widthPercent: number;
  readonly heightPercent: number;
}

export interface CharacterRenderMarker {
  readonly id: string;
  readonly xPercent: number;
  readonly yPercent: number;
}

export interface CharacterRenderPlan {
  readonly personId: string;
  readonly appearanceSeed: string;
  readonly recipeVersion: string;
  readonly catalogGeneration: number;
  /** True when the person carries an explicit pin; false for the legacy default. */
  readonly pinnedByPerson: boolean;
  /** Stable key for the resolved identity; equal for equal identities. */
  readonly recipeKey: string;
  readonly identity: CharacterRecipeIdentity;
  readonly anchorId: string;
  readonly poseFamily: string;
  readonly depth: number;
  /** Character box in plate percent units. */
  readonly box: {
    readonly leftPercent: number;
    readonly topPercent: number;
    readonly widthPercent: number;
    readonly heightPercent: number;
  };
  /** Pelvis-hip-center root, in plate percent units. */
  readonly root: CharacterRenderMarker | null;
  /** Body-rig attachment anchors, in plate percent units. Debug only. */
  readonly attachmentAnchors: readonly CharacterRenderMarker[];
  /** Ordered by layer ascending; render in this order. */
  readonly layers: readonly CharacterRenderLayer[];
  /** True when a body resolved and every layer is runtime eligible. */
  readonly complete: boolean;
  /** Component IDs resolved but not runtime eligible, or a missing body. */
  readonly missing: readonly string[];
}

export interface CharacterRenderPlanRequest {
  readonly personId: string;
  readonly appearance: PersonAppearance;
  readonly anchor: ModularSceneAnchor;
  readonly plate: SceneSize;
  readonly library: CharacterComponentLibrary;
  readonly visualLibrary: RuntimeVisualLibrary;
}

function stableIdentityKey(identity: CharacterRecipeIdentity): string {
  const slots = Object.keys(identity.slots)
    .sort()
    .map((slotId) => `${slotId}=${identity.slots[slotId] ?? "-"}`)
    .join(",");
  return `${identity.bodyFamily}|${identity.headFamily}|${slots}`;
}

export function resolvePersonCatalogGeneration(
  appearance: PersonAppearance,
  library: CharacterComponentLibrary,
): number {
  const generation =
    appearance.catalogGeneration ?? LEGACY_APPEARANCE_CATALOG_GENERATION;
  if (generation > library.catalogGeneration) {
    throw new Error(
      `Person appearance is pinned to catalog generation ${generation} but the library only reaches ${library.catalogGeneration}.`,
    );
  }
  return generation;
}

export function resolvePersonCharacterRecipe(
  appearance: PersonAppearance,
  poseFamily: string,
  library: CharacterComponentLibrary,
): CharacterRecipe {
  return resolveCharacterRecipe(
    {
      appearance,
      poseFamily,
      catalogGeneration: resolvePersonCatalogGeneration(appearance, library),
    },
    library,
  );
}

export function buildCharacterRenderPlan(
  request: CharacterRenderPlanRequest,
): CharacterRenderPlan {
  const { personId, appearance, anchor, plate, library, visualLibrary } =
    request;
  if (!(anchor.bodyWidthPercent > 0) || !(anchor.scale > 0)) {
    throw new Error(
      `Scene anchor '${anchor.id}' must declare positive bodyWidthPercent and scale.`,
    );
  }
  const recipe = resolvePersonCharacterRecipe(
    appearance,
    anchor.poseFamily,
    library,
  );
  const projected = projectCharacterLayers(recipe, library);
  const recipeKey = `${appearance.seed}@${recipe.recipeVersion}#g${recipe.catalogGeneration}:${stableIdentityKey(recipe.identity)}`;

  if (!projected) {
    return {
      personId,
      appearanceSeed: appearance.seed,
      recipeVersion: recipe.recipeVersion,
      catalogGeneration: recipe.catalogGeneration,
      pinnedByPerson: appearance.catalogGeneration !== undefined,
      recipeKey,
      identity: recipe.identity,
      anchorId: anchor.id,
      poseFamily: anchor.poseFamily,
      depth: anchor.depth,
      box: {
        leftPercent: anchor.xPercent,
        topPercent: anchor.yPercent,
        widthPercent: 0,
        heightPercent: 0,
      },
      root: null,
      attachmentAnchors: [],
      layers: [],
      complete: false,
      missing: [`body:${recipe.identity.bodyFamily}:${anchor.poseFamily}`],
    };
  }

  const widthPercent = anchor.bodyWidthPercent * anchor.scale;
  const heightPercent =
    (widthPercent /
      (projected.bodyCanvas.width / projected.bodyCanvas.height)) *
    (plate.width / plate.height);
  const leftPercent = anchor.xPercent - projected.root.x * widthPercent;
  const topPercent = anchor.yPercent - projected.root.y * heightPercent;

  const bodyEntry = recipe.context.components.find(
    (component) => component.kind === "body",
  );
  const body = bodyEntry ? library.components.get(bodyEntry.assetId) : null;
  const attachmentAnchors = (body?.definition.attachment_anchors ?? []).map(
    (rigAnchor) => ({
      id: rigAnchor.id,
      xPercent: leftPercent + rigAnchor.x * widthPercent,
      yPercent: topPercent + rigAnchor.y * heightPercent,
    }),
  );

  const missing: string[] = [];
  const layers: CharacterRenderLayer[] = projected.layers.map((layer) => {
    const asset = layer.released ? visualLibrary.get(layer.assetId) : undefined;
    if (!asset) missing.push(layer.assetId);
    return {
      assetId: layer.assetId,
      kind: layer.kind,
      slotId: layer.slotId,
      layer: layer.layer,
      released: layer.released && asset !== undefined,
      url: asset?.url ?? null,
      hash: asset?.hash ?? null,
      attachmentAnchorId: layer.attachmentAnchorId,
      leftPercent: leftPercent + layer.left * widthPercent,
      topPercent: topPercent + layer.top * heightPercent,
      widthPercent: layer.width * widthPercent,
      heightPercent: layer.height * heightPercent,
    };
  });

  return {
    personId,
    appearanceSeed: appearance.seed,
    recipeVersion: recipe.recipeVersion,
    catalogGeneration: recipe.catalogGeneration,
    pinnedByPerson: appearance.catalogGeneration !== undefined,
    recipeKey,
    identity: recipe.identity,
    anchorId: anchor.id,
    poseFamily: anchor.poseFamily,
    depth: anchor.depth,
    box: { leftPercent, topPercent, widthPercent, heightPercent },
    root: {
      id: "pelvis-hip-center",
      xPercent: anchor.xPercent,
      yPercent: anchor.yPercent,
    },
    attachmentAnchors,
    layers,
    complete: missing.length === 0,
    missing,
  };
}
