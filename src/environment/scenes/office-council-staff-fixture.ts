import type { EnvironmentSceneSpec } from "../environment-scene-spec";

/**
 * The council staff office, authored as an EnvironmentSceneSpec.
 *
 * DEVELOPMENT FIXTURE ART. The prompt30 lineage's true native detail is
 * 1024x572; the shipped 2048x1144 file is a deterministic 2x resample of it and
 * carries no additional detail. It cannot produce a production tier and is
 * frozen as regression art. It is NOT the office master of record.
 *
 * Every placement number below is a VISUAL ESTIMATE read off that fixture
 * plate. They are recorded as such in `explicit_unknowns` rather than dressed
 * up as measurements, because nothing in this scene is plan-derived.
 *
 * The camera policy, safe areas, anchor positions and occluder are the values
 * already accepted on main; migrating them here changes where they live, not
 * what they are.
 */
export const OFFICE_COUNCIL_STAFF_FIXTURE_SCENE: EnvironmentSceneSpec = {
  environment_id: "environment:council-staff-office:prompt30-fixture:v1",
  scene_id: "office-council-staff-fixture",
  family_id: "council-staff-office",
  label: "Council staff office (development fixture)",
  presentation_status: "development-fixture",
  fidelity_tier: "F4",
  coordinate_system: "plate-normalized",
  units: "plate-percent",

  plate: { width: 1024, height: 572 },
  camera_policy: {
    minimum_aspect_ratio: 1.5,
    maximum_aspect_ratio: 12 / 5,
    horizontal_focus: 0.5,
    vertical_focus: 0.75,
  },
  safe_area: { x: 86, y: 112, width: 850, height: 421 },
  essential_content_area: { x: 185, y: 165, width: 730, height: 353.75 },
  ui_safe_zones: [
    { id: "lower-shell", edge: "bottom-left", width: 620, height: 120 },
    { id: "navigation-flyout", edge: "top-left", width: 320, height: 300 },
  ],

  raster: {
    asset_id: "env_lexington_council_staff_office_prompt30_v1",
    tiers: [
      {
        width: 1024,
        height: 572,
        path: "art/families/council-staff-office/env_lexington_council_staff_office_prompt30_v1.png",
        hash: "76d9ae5878acbd0050c60695bebd2f3f9f0da36c75ce2e9e392d30254ab64b43",
        derivation: "native-master",
      },
      {
        width: 2048,
        height: 1144,
        path: "art/families/council-staff-office/env_lexington_council_staff_office_prompt30_runtime_2x_v1.png",
        hash: "66678f0e91c52ca86f851ae4ba73d1a736a56be9cb7875512ab6bd1235de07f0",
        derivation: "upscaled-development-fixture",
        native_detail_width: 1024,
      },
    ],
  },

  /**
   * Two calibration pairs and a linear ramp between them. At the seated floor
   * line (84%) this yields exactly the 0.95 scale the accepted fixture used, so
   * the number is now derived from the floor rather than tuned per sprite.
   *
   * The 84% floor line is itself derived rather than picked: it is where a
   * seated figure of the fixture sprites' proportions actually puts its feet
   * once its pelvis is on the 63.5% seat plane. Choosing a rounder number would
   * have made the seat and the floor disagree.
   */
  floor_calibration: {
    near: { floor_y_percent: 100, scale: 1.05 },
    far: { floor_y_percent: 60, scale: 0.8 },
  },

  /**
   * A normalized body canvas paints 21.5% of plate width here at scale 1. With
   * the seated floor line below, that puts a seated body's soles on the floor
   * and its pelvis on the seat plane at the same time — the two constraints the
   * older hand-tuned placement could not satisfy together.
   */
  standard_body_width_percent: 21.5,

  anchors: [
    {
      id: "primary-desk-chair",
      type: "seated-person",
      kind: "seat",
      x_percent: 80.5,
      z_order: 2,
      footprint_percent: 30,
      hitbox_percent: {
        x_percent: 35,
        y_percent: 5,
        width_percent: 55,
        height_percent: 50,
      },
      allowed_pose_families: ["seated-at-desk"],
      permitted_facings: ["front"],
      seat_contact: {
        seat_plane_y_percent: 63.5,
        seat_front_x_percent: 80.5,
        seat_width_percent: 17,
        floor_y_percent: 84,
        seat_z_order: 1,
        backrest_z_order: 0,
      },
    },
    {
      id: "left-guest-chair",
      type: "seated-person",
      kind: "seat",
      x_percent: 28,
      z_order: 3,
      footprint_percent: 26,
      hitbox_percent: {
        x_percent: 5,
        y_percent: 2,
        width_percent: 90,
        height_percent: 50,
      },
      // The guest chair prefers the P0 guest-seating pose. No body art
      // declares it yet, so the runtime reports the exact gap and falls back
      // to the one other pose this anchor itself permits.
      allowed_pose_families: ["seated-guest-neutral", "seated-at-desk"],
      permitted_facings: ["front"],
      seat_contact: {
        seat_plane_y_percent: 63,
        seat_front_x_percent: 28,
        seat_width_percent: 15,
        floor_y_percent: 84,
        seat_z_order: 1,
        backrest_z_order: 0,
      },
    },
    {
      id: "doorway-standing",
      type: "standing-person",
      kind: "floor-standing",
      x_percent: 47,
      z_order: 1,
      footprint_percent: 20,
      allowed_pose_families: ["standing-neutral"],
      permitted_facings: ["front"],
      floor_contact: { floor_y_percent: 68, max_foot_spread_percent: 7 },
    },
    {
      id: "near-desk-standing",
      type: "standing-person",
      kind: "floor-standing",
      x_percent: 62,
      z_order: 2,
      footprint_percent: 24,
      allowed_pose_families: ["standing-neutral"],
      permitted_facings: ["front"],
      floor_contact: { floor_y_percent: 82, max_foot_spread_percent: 9 },
    },
  ],

  foreground_occlusion_objects: [
    {
      id: "desk-front",
      type: "furniture-foreground",
      asset_id:
        "env_lexington_council_staff_office_prompt30_foreground_mask_v1",
      z_order: 4,
      region_percent: {
        x_percent: 42,
        y_percent: 62,
        width_percent: 58,
        height_percent: 38,
      },
    },
    {
      id: "guest-chair-near-arm",
      type: "furniture-foreground",
      z_order: 5,
      region_percent: {
        x_percent: 18,
        y_percent: 66,
        width_percent: 22,
        height_percent: 26,
      },
    },
  ],

  surface_slots: [
    {
      slot_id: "desk-working-document",
      kind: "desk-document",
      rect_percent: {
        x_percent: 63,
        y_percent: 52,
        width_percent: 12,
        height_percent: 9,
      },
      z_order: 3,
      allowed_content_classes: ["working-draft", "briefing-memo"],
      fallback_decoration: "an empty desk blotter",
    },
    {
      slot_id: "wall-frame",
      kind: "picture-frame",
      rect_percent: {
        x_percent: 12,
        y_percent: 24,
        width_percent: 14,
        height_percent: 18,
      },
      z_order: 0,
      allowed_content_classes: ["jurisdiction-seal", "neutral-art"],
      civic_symbol_policy: "canonical-source-only",
      fallback_decoration: "plain framed paper",
    },
  ],

  explicit_unknowns: [
    "Every anchor, contact, occluder region and surface slot in this scene is a visual estimate read off fixture art. None of it is plan-derived, and none of it should be copied into a production scene.",
    "The prompt30 plate's real detail is 1024x572. The 2048x1144 runtime file is a 2x resample of that same source and is registered as an upscale so the runtime reports its shortfall honestly.",
    "The guest chair's near arm has no authored alpha mask yet, so its occluder region is declared for footprint and debug purposes without a raster.",
  ],
};
