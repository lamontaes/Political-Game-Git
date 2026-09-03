/**
 * PRODUCTION CARGO — the approved environment library as scene-authoring
 * records rather than research notes.
 *
 * Six approved masters exist. Until now what was known about them lived in a
 * document: floor ramps, seat planes, staging positions, occluder rectangles
 * and a per-surface ruling on every visible frame. This file is that evidence
 * as scaffolds — typed, validated, and refusing to project into a runtime spec
 * while a blocking gap remains.
 *
 * Every one of these scaffolds is deliberately INCOMPLETE, and the shape of the
 * incompleteness is the useful part. Three things are missing across the board,
 * and each is a different kind of missing:
 *
 * 1. **No raster.** The plates are Drive-only. Committing them would put
 *    unapproved bytes in the tree, so `raster` is null and the tier ladder is
 *    unbuilt. The intake and the tier plan already exist; what is absent is the
 *    files, not the pipeline.
 * 2. **No camera or safe area.** Nobody has decided what a cover-fit crop may
 *    lose from these rooms on a wide or a tall screen. That is an author's
 *    judgement about a picture, and it has not been made. It is also blocking:
 *    a scene cannot register without it.
 * 3. **No seat boxes.** The inspection measured the seat PLANE of every chair,
 *    which can be read straight off a picture. The seat's width and the paint
 *    order of its pan and backrest cannot be, so `seatContact` stays unresolved
 *    while `seatPlaneYPercent` carries what was actually measured.
 *
 * Everything resolved below is `ESTIMATED`, sourced to the geometry inspection,
 * with one exception: the Lexington fixture's numbers were verified against art
 * that is in the repository and are marked as such where they came from it.
 * Nothing here is presented as plan-derived, because none of it is.
 */

import {
  createSceneAuthoringScaffold,
  resolveAnchorField,
  resolveOccluderField,
  resolveSceneField,
  resolveSurfaceSlotField,
  type SceneAuthoringScaffold,
} from "../scene-scaffold";

const GEOMETRY_SOURCE =
  "37C scene geometry and dynamic-surface authoring evidence, 2026-09-02 (visual estimate)";

/** The whole library shares one raster ladder note, so it is stated once. */
const NO_PLATE_NOTE =
  "The master is approved but lives in Drive, not in this repository. Nothing here declares a raster, a tier or a hash, and the scaffold cannot project into a runtime spec until intake runs on the real file.";

// ---------------------------------------------------------------------------
// Scene 1 — civic community meeting hall
// ---------------------------------------------------------------------------

/**
 * The title tableau, and the only scene in the library with a hero slot.
 *
 * Its podium is the clearest case in the project for a dynamic surface: the
 * placard is large, flat, dead centre of the composition, and the single most
 * jurisdiction-specific object in the room. Baking anything onto it would make
 * one plate serve one meeting.
 */
