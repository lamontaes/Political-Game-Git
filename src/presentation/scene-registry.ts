import {
  validateEnvironmentSceneSpec,
  type Anchor,
  type EnvironmentSceneSpec,
  type Occluder,
  type PercentRect,
  type SceneAnchorKind,
  type SceneFloorCalibration,
  type SceneFloorContact,
  type SceneSeatContact,
  type SceneSurfaceSlot,
  type SceneUiSafeZoneSpec,
} from "../environment/environment-scene-spec";
import { CIVIC_COMMUNITY_MEETING_TITLE_SCENE } from "../environment/scenes/civic-community-meeting-title-production";
import { CIVIC_HEARING_ROOM_PRODUCTION_SCENE } from "../environment/scenes/civic-hearing-room-production";
import { COMMITTEE_ROOM_FIXTURE_SCENE } from "../environment/scenes/committee-room-fixture";
import { LEGISLATIVE_CHAMBER_PRODUCTION_SCENE } from "../environment/scenes/legislative-chamber-production";
import { OFFICE_COUNCIL_STAFF_FIXTURE_SCENE } from "../environment/scenes/office-council-staff-fixture";
import {
  RESIDENCE_APARTMENT_LIVING_CANONICAL_03_SCENE,
  RESIDENCE_APARTMENT_LIVING_ORDINARY_02_SCENE,
} from "../environment/scenes/residence-apartment-living-production";
import { SHARED_WORKROOM_OFFICE_PRODUCTION_SCENE } from "../environment/scenes/shared-workroom-office-production";
import { createRasterTierLadder, type RasterTierLadder } from "./raster-tiers";
import type {
  SceneCameraPolicy,
  SceneRect,
  SceneSize,
} from "./scene-transform";

/**
 * The runtime scene registry.
 *
 * `EnvironmentSceneSpec` is the one scene contract; this module turns a
 * validated spec into the shape the compositor consumes. There is deliberately
 * no second scene schema, and no scene-specific React: adding a room is
 * authoring a spec and registering it.
 *
 * A scene may register without a raster. That is the honest state of a room
 * whose plate has not been made yet, and the runtime says so rather than
 * borrowing another room's picture.
 */

export type ScenePresentationStatus = "development-fixture" | "production";

export interface RegisteredSceneAnchor {
  readonly id: string;
  readonly type: string;
  readonly kind: SceneAnchorKind | null;
  readonly xPercent: number;
  /** Paint order. Perspective depth is derived from contacts, not from this. */
  readonly zOrder: number;
  readonly footprintPercent: number | null;
  readonly hitboxPercent: PercentRect | null;
  readonly floorContact: SceneFloorContact | null;
  readonly seatContact: SceneSeatContact | null;
  readonly allowedBodyFamilies: readonly string[] | null;
  readonly allowedPoseFamilies: readonly string[] | null;
  readonly permittedFacings: readonly string[] | null;
  /**
   * The floor line this anchor stands or sits on, which is what perspective
   * scale is interpolated from.
   */
  readonly contactFloorYPercent: number;
}

export interface RegisteredSceneOccluder {
  readonly id: string;
  readonly type: string;
  readonly assetId: string | null;
  readonly zOrder: number;
  readonly regionPercent: PercentRect | null;
}

export interface RegisteredScene {
  readonly sceneId: string;
  readonly familyId: string | null;
  readonly label: string;
  readonly presentationStatus: ScenePresentationStatus;
  readonly plate: SceneSize;
  readonly camera: SceneCameraPolicy;
  readonly safeArea: SceneRect;
  readonly essentialContentArea: SceneRect;
  readonly uiSafeZones: readonly SceneUiSafeZoneSpec[];
  /** Null when this room has no plate yet. */
  readonly raster: {
    readonly assetId: string;
    readonly ladder: RasterTierLadder;
  } | null;
  readonly floorCalibration: SceneFloorCalibration | null;
  /**
   * Width a normalized modular body canvas paints at scale 1, as a percentage
   * of plate width. Null when the scene has not been authored for modular
   * people, which is a refusal to guess rather than a default.
   */
  readonly standardBodyWidthPercent: number | null;
  readonly anchors: ReadonlyMap<string, RegisteredSceneAnchor>;
  /** Ascending by z-order, then by id, so paint order is deterministic. */
  readonly occluders: readonly RegisteredSceneOccluder[];
  readonly surfaceSlots: readonly SceneSurfaceSlot[];
  readonly spec: EnvironmentSceneSpec;
}

