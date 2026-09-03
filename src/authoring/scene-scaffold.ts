/**
 * SYSTEM 3 — SCENE AUTHORING SCAFFOLD
 *
 * Turns an accepted environment master into a structured place to DO the
 * authoring, instead of a blank file and a hope.
 *
 * The scaffold's job is to be exhaustively incomplete. It lists every value an
 * `EnvironmentSceneSpec` needs before the compositor can put a person in the
 * room — floor lines, seat planes, contacts, footprints, occluders, paint
 * order, surface slots, title-safe regions, the perspective calibration pair —
 * and it marks every one of them UNRESOLVED until a person or a source
 * actually settles it.
 *
 * The temptation this exists to defeat is the plausible default. A scaffold
 * that quietly filled `floor_y_percent` with 85 would produce a scene that
 * registers, renders, and puts everybody's feet slightly through the floor in a
 * way nobody can attribute to anything. An explicit
 * `UNRESOLVED: nobody has measured this` cannot be mistaken for a measurement,
 * and it cannot be shipped by accident either, because projection refuses.
 *
 * The two dimensions the scaffold DOES fill in are the plate size and the
 * raster ladder, because those are measured facts about the file rather than
 * judgements about the picture.
 */

import { CIVIC_SYMBOL_POLICY } from "../environment/environment-scene-spec";
import type {
  Anchor,
  EnvironmentSceneSpec,
  Occluder,
  PercentRect,
  SceneAnchorKind,
  SceneCameraSpec,
  SceneFloorCalibration,
  SceneFloorContact,
  SceneRasterSpec,
  SceneRect,
  SceneSeatContact,
  SceneSurfaceContentClass,
  SceneSurfaceKind,
  SceneSurfaceSlot,
  SceneUiSafeZoneSpec,
} from "../environment/environment-scene-spec";
import type { TierPlan } from "./tier-plan";

// ---------------------------------------------------------------------------
// Certainty
// ---------------------------------------------------------------------------

/**
 * How much weight a value carries.
 *
 * - `VERIFIED` — measured, or taken from a source that states it.
 * - `ESTIMATED` — an author's considered judgement from the picture. Honest,
 *   defensible, and explicitly not a measurement.
 * - `UNKNOWN` — nobody has decided yet.
 * - `UNVERIFIED` — a value exists somewhere upstream but nobody has checked it
 *   here. Distinct from UNKNOWN because the remedy is different: UNKNOWN needs
 *   someone to decide, UNVERIFIED needs someone to confirm.
 */
export type AuthoringCertainty =
  "VERIFIED" | "ESTIMATED" | "UNKNOWN" | "UNVERIFIED";

export interface ResolvedField<T> {
  readonly state: "resolved";
  readonly certainty: "VERIFIED" | "ESTIMATED";
  readonly value: T;
  /** Where the value came from: a source id, a measurement, an author. */
  readonly source?: string;
  readonly note?: string;
}

export interface UnresolvedField {
  readonly state: "unresolved";
  readonly certainty: "UNKNOWN" | "UNVERIFIED";
  readonly reason: string;
}

export type ScaffoldField<T> = ResolvedField<T> | UnresolvedField;

export function resolved<T>(
  value: T,
  certainty: "VERIFIED" | "ESTIMATED",
  source?: string,
  note?: string,
): ResolvedField<T> {
  return {
    state: "resolved",
    certainty,
    value,
    ...(source !== undefined ? { source } : {}),
    ...(note !== undefined ? { note } : {}),
  };
}

export function unresolved(
  reason: string,
  certainty: "UNKNOWN" | "UNVERIFIED" = "UNKNOWN",
): UnresolvedField {
  return { state: "unresolved", certainty, reason };
}

export function isResolved<T>(
  field: ScaffoldField<T>,
): field is ResolvedField<T> {
  return field.state === "resolved";
}

/** The value, or null. Never a default: a default is the failure mode. */
export function fieldValue<T>(field: ScaffoldField<T>): T | null {
  return isResolved(field) ? field.value : null;
}

// ---------------------------------------------------------------------------
// Scaffold shape
// ---------------------------------------------------------------------------

