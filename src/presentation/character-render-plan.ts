import type { PersonAppearance } from "../simulation/person-appearance";
import {
  projectCharacterLayers,
  resolveCharacterRecipe,
  type CharacterComponentKind,
  type CharacterRecipeDiagnostic,
  type CharacterComponentLibrary,
  type CharacterRecipe,
  type CharacterRecipeIdentity,
  type ProjectedLayerFitRefusal,
} from "./character-components";
import type { GarmentFitClass, GarmentFitMatrix } from "./garment-fit";
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

/**
 * One horizontal slice of a bounded-warp fit, in plate percent units.
 *
 * `clipTopPercent` and `clipBottomPercent` are the share of the drawn image to
 * hide above and below this band, so a renderer can draw the same raster once
 * per band and let each band show only its own rows. They are the projection's
 * `sourceTopFraction` / `sourceBottomFraction` in the form CSS `inset()` wants.
 */
export interface CharacterRenderBand {
  readonly index: number;
  readonly leftPercent: number;
  readonly topPercent: number;
  readonly widthPercent: number;
  readonly heightPercent: number;
  readonly clipTopPercent: number;
  readonly clipBottomPercent: number;
}

export interface CharacterRenderLayerFit {
  readonly classification: GarmentFitClass;
  readonly transformKind: "direct" | "affine" | "bounded-warp";
  readonly matrix: GarmentFitMatrix;
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
  /** The morphology fit applied, or null under the pre-fit contract. */
  readonly fit: CharacterRenderLayerFit | null;
  /**
   * Non-null only for a bounded warp. A renderer that draws bands is correct
   * for every layer; one that draws only the rectangle is correct for every
   * layer except these, where the rectangle is the bounding box of a shape
   * that tapers.
   */
  readonly bands: readonly CharacterRenderBand[] | null;
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
  /** Named reasons a slot resolved nothing, carried from the recipe context. */
  readonly diagnostics: readonly CharacterRecipeDiagnostic[];
  /**
   * True when a body resolved, every required slot is filled, and every layer
   * is runtime eligible. A person with an empty required slot is NOT complete,
   * however well the rest of them draws: a figure with bare ankles is a
   * contract failure, not an aesthetic one.
   */
  readonly complete: boolean;
  /**
   * What stopped this person being complete: component IDs that resolved but
   * are not runtime eligible, a missing body, empty required slots, and any
   * garment the fit bank refused to place on this morphology.
   */
  readonly missing: readonly string[];
  /**
   * Garments this body family and pose have no usable fit for, with the reason.
   *
   * A refusal is not a rendering hiccup: it says the art has never been fitted
   * to this morphology, and the honest answer is a gap rather than a garment
   * hanging off the silhouette.
   */
  readonly fitRefusals: readonly ProjectedLayerFitRefusal[];
}

export interface CharacterRenderPlanRequest {
  readonly personId: string;
  readonly appearance: PersonAppearance;
  readonly anchor: ModularSceneAnchor;
  readonly plate: SceneSize;
  readonly library: CharacterComponentLibrary;
  readonly visualLibrary: RuntimeVisualLibrary;
  /**
   * Whether the caller's renderer can draw `CharacterRenderLayer.bands`.
   *
   * Defaults to false, which is the truth about every renderer in this
   * repository today: they draw one rectangle per layer. A bounded-warp fit is
   * a set of horizontal slices, and drawing only its bounding rectangle would
   * paint the garment at its widest band from top to bottom — a worse result
   * than the unfitted placement the fit replaced. So a warped layer is refused
   * unless the caller says it can carry one, and the refusal is named rather
   * than silent.
   */
  readonly rendererSupportsBands?: boolean;
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
  const {
    personId,
    appearance,
    anchor,
    plate,
    library,
    visualLibrary,
    rendererSupportsBands = false,
  } = request;
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
      diagnostics: recipe.context.diagnostics,
      complete: false,
      missing: [`body:${recipe.identity.bodyFamily}:${anchor.poseFamily}`],
      fitRefusals: [],
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
  const fitRefusals: ProjectedLayerFitRefusal[] = [...projected.fitRefusals];
  const layers: CharacterRenderLayer[] = projected.layers.map((layer) => {
    const bandsUnrenderable =
      layer.fit?.bands != null && !rendererSupportsBands;
    if (bandsUnrenderable) {
      fitRefusals.push({
        assetId: layer.assetId,
        code: "fit-bands-unsupported-by-renderer",
        message: `Component '${layer.assetId}' resolves to a bounded-warp fit of ${layer.fit?.bands?.length ?? 0} bands, and this caller's renderer draws one rectangle per layer. Drawing the bounding rectangle would paint the garment at its widest band down its whole length, so the layer is withheld instead.`,
      });
    }
    const drawable = layer.released && !bandsUnrenderable;
    const asset = drawable ? visualLibrary.get(layer.assetId) : undefined;
    if (!asset) missing.push(layer.assetId);
    return {
      assetId: layer.assetId,
      kind: layer.kind,
      slotId: layer.slotId,
      layer: layer.layer,
      released: drawable && asset !== undefined,
      url: asset?.url ?? null,
      hash: asset?.hash ?? null,
      attachmentAnchorId: layer.attachmentAnchorId,
      leftPercent: leftPercent + layer.left * widthPercent,
      topPercent: topPercent + layer.top * heightPercent,
      widthPercent: layer.width * widthPercent,
      heightPercent: layer.height * heightPercent,
      fit: layer.fit
        ? {
            classification: layer.fit.classification,
            transformKind: layer.fit.transformKind,
            matrix: layer.fit.matrix,
          }
        : null,
      bands:
        layer.fit?.bands?.map((band) => ({
          index: band.index,
          leftPercent: leftPercent + band.left * widthPercent,
          topPercent: topPercent + band.top * heightPercent,
          widthPercent: band.width * widthPercent,
          heightPercent: band.height * heightPercent,
          clipTopPercent: band.sourceTopFraction * 100,
          clipBottomPercent: (1 - band.sourceBottomFraction) * 100,
        })) ?? null,
    };
  });

  const emptyRequiredSlots = recipe.context.diagnostics.filter(
    (diagnostic) => diagnostic.code === "required-slot-empty",
  );
  for (const diagnostic of emptyRequiredSlots) {
    missing.push(`slot:${diagnostic.slotId}`);
  }

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
    diagnostics: recipe.context.diagnostics,
    complete: missing.length === 0,
    missing,
    fitRefusals,
  };
}