function requirePresentationField<T>(
  sceneLabel: string,
  field: string,
  value: T | undefined,
): T {
  if (value === undefined) {
    throw new Error(
      `Scene '${sceneLabel}' cannot be registered without '${field}'.`,
    );
  }
  return value;
}

function projectAnchor(anchor: Anchor, sceneId: string): RegisteredSceneAnchor {
  const kind = anchor.kind ?? null;
  const contactFloorYPercent =
    anchor.seat_contact?.floor_y_percent ??
    anchor.floor_contact?.floor_y_percent ??
    null;
  if (contactFloorYPercent === null) {
    throw new Error(
      `Scene '${sceneId}' anchor '${anchor.id}' declares no floor line; placement cannot be computed from contacts without one.`,
    );
  }
  if (anchor.x_percent === undefined) {
    throw new Error(
      `Scene '${sceneId}' anchor '${anchor.id}' must declare 'x_percent'.`,
    );
  }
  return {
    id: anchor.id,
    type: anchor.type,
    kind,
    xPercent: anchor.x_percent,
    zOrder: anchor.z_order ?? 0,
    footprintPercent: anchor.footprint_percent ?? null,
    hitboxPercent: anchor.hitbox_percent ?? null,
    floorContact: anchor.floor_contact ?? null,
    seatContact: anchor.seat_contact ?? null,
    allowedBodyFamilies: anchor.allowed_body_families ?? null,
    allowedPoseFamilies: anchor.allowed_pose_families ?? null,
    permittedFacings: anchor.permitted_facings ?? null,
    contactFloorYPercent,
  };
}

function projectOccluder(occluder: Occluder): RegisteredSceneOccluder {
  return {
    id: occluder.id,
    type: occluder.type,
    assetId: occluder.asset_id ?? null,
    zOrder: occluder.z_order ?? 0,
    regionPercent: occluder.region_percent ?? null,
  };
}

/**
 * Validates a spec and projects it into the runtime shape. Throws rather than
 * registering a scene the compositor could not place a person in.
 */
export function registerScene(spec: EnvironmentSceneSpec): RegisteredScene {
  const validation = validateEnvironmentSceneSpec(spec);
  if (!validation.valid) {
    throw new Error(
      `Cannot register scene '${spec.scene_id ?? spec.environment_id}': ${validation.errors.join(" ")}`,
    );
  }
  const sceneId = requirePresentationField(
    spec.environment_id,
    "scene_id",
    spec.scene_id,
  );
  const plate = requirePresentationField(sceneId, "plate", spec.plate);
  const policy = requirePresentationField(
    sceneId,
    "camera_policy",
    spec.camera_policy,
  );
  const safeArea = requirePresentationField(
    sceneId,
    "safe_area",
    spec.safe_area,
  );
  const essentialContentArea = requirePresentationField(
    sceneId,
    "essential_content_area",
    spec.essential_content_area,
  );

  const anchors = new Map<string, RegisteredSceneAnchor>();
  for (const anchor of spec.anchors ?? []) {
    anchors.set(anchor.id, projectAnchor(anchor, sceneId));
  }

  const occluders = (spec.foreground_occlusion_objects ?? [])
    .map(projectOccluder)
    .sort((a, b) =>
      a.zOrder !== b.zOrder
        ? a.zOrder - b.zOrder
        : a.id < b.id
          ? -1
          : a.id > b.id
            ? 1
            : 0,
    );

  const raster = spec.raster
    ? {
        assetId: spec.raster.asset_id,
        ladder: createRasterTierLadder(
          spec.raster.asset_id,
          spec.raster.tiers.map((tier) => ({
            width: tier.width,
            height: tier.height,
            path: tier.path,
            hash: tier.hash,
            derivation: tier.derivation,
            ...(tier.native_detail_width !== undefined
              ? { nativeDetailWidth: tier.native_detail_width }
              : {}),
          })),
        ),
      }
    : null;

  return {
    sceneId,
    familyId: spec.family_id ?? null,
    label: spec.label ?? sceneId,
    presentationStatus: spec.presentation_status ?? "development-fixture",
    plate: { width: plate.width, height: plate.height },
    camera: {
      minimumAspectRatio: policy.minimum_aspect_ratio,
      maximumAspectRatio: policy.maximum_aspect_ratio,
      horizontalFocus: policy.horizontal_focus,
      verticalFocus: policy.vertical_focus,
    },
    safeArea,
    essentialContentArea,
    uiSafeZones: spec.ui_safe_zones ?? [],
    raster,
    floorCalibration: spec.floor_calibration ?? null,
    standardBodyWidthPercent: spec.standard_body_width_percent ?? null,
    anchors,
    occluders,
    surfaceSlots: spec.surface_slots ?? [],
    spec,
  };
}