export interface AnchorScaffold {
  readonly id: string;
  readonly type: string;
  readonly kind: SceneAnchorKind;
  /** Horizontal position as a percentage of plate width. */
  readonly xPercent: ScaffoldField<number>;
  readonly zOrder: ScaffoldField<number>;
  readonly footprintPercent: ScaffoldField<number>;
  readonly hitboxPercent: ScaffoldField<PercentRect>;
  /** Required for a `floor-standing` anchor. */
  readonly floorContact: ScaffoldField<SceneFloorContact>;
  /** Required for a `seat` anchor. */
  readonly seatContact: ScaffoldField<SceneSeatContact>;
  readonly allowedPoseFamilies: ScaffoldField<readonly string[]>;
  readonly permittedFacings: ScaffoldField<readonly string[]>;
}

export interface OccluderScaffold {
  readonly id: string;
  readonly type: string;
  readonly zOrder: ScaffoldField<number>;
  readonly regionPercent: ScaffoldField<PercentRect>;
  readonly assetId: ScaffoldField<string>;
}

export interface SurfaceSlotScaffold {
  readonly slotId: string;
  readonly kind: ScaffoldField<SceneSurfaceKind>;
  readonly rectPercent: ScaffoldField<PercentRect>;
  readonly zOrder: ScaffoldField<number>;
  readonly allowedContentClasses: ScaffoldField<
    readonly SceneSurfaceContentClass[]
  >;
  readonly fallbackDecoration: ScaffoldField<string>;
  /**
   * Set only when the slot may present a civic symbol. The scaffold carries it
   * so an author cannot register a seal or flag without stating that it comes
   * from its canonical source.
   */
  readonly civicSymbolPolicy: ScaffoldField<typeof CIVIC_SYMBOL_POLICY>;
}

export interface SceneAuthoringScaffold {
  readonly sceneId: string;
  readonly familyId: string | null;
  readonly label: string;
  readonly presentationStatus: "development-fixture" | "production";
  /** Measured from the master, so it is VERIFIED from the start. */
  readonly plate: { readonly width: number; readonly height: number };
  /** Built from the tier plan. Null when the scene has no plate yet. */
  readonly raster: SceneRasterSpec | null;

  readonly camera: ScaffoldField<SceneCameraSpec>;
  readonly safeArea: ScaffoldField<SceneRect>;
  readonly essentialContentArea: ScaffoldField<SceneRect>;
  readonly uiSafeZones: ScaffoldField<readonly SceneUiSafeZoneSpec[]>;
  /** The perspective calibration pair: two floor lines and their scales. */
  readonly floorCalibration: ScaffoldField<SceneFloorCalibration>;
  readonly standardBodyWidthPercent: ScaffoldField<number>;
  /** Hero / title-safe regions for the title tableau. */
  readonly heroSafeRegions: ScaffoldField<readonly PercentRect[]>;

  readonly anchors: readonly AnchorScaffold[];
  readonly occluders: readonly OccluderScaffold[];
  readonly surfaceSlots: readonly SurfaceSlotScaffold[];

  /** Ids of measured rooms or archetypes informing this scene. */
  readonly measuredGeometryRefs: readonly string[];
  /** Free-text authoring and source notes, in declaration order. */
  readonly sourceNotes: readonly string[];
}

// ---------------------------------------------------------------------------
// Creation
// ---------------------------------------------------------------------------

export interface SceneScaffoldInput {
  readonly sceneId: string;
  readonly label: string;
  readonly familyId?: string;
  readonly presentationStatus?: "development-fixture" | "production";
  readonly plate: { readonly width: number; readonly height: number };
  /** The accepted ladder. Omitted for a room with no plate yet. */
  readonly tierPlan?: TierPlan;
  /** Content hashes per tier width, from the derivation step. */
  readonly tierHashes?: ReadonlyMap<number, string>;
  readonly assetId?: string;
  readonly measuredGeometryRefs?: readonly string[];
  readonly sourceNotes?: readonly string[];
  /**
   * Anchors to lay out as EMPTY scaffolds. Supplying ids and kinds is the
   * author saying "there are four places people go in this room"; it does not
   * supply any of their geometry, which stays unresolved.
   */
  readonly plannedAnchors?: readonly {
    readonly id: string;
    readonly type: string;
    readonly kind: SceneAnchorKind;
  }[];
  readonly plannedOccluders?: readonly {
    readonly id: string;
    readonly type: string;
  }[];
  readonly plannedSurfaceSlots?: readonly { readonly slotId: string }[];
}

