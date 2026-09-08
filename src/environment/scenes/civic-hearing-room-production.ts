import type { EnvironmentSceneSpec } from "../environment-scene-spec";

/**
 * A public hearing room, authored as the first PRODUCTION committee surface.
 *
 * PRODUCTION ART. Its raster is the owner-approved Our Civic Duty scene master
 * `OCD_SCENE_MASTER_CIVIC_HEARING_ROOM_5504x3072_01.jpg`, preserved
 * byte-for-byte under `art/references/masters/scene-environment/` and carried
 * in as two deterministic Lanczos-3 DOWNSCALES.
 *
 * THIS IS NOT THE COMMITTEE FIXTURE, AND IT DOES NOT REPLACE IT.
 * `committee-room-fixture` stays exactly as it is: a room with no plate, kept
 * as the proof that the scene contract works ahead of art. This scene is a
 * different room with its own measured geometry. Nothing is copied between
 * them.
 *
 * WHAT MAKES IT A HEARING ROOM RATHER THAN THE COMMUNITY HALL: a curved member
 * bench with seven chairs behind it, a testimony lectern facing that bench, a
 * clerk's desk inside the well, and public seating on both sides of an aisle.
 * The consumer map ruled the community-meeting master out for this purpose
 * precisely because it has none of those. Nothing in the room names a
 * jurisdiction: the screens are blank, the board behind the bench is blank, and
 * the one framed picture is a landscape.
 */
