import type {
  CharacterBodyContacts,
  CharacterContactPoint,
} from "./character-components";
import type { RegisteredScene, RegisteredSceneAnchor } from "./scene-registry";
import type { SceneSize } from "./scene-transform";

/**
 * Contact-driven placement.
 *
 * A scene declares where its floor and its seats are; a body declares where its
 * soles and its seated pelvis are. Placement is the arithmetic between the two,
 * so swapping one body for another at the same anchor keeps contact without any
 * per-sprite retuning. Nothing here is hand-tuned and nothing here is a
 * projective camera: perspective is a bounded linear ramp between two authored
 * floor calibration pairs, which is correct for a single-vanishing-point
 * interior and is all the generation pipeline can honestly support.
 *
 * Paint order (`zOrder`) and perspective depth (the floor line) are separate
 * concepts here and share no field.
 */

/** How far a contact may miss its plane, in plate percent, before it warns. */
export const CONTACT_TOLERANCE_PERCENT = 1.5;

/**
 * The 10A development warning family. These are development diagnostics, not
 * player-facing copy: they are allowed to be technical and must be specific
 * enough to name the contract that was broken.
 */
export type SceneDiagnosticCode =
  /** W1 */
  | "seated-pelvis-misses-seat-plane"
  /** W2 */
  | "feet-miss-floor-line"
  /** W3 */
  | "sprite-exceeds-footprint"
  /** W4 */
  | "pose-not-permitted-at-anchor"
  /** W5 */
  | "body-family-not-permitted-at-anchor"
  /** W6 */
  | "facing-not-permitted-at-anchor"
  /** W7 */
  | "selected-raster-under-resolved"
  /** W8 */
  | "incompatible-slot-combination"
  /** W9 */
  | "required-slot-empty"
  /** W10 */
  | "asset-not-runtime-approved"
  /** Contact metadata the placement needed is absent from the body. */
  | "body-declares-no-contacts"
  /** The scene cannot derive a scale because it declares no calibration. */
  | "scene-declares-no-floor-calibration"
  /** The room has no plate yet. */
  | "scene-has-no-raster";

export interface SceneDiagnostic {
  readonly code: SceneDiagnosticCode;
  /** W-number from the 10A warning family, for cross-referencing. */
  readonly warning: string;
  readonly sceneId: string;
  readonly anchorId: string | null;
  readonly subject: string | null;
  readonly message: string;
}

export function sceneDiagnostic(
  code: SceneDiagnosticCode,
  warning: string,
  sceneId: string,
  anchorId: string | null,
  subject: string | null,
  message: string,
): SceneDiagnostic {
  return { code, warning, sceneId, anchorId, subject, message };
}

// ---------------------------------------------------------------------------
// Perspective
// ---------------------------------------------------------------------------

/**
 * Derives a person's scale from where they stand, by linear interpolation
 * between the scene's two floor calibration pairs. Positions beyond either pair
 * are clamped to that pair rather than extrapolated: the authored pairs bound
 * what the plate's perspective actually evidences.
 */
export function resolvePerspectiveScale(
  scene: RegisteredScene,
  floorYPercent: number,
): number {
  const calibration = scene.floorCalibration;
  if (!calibration) return 1;
  const { near, far } = calibration;
  const span = near.floor_y_percent - far.floor_y_percent;
  if (span === 0) return far.scale;
  const t = (floorYPercent - far.floor_y_percent) / span;
  const clamped = t < 0 ? 0 : t > 1 ? 1 : t;
  return far.scale + clamped * (near.scale - far.scale);
}

// ---------------------------------------------------------------------------
// Placement
// ---------------------------------------------------------------------------