const NEEDS_MEASUREMENT =
  "Nobody has measured this against the plate yet. Set it from the authoring overlay or from measured-geometry evidence.";
const NEEDS_JUDGEMENT =
  "Nobody has made this judgement yet. It is an author's call about this picture, not a number with a default.";

/**
 * Builds a scaffold in which everything a person must decide is UNRESOLVED.
 *
 * Note what this function does NOT do: it invents no anchors, no contacts, no
 * floor lines, no calibration. The only fields it fills are the ones the file
 * itself answers.
 */
export function createSceneAuthoringScaffold(
  input: SceneScaffoldInput,
): SceneAuthoringScaffold {
  const raster = buildRasterSpec(input);
  return {
    sceneId: input.sceneId,
    familyId: input.familyId ?? null,
    label: input.label,
    presentationStatus: input.presentationStatus ?? "development-fixture",
    plate: { width: input.plate.width, height: input.plate.height },
    raster,

    camera: unresolved(
      `${NEEDS_JUDGEMENT} Camera framing decides what the cover-fit crop is allowed to lose on a wide or a tall screen.`,
    ),
    safeArea: unresolved(
      `${NEEDS_JUDGEMENT} The safe area is the region of the plate that must survive every supported aspect ratio.`,
    ),
    essentialContentArea: unresolved(
      `${NEEDS_JUDGEMENT} The essential content area is the part of the room the scene is actually about.`,
    ),
    uiSafeZones: unresolved(
      `${NEEDS_JUDGEMENT} UI safe zones are where the permanent shell sits over this plate.`,
    ),
    floorCalibration: unresolved(
      `${NEEDS_MEASUREMENT} Two floor lines and the body scale at each are the entire perspective model; a scene cannot place people at depth without them.`,
    ),
    standardBodyWidthPercent: unresolved(
      `${NEEDS_JUDGEMENT} A normalized body canvas has no inherent size on a picture, so this scene must state how wide one paints at scale 1.`,
    ),
    heroSafeRegions: unresolved(
      `${NEEDS_JUDGEMENT} Hero and title-safe regions are where title-tableau copy may sit without covering the subject.`,
    ),

    anchors: (input.plannedAnchors ?? []).map(createAnchorScaffold),
    occluders: (input.plannedOccluders ?? []).map((planned) => ({
      id: planned.id,
      type: planned.type,
      zOrder: unresolved(
        `${NEEDS_JUDGEMENT} Paint order decides whether this object is in front of a person or behind them.`,
      ),
      regionPercent: unresolved(
        `${NEEDS_MEASUREMENT} The occluded region is traced against the plate.`,
      ),
      assetId: unresolved(
        "No alpha mask has been produced for this occluder yet.",
        "UNVERIFIED",
      ),
    })),
    surfaceSlots: (input.plannedSurfaceSlots ?? []).map((planned) => ({
      slotId: planned.slotId,
      kind: unresolved(
        `${NEEDS_JUDGEMENT} What class of surface this is decides what may be painted into it.`,
      ),
      rectPercent: unresolved(
        `${NEEDS_MEASUREMENT} The slot rectangle is traced against the plate.`,
      ),
      zOrder: unresolved(`${NEEDS_JUDGEMENT} Paint order for this surface.`),
      allowedContentClasses: unresolved(
        `${NEEDS_JUDGEMENT} Which simulation-owned content classes this slot accepts.`,
      ),
      civicSymbolPolicy: unresolved(
        `${NEEDS_JUDGEMENT} Whether this surface may present a civic seal or flag. If it may, it comes from the canonical source and is never generated.`,
        "UNVERIFIED",
      ),
      fallbackDecoration: unresolved(
        "No empty-state decor has been chosen. An unfilled slot shows restrained decor or nothing; it never shows placeholder information.",
      ),
    })),

    measuredGeometryRefs: [...(input.measuredGeometryRefs ?? [])],
    sourceNotes: [...(input.sourceNotes ?? [])],
  };
}

