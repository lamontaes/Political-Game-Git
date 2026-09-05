import type { EnvironmentSceneSpec } from "../environment-scene-spec";

/**
 * The shared staff workroom, authored as the first PRODUCTION EnvironmentSceneSpec.
 *
 * PRODUCTION ART. Its raster is the owner-approved Our Civic Duty scene master
 * `OCD_SCENE_MASTER_SHARED_WORKROOM_OFFICE_5504x3072_01.jpg`, preserved
 * byte-for-byte under `art/references/masters/scene-environment/` and carried
 * into the runtime as two deterministic Lanczos-3 DOWNSCALES. Nothing in this
 * repository enlarged it, so both tiers are `deterministic-downscale` and
 * neither declares a native-detail shortfall: their pixel width is the truth.
 *
 * NOTHING HERE IS COPIED FROM THE PROMPT30 DEVELOPMENT FIXTURE. That fixture's
 * own `explicit_unknowns` say its numbers "should not be copied into a
 * production scene", and they have not been. Every number below was measured
 * off THIS master, by the method recorded beside it.
 *
 * THE MEASURING METHOD, once, because everything else depends on it.
 * The floor is tiled on a regular grid, which makes the plate its own ruler. A
 * commercial floor tile is 12 inches (0.3048 m). Measuring one tile's width
 * near the camera and again at the back of the tiled area gives the apparent
 * size of a known length at two depths:
 *
 *   floor y ~97%  ->  1 m spans ~33.4% of plate height
 *   floor y ~57%  ->  1 m spans ~10.0% of plate height
 *
 * For a flat floor under a fixed camera, the apparent size of an object
 * standing on it is proportional to (floor_y - horizon_y). Solving the two
 * measurements for that horizon puts it at y ~= 39.9% of plate height, which
 * agrees with where the ceiling grid and the floor tiles visibly converge. So:
 *
 *   one metre  ~=  0.585 * (floor_y_percent - 39.9)   % of plate height
 *
 * That single relation produces the floor calibration, the standard body width
 * and the cross-check on the one seat below. It is a visual estimate read off
 * the plate — the tile size is a convention, not a surveyed fact — and it is
 * recorded as such in `explicit_unknowns`.
 */