function civicCommunityMeetingHall(): SceneAuthoringScaffold {
  let scene = createSceneAuthoringScaffold({
    sceneId: "civic-community-meeting-hall",
    label: "Civic community meeting hall (title tableau)",
    familyId: "CIVIC_COMMUNITY_MEETING_HALL_01",
    presentationStatus: "production",
    plate: { width: 5504, height: 3072 },
    sourceNotes: [
      NO_PLATE_NOTE,
      "Master: PG_TITLE_BG_COMMUNITY_MEETING_HERO_SLOT_02_5504x3072.png. Native 5504x3072, lossless PNG.",
      "The audience is baked illustrated sprites. Only the podium hero slot and the right foreground chair accept modular people.",
      "The lectern face is angled roughly four degrees off square. That skew is an estimate and no placard geometry should be treated as exactly rectangular.",
      "The inspection listed `agenda` among the placard's content classes. It is dropped here: a placard is a name plate holding one short line, and no component family that draws an agenda can be drawn on one. The agenda belongs on the lectern's speech notes, which is where it is bound.",
    ],
    plannedAnchors: [
      {
        id: "podium-speaker-hero",
        type: "standing-person",
        kind: "floor-standing",
      },
      { id: "audience-front-guest-chair", type: "seated-person", kind: "seat" },
      {
        id: "hall-perimeter-standing",
        type: "standing-person",
        kind: "floor-standing",
      },
    ],
    plannedOccluders: [
      { id: "podium-body-occluder", type: "furniture-foreground" },
      { id: "foreground-chair-frame", type: "furniture-foreground" },
    ],
    plannedSurfaceSlots: [
      { slotId: "podium-front-placard" },
      { slotId: "podium-speech-notes" },
      { slotId: "hall-title-banner-area" },
    ],
  });

  scene = resolveSceneField(
    scene,
    "floorCalibration",
    {
      near: { floor_y_percent: 98, scale: 1.15 },
      far: { floor_y_percent: 52, scale: 0.7 },
    },
    "ESTIMATED",
    GEOMETRY_SOURCE,
  );
  scene = resolveSceneField(
    scene,
    "standardBodyWidthPercent",
    16.5,
    "ESTIMATED",
    GEOMETRY_SOURCE,
  );
  scene = resolveSceneField(
    scene,
    "heroSafeRegions",
    [{ x_percent: 2, y_percent: 5, width_percent: 33, height_percent: 25 }],
    "ESTIMATED",
    GEOMETRY_SOURCE,
  );

  scene = resolveAnchorField(
    scene,
    "podium-speaker-hero",
    "xPercent",
    26.5,
    "ESTIMATED",
    GEOMETRY_SOURCE,
  );
  scene = resolveAnchorField(
    scene,
    "podium-speaker-hero",
    "zOrder",
    2,
    "ESTIMATED",
    GEOMETRY_SOURCE,
  );
  scene = resolveAnchorField(
    scene,
    "podium-speaker-hero",
    "floorContact",
    { floor_y_percent: 86, max_foot_spread_percent: 8 },
    "ESTIMATED",
    GEOMETRY_SOURCE,
  );
  scene = resolveAnchorField(
    scene,
    "podium-speaker-hero",
    "allowedPoseFamilies",
    ["standing-at-podium", "standing-speech"],
    "ESTIMATED",
    GEOMETRY_SOURCE,
  );
  scene = resolveAnchorField(
    scene,
    "podium-speaker-hero",
    "permittedFacings",
    ["front", "three-quarter-right"],
    "ESTIMATED",
    GEOMETRY_SOURCE,
  );

  scene = resolveAnchorField(
    scene,
    "audience-front-guest-chair",
    "xPercent",
    83.5,
    "ESTIMATED",
    GEOMETRY_SOURCE,
  );
  scene = resolveAnchorField(
    scene,
    "audience-front-guest-chair",
    "zOrder",
    4,
    "ESTIMATED",
    GEOMETRY_SOURCE,
  );
  scene = resolveAnchorField(
    scene,
    "audience-front-guest-chair",
    "seatPlaneYPercent",
    68,
    "ESTIMATED",
    GEOMETRY_SOURCE,
  );
  scene = resolveAnchorField(
    scene,
    "audience-front-guest-chair",
    "floorContact",
    { floor_y_percent: 98 },
    "ESTIMATED",
    GEOMETRY_SOURCE,
  );
  scene = resolveAnchorField(
    scene,
    "audience-front-guest-chair",
    "allowedPoseFamilies",
    ["seated-in-guest-chair"],
    "ESTIMATED",
    GEOMETRY_SOURCE,
  );

  scene = resolveAnchorField(
    scene,
    "hall-perimeter-standing",
    "xPercent",
    12,
    "ESTIMATED",
    GEOMETRY_SOURCE,
  );
  scene = resolveAnchorField(
    scene,
    "hall-perimeter-standing",
    "zOrder",
    1,
    "ESTIMATED",
    GEOMETRY_SOURCE,
  );
  scene = resolveAnchorField(
    scene,
    "hall-perimeter-standing",
    "floorContact",
    { floor_y_percent: 54, max_foot_spread_percent: 6 },
    "ESTIMATED",
    GEOMETRY_SOURCE,
  );

  scene = resolveOccluderField(
    scene,
    "podium-body-occluder",
    "zOrder",
    3,
    "ESTIMATED",
    GEOMETRY_SOURCE,
  );
  scene = resolveOccluderField(
    scene,
    "podium-body-occluder",
    "regionPercent",
    {
      x_percent: 21.8,
      y_percent: 30.8,
      width_percent: 19,
      height_percent: 67.2,
    },
    "ESTIMATED",
    GEOMETRY_SOURCE,
  );
  scene = resolveOccluderField(
    scene,
    "foreground-chair-frame",
    "zOrder",
    5,
    "ESTIMATED",
    GEOMETRY_SOURCE,
  );
  scene = resolveOccluderField(
    scene,
    "foreground-chair-frame",
    "regionPercent",
    { x_percent: 72, y_percent: 67, width_percent: 23.5, height_percent: 31 },
    "ESTIMATED",
    GEOMETRY_SOURCE,
  );

  scene = resolveSurfaceSlotField(
    scene,
    "podium-front-placard",
    "kind",
    "podium-placard",
    "ESTIMATED",
    GEOMETRY_SOURCE,
  );
  scene = resolveSurfaceSlotField(
    scene,
    "podium-front-placard",
    "rectPercent",
    { x_percent: 27, y_percent: 44, width_percent: 10.5, height_percent: 38 },
    "ESTIMATED",
    GEOMETRY_SOURCE,
  );
  scene = resolveSurfaceSlotField(
    scene,
    "podium-front-placard",
    "zOrder",
    3,
    "ESTIMATED",
    GEOMETRY_SOURCE,
  );
  scene = resolveSurfaceSlotField(
    scene,
    "podium-front-placard",
    "allowedContentClasses",
    ["jurisdiction-seal", "candidate-name", "campaign-name"],
    "ESTIMATED",
    GEOMETRY_SOURCE,
  );
  scene = resolveSurfaceSlotField(
    scene,
    "podium-front-placard",
    "fallbackDecoration",
    "plain oak grain, no lettering",
    "ESTIMATED",
    GEOMETRY_SOURCE,
  );

  scene = resolveSurfaceSlotField(
    scene,
    "podium-speech-notes",
    "kind",
    "podium-speech-notes",
    "ESTIMATED",
    GEOMETRY_SOURCE,
  );
  scene = resolveSurfaceSlotField(
    scene,
    "podium-speech-notes",
    "rectPercent",
    {
      x_percent: 24.5,
      y_percent: 32.5,
      width_percent: 13,
      height_percent: 6.5,
    },
    "ESTIMATED",
    GEOMETRY_SOURCE,
  );
  scene = resolveSurfaceSlotField(
    scene,
    "podium-speech-notes",
    "zOrder",
    3,
    "ESTIMATED",
    GEOMETRY_SOURCE,
  );
  scene = resolveSurfaceSlotField(
    scene,
    "podium-speech-notes",
    "allowedContentClasses",
    ["briefing-slide", "document-body", "agenda"],
    "ESTIMATED",
    GEOMETRY_SOURCE,
  );
  scene = resolveSurfaceSlotField(
    scene,
    "podium-speech-notes",
    "fallbackDecoration",
    "ruled paper with no readable words",
    "ESTIMATED",
    GEOMETRY_SOURCE,
  );

  scene = resolveSurfaceSlotField(
    scene,
    "hall-title-banner-area",
    "kind",
    "title-banner-safe",
    "ESTIMATED",
    GEOMETRY_SOURCE,
  );
  scene = resolveSurfaceSlotField(
    scene,
    "hall-title-banner-area",
    "rectPercent",
    { x_percent: 2, y_percent: 5, width_percent: 33, height_percent: 25 },
    "ESTIMATED",
    GEOMETRY_SOURCE,
  );
  scene = resolveSurfaceSlotField(
    scene,
    "hall-title-banner-area",
    "zOrder",
    1,
    "ESTIMATED",
    GEOMETRY_SOURCE,
  );
  scene = resolveSurfaceSlotField(
    scene,
    "hall-title-banner-area",
    "allowedContentClasses",
    ["headline", "jurisdiction-name"],
    "ESTIMATED",
    GEOMETRY_SOURCE,
  );
  scene = resolveSurfaceSlotField(
    scene,
    "hall-title-banner-area",
    "fallbackDecoration",
    "empty neutral wall paint",
    "ESTIMATED",
    GEOMETRY_SOURCE,
  );

  return scene;
}

