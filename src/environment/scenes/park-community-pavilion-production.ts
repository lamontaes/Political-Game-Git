import type { EnvironmentSceneSpec } from "../environment-scene-spec";

/**
 * A community park pavilion shelter, authored as CANDIDATE art.
 *
 * CANDIDATE ART. Its raster is derived from the swept 5504x3072 master
 * preserved byte-for-byte under candidate references and carried into the runtime
 * as two deterministic Lanczos-3 downscales. Nothing was enlarged: 1376x768 is an
 * exact 1/4 reduction and 2752x1536 is an exact 1/2 reduction.
 *
 * CANDIDATE ISOLATION: Preserves AX-92B1 intake invariants. The scene is
 * declared as candidate presentation status and is isolated from normal
 * play reachability pending human visual acceptance.
 *
 * WHAT THE SCENE CONTAINS: An open-air park shelter with timber post-and-beam
 * framing, a concrete pad, wooden picnic tables, and trees and lawn visible
 * beyond. No figures or readable baked text exist in the source plate.
 *
 * DYNAMIC CONTENT: Municipal event announcements, rally banners, and printed
 * park fliers are fed through declared surface slots bound to canonical World state.
 */
export const PARK_COMMUNITY_PAVILION_CANDIDATE_SCENE: EnvironmentSceneSpec = {
  environment_id: "environment:park-community-pavilion:candidate:v1",
  scene_id: "park-community-pavilion-candidate",
  family_id: "park-community-pavilion",
  label: "A park community pavilion shelter (candidate)",
  presentation_status: "development-fixture",
  fidelity_tier: "F4",
  coordinate_system: "plate-normalized",
  units: "plate-percent",

  /** An exact 1/4 downscale of the 5504x3072 master. */
  plate: { width: 1376, height: 768 },

  camera_policy: {
    minimum_aspect_ratio: 1.5,
    maximum_aspect_ratio: 12 / 5,
    horizontal_focus: 0.5,
    vertical_focus: 0.65,
  },

  safe_area: { x: 96, y: 195, width: 1152, height: 573 },
  essential_content_area: { x: 120, y: 240, width: 1120, height: 520 },

  ui_safe_zones: [
    { id: "lower-shell", edge: "bottom-left", width: 620, height: 120 },
    { id: "navigation-flyout", edge: "top-left", width: 320, height: 300 },
  ],

  raster: {
    asset_id: "env_park_community_pavilion_candidate_5504x3072_v1",
    tiers: [
      {
        width: 1376,
        height: 768,
        path: "art/families/park-community-pavilion/env_park_community_pavilion_v1.png",
        hash: "d785b09e41f02a41b625a2fccda9f840dadc5f56cf3fd3f388350aeec6f4f813",
        derivation: "deterministic-downscale",
      },
      {
        width: 2752,
        height: 1536,
        path: "art/families/park-community-pavilion/env_park_community_pavilion_runtime_2x_v1.png",
        hash: "228fd1dcf898c13277c0efc301f3347d0baab8a5d49076a6cb0a769aac242dbc",
        derivation: "deterministic-downscale",
      },
    ],
  },

  anchors: [
    {
      /** Standing under the pavilion shelter on the concrete pad. */
      id: "pavilion-pad-standing",
      type: "standing-person",
      kind: "floor-standing",
      x_percent: 50,
      z_order: 3,
      footprint_percent: 5,
      allowed_pose_families: [
        "standing-neutral",
        "standing-listening",
        "standing-podium-or-lectern",
      ],
      permitted_facings: ["front"],
      floor_contact: { floor_y_percent: 68, max_foot_spread_percent: 8 },
    },
    {
      /** Standing near the shelter perimeter on the walkway/lawn transition. */
      id: "pavilion-perimeter-standing",
      type: "standing-person",
      kind: "floor-standing",
      x_percent: 24,
      z_order: 2,
      footprint_percent: 8,
      allowed_pose_families: ["standing-neutral", "standing-listening"],
      permitted_facings: ["front"],
      floor_contact: { floor_y_percent: 82, max_foot_spread_percent: 8 },
    },
    {
      /** Seated at the park pavilion wooden picnic bench. */
      id: "picnic-bench-seated",
      type: "seated-person",
      kind: "seat",
      x_percent: 68,
      z_order: 4,
      footprint_percent: 12,
      allowed_pose_families: ["seated-at-desk"],
      permitted_facings: ["front"],
      seat_contact: {
        seat_plane_y_percent: 64,
        seat_front_x_percent: 68,
        seat_width_percent: 10,
        floor_y_percent: 78,
        seat_z_order: 4,
        backrest_z_order: 3,
      },
    },
  ],

  foreground_occlusion_objects: [
    {
      /** Picnic table in the mid-foreground. */
      id: "picnic-table-foreground",
      type: "furniture-foreground",
      z_order: 5,
      region_percent: {
        x_percent: 60,
        y_percent: 62,
        width_percent: 28,
        height_percent: 26,
      },
    },
  ],

  surface_slots: [
    {
      /** Crossbeam hanging banner for park community gatherings and rally slogans. */
      slot_id: "pavilion-event-banner",
      kind: "title-banner-safe",
      rect_percent: {
        x_percent: 32,
        y_percent: 12,
        width_percent: 36,
        height_percent: 14,
      },
      z_order: 0,
      allowed_content_classes: [
        "campaign-name",
        "jurisdiction-name",
        "headline",
      ],
      information_access: "public-record",
      fallback_decoration: "bare wooden pavilion rafter beams",
    },
    {
      /** Printed flyers or sign-in sheets laid on the picnic table. */
      slot_id: "picnic-table-handout",
      kind: "desk-document",
      rect_percent: {
        x_percent: 62,
        y_percent: 63,
        width_percent: 14,
        height_percent: 5,
      },
      z_order: 6,
      allowed_content_classes: ["document-body"],
      information_access: "public-record",
      fallback_decoration: "bare picnic table wooden slats",
    },
  ],

  explicit_unknowns: [
    "Every anchor contact, floor line and occlusion boundary is a VISUAL ESTIMATE read from the swept candidate master. No architectural survey or construction blueprint exists.",
    "This is a candidate community park pavilion and picnic shelter. It is kept candidate-isolated from normal production play reachability pending human visual acceptance.",
    "No real municipal park, county recreation district, or historical event is depicted.",
    "No baked text exists on the pavilion or signage; all event titles, campaign names and community notices are supplied dynamically by canonical World state.",
    "No floor calibration scale pair is established. Depth scaling is interpolated from visual-estimate floor contact lines.",
  ],
};