export interface PlacementSubject {
  /** Identifier used in diagnostics; a person id or a fixture label. */
  readonly id: string;
  readonly bodyCanvas: SceneSize;
  /** Pelvis-hip-center, normalized in the body canvas. */
  readonly root: CharacterContactPoint;
  /** Declared contacts. Missing contacts degrade to the root, with a warning. */
  readonly contacts?: CharacterBodyContacts;
  readonly bodyFamily: string;
  readonly poseFamily: string;
  readonly facing: string | null;
  /**
   * How wide this body's canvas paints on this plate at scale 1, as a
   * percentage of plate width.
   */
  readonly referenceWidthPercent: number;
}

export interface PlacementBox {
  readonly leftPercent: number;
  readonly topPercent: number;
  readonly widthPercent: number;
  readonly heightPercent: number;
}

export interface PlacementMarker {
  readonly id: string;
  readonly xPercent: number;
  readonly yPercent: number;
}

export interface ScenePlacement {
  readonly sceneId: string;
  readonly anchorId: string;
  readonly subjectId: string;
  /** Derived from the anchor's floor line; never hand-tuned. */
  readonly scale: number;
  readonly box: PlacementBox;
  /** Paint order, distinct from the floor line below. */
  readonly zOrder: number;
  /** Perspective depth: where on the floor this person stands. */
  readonly contactFloorYPercent: number;
  readonly hitbox: PlacementBox;
  readonly rootMarker: PlacementMarker;
  readonly floorContactMarkers: readonly PlacementMarker[];
  readonly seatedPelvisMarker: PlacementMarker | null;
  readonly diagnostics: readonly SceneDiagnostic[];
}

function bodyHeightPercent(
  widthPercent: number,
  bodyCanvas: SceneSize,
  plate: SceneSize,
): number {
  return (
    (widthPercent / (bodyCanvas.width / bodyCanvas.height)) *
    (plate.width / plate.height)
  );
}

function soleContacts(contacts: CharacterBodyContacts | undefined): {
  readonly left: CharacterContactPoint;
  readonly right: CharacterContactPoint;
} | null {
  if (!contacts?.leftFoot || !contacts.rightFoot) return null;
  return { left: contacts.leftFoot, right: contacts.rightFoot };
}

/**
 * Places one body at one anchor from contacts alone.
 *
 * Standing: the sole line lands on the anchor's floor line and the midpoint
 * between the soles lands on the anchor's x.
 *
 * Seated: the seated pelvis lands on the seat plane, and the resulting sole
 * line is then checked against the seat's floor line — because a seated
 * person's feet are on the floor, and modelling only the pelvis is exactly why
 * hand-tuned seated sprites float.
 *
 * A body that declares no contacts falls back to its pelvis root, which
 * reproduces the older hand-placed behaviour and says so in a diagnostic.
 */