// ---------------------------------------------------------------------------
// Scenes 2-4 — the three apartments
// ---------------------------------------------------------------------------

interface ApartmentInput {
  readonly sceneId: string;
  readonly label: string;
  readonly familyId: string;
  readonly masterFile: string;
  readonly extraNotes: readonly string[];
  readonly floorCalibration: {
    readonly near: { readonly floor_y_percent: number; readonly scale: number };
    readonly far: { readonly floor_y_percent: number; readonly scale: number };
  };
  readonly bodyWidthPercent: number;
  readonly seats: readonly {
    readonly id: string;
    readonly xPercent: number;
    readonly zOrder: number;
    readonly seatPlaneYPercent: number;
    readonly floorYPercent: number;
    readonly poseFamilies?: readonly string[];
    readonly facings?: readonly string[];
  }[];
  readonly standing: readonly {
    readonly id: string;
    readonly xPercent: number;
    readonly zOrder: number;
    readonly floorYPercent: number;
    readonly footSpreadPercent: number;
    readonly facings?: readonly string[];
  }[];
  readonly occluders: readonly {
    readonly id: string;
    readonly zOrder: number;
    readonly region: {
      readonly x_percent: number;
      readonly y_percent: number;
      readonly width_percent: number;
      readonly height_percent: number;
    };
  }[];
  readonly slots: readonly {
    readonly slotId: string;
    readonly kind: string;
    readonly zOrder: number;
    readonly rect: {
      readonly x_percent: number;
      readonly y_percent: number;
      readonly width_percent: number;
      readonly height_percent: number;
    };
    readonly contentClasses: readonly string[];
    readonly fallback: string;
  }[];
}

