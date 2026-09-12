import type { EnvironmentSceneSpec } from "../environment-scene-spec";

/**
 * A campaign storefront field office, authored as PRODUCTION art.
 *
 * PRODUCTION ART. Its raster is derived from the swept 5504x3072 master
 * `IMG_5205.JPG` (Drive file id `1omryvYo8QYASr96guWI7XeQkJ6hdTKCu`), preserved
 * byte-for-byte under `art/references/candidates/recent-drive-sweep/source-images/`
 * and carried into the runtime as two deterministic Lanczos-3 downscales. Nothing
 * was enlarged: 1376x768 is an exact 1/4 reduction and 2752x1536 is an exact 1/2
 * reduction.
 *
 * WHAT THE ROOM CONTAINS, read off the plate: an open storefront space in use
 * as a political field office and phone bank. Folding tables with corded desk
 * phones, mismatched folding and task chairs, cardboard supply boxes with blank
 * labels, a blank corkboard bulletin, and an unlettered whiteboard. No human
 * figures are painted into the scene, and inspection confirmed NO baked readable
 * text or signage (unlike sibling candidates IMG_5190 and IMG_5207 which had
 * baked "FIELD OFFICE" window text).
 *
 * DYNAMIC CONTENT: All campaign branding, jurisdiction names, volunteer call
 * sheets, and strategy goals are fed through declared surface slots bound to
 * canonical World state. Nothing is baked into the picture.
 */