export function placeSubjectAtAnchor(
  scene: RegisteredScene,
  anchor: RegisteredSceneAnchor,
  subject: PlacementSubject,
): ScenePlacement {
  const diagnostics: SceneDiagnostic[] = [];
  const note = (
    code: SceneDiagnosticCode,
    warning: string,
    message: string,
  ) => {
    diagnostics.push(
      sceneDiagnostic(
        code,
        warning,
        scene.sceneId,
        anchor.id,
        subject.id,
        message,
      ),
    );
  };

  if (!scene.floorCalibration) {
    note(
      "scene-declares-no-floor-calibration",
      "—",
      `Scene '${scene.sceneId}' declares no floor calibration, so every person paints at scale 1.`,
    );
  }

  if (
    anchor.allowedPoseFamilies &&
    !anchor.allowedPoseFamilies.includes(subject.poseFamily)
  ) {
    note(
      "pose-not-permitted-at-anchor",
      "W4",
      `Anchor '${anchor.id}' permits poses ${anchor.allowedPoseFamilies.join(", ")}; this body presents '${subject.poseFamily}'.`,
    );
  }
  if (
    anchor.allowedBodyFamilies &&
    !anchor.allowedBodyFamilies.includes(subject.bodyFamily)
  ) {
    note(
      "body-family-not-permitted-at-anchor",
      "W5",
      `Anchor '${anchor.id}' permits body families ${anchor.allowedBodyFamilies.join(", ")}; this body is '${subject.bodyFamily}'.`,
    );
  }
  if (
    anchor.permittedFacings &&
    subject.facing !== null &&
    !anchor.permittedFacings.includes(subject.facing)
  ) {
    note(
      "facing-not-permitted-at-anchor",
      "W6",
      `Anchor '${anchor.id}' permits facings ${anchor.permittedFacings.join(", ")}; this body faces '${subject.facing}'.`,
    );
  }

  const scale = resolvePerspectiveScale(scene, anchor.contactFloorYPercent);
  const widthPercent = subject.referenceWidthPercent * scale;
  const heightPercent = bodyHeightPercent(
    widthPercent,
    subject.bodyCanvas,
    scene.plate,
  );

  const soles = soleContacts(subject.contacts);
  const seatedPelvis = subject.contacts?.seatedPelvis ?? null;
  const seat = anchor.seatContact;

  let anchorPointX: number;
  let anchorPointY: number;
  let placedByY: number;

  if (seat) {
    if (seatedPelvis) {
      anchorPointX = seatedPelvis.x;
      anchorPointY = seatedPelvis.y;
    } else {
      note(
        "body-declares-no-contacts",
        "W1",
        `Body '${subject.id}' declares no seatedPelvis contact, so it is placed by its pelvis root and its contact with the seat is unverified.`,
      );
      anchorPointX = subject.root.x;
      anchorPointY = subject.root.y;
    }
    placedByY = seat.seat_plane_y_percent;
  } else if (anchor.floorContact) {
    if (soles) {
      anchorPointX = (soles.left.x + soles.right.x) / 2;
      anchorPointY = Math.max(soles.left.y, soles.right.y);
    } else {
      note(
        "body-declares-no-contacts",
        "W2",
        `Body '${subject.id}' declares no foot contacts, so it is placed by its pelvis root and its contact with the floor is unverified.`,
      );
      anchorPointX = subject.root.x;
      anchorPointY = subject.root.y;
    }
    placedByY = soles
      ? anchor.floorContact.floor_y_percent
      : anchor.contactFloorYPercent;
  } else {
    anchorPointX = subject.root.x;
    anchorPointY = subject.root.y;
    placedByY = anchor.contactFloorYPercent;
  }

  const leftPercent = anchor.xPercent - anchorPointX * widthPercent;
  const topPercent = placedByY - anchorPointY * heightPercent;

  const markerAt = (
    id: string,
    point: CharacterContactPoint,
  ): PlacementMarker => ({
    id,
    xPercent: leftPercent + point.x * widthPercent,
    yPercent: topPercent + point.y * heightPercent,
  });

  const floorContactMarkers = soles
    ? [markerAt("left-foot", soles.left), markerAt("right-foot", soles.right)]
    : [];
  const seatedPelvisMarker = seatedPelvis
    ? markerAt("seated-pelvis", seatedPelvis)
    : null;

  // A seated body's feet must still reach the floor the seat stands on.
  if (seat && soles) {
    const soleY = Math.max(
      floorContactMarkers[0]!.yPercent,
      floorContactMarkers[1]!.yPercent,
    );
    const miss = soleY - seat.floor_y_percent;
    if (Math.abs(miss) > CONTACT_TOLERANCE_PERCENT) {
      note(
        "feet-miss-floor-line",
        "W2",
        `Seated body '${subject.id}' lands its soles at ${soleY.toFixed(2)}% while anchor '${anchor.id}' puts the floor at ${seat.floor_y_percent}% — ${miss > 0 ? "through" : "above"} the floor by ${Math.abs(miss).toFixed(2)}%.`,
      );
    }
  }
  if (seat && seatedPelvisMarker) {
    const miss = seatedPelvisMarker.yPercent - seat.seat_plane_y_percent;
    if (Math.abs(miss) > CONTACT_TOLERANCE_PERCENT) {
      note(
        "seated-pelvis-misses-seat-plane",
        "W1",
        `Seated body '${subject.id}' puts its pelvis at ${seatedPelvisMarker.yPercent.toFixed(2)}% while anchor '${anchor.id}' puts the seat plane at ${seat.seat_plane_y_percent}%.`,
      );
    }
  }
  if (!seat && anchor.floorContact && soles) {
    const soleY = Math.max(
      floorContactMarkers[0]!.yPercent,
      floorContactMarkers[1]!.yPercent,
    );
    const miss = soleY - anchor.floorContact.floor_y_percent;
    if (Math.abs(miss) > CONTACT_TOLERANCE_PERCENT) {
      note(
        "feet-miss-floor-line",
        "W2",
        `Standing body '${subject.id}' lands its soles at ${soleY.toFixed(2)}% while anchor '${anchor.id}' puts the floor at ${anchor.floorContact.floor_y_percent}%.`,
      );
    }
    const spread = Math.abs(
      floorContactMarkers[1]!.xPercent - floorContactMarkers[0]!.xPercent,
    );
    const maxSpread = anchor.floorContact.max_foot_spread_percent;
    if (maxSpread !== undefined && spread > maxSpread) {
      note(
        "sprite-exceeds-footprint",
        "W3",
        `Standing body '${subject.id}' spreads its feet ${spread.toFixed(2)}% of plate width; anchor '${anchor.id}' allows ${maxSpread}%.`,
      );
    }
  }

  if (
    anchor.footprintPercent !== null &&
    widthPercent > anchor.footprintPercent
  ) {
    note(
      "sprite-exceeds-footprint",
      "W3",
      `Body '${subject.id}' paints ${widthPercent.toFixed(2)}% of plate width at anchor '${anchor.id}', which allows a ${anchor.footprintPercent}% footprint.`,
    );
  }

  const hitboxSpec = anchor.hitboxPercent;
  const hitbox: PlacementBox = hitboxSpec
    ? {
        leftPercent: leftPercent + widthPercent * (hitboxSpec.x_percent / 100),
        topPercent: topPercent + heightPercent * (hitboxSpec.y_percent / 100),
        widthPercent: widthPercent * (hitboxSpec.width_percent / 100),
        heightPercent: heightPercent * (hitboxSpec.height_percent / 100),
      }
    : { leftPercent, topPercent, widthPercent, heightPercent };

  return {
    sceneId: scene.sceneId,
    anchorId: anchor.id,
    subjectId: subject.id,
    scale,
    box: { leftPercent, topPercent, widthPercent, heightPercent },
    zOrder: anchor.zOrder,
    contactFloorYPercent: anchor.contactFloorYPercent,
    hitbox,
    rootMarker: markerAt("pelvis-hip-center", subject.root),
    floorContactMarkers,
    seatedPelvisMarker,
    diagnostics,
  };
}

/**
 * Paint order for several people in one scene: further back paints first.
 * Depth comes from the floor line, and the anchor's explicit z-order breaks
 * ties, so ordering never depends on DOM insertion order.
 */
export function sortPlacementsByDepth(
  placements: readonly ScenePlacement[],
): readonly ScenePlacement[] {
  return [...placements].sort((a, b) => {
    if (a.contactFloorYPercent !== b.contactFloorYPercent) {
      return a.contactFloorYPercent - b.contactFloorYPercent;
    }
    if (a.zOrder !== b.zOrder) return a.zOrder - b.zOrder;
    return a.subjectId < b.subjectId ? -1 : a.subjectId > b.subjectId ? 1 : 0;
  });
}

/**
 * Named occluders that paint in front of a placed person. Each occluder keeps
 * its own z-order, so a desk front and a chair arm can sit at different depths
 * rather than sharing one flat mask.
 */
export function occludersInFrontOf(
  scene: RegisteredScene,
  placement: ScenePlacement,
): readonly RegisteredScene["occluders"][number][] {
  return scene.occluders.filter(
    (occluder) => occluder.zOrder > placement.zOrder,
  );
}