/**
 * The three apartments differ in furniture, not in kind, so they are authored
 * through one builder. Writing them out three times would invite exactly the
 * copy-paste drift that makes two rooms disagree about what a floor line is.
 */
function apartment(input: ApartmentInput): SceneAuthoringScaffold {
  let scene = createSceneAuthoringScaffold({
    sceneId: input.sceneId,
    label: input.label,
    familyId: input.familyId,
    presentationStatus: "production",
    plate: { width: 1376, height: 768 },
    sourceNotes: [
      NO_PLATE_NOTE,
      `Master: ${input.masterFile}. Native 1376x768.`,
      ...input.extraNotes,
    ],
    plannedAnchors: [
      ...input.seats.map((seat) => ({
        id: seat.id,
        type: "seated-person",
        kind: "seat" as const,
      })),
      ...input.standing.map((stand) => ({
        id: stand.id,
        type: "standing-person",
        kind: "floor-standing" as const,
      })),
    ],
    plannedOccluders: input.occluders.map((occluder) => ({
      id: occluder.id,
      type: "furniture-foreground",
    })),
    plannedSurfaceSlots: input.slots.map((slot) => ({ slotId: slot.slotId })),
  });

  scene = resolveSceneField(
    scene,
    "floorCalibration",
    input.floorCalibration,
    "ESTIMATED",
    GEOMETRY_SOURCE,
  );
  scene = resolveSceneField(
    scene,
    "standardBodyWidthPercent",
    input.bodyWidthPercent,
    "ESTIMATED",
    GEOMETRY_SOURCE,
  );

  for (const seat of input.seats) {
    scene = resolveAnchorField(
      scene,
      seat.id,
      "xPercent",
      seat.xPercent,
      "ESTIMATED",
      GEOMETRY_SOURCE,
    );
    scene = resolveAnchorField(
      scene,
      seat.id,
      "zOrder",
      seat.zOrder,
      "ESTIMATED",
      GEOMETRY_SOURCE,
    );
    scene = resolveAnchorField(
      scene,
      seat.id,
      "seatPlaneYPercent",
      seat.seatPlaneYPercent,
      "ESTIMATED",
      GEOMETRY_SOURCE,
    );
    scene = resolveAnchorField(
      scene,
      seat.id,
      "floorContact",
      { floor_y_percent: seat.floorYPercent },
      "ESTIMATED",
      GEOMETRY_SOURCE,
    );
    if (seat.poseFamilies) {
      scene = resolveAnchorField(
        scene,
        seat.id,
        "allowedPoseFamilies",
        seat.poseFamilies,
        "ESTIMATED",
        GEOMETRY_SOURCE,
      );
    }
    if (seat.facings) {
      scene = resolveAnchorField(
        scene,
        seat.id,
        "permittedFacings",
        seat.facings,
        "ESTIMATED",
        GEOMETRY_SOURCE,
      );
    }
  }

  for (const stand of input.standing) {
    scene = resolveAnchorField(
      scene,
      stand.id,
      "xPercent",
      stand.xPercent,
      "ESTIMATED",
      GEOMETRY_SOURCE,
    );
    scene = resolveAnchorField(
      scene,
      stand.id,
      "zOrder",
      stand.zOrder,
      "ESTIMATED",
      GEOMETRY_SOURCE,
    );
    scene = resolveAnchorField(
      scene,
      stand.id,
      "floorContact",
      {
        floor_y_percent: stand.floorYPercent,
        max_foot_spread_percent: stand.footSpreadPercent,
      },
      "ESTIMATED",
      GEOMETRY_SOURCE,
    );
    if (stand.facings) {
      scene = resolveAnchorField(
        scene,
        stand.id,
        "permittedFacings",
        stand.facings,
        "ESTIMATED",
        GEOMETRY_SOURCE,
      );
    }
  }

  for (const occluder of input.occluders) {
    scene = resolveOccluderField(
      scene,
      occluder.id,
      "zOrder",
      occluder.zOrder,
      "ESTIMATED",
      GEOMETRY_SOURCE,
    );
    scene = resolveOccluderField(
      scene,
      occluder.id,
      "regionPercent",
      occluder.region,
      "ESTIMATED",
      GEOMETRY_SOURCE,
    );
  }

  for (const slot of input.slots) {
    scene = resolveSurfaceSlotField(
      scene,
      slot.slotId,
      "kind",
      slot.kind,
      "ESTIMATED",
      GEOMETRY_SOURCE,
    );
    scene = resolveSurfaceSlotField(
      scene,
      slot.slotId,
      "rectPercent",
      slot.rect,
      "ESTIMATED",
      GEOMETRY_SOURCE,
    );
    scene = resolveSurfaceSlotField(
      scene,
      slot.slotId,
      "zOrder",
      slot.zOrder,
      "ESTIMATED",
      GEOMETRY_SOURCE,
    );
    scene = resolveSurfaceSlotField(
      scene,
      slot.slotId,
      "allowedContentClasses",
      slot.contentClasses,
      "ESTIMATED",
      GEOMETRY_SOURCE,
    );
    scene = resolveSurfaceSlotField(
      scene,
      slot.slotId,
      "fallbackDecoration",
      slot.fallback,
      "ESTIMATED",
      GEOMETRY_SOURCE,
    );
  }

  return scene;
}

