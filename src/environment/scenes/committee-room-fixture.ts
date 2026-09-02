import type { EnvironmentSceneSpec } from "../environment-scene-spec";

/**
 * A committee room, authored as metadata only.
 *
 * There is no plate for this room yet, and this file does not pretend
 * otherwise: it registers no raster. It exists to prove that the scene
 * contract is authorable ahead of art, that a scene without a picture degrades
 * honestly rather than failing, and that the second scene purpose exercises
 * surface slots, multiple named occluders and a deeper floor ramp than the
 * office does.
 *
 * Nothing here claims to describe a real committee room in any jurisdiction.
 * The geometry is a fixture layout for the presentation runtime.
 */
export const COMMITTEE_ROOM_FIXTURE_SCENE: EnvironmentSceneSpec = {
  environment_id: "environment:generic-committee-room:metadata-fixture:v1",
  scene_id: "committee-room-fixture",
  family_id: "generic-committee-room",
  label: "Committee room (metadata fixture, no plate yet)",
  presentation_status: "development-fixture",
  fidelity_tier: "F4",
  coordinate_system: "plate-normalized",
  units: "plate-percent",

  plate: { width: 1024, height: 576 },
  camera_policy: {
    minimum_aspect_ratio: 1.5,
    maximum_aspect_ratio: 12 / 5,
    horizontal_focus: 0.5,
    vertical_focus: 0.75,
  },
  safe_area: { x: 86, y: 115, width: 850, height: 424 },
  essential_content_area: { x: 185, y: 166, width: 730, height: 356 },
  ui_safe_zones: [
    { id: "lower-shell", edge: "bottom-left", width: 620, height: 120 },
  ],

  /**
   * A committee room seen down its own table has a much longer depth run than
   * a small office, so the near and far ends differ by more than a third.
   */
  floor_calibration: {
    near: { floor_y_percent: 98, scale: 1.25 },
    far: { floor_y_percent: 50, scale: 0.62 },
  },

  /** Narrower than the office: this room is seen from much further back. */
  standard_body_width_percent: 14,

  anchors: [
    {
      id: "witness-chair",
      type: "seated-person",
      kind: "seat",
      x_percent: 50,
      z_order: 3,
      footprint_percent: 22,
      allowed_pose_families: ["seated-at-desk"],
      permitted_facings: ["front"],
      seat_contact: {
        seat_plane_y_percent: 66,
        seat_front_x_percent: 50,
        seat_width_percent: 14,
        floor_y_percent: 80,
        seat_z_order: 2,
        backrest_z_order: 1,
      },
    },
    {
      id: "member-seat-left",
      type: "seated-person",
      kind: "seat",
      x_percent: 26,
      z_order: 2,
      footprint_percent: 16,
      allowed_pose_families: ["seated-at-desk"],
      permitted_facings: ["front"],
      seat_contact: {
        seat_plane_y_percent: 55,
        seat_front_x_percent: 26,
        seat_width_percent: 11,
        floor_y_percent: 66,
        seat_z_order: 1,
        backrest_z_order: 0,
      },
    },
    {
      id: "staff-standing-rear",
      type: "standing-person",
      kind: "floor-standing",
      x_percent: 78,
      z_order: 1,
      footprint_percent: 12,
      allowed_pose_families: ["standing-neutral"],
      permitted_facings: ["front"],
      floor_contact: { floor_y_percent: 58, max_foot_spread_percent: 5 },
    },
  ],

  foreground_occlusion_objects: [
    {
      id: "table-front",
      type: "furniture-foreground",
      z_order: 6,
      region_percent: {
        x_percent: 0,
        y_percent: 74,
        width_percent: 100,
        height_percent: 26,
      },
    },
    {
      id: "near-seat-backs",
      type: "furniture-foreground",
      z_order: 7,
      region_percent: {
        x_percent: 0,
        y_percent: 88,
        width_percent: 100,
        height_percent: 12,
      },
    },
  ],

  surface_slots: [
    {
      slot_id: "bulletin-board",
      kind: "monitor-or-bulletin-board",
      rect_percent: {
        x_percent: 68,
        y_percent: 26,
        width_percent: 22,
        height_percent: 16,
      },
      z_order: 0,
      allowed_content_classes: ["agenda-placeholder", "neutral-art"],
      fallback_decoration: "an empty board",
    },
    {
      slot_id: "roll-call-board",
      kind: "roll-call-board",
      rect_percent: {
        x_percent: 12,
        y_percent: 24,
        width_percent: 18,
        height_percent: 20,
      },
      z_order: 0,
      allowed_content_classes: ["roll-call-tally"],
      fallback_decoration: "an unlit tally board",
    },
    {
      slot_id: "table-papers",
      kind: "desk-document",
      rect_percent: {
        x_percent: 44,
        y_percent: 70,
        width_percent: 14,
        height_percent: 8,
      },
      z_order: 5,
      allowed_content_classes: ["working-draft", "briefing-memo"],
      fallback_decoration: "a bare tabletop",
    },
  ],

  explicit_unknowns: [
    "No plate exists for this room. The scene registers no raster and the runtime reports it as art-unavailable rather than substituting another room's picture.",
    "All geometry is a fixture layout authored to exercise the contract, not a description of any real committee room.",
    "Neither occluder has an authored alpha mask; their regions are declared for footprint checks and the debug overlay only.",
  ],
};