export const CAMPAIGN_STOREFRONT_PRODUCTION_SCENE: EnvironmentSceneSpec = {
  environment_id: "environment:campaign-storefront:field-office:v1",
  scene_id: "campaign-storefront-production",
  family_id: "campaign-storefront",
  label: "A campaign storefront field office",
  presentation_status: "production",
  fidelity_tier: "F4",
  coordinate_system: "plate-normalized",
  units: "plate-percent",

  /** An exact 1/4 downscale of the 5504x3072 master. */
  plate: { width: 1376, height: 768 },

  camera_policy: {
    minimum_aspect_ratio: 1.5,
    maximum_aspect_ratio: 12 / 5,
    horizontal_focus: 0.5,
    vertical_focus: 0.68,
  },

  safe_area: { x: 96, y: 195, width: 1152, height: 573 },
  essential_content_area: { x: 120, y: 260, width: 1120, height: 500 },

  ui_safe_zones: [
    { id: "lower-shell", edge: "bottom-left", width: 620, height: 120 },
    { id: "navigation-flyout", edge: "top-left", width: 320, height: 300 },
  ],

  raster: {
    asset_id: "env_campaign_storefront_5504x3072_v1",
    tiers: [
      {
        width: 1376,
        height: 768,
        path: "art/families/campaign-storefront/env_campaign_storefront_v1.png",
        hash: "35a37c8a6526a86eb569be61383558c1b90369abb9c185d21a7d5765d52edfc0",
        derivation: "deterministic-downscale",
      },
      {
        width: 2752,
        height: 1536,
        path: "art/families/campaign-storefront/env_campaign_storefront_runtime_2x_v1.png",
        hash: "8ed3362367898887a638b78caf95e55600f98dcaf9aa154d197a0035fc467663",
        derivation: "deterministic-downscale",
      },
    ],
  },

  anchors: [
    {
      /** Standing by the phone bank folding table on the left side of the room. */
      id: "phone-bank-standing",
      type: "standing-person",
      kind: "floor-standing",
      x_percent: 26,
      z_order: 3,
      footprint_percent: 14,
      allowed_pose_families: ["standing-neutral", "standing-listening"],
      permitted_facings: ["front"],
      floor_contact: { floor_y_percent: 82, max_foot_spread_percent: 8 },
    },
    {
      /** Standing in the clear central floor area near the strategy corkboard. */
      id: "organizer-standing",
      type: "standing-person",
      kind: "floor-standing",
      x_percent: 62,
      z_order: 2,
      footprint_percent: 15,
      allowed_pose_families: [
        "standing-neutral",
        "standing-podium-or-lectern",
      ],
      permitted_facings: ["front"],
      floor_contact: { floor_y_percent: 85, max_foot_spread_percent: 8 },
    },
    {
      /** Seated volunteer chair at the folding phone table. */
      id: "volunteer-desk-chair",
      type: "seated-person",
      kind: "seat",
      x_percent: 38,
      z_order: 4,
      footprint_percent: 12,
      allowed_pose_families: ["seated-at-desk"],
      permitted_facings: ["front"],
      seat_contact: {
        seat_plane_y_percent: 65,
        seat_front_x_percent: 38,
        seat_width_percent: 9,
        floor_y_percent: 82,
        seat_z_order: 4,
        backrest_z_order: 3,
      },
    },
  ],

  foreground_occlusion_objects: [
    {
      /** The folding work table in the mid-foreground. */
      id: "folding-table-foreground",
      type: "furniture-foreground",
      z_order: 6,
      region_percent: {
        x_percent: 18,
        y_percent: 62,
        width_percent: 32,
        height_percent: 28,
      },
    },
    {
      /** Cardboard supply boxes stacked on the right floor. */
      id: "stacked-boxes-foreground",
      type: "furniture-foreground",
      z_order: 5,
      region_percent: {
        x_percent: 75,
        y_percent: 65,
        width_percent: 22,
        height_percent: 32,
      },
    },
  ],

  surface_slots: [
    {
      /** Upper storefront window area for campaign name and slogan banners. */
      slot_id: "storefront-window-banner",
      kind: "title-banner-safe",
      rect_percent: {
        x_percent: 8,
        y_percent: 8,
        width_percent: 36,
        height_percent: 18,
      },
      z_order: 0,
      allowed_content_classes: [
        "campaign-name",
        "jurisdiction-name",
        "headline",
      ],
      information_access: "public-record",
      fallback_decoration: "bare storefront window glass",
    },
    {
      /** Corkboard on the back wall for phone bank schedules and district maps. */
      slot_id: "phone-bank-corkboard",
      kind: "monitor-or-bulletin-board",
      rect_percent: {
        x_percent: 48,
        y_percent: 20,
        width_percent: 18,
        height_percent: 22,
      },
      z_order: 0,
      allowed_content_classes: ["document-body", "headline"],
      information_access: "public-record",
      fallback_decoration: "plain brown cork with empty pushpins",
    },
    {
      /** Whiteboard on the back-right wall for volunteer turnout tallies. */
      slot_id: "strategy-whiteboard",
      kind: "agenda-board",
      rect_percent: {
        x_percent: 70,
        y_percent: 22,
        width_percent: 20,
        height_percent: 24,
      },
      z_order: 0,
      allowed_content_classes: ["document-body", "headline"],
      information_access: "public-record",
      fallback_decoration: "a clean white marker board",
    },
    {
      /** Printed voter call lists and campaign literature on the table. */
      slot_id: "table-literature-pamphlet",
      kind: "desk-document",
      rect_percent: {
        x_percent: 22,
        y_percent: 64,
        width_percent: 12,
        height_percent: 5,
      },
      z_order: 7,
      allowed_content_classes: ["document-body"],
      information_access: "public-record",
      fallback_decoration: "a bare laminate folding table top",
    },
  ],

  explicit_unknowns: [
    "Every anchor contact, floor line and occlusion boundary is a VISUAL ESTIMATE read directly from the 5504x3072 master IMG_5205.JPG. No architectural plan or calibrated laser survey exists.",
    "This is a generic campaign field office and phone bank. It depicts no real political candidate, campaign organization, party headquarters or historical election.",
    "Baked labels on boxes, the corkboard and the whiteboard are verified blank in the source image; all campaign slogans, volunteer call targets and candidate names are supplied dynamically by canonical World state.",
    "No floor calibration scale pair is established. Depth scaling is interpolated from visual-estimate floor contact lines.",
  ],
};