// ---------------------------------------------------------------------------
// Scene 6 — executive private office
// ---------------------------------------------------------------------------

function executivePrivateOffice(): SceneAuthoringScaffold {
  let scene = createSceneAuthoringScaffold({
    sceneId: "executive-private-office",
    label: "Executive private office (capitol view)",
    familyId: "EXECUTIVE_PRIVATE_OFFICE_01",
    presentationStatus: "production",
    plate: { width: 1672, height: 941 },
    sourceNotes: [
      NO_PLATE_NOTE,
      "Master: CANDIDATE_ACCEPTABLE_STYLE_Render_A_environment_v2_illustrated_2026-08-25.png. Native 1672x941.",
      "The two guest chairs are occupied from BEHIND: their permitted facings are back and three-quarter-back only. A front-facing seated body at either anchor would be turned the wrong way in its own chair.",
      "The left window frames a classical capitol dome. Bound to a jurisdiction without one, this is a declared visual mismatch, not a detail to overlook.",
    ],
    plannedAnchors: [
      { id: "executive-hero-chair", type: "seated-person", kind: "seat" },
      { id: "dialogue-guest-left", type: "seated-person", kind: "seat" },
      { id: "dialogue-guest-right", type: "seated-person", kind: "seat" },
      {
        id: "executive-room-standing",
        type: "standing-person",
        kind: "floor-standing",
      },
    ],
    plannedOccluders: [
      { id: "executive-desk-front", type: "furniture-foreground" },
      { id: "guest-chair-left-silhouette", type: "furniture-foreground" },
      { id: "guest-chair-right-silhouette", type: "furniture-foreground" },
    ],
    plannedSurfaceSlots: [
      { slotId: "desk-active-dossier" },
      { slotId: "executive-center-frame" },
      { slotId: "jurisdiction-state-flag" },
    ],
  });

  scene = resolveSceneField(
    scene,
    "floorCalibration",
    {
      near: { floor_y_percent: 100, scale: 1.2 },
      far: { floor_y_percent: 61, scale: 0.75 },
    },
    "ESTIMATED",
    GEOMETRY_SOURCE,
  );
  scene = resolveSceneField(
    scene,
    "standardBodyWidthPercent",
    19,
    "ESTIMATED",
    GEOMETRY_SOURCE,
  );

  const seats = [
    {
      id: "executive-hero-chair",
      x: 47.5,
      z: 2,
      plane: 54,
      floor: 66,
      poses: ["seated-at-desk", "seated-executive"],
      facings: ["front"],
    },
    {
      id: "dialogue-guest-left",
      x: 26,
      z: 4,
      plane: 74,
      floor: 96,
      poses: undefined,
      facings: ["back", "three-quarter-back-right"],
    },
    {
      id: "dialogue-guest-right",
      x: 76,
      z: 4,
      plane: 74,
      floor: 96,
      poses: undefined,
      facings: ["back", "three-quarter-back-left"],
    },
  ] as const;

  for (const seat of seats) {
    scene = resolveAnchorField(
      scene,
      seat.id,
      "xPercent",
      seat.x,
      "ESTIMATED",
      GEOMETRY_SOURCE,
    );
    scene = resolveAnchorField(
      scene,
      seat.id,
      "zOrder",
      seat.z,
      "ESTIMATED",
      GEOMETRY_SOURCE,
    );
    scene = resolveAnchorField(
      scene,
      seat.id,
      "seatPlaneYPercent",
      seat.plane,
      "ESTIMATED",
      GEOMETRY_SOURCE,
    );
    scene = resolveAnchorField(
      scene,
      seat.id,
      "floorContact",
      { floor_y_percent: seat.floor },
      "ESTIMATED",
      GEOMETRY_SOURCE,
    );
    scene = resolveAnchorField(
      scene,
      seat.id,
      "permittedFacings",
      seat.facings,
      "ESTIMATED",
      GEOMETRY_SOURCE,
    );
    if (seat.poses) {
      scene = resolveAnchorField(
        scene,
        seat.id,
        "allowedPoseFamilies",
        seat.poses,
        "ESTIMATED",
        GEOMETRY_SOURCE,
      );
    }
  }

  scene = resolveAnchorField(
    scene,
    "executive-room-standing",
    "xPercent",
    31,
    "ESTIMATED",
    GEOMETRY_SOURCE,
  );
  scene = resolveAnchorField(
    scene,
    "executive-room-standing",
    "zOrder",
    2,
    "ESTIMATED",
    GEOMETRY_SOURCE,
  );
  scene = resolveAnchorField(
    scene,
    "executive-room-standing",
    "floorContact",
    { floor_y_percent: 63, max_foot_spread_percent: 6.5 },
    "ESTIMATED",
    GEOMETRY_SOURCE,
  );

  const occluders = [
    {
      id: "executive-desk-front",
      z: 3,
      region: {
        x_percent: 19,
        y_percent: 61,
        width_percent: 65.5,
        height_percent: 35.5,
      },
    },
    {
      id: "guest-chair-left-silhouette",
      z: 5,
      region: {
        x_percent: 9.5,
        y_percent: 72.5,
        width_percent: 33.5,
        height_percent: 27.5,
      },
    },
    {
      id: "guest-chair-right-silhouette",
      z: 5,
      region: {
        x_percent: 59.5,
        y_percent: 72.5,
        width_percent: 33.5,
        height_percent: 27.5,
      },
    },
  ] as const;
  for (const occluder of occluders) {
    scene = resolveOccluderField(
      scene,
      occluder.id,
      "zOrder",
      occluder.z,
      "ESTIMATED",
      GEOMETRY_SOURCE,
    );
    scene = resolveOccluderField(
      scene,
      occluder.id,
      "regionPercent",
      occluder.region,
      "ESTIMATED",
      GEOMETRY_SOURCE,
    );
  }

  const slots = [
    {
      slotId: "desk-active-dossier",
      kind: "desk-document",
      z: 3,
      rect: {
        x_percent: 45.5,
        y_percent: 61.8,
        width_percent: 6,
        height_percent: 4,
      },
      classes: ["document-body", "bill-title", "briefing-slide"],
      fallback: "a closed leather binder",
    },
    {
      slotId: "executive-center-frame",
      kind: "official-portrait-slot",
      z: 1,
      rect: {
        x_percent: 39,
        y_percent: 16.8,
        width_percent: 11.8,
        height_percent: 17.7,
      },
      classes: ["officeholder-portrait", "jurisdiction-seal"],
      fallback: "the painted river landscape the plate already carries",
    },
    {
      slotId: "jurisdiction-state-flag",
      kind: "flag-standard",
      z: 1,
      rect: {
        x_percent: 74.2,
        y_percent: 14.5,
        width_percent: 4.4,
        height_percent: 49,
      },
      classes: ["jurisdiction-seal"],
      fallback: "an unmarked ceremonial standard",
    },
  ] as const;
  for (const slot of slots) {
    scene = resolveSurfaceSlotField(
      scene,
      slot.slotId,
      "kind",
      slot.kind,
      "ESTIMATED",
      GEOMETRY_SOURCE,
    );
    scene = resolveSurfaceSlotField(
      scene,
      slot.slotId,
      "rectPercent",
      slot.rect,
      "ESTIMATED",
      GEOMETRY_SOURCE,
    );
    scene = resolveSurfaceSlotField(
      scene,
      slot.slotId,
      "zOrder",
      slot.z,
      "ESTIMATED",
      GEOMETRY_SOURCE,
    );
    scene = resolveSurfaceSlotField(
      scene,
      slot.slotId,
      "allowedContentClasses",
      slot.classes,
      "ESTIMATED",
      GEOMETRY_SOURCE,
    );
    scene = resolveSurfaceSlotField(
      scene,
      slot.slotId,
      "fallbackDecoration",
      slot.fallback,
      "ESTIMATED",
      GEOMETRY_SOURCE,
    );
  }

  return scene;
}