function createAnchorScaffold(planned: {
  readonly id: string;
  readonly type: string;
  readonly kind: SceneAnchorKind;
}): AnchorScaffold {
  const seatRelevant = planned.kind === "seat";
  return {
    id: planned.id,
    type: planned.type,
    kind: planned.kind,
    xPercent: unresolved(
      `${NEEDS_MEASUREMENT} Where along the plate this anchor sits.`,
    ),
    zOrder: unresolved(
      `${NEEDS_JUDGEMENT} Paint order at this anchor, which is distinct from perspective depth.`,
    ),
    footprintPercent: unresolved(
      `${NEEDS_JUDGEMENT} The widest a body may paint here before it reads as too large for the room.`,
    ),
    hitboxPercent: unresolved(
      "No interactive region has been traced for this anchor.",
      "UNVERIFIED",
    ),
    floorContact: seatRelevant
      ? unresolved(
          "A seat anchor carries its floor line inside its seat contact; a separate floor contact is not required here.",
          "UNVERIFIED",
        )
      : unresolved(
          `${NEEDS_MEASUREMENT} The floor line a standing person's soles land on. Guessing this is exactly how figures end up floating or sunk.`,
        ),
    seatContact: seatRelevant
      ? unresolved(
          `${NEEDS_MEASUREMENT} A seat contact needs the seat plane, the seat front, the seat width, the paint order of pan and backrest, AND the floor line the sitter's feet reach — a seated person's feet are on the floor, not on the chair.`,
        )
      : unresolved("Not a seat anchor.", "UNVERIFIED"),
    allowedPoseFamilies: unresolved(
      `${NEEDS_JUDGEMENT} Which pose families this anchor accepts.`,
    ),
    permittedFacings: unresolved(
      `${NEEDS_JUDGEMENT} Which facings read correctly at this anchor.`,
    ),
  };
}

function buildRasterSpec(input: SceneScaffoldInput): SceneRasterSpec | null {
  const plan = input.tierPlan;
  if (!plan || plan.tiers.length === 0) return null;
  const assetId = input.assetId ?? plan.assetId;
  const hashes = input.tierHashes;
  const tiers = plan.tiers
    .filter((tier) => hashes?.has(tier.width))
    .map((tier) => ({
      width: tier.width,
      height: tier.height,
      path: tier.path,
      hash: hashes!.get(tier.width)!,
      derivation: tier.derivation,
      ...(tier.nativeDetailWidth !== undefined
        ? { native_detail_width: tier.nativeDetailWidth }
        : {}),
    }));
  return tiers.length > 0 ? { asset_id: assetId, tiers } : null;
}

// ---------------------------------------------------------------------------
// Readiness
// ---------------------------------------------------------------------------

export interface ScaffoldGap {
  /** Dotted path of the unresolved field, e.g. `anchors.witness-chair.xPercent`. */
  readonly path: string;
  readonly certainty: "UNKNOWN" | "UNVERIFIED";
  readonly reason: string;
  /** Whether registering the scene is impossible until this is settled. */
  readonly blocking: boolean;
}

export interface ScaffoldReadiness {
  readonly sceneId: string;
  /** True when every blocking gap is closed. */
  readonly registrable: boolean;
  readonly gaps: readonly ScaffoldGap[];
  readonly blockingGapCount: number;
  readonly nonBlockingGapCount: number;
}

function collect(
  gaps: ScaffoldGap[],
  path: string,
  field: ScaffoldField<unknown>,
  blocking: boolean,
): void {
  if (field.state === "unresolved") {
    gaps.push({
      path,
      certainty: field.certainty,
      reason: field.reason,
      blocking,
    });
  }
}

/**
 * Everything still unresolved, and which of it stops the scene registering.
 *
 * "Blocking" here means exactly what `registerScene` means by it: the
 * compositor cannot place a person without the value. A missing hitbox is a
 * real gap and is reported, but it does not stop the room existing.
 */