export const SHARED_WORKROOM_OFFICE_PRODUCTION_SCENE: EnvironmentSceneSpec = {
  environment_id: "environment:shared-workroom-office:ocd-master:v1",
  scene_id: "shared-workroom-office-production",
  family_id: "shared-workroom-office",
  label: "Shared staff workroom (production)",
  presentation_status: "production",
  fidelity_tier: "F4",
  coordinate_system: "plate-normalized",
  units: "plate-percent",

  /**
   * The plate coordinate space is the quarter-scale tier, 1376x768. It is an
   * exact 1/4 of the 5504x3072 master in both axes, so a percentage in this
   * space lands on the same feature in every tier without a rounding story.
   */
  plate: { width: 1376, height: 768 },

  /**
   * The supported aspect range is the project's presentation policy and is not
   * plate geometry, so it is shared rather than measured. The two focus values
   * ARE measured against this plate: horizontal 0.5 because the room's content
   * runs wall to wall with the kitchenette left and the work tables right, and
   * vertical 0.70 because the part that must survive a 2.4 crop is the floor
   * and furniture band from about 40% down, not the ceiling.
   */
  camera_policy: {
    minimum_aspect_ratio: 1.5,
    maximum_aspect_ratio: 12 / 5,
    horizontal_focus: 0.5,
    vertical_focus: 0.7,
  },

  /**
   * The intersection of what survives every supported aspect, computed from the
   * policy above rather than drawn by eye. At 1.5 the plate loses its sides and
   * keeps x 8.14%-91.86%; at 2.4 it loses its top and keeps y 32.68% down. In
   * plate pixels that is x 112..1264 and y 251..768.
   */
  safe_area: { x: 112, y: 251, width: 1152, height: 517 },

  /**
   * The content that must never be cropped: the work tables, the task chairs,
   * the open tiled floor people stand on, and the near table edge. Measured at
   * x 9.4%-90.8%, y 35.2%-100%, and held inside the safe area above.
   */
  essential_content_area: { x: 130, y: 270, width: 1120, height: 498 },

  ui_safe_zones: [
    { id: "lower-shell", edge: "bottom-left", width: 620, height: 120 },
    { id: "navigation-flyout", edge: "top-left", width: 320, height: 300 },
  ],

  raster: {
    asset_id: "env_shared_workroom_office_v1",
    tiers: [
      {
        width: 1376,
        height: 768,
        path: "art/families/shared-workroom-office/env_shared_workroom_office_v1.png",
        hash: "51f6a94c151815bdcbf296096b94232b24a67c31a21744af40b84742ba5e6c12",
        derivation: "deterministic-downscale",
      },
      {
        width: 2752,
        height: 1536,
        path: "art/families/shared-workroom-office/env_shared_workroom_office_runtime_2x_v1.png",
        hash: "c26094b0b62c4e3b949ae4a5e839f2331f0785b74ffacf8488baea1564398c93",
        derivation: "deterministic-downscale",
      },
    ],
  },

  /**
   * Two points on the line described at the top of this file.
   *
   * Because apparent size is proportional to (floor_y - 39.9), a linear ramp in
   * floor_y is not an approximation here — it is the exact model, and the two
   * pairs are just two points on it. Scale is defined as 1 at floor 80%, so
   * near = (100-39.9)/40.1 = 1.4988 and far = (55-39.9)/40.1 = 0.3766. Any
   * anchor between them gets its scale from its own floor line and never from a
   * number tuned for a sprite.
   */
  floor_calibration: {
    near: { floor_y_percent: 100, scale: 1.4988 },
    far: { floor_y_percent: 55, scale: 0.3766 },
  },

  /**
   * Derived, not chosen. At floor 80% (scale 1) a 1.7 m adult stands 1.7 *
   * 0.585 * 40.1 = 39.9% of plate height. A normalized body raster carries its
   * figure across about 90.3% of its canvas height, so the whole canvas is
   * 44.2% of plate height there; at the 765x1024 canvas ratio that is 18.42% of
   * plate width.
   *
   * It lands near the fixture's 19.48% by arithmetic rather than by descent:
   * this plate is a different room measured a different way, and the two agree
   * only because both rooms are ordinary rooms photographed at ordinary height.
   */
  standard_body_width_percent: 18.42,

  anchors: [
    {
      /**
       * Open tiled floor in front of the kitchenette. Floor contact read where
       * the tiles meet the counter base run.
       */
      id: "kitchenette-standing",
      type: "standing-person",
      kind: "floor-standing",
      x_percent: 16,
      z_order: 1,
      footprint_percent: 14,
      allowed_pose_families: ["standing-neutral", "standing-conversational"],
      permitted_facings: ["front"],
      floor_contact: { floor_y_percent: 66, max_foot_spread_percent: 7 },
    },
    {
      /** Middle of the open tiled floor, clear of every table leg. */
      id: "workroom-floor-standing",
      type: "standing-person",
      kind: "floor-standing",
      x_percent: 26,
      z_order: 2,
      footprint_percent: 18,
      allowed_pose_families: ["standing-neutral", "standing-conversational"],
      permitted_facings: ["front"],
      floor_contact: { floor_y_percent: 82, max_foot_spread_percent: 9 },
    },
    {
      /**
       * Near foreground floor, beside the front table. The nearest place a
       * person can stand and still be whole inside the safe area.
       */
      id: "near-table-standing",
      type: "standing-person",
      kind: "floor-standing",
      x_percent: 40,
      z_order: 3,
      footprint_percent: 22,
      allowed_pose_families: ["standing-neutral", "standing-listening"],
      permitted_facings: ["front"],
      floor_contact: { floor_y_percent: 94, max_foot_spread_percent: 10 },
    },
    {
      /**
       * The ONE seat in this room whose cushion is actually visible.
       *
       * The blue task chair beside the kitchenette is clear of the tables, so
       * its seat can be measured: cushion x 27.44%-31.80%, y 53.04% (back edge)
       * to 55.64% (front lip), casters on the floor at 57.9%. The seat plane is
       * one third forward of the back edge, the same rule the repository
       * applies elsewhere, giving 53.9%.
       *
       * Cross-check against this plate's own ruler: a 0.45 m seat at floor
       * 57.9% should stand 0.45 * 0.585 * 18.0 = 4.74% of plate height above
       * it. Measured, the gap is 4.0%. The measurement is recorded as found and
       * the difference is left in `explicit_unknowns` rather than split.
       *
       * The chair is drawn from behind and to its left, so a person sitting in
       * it faces away from the camera. No pose family in this repository
       * describes that, and none is invented here: the anchor permits the two
       * seated families that exist and the runtime fails closed until art for
       * one of them exists.
       */
      id: "left-task-chair",
      type: "seated-person",
      kind: "seat",
      x_percent: 29.6,
      z_order: 2,
      footprint_percent: 12,
      allowed_pose_families: ["seated-at-desk", "seated-guest-neutral"],
      permitted_facings: ["away"],
      seat_contact: {
        seat_plane_y_percent: 53.9,
        seat_front_x_percent: 29.6,
        seat_width_percent: 4.36,
        floor_y_percent: 57.9,
        seat_z_order: 2,
        backrest_z_order: 1,
      },
    },
  ],

  /**
   * The near table edge is the only real occluder in this room, and its region
   * is measured. Its alpha is NOT authored yet, and that is deliberate: no
   * production body art exists, so nothing is currently drawn behind the table
   * for a mask to cut. Declaring the footprint without a raster is the same
   * honest state the repository already uses elsewhere; painting a speculative
   * mask over a plate this detailed would be inventing geometry to satisfy a
   * checklist. The day a production body renders here, this region is where its
   * mask goes.
   */
  foreground_occlusion_objects: [
    {
      id: "near-table-front",
      type: "furniture-foreground",
      z_order: 4,
      region_percent: {
        x_percent: 40,
        y_percent: 60,
        width_percent: 60,
        height_percent: 40,
      },
    },
  ],

  /**
   * Three surfaces this room can actually carry information on, measured off
   * the plate. Everything else in the picture — the kitchenette, the coat rack,
   * the stacked boxes, the ceiling — is ambient and is deliberately absent so a
   * later pass cannot quietly promote it.
   */
  surface_slots: [
    {
      slot_id: "workroom-corkboard",
      kind: "monitor-or-bulletin-board",
      rect_percent: {
        x_percent: 70,
        y_percent: 13,
        width_percent: 26,
        height_percent: 17,
      },
      z_order: 1,
      allowed_content_classes: ["agenda", "headline", "document-body"],
      fallback_decoration: "blank pinned paper shapes with no legible text",
    },
    {
      slot_id: "near-table-working-document",
      kind: "desk-document",
      rect_percent: {
        x_percent: 60,
        y_percent: 63,
        width_percent: 18,
        height_percent: 12,
      },
      z_order: 3,
      allowed_content_classes: ["document-body", "bill-title", "bill-number"],
      fallback_decoration: "a clipboard holding blank paper",
    },
    {
      slot_id: "near-table-laptop-screen",
      kind: "monitor-or-screen",
      rect_percent: {
        x_percent: 72,
        y_percent: 55,
        width_percent: 10,
        height_percent: 9,
      },
      z_order: 3,
      allowed_content_classes: ["document-body", "briefing-slide"],
      fallback_decoration: "a dark screen with no interface drawn on it",
    },
  ],

  explicit_unknowns: [
    "Every anchor, contact, occluder region and surface slot here is a visual estimate read off this master. The scale ruler is the floor tile grid taken as 12-inch commercial tile, which is a convention rather than a surveyed dimension; if the real tile differs, every derived size moves together and the relative geometry still holds.",
    "The horizon at 39.9% of plate height is solved from two tile measurements, not surveyed. It is the single number the floor calibration and the standard body width both rest on.",
    "The left task chair's measured seat-to-floor gap is 4.0% of plate height where this plate's own ruler predicts 4.74% for a 0.45 m seat. Both numbers are recorded as found; neither was adjusted to close the difference.",
    "Every other chair in this room has its seat cushion hidden behind a work table, so no seat plane can be measured for it. Those chairs are deliberately NOT declared as seat anchors rather than being given plausible numbers.",
    "The near table's occluder region is declared without an authored alpha mask, because no production body currently renders behind it. The mask is derived from this plate when the first production body needs it.",
    "This scene has no production character art. Body, head, hair, wardrobe and footwear masters for production people do not exist yet, so every anchor above fails closed and the proof surface reports the gap instead of substituting development fixtures.",
    "The 35 banked pg-* candidate components are NOT eligible to fill these anchors. Their gray mannequin bodies are structural reference evidence only, and their attachment anchors are non-authoritative visual estimates (see D-068).",
  ],
};