// ---------------------------------------------------------------------------
// The library
// ---------------------------------------------------------------------------

export const SCENE_CIVIC_COMMUNITY_MEETING_HALL = civicCommunityMeetingHall();

export const SCENE_APARTMENT_STARTER_01 = apartment({
  sceneId: "apartment-starter-01",
  label: "Starter apartment living room",
  familyId: "HOME_APARTMENT_STARTER_01",
  masterFile: "PG_SCENE_HOME_APARTMENT_LIVING_01_1376x768_CANDIDATE.png",
  extraNotes: [
    "No 4K enlargement of this plate exists anywhere. Its maximum honest detail is 1376 pixels wide, and the tier ladder must stop there rather than inventing a 2048.",
    "The shelf print at 61.5% and the clipped wall frame at the right edge are baked decor. The right frame is cut by the plate boundary and could not carry content even if it were large enough.",
  ],
  floorCalibration: {
    near: { floor_y_percent: 100, scale: 1.1 },
    far: { floor_y_percent: 62, scale: 0.75 },
  },
  bodyWidthPercent: 18.5,
  seats: [
    {
      id: "sofa-left-seat",
      xPercent: 21,
      zOrder: 2,
      seatPlaneYPercent: 64,
      floorYPercent: 85,
    },
    {
      id: "corner-blue-chair",
      xPercent: 59,
      zOrder: 2,
      seatPlaneYPercent: 61.5,
      floorYPercent: 71,
    },
  ],
  standing: [
    {
      id: "hallway-corridor-standing",
      xPercent: 88,
      zOrder: 1,
      floorYPercent: 62,
      footSpreadPercent: 6,
    },
    {
      id: "open-living-floor-standing",
      xPercent: 48,
      zOrder: 4,
      floorYPercent: 86,
      footSpreadPercent: 8.5,
    },
  ],
  occluders: [
    {
      id: "modest-coffee-table",
      zOrder: 3,
      region: {
        x_percent: 38.5,
        y_percent: 63.5,
        width_percent: 12.5,
        height_percent: 21,
      },
    },
  ],
  slots: [
    {
      slotId: "television-screen-slot",
      kind: "monitor-display",
      zOrder: 1,
      rect: {
        x_percent: 71.5,
        y_percent: 46.5,
        width_percent: 7,
        height_percent: 17.5,
      },
      contentClasses: ["headline", "election-result", "candidate-name"],
      fallback: "a matte dark screen, powered off",
    },
  ],
});