export function evaluateScaffoldReadiness(
  scaffold: SceneAuthoringScaffold,
): ScaffoldReadiness {
  const gaps: ScaffoldGap[] = [];

  collect(gaps, "camera", scaffold.camera, true);
  collect(gaps, "safeArea", scaffold.safeArea, true);
  collect(gaps, "essentialContentArea", scaffold.essentialContentArea, true);
  collect(gaps, "uiSafeZones", scaffold.uiSafeZones, false);
  collect(gaps, "floorCalibration", scaffold.floorCalibration, false);
  collect(
    gaps,
    "standardBodyWidthPercent",
    scaffold.standardBodyWidthPercent,
    false,
  );
  collect(gaps, "heroSafeRegions", scaffold.heroSafeRegions, false);

  for (const anchor of scaffold.anchors) {
    const base = `anchors.${anchor.id}`;
    collect(gaps, `${base}.xPercent`, anchor.xPercent, true);
    collect(gaps, `${base}.zOrder`, anchor.zOrder, false);
    collect(gaps, `${base}.footprintPercent`, anchor.footprintPercent, false);
    collect(gaps, `${base}.hitboxPercent`, anchor.hitboxPercent, false);
    collect(
      gaps,
      `${base}.allowedPoseFamilies`,
      anchor.allowedPoseFamilies,
      false,
    );
    collect(gaps, `${base}.permittedFacings`, anchor.permittedFacings, false);
    // Exactly one contact is required, and which one depends on the kind.
    if (anchor.kind === "seat") {
      collect(gaps, `${base}.seatContact`, anchor.seatContact, true);
    } else if (anchor.kind === "floor-standing") {
      collect(gaps, `${base}.floorContact`, anchor.floorContact, true);
    } else {
      collect(gaps, `${base}.floorContact`, anchor.floorContact, false);
    }
  }

  for (const occluder of scaffold.occluders) {
    const base = `occluders.${occluder.id}`;
    collect(gaps, `${base}.zOrder`, occluder.zOrder, false);
    collect(gaps, `${base}.regionPercent`, occluder.regionPercent, false);
    collect(gaps, `${base}.assetId`, occluder.assetId, false);
  }

  for (const slot of scaffold.surfaceSlots) {
    const base = `surfaceSlots.${slot.slotId}`;
    collect(gaps, `${base}.kind`, slot.kind, true);
    collect(gaps, `${base}.rectPercent`, slot.rectPercent, true);
    collect(gaps, `${base}.zOrder`, slot.zOrder, true);
    collect(
      gaps,
      `${base}.allowedContentClasses`,
      slot.allowedContentClasses,
      true,
    );
    collect(gaps, `${base}.fallbackDecoration`, slot.fallbackDecoration, false);
  }

  const blocking = gaps.filter((gap) => gap.blocking);
  return {
    sceneId: scaffold.sceneId,
    registrable: blocking.length === 0,
    gaps,
    blockingGapCount: blocking.length,
    nonBlockingGapCount: gaps.length - blocking.length,
  };
}

// ---------------------------------------------------------------------------
// Projection
// ---------------------------------------------------------------------------

export interface ScaffoldProjection {
  /** Null when a blocking gap remains. Never a partially-guessed spec. */
  readonly spec: EnvironmentSceneSpec | null;
  readonly readiness: ScaffoldReadiness;
}

/**
 * Projects a scaffold into an `EnvironmentSceneSpec`, or refuses.
 *
 * Refusal is the interesting half. A scaffold with any blocking gap yields
 * `spec: null` and the gap list, rather than a spec with plausible numbers
 * standing in for decisions nobody made. The scaffold is allowed to be
 * incomplete; the spec is not allowed to pretend otherwise.
 */