export const CIVIC_HEARING_ROOM_PRODUCTION_SCENE: EnvironmentSceneSpec = {
  environment_id: "environment:civic-hearing-room:ocd-master:v1",
  scene_id: "civic-hearing-room-production",
  family_id: "civic-hearing-room",
  label: "A public hearing room (production)",
  presentation_status: "production",
  fidelity_tier: "F4",
  coordinate_system: "plate-normalized",
  units: "plate-percent",

  plate: { width: 1376, height: 768 },

  /**
   * Vertical focus is low: the bench, the lectern and the floor sit in the
   * bottom two thirds, and the wall screens above them are the first thing a
   * narrow crop may lose.
   */
  camera_policy: {
    minimum_aspect_ratio: 1.5,
    maximum_aspect_ratio: 12 / 5,
    horizontal_focus: 0.5,
    vertical_focus: 0.7,
  },

  safe_area: { x: 112, y: 195, width: 1152, height: 573 },
  /** The bench, the lectern, the clerk's desk and the aisle floor. */
  essential_content_area: { x: 300, y: 290, width: 964, height: 478 },

  ui_safe_zones: [
    { id: "lower-shell", edge: "bottom-left", width: 620, height: 120 },
    { id: "navigation-flyout", edge: "top-left", width: 320, height: 300 },
  ],

  raster: {
    asset_id: "env_civic_hearing_room_5504x3072_v1",
    tiers: [
      {
        width: 1376,
        height: 768,
        path: "art/families/civic-hearing-room/env_civic_hearing_room_v1.png",
        hash: "d30fe81c23952b9dd98ec88b34f87952dbbec7044a8955a9c521ba10eeac9663",
        derivation: "deterministic-downscale",
      },
      {
        width: 2752,
        height: 1536,
        path: "art/families/civic-hearing-room/env_civic_hearing_room_runtime_2x_v1.png",
        hash: "30fe0f333eeef50c9938a0055b43f75ebf657174f66b445b4cfc73b5d9c5628c",
        derivation: "deterministic-downscale",
      },
    ],
  },

  anchors: [
    {
      /** At the testimony lectern, facing the bench and the camera. */
      id: "witness-lectern-standing",
      type: "standing-person",
      kind: "floor-standing",
      x_percent: 54,
      z_order: 3,
      footprint_percent: 14,
      allowed_pose_families: ["standing-podium-or-lectern", "standing-neutral"],
      permitted_facings: ["front"],
      floor_contact: { floor_y_percent: 82, max_foot_spread_percent: 8 },
    },
    {
      /** The open aisle floor between the public seating blocks. */
      id: "hearing-floor-standing",
      type: "standing-person",
      kind: "floor-standing",
      x_percent: 45,
      z_order: 4,
      footprint_percent: 18,
      allowed_pose_families: ["standing-neutral", "standing-listening"],
      permitted_facings: ["front"],
      floor_contact: { floor_y_percent: 95, max_foot_spread_percent: 10 },
    },
    {
      /**
       * The clerk's task chair inside the well — the ONLY seat in this room
       * whose cushion is visible. It is drawn from behind and to its right, so
       * somebody sitting in it faces away from the camera. No pose family here
       * describes that, and none is invented: the anchor permits the seated
       * family that exists and the runtime fails closed until art for it does.
       */
      id: "clerk-desk-chair",
      type: "seated-person",
      kind: "seat",
      x_percent: 75.5,
      z_order: 2,
      footprint_percent: 10,
      allowed_pose_families: ["seated-at-desk"],
      permitted_facings: ["away"],
      seat_contact: {
        seat_plane_y_percent: 53.5,
        seat_front_x_percent: 75.5,
        seat_width_percent: 5,
        floor_y_percent: 67.5,
        seat_z_order: 2,
        backrest_z_order: 1,
      },
    },
  ],

  foreground_occlusion_objects: [
    {
      /** The nearest block of public seating, between camera and aisle. */
      id: "public-seating-foreground",
      type: "furniture-foreground",
      z_order: 8,
      region_percent: {
        x_percent: 55,
        y_percent: 68,
        width_percent: 45,
        height_percent: 32,
      },
    },
    {
      /** The member bench, which hides everyone seated behind it. */
      id: "member-bench-front",
      type: "furniture-foreground",
      z_order: 5,
      region_percent: {
        x_percent: 30,
        y_percent: 43,
        width_percent: 66,
        height_percent: 27,
      },
    },
    {
      id: "testimony-lectern-front",
      type: "furniture-foreground",
      z_order: 6,
      region_percent: {
        x_percent: 48,
        y_percent: 47,
        width_percent: 12,
        height_percent: 35,
      },
    },
  ],

  surface_slots: [
    {
      slot_id: "hearing-wall-screen-left",
      kind: "monitor-or-screen",
      rect_percent: {
        x_percent: 3,
        y_percent: 7,
        width_percent: 14,
        height_percent: 20,
      },
      z_order: 0,
      allowed_content_classes: [
        "bill-number",
        "bill-title",
        "vote-tally",
        "briefing-slide",
      ],
      information_access: "public-record",
      fallback_decoration: "a dark screen with no interface drawn on it",
    },
    {
      slot_id: "hearing-wall-screen-right",
      kind: "monitor-or-screen",
      rect_percent: {
        x_percent: 24,
        y_percent: 8,
        width_percent: 13,
        height_percent: 16,
      },
      z_order: 0,
      allowed_content_classes: ["agenda", "bill-title", "briefing-slide"],
      information_access: "public-record",
      fallback_decoration: "a dark screen with no interface drawn on it",
    },
    {
      /** The blank presentation board behind the bench. */
      slot_id: "hearing-agenda-board",
      kind: "agenda-board",
      rect_percent: {
        x_percent: 53,
        y_percent: 15,
        width_percent: 32,
        height_percent: 18,
      },
      z_order: 0,
      allowed_content_classes: ["agenda", "bill-title", "bill-number"],
      information_access: "public-record",
      fallback_decoration: "a blank board",
    },
    {
      slot_id: "clerk-desk-monitor",
      kind: "monitor-or-screen",
      rect_percent: {
        x_percent: 66.5,
        y_percent: 44,
        width_percent: 6,
        height_percent: 8,
      },
      z_order: 4,
      allowed_content_classes: ["document-body", "calendar-date"],
      information_access: "institutional-working",
      fallback_decoration: "a screen showing nothing",
    },
    {
      slot_id: "testimony-lectern-notes",
      kind: "podium-speech-notes",
      rect_percent: {
        x_percent: 49,
        y_percent: 46,
        width_percent: 9,
        height_percent: 4,
      },
      z_order: 7,
      allowed_content_classes: ["document-body"],
      information_access: "public-record",
      fallback_decoration: "an empty reading surface",
    },
  ],

  explicit_unknowns: [
    "No floor calibration pair and no standard body width are declared. This floor IS tiled, so it was measured: four successive tile seams sit at plate y 63.7%, 69.5%, 76.6%, 85.5% and 96.5%. Fitting those to a flat floor under a fixed camera puts the horizon near the very top of the frame, which the room's own walls and ceiling contradict. The plate is an illustration and is not drawn on one consistent perspective, so the measurement is recorded and NO calibration pair is derived from it.",
    "Every anchor contact is a visual estimate read off this plate where an object visibly meets the floor.",
    "Only the clerk's task chair has a visible seat cushion. The seven chairs behind the member bench are hidden by the bench itself, so no member seat anchor is declared rather than being given plausible numbers.",
    "None of the three occluder regions has an authored alpha mask, because no production body renders behind them yet.",
    "Nothing in this room identifies a jurisdiction, so the scene claims none. Binding it to a committee, a chamber or a place is canonical world work, not a property of this file.",
  ],
};