export const SCENE_APARTMENT_ORDINARY_02 = apartment({
  sceneId: "apartment-ordinary-02",
  label: "Ordinary apartment living room",
  familyId: "HOME_APARTMENT_ORDINARY_02",
  masterFile: "PG_SCENE_HOME_APARTMENT_LIVING_02_1376x768_CANDIDATE.png",
  extraNotes: [
    "A 5504x3072 enlargement exists in Drive as upscale_image_01-3.png, but it is a JPEG bitstream in a file named .png. It must be remuxed and declared an external upscale before it can join a ladder; its real detail stops at 1376.",
    "The autumn landscape on the left wall is a finished painting and stays baked. It is neutral across every player background and there is nothing canonical it should be replaced with.",
  ],
  floorCalibration: {
    near: { floor_y_percent: 100, scale: 1.1 },
    far: { floor_y_percent: 63, scale: 0.76 },
  },
  bodyWidthPercent: 18.5,
  seats: [
    {
      id: "sofa-left-seat",
      xPercent: 18.5,
      zOrder: 2,
      seatPlaneYPercent: 63.5,
      floorYPercent: 85,
      facings: ["front", "three-quarter-right"],
    },
    {
      id: "sofa-right-seat",
      xPercent: 28,
      zOrder: 2,
      seatPlaneYPercent: 63.5,
      floorYPercent: 85,
      facings: ["front", "three-quarter-right"],
    },
    {
      id: "blue-armchair-seated",
      xPercent: 68.5,
      zOrder: 3,
      seatPlaneYPercent: 66.5,
      floorYPercent: 92,
      facings: ["front", "three-quarter-left"],
    },
  ],
  standing: [
    {
      id: "hallway-entry-standing",
      xPercent: 89,
      zOrder: 1,
      floorYPercent: 64,
      footSpreadPercent: 6,
    },
    {
      id: "central-floor-standing",
      xPercent: 54,
      zOrder: 3,
      floorYPercent: 82,
      footSpreadPercent: 8.5,
    },
  ],
  occluders: [
    {
      id: "coffee-table-ordinary",
      zOrder: 4,
      region: {
        x_percent: 34,
        y_percent: 63,
        width_percent: 17,
        height_percent: 25,
      },
    },
    {
      id: "blue-armchair-front-arm",
      zOrder: 4,
      region: {
        x_percent: 57.5,
        y_percent: 64,
        width_percent: 12,
        height_percent: 26,
      },
    },
  ],
  slots: [
    {
      slotId: "television-screen-slot",
      kind: "monitor-display",
      zOrder: 1,
      rect: {
        x_percent: 45.2,
        y_percent: 42.5,
        width_percent: 11.2,
        height_percent: 13,
      },
      contentClasses: ["headline", "election-result", "briefing-slide"],
      fallback: "a matte dark screen, powered off",
    },
    {
      slotId: "window-backdrop-ordinary",
      kind: "window-view",
      zOrder: 0,
      rect: {
        x_percent: 47,
        y_percent: 22,
        width_percent: 18,
        height_percent: 26,
      },
      contentClasses: [],
      fallback: "soft brick buildings under an overcast sky",
    },
  ],
});