export function projectScaffoldToSpec(
  scaffold: SceneAuthoringScaffold,
): ScaffoldProjection {
  const readiness = evaluateScaffoldReadiness(scaffold);
  if (!readiness.registrable) return { spec: null, readiness };

  const anchors: Anchor[] = scaffold.anchors.map((anchor) => {
    const floorContact = fieldValue(anchor.floorContact);
    const seatContact = fieldValue(anchor.seatContact);
    const zOrder = fieldValue(anchor.zOrder);
    const footprint = fieldValue(anchor.footprintPercent);
    const hitbox = fieldValue(anchor.hitboxPercent);
    const poses = fieldValue(anchor.allowedPoseFamilies);
    const facings = fieldValue(anchor.permittedFacings);
    return {
      id: anchor.id,
      type: anchor.type,
      kind: anchor.kind,
      x_percent: fieldValue(anchor.xPercent)!,
      ...(floorContact ? { floor_contact: floorContact } : {}),
      ...(seatContact ? { seat_contact: seatContact } : {}),
      ...(zOrder !== null ? { z_order: zOrder } : {}),
      ...(footprint !== null ? { footprint_percent: footprint } : {}),
      ...(hitbox ? { hitbox_percent: hitbox } : {}),
      ...(poses ? { allowed_pose_families: [...poses] } : {}),
      ...(facings ? { permitted_facings: [...facings] } : {}),
    };
  });

  const occluders: Occluder[] = scaffold.occluders.map((occluder) => {
    const zOrder = fieldValue(occluder.zOrder);
    const region = fieldValue(occluder.regionPercent);
    const assetId = fieldValue(occluder.assetId);
    return {
      id: occluder.id,
      type: occluder.type,
      ...(zOrder !== null ? { z_order: zOrder } : {}),
      ...(region ? { region_percent: region } : {}),
      ...(assetId ? { asset_id: assetId } : {}),
    };
  });

  const surfaceSlots: SceneSurfaceSlot[] = scaffold.surfaceSlots.map((slot) => {
    const fallback = fieldValue(slot.fallbackDecoration);
    const civicPolicy = fieldValue(slot.civicSymbolPolicy);
    return {
      slot_id: slot.slotId,
      kind: fieldValue(slot.kind)!,
      rect_percent: fieldValue(slot.rectPercent)!,
      z_order: fieldValue(slot.zOrder)!,
      allowed_content_classes: [...fieldValue(slot.allowedContentClasses)!],
      ...(civicPolicy ? { civic_symbol_policy: civicPolicy } : {}),
      ...(fallback ? { fallback_decoration: fallback } : {}),
    };
  });

  const uiSafeZones = fieldValue(scaffold.uiSafeZones);
  const floorCalibration = fieldValue(scaffold.floorCalibration);
  const standardBodyWidth = fieldValue(scaffold.standardBodyWidthPercent);

  const spec: EnvironmentSceneSpec = {
    environment_id: scaffold.sceneId,
    fidelity_tier: "F1",
    scene_id: scaffold.sceneId,
    label: scaffold.label,
    presentation_status: scaffold.presentationStatus,
    plate: { width: scaffold.plate.width, height: scaffold.plate.height },
    camera_policy: fieldValue(scaffold.camera)!,
    safe_area: fieldValue(scaffold.safeArea)!,
    essential_content_area: fieldValue(scaffold.essentialContentArea)!,
    ...(scaffold.familyId ? { family_id: scaffold.familyId } : {}),
    ...(scaffold.raster ? { raster: scaffold.raster } : {}),
    ...(uiSafeZones ? { ui_safe_zones: [...uiSafeZones] } : {}),
    ...(floorCalibration ? { floor_calibration: floorCalibration } : {}),
    ...(standardBodyWidth !== null
      ? { standard_body_width_percent: standardBodyWidth }
      : {}),
    ...(anchors.length > 0 ? { anchors } : {}),
    ...(occluders.length > 0
      ? { foreground_occlusion_objects: occluders }
      : {}),
    ...(surfaceSlots.length > 0 ? { surface_slots: surfaceSlots } : {}),
    ...(readiness.gaps.length > 0
      ? {
          explicit_unknowns: readiness.gaps.map(
            (gap) => `${gap.path}: ${gap.certainty} — ${gap.reason}`,
          ),
        }
      : {}),
  };

  return { spec, readiness };
}

// ---------------------------------------------------------------------------
// Editing
// ---------------------------------------------------------------------------

/**
 * Settles one anchor field, returning a new scaffold.
 *
 * Provided so the authoring surface never mutates a scaffold in place and so
 * every settled value carries the certainty the author chose. There is
 * deliberately no path that sets a value without one.
 */
export function resolveAnchorField<K extends keyof AnchorScaffold>(
  scaffold: SceneAuthoringScaffold,
  anchorId: string,
  field: K,
  value: AnchorScaffold[K] extends ScaffoldField<infer V> ? V : never,
  certainty: "VERIFIED" | "ESTIMATED",
  source?: string,
): SceneAuthoringScaffold {
  const anchors = scaffold.anchors.map((anchor) =>
    anchor.id === anchorId
      ? { ...anchor, [field]: resolved(value, certainty, source) }
      : anchor,
  );
  if (!scaffold.anchors.some((anchor) => anchor.id === anchorId)) {
    throw new Error(
      `Scaffold '${scaffold.sceneId}' has no anchor '${anchorId}'.`,
    );
  }
  return { ...scaffold, anchors };
}