export interface SceneRegistry {
  readonly scenes: ReadonlyMap<string, RegisteredScene>;
}

export function createSceneRegistry(
  specs: readonly EnvironmentSceneSpec[],
): SceneRegistry {
  const scenes = new Map<string, RegisteredScene>();
  for (const spec of specs) {
    const scene = registerScene(spec);
    if (scenes.has(scene.sceneId)) {
      throw new Error(`Scene registry already holds '${scene.sceneId}'.`);
    }
    scenes.set(scene.sceneId, scene);
  }
  return { scenes };
}

export function requireScene(
  registry: SceneRegistry,
  sceneId: string,
): RegisteredScene {
  const scene = registry.scenes.get(sceneId);
  if (!scene) {
    throw new Error(`Scene registry has no scene '${sceneId}'.`);
  }
  return scene;
}

export function requireSceneAnchor(
  scene: RegisteredScene,
  anchorId: string,
): RegisteredSceneAnchor {
  const anchor = scene.anchors.get(anchorId);
  if (!anchor) {
    throw new Error(`Scene '${scene.sceneId}' has no anchor '${anchorId}'.`);
  }
  return anchor;
}

/**
 * Every scene the runtime knows about.
 *
 * Five carry production plates and two are development fixtures. The fixtures
 * are kept deliberately: the council-staff office is frozen regression
 * evidence, and the committee room is the proof that a scene with no picture
 * at all still registers and still says so. Adding a room is adding a spec to
 * this list, not writing scene-specific React.
 */
export const SCENE_REGISTRY: SceneRegistry = createSceneRegistry([
  SHARED_WORKROOM_OFFICE_PRODUCTION_SCENE,
  CIVIC_COMMUNITY_MEETING_TITLE_SCENE,
  CIVIC_HEARING_ROOM_PRODUCTION_SCENE,
  LEGISLATIVE_CHAMBER_PRODUCTION_SCENE,
  RESIDENCE_APARTMENT_LIVING_CANONICAL_03_SCENE,
  RESIDENCE_APARTMENT_LIVING_ORDINARY_02_SCENE,
  OFFICE_COUNCIL_STAFF_FIXTURE_SCENE,
  COMMITTEE_ROOM_FIXTURE_SCENE,
]);

/**
 * The production office. Its geometry is measured from its own 5504x3072
 * master; nothing is inherited from the development fixture below it.
 */
export const PRODUCTION_OFFICE_SCENE_ID = "shared-workroom-office-production";
export const OFFICE_FIXTURE_SCENE_ID = "office-council-staff-fixture";
export const COMMITTEE_FIXTURE_SCENE_ID = "committee-room-fixture";

/** The neutral public room the title screen composes against. */
export const TITLE_TABLEAU_SCENE_ID = "civic-community-meeting-title";
/** The production hearing room. Distinct from the committee fixture above. */
export const HEARING_ROOM_SCENE_ID = "civic-hearing-room-production";
/** The production chamber floor. Distinct from the hearing room and courtroom. */
export const LEGISLATIVE_CHAMBER_SCENE_ID = "legislative-chamber-production";
export const DOMESTIC_CANONICAL_SCENE_ID =
  "residence-apartment-living-canonical-03";
export const DOMESTIC_ORDINARY_SCENE_ID =
  "residence-apartment-living-ordinary-02";

/**
 * The domestic rooms, in the order a deterministic chooser walks them. Both
 * are ordinary apartments and neither carries a station: which household a
 * room stands for is canonical world truth, never a property of the plate.
 */
export const DOMESTIC_SCENE_IDS: readonly string[] = [
  DOMESTIC_CANONICAL_SCENE_ID,
  DOMESTIC_ORDINARY_SCENE_ID,
];