export const SCENE_APARTMENT_SETTLED_03 = apartment({
  sceneId: "apartment-settled-03",
  label: "Settled apartment living room",
  familyId: "HOME_APARTMENT_SETTLED_03",
  masterFile: "PG_SCENE_HOME_APARTMENT_LIVING_03_1376x768_CANDIDATE.png",
  extraNotes: [
    "A 5504x3072 enlargement exists in Drive as upscale_image_01-4.png, but it is a JPEG bitstream in a file named .png. It must be remuxed and declared an external upscale before it can join a ladder; its real detail stops at 1376.",
    "Four bookcase micro-frames between 3% and 4% of plate width, plus the angled left wall art, are baked decor. This is the room the promotion threshold was written against.",
  ],
  floorCalibration: {
    near: { floor_y_percent: 100, scale: 1.1 },
    far: { floor_y_percent: 64, scale: 0.78 },
  },
  bodyWidthPercent: 18.5,
  seats: [
    {
      id: "living-club-chair-left",
      xPercent: 34.2,
      zOrder: 2,
      seatPlaneYPercent: 60.5,
      floorYPercent: 74,
      poseFamilies: ["seated-in-guest-chair", "seated-neutral"],
      facings: ["front", "three-quarter-right"],
    },
    {
      id: "living-sofa-center-left",
      xPercent: 64.5,
      zOrder: 2,
      seatPlaneYPercent: 61,
      floorYPercent: 78,
      poseFamilies: ["seated-neutral", "seated-conversational"],
      facings: ["front", "three-quarter-left"],
    },
    {
      id: "living-sofa-center-right",
      xPercent: 71.5,
      zOrder: 2,
      seatPlaneYPercent: 61,
      floorYPercent: 78,
      poseFamilies: ["seated-neutral", "seated-conversational"],
      facings: ["front", "three-quarter-left"],
    },
  ],
  standing: [
    {
      id: "entryway-standing",
      xPercent: 81,
      zOrder: 1,
      floorYPercent: 63.5,
      footSpreadPercent: 6.5,
      facings: ["front", "three-quarter-left"],
    },
    {
      id: "foreground-floor-pacing",
      xPercent: 50,
      zOrder: 4,
      floorYPercent: 88,
      footSpreadPercent: 9,
      facings: ["front", "left", "right"],
    },
  ],
  occluders: [
    {
      id: "coffee-table-foreground",
      zOrder: 3,
      region: {
        x_percent: 40,
        y_percent: 59.5,
        width_percent: 19,
        height_percent: 14.5,
      },
    },
    {
      id: "club-chair-near-arm",
      zOrder: 3,
      region: {
        x_percent: 33,
        y_percent: 58,
        width_percent: 8,
        height_percent: 12,
      },
    },
  ],
  slots: [
    {
      slotId: "television-screen-slot",
      kind: "monitor-display",
      zOrder: 1,
      rect: {
        x_percent: 46.3,
        y_percent: 40.2,
        width_percent: 10.2,
        height_percent: 11.8,
      },
      contentClasses: [
        "headline",
        "election-result",
        "briefing-slide",
        "candidate-name",
      ],
      fallback: "matte black glass with a soft window reflection",
    },
    {
      slotId: "window-weather-backdrop",
      kind: "window-view",
      zOrder: 0,
      rect: {
        x_percent: 43,
        y_percent: 22,
        width_percent: 16.5,
        height_percent: 23,
      },
      contentClasses: [],
      fallback: "soft city brick and an overcast sky",
    },
  ],
});

export const SCENE_EXECUTIVE_PRIVATE_OFFICE = executivePrivateOffice();

export const PRODUCTION_SCENE_SCAFFOLDS: readonly SceneAuthoringScaffold[] = [
  SCENE_APARTMENT_ORDINARY_02,
  SCENE_APARTMENT_SETTLED_03,
  SCENE_APARTMENT_STARTER_01,
  SCENE_CIVIC_COMMUNITY_MEETING_HALL,
  SCENE_EXECUTIVE_PRIVATE_OFFICE,
];
