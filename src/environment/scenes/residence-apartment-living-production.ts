import type { EnvironmentSceneSpec } from "../environment-scene-spec";

/**
 * The two production apartment living rooms.
 *
 * PRODUCTION ART. Both rasters are owner-approved Our Civic Duty scene masters
 * at 5504x3072, preserved byte-for-byte under
 * `art/references/masters/scene-environment/` and carried in as single
 * deterministic Lanczos-3 DOWNSCALES to 1376x768.
 *
 * ONE TIER EACH, ON PURPOSE. Both masters are external 4x upscales of 1376-wide
 * original renders, so their detail ceiling is 1376 pixels however many pixels
 * the file has. A 2752 tier would be four times the bytes carrying no more
 * detail than the 1376 one, and would have to declare a shortfall to say so.
 * The honest ladder is the one that stops where the detail stops.
 *
 * A ROOM IS NOT A BIOGRAPHY. Neither of these is "the player's apartment" or
 * "the parents' house". They are two ordinary living rooms; which household a
 * room stands for is a canonical world fact bound at runtime, never a property
 * of the file. Nothing here reads socioeconomic standing off the furniture.
 *
 * NEITHER ROOM IS CALIBRATED FOR PEOPLE, and that is a refusal rather than an
 * oversight — see `explicit_unknowns` on each.
 */

const DOMESTIC_CAMERA = {
  minimum_aspect_ratio: 1.5,
  maximum_aspect_ratio: 12 / 5,
  horizontal_focus: 0.5,
  vertical_focus: 0.66,
} as const;

const DOMESTIC_UI_SAFE_ZONES = [
  { id: "lower-shell", edge: "bottom-left", width: 620, height: 120 },
  { id: "navigation-flyout", edge: "top-left", width: 320, height: 300 },
] as const;

const DOMESTIC_UNKNOWNS = [
  "No floor calibration pair and no standard body width are declared. These plates have no repeating floor unit to measure against, and the manifest that approved them lists the perspective calibration pair as UNRESOLVED until a modular sprite alignment pass. No production body art exists to run that pass, so the numbers stay unstated rather than estimated.",
  "Every anchor contact below is a visual estimate read off this plate at the point where the furniture visibly meets the floor. Seat planes are read from the visible cushion; no seat hidden behind another object is declared.",
  "The coffee-table occluder region is declared without an authored alpha mask, because no production body renders behind it yet.",
  "The window slot carries only neutral art. Time of day and weather have no canonical owner in this world, so the slot marks where such a binder would attach and shows the painted daylight until one exists.",
  "Both masters are external 4x upscales of 1376-wide originals. The single 1376 tier is a reduction and its pixel width is its detail width; no larger tier was derived, because none would carry more detail.",
] as const;

/**
 * The benchmark domestic plate: a sofa on the right, a leather club chair on
 * the left, a coffee table between them, a television on a low console and a
 * daylight window behind it.
 */
export const RESIDENCE_APARTMENT_LIVING_CANONICAL_03_SCENE: EnvironmentSceneSpec =
  {
    environment_id: "environment:residence-apartment-living:canonical-03:v1",
    scene_id: "residence-apartment-living-canonical-03",
    family_id: "apartment-ordinary",
    label: "An apartment living room",
    presentation_status: "production",
    fidelity_tier: "F4",
    coordinate_system: "plate-normalized",
    units: "plate-percent",

    plate: { width: 1376, height: 768 },
    camera_policy: DOMESTIC_CAMERA,
    /** At 1.5 the plate keeps x 112..1264; at 2.4 it keeps 573 rows from y 195. */
    safe_area: { x: 112, y: 195, width: 1152, height: 573 },
    /** The seating group, the console and the open foreground floor. */
    essential_content_area: { x: 330, y: 260, width: 934, height: 508 },
    ui_safe_zones: [...DOMESTIC_UI_SAFE_ZONES],

    raster: {
      asset_id: "env_residence_apartment_living_canonical_03_5504x3072_v1",
      tiers: [
        {
          width: 1376,
          height: 768,
          path: "art/families/apartment-ordinary/env_residence_apartment_living_canonical_03_v1.png",
          hash: "baa3f6f965250363fdb1e376148ef0bdd7b84a36dd702a84bbe5239162c5753f",
          derivation: "deterministic-downscale",
        },
      ],
    },

    anchors: [
      {
        /** The grey sofa on the right. Cushion back edge 58%, front lip 63%. */
        id: "sofa-seated",
        type: "seated-person",
        kind: "seat",
        x_percent: 69,
        z_order: 3,
        footprint_percent: 18,
        allowed_pose_families: ["seated-guest-neutral", "seated-at-desk"],
        permitted_facings: ["front"],
        seat_contact: {
          seat_plane_y_percent: 59.7,
          seat_front_x_percent: 69,
          seat_width_percent: 17,
          floor_y_percent: 79,
          seat_z_order: 3,
          backrest_z_order: 2,
        },
      },
      {
        /** The leather club chair on the left, turned towards the room. */
        id: "club-chair-seated",
        type: "seated-person",
        kind: "seat",
        x_percent: 33,
        z_order: 2,
        footprint_percent: 13,
        allowed_pose_families: ["seated-guest-neutral"],
        permitted_facings: ["front"],
        seat_contact: {
          seat_plane_y_percent: 61.5,
          seat_front_x_percent: 33,
          seat_width_percent: 12,
          floor_y_percent: 71,
          seat_z_order: 2,
          backrest_z_order: 1,
        },
      },
      {
        /** Open floor in the foreground, clear of the rug and the table. */
        id: "living-room-floor-standing",
        type: "standing-person",
        kind: "floor-standing",
        x_percent: 46,
        z_order: 4,
        footprint_percent: 20,
        allowed_pose_families: ["standing-neutral", "standing-conversational"],
        permitted_facings: ["front"],
        floor_contact: { floor_y_percent: 92, max_foot_spread_percent: 10 },
      },
      {
        /** Bare floor to the right of the sofa, on the way to the door. */
        id: "entry-side-standing",
        type: "standing-person",
        kind: "floor-standing",
        x_percent: 87,
        z_order: 2,
        footprint_percent: 14,
        allowed_pose_families: ["standing-neutral", "standing-listening"],
        permitted_facings: ["front"],
        floor_contact: { floor_y_percent: 82, max_foot_spread_percent: 8 },
      },
    ],

    foreground_occlusion_objects: [
      {
        id: "coffee-table-front",
        type: "furniture-foreground",
        z_order: 5,
        region_percent: {
          x_percent: 41,
          y_percent: 60,
          width_percent: 18,
          height_percent: 14,
        },
      },
    ],

    surface_slots: [
      {
        slot_id: "living-room-television",
        kind: "television",
        rect_percent: {
          x_percent: 46,
          y_percent: 40,
          width_percent: 11,
          height_percent: 13,
        },
        z_order: 1,
        allowed_content_classes: [
          "headline",
          "election-result",
          "briefing-slide",
        ],
        fallback_decoration: "a dark screen with nothing on it",
      },
      {
        slot_id: "living-room-wall-frame",
        kind: "picture-frame",
        rect_percent: {
          x_percent: 4,
          y_percent: 14,
          width_percent: 13,
          height_percent: 22,
        },
        z_order: 0,
        allowed_content_classes: ["neutral-art", "officeholder-portrait"],
        fallback_decoration: "the abstract print painted into the plate",
      },
      {
        slot_id: "living-room-window",
        kind: "window-view",
        rect_percent: {
          x_percent: 38,
          y_percent: 19,
          width_percent: 22,
          height_percent: 31,
        },
        z_order: 0,
        allowed_content_classes: ["neutral-art"],
        fallback_decoration: "the painted daylight and the buildings opposite",
      },
      {
        slot_id: "coffee-table-papers",
        kind: "desk-document",
        rect_percent: {
          x_percent: 44,
          y_percent: 60,
          width_percent: 10,
          height_percent: 4,
        },
        z_order: 6,
        allowed_content_classes: ["document-body"],
        fallback_decoration: "the closed magazines painted on the table",
      },
    ],

    explicit_unknowns: [...DOMESTIC_UNKNOWNS],
  };

/**
 * The second domestic plate: a sofa on the left, a worn armchair on the right,
 * a radiator under the window and a shelf of books beside the television.
 */
export const RESIDENCE_APARTMENT_LIVING_ORDINARY_02_SCENE: EnvironmentSceneSpec =
  {
    environment_id: "environment:residence-apartment-living:ordinary-02:v1",
    scene_id: "residence-apartment-living-ordinary-02",
    family_id: "apartment-ordinary",
    label: "A second apartment living room",
    presentation_status: "production",
    fidelity_tier: "F4",
    coordinate_system: "plate-normalized",
    units: "plate-percent",

    plate: { width: 1376, height: 768 },
    camera_policy: DOMESTIC_CAMERA,
    safe_area: { x: 112, y: 195, width: 1152, height: 573 },
    essential_content_area: { x: 200, y: 260, width: 1064, height: 508 },
    ui_safe_zones: [...DOMESTIC_UI_SAFE_ZONES],

    raster: {
      asset_id: "env_residence_apartment_living_ordinary_02_5504x3072_v1",
      tiers: [
        {
          width: 1376,
          height: 768,
          path: "art/families/apartment-ordinary/env_residence_apartment_living_ordinary_02_v1.png",
          hash: "8d0863e1c8423e6cb61682cbf025e1590f7bd5bf4fd964864b05d79f8e8838fe",
          derivation: "deterministic-downscale",
        },
      ],
    },

    anchors: [
      {
        /** The long sofa on the left. Cushion back edge 62%, front lip 67%. */
        id: "sofa-seated",
        type: "seated-person",
        kind: "seat",
        x_percent: 21,
        z_order: 3,
        footprint_percent: 20,
        allowed_pose_families: ["seated-guest-neutral", "seated-at-desk"],
        permitted_facings: ["front"],
        seat_contact: {
          seat_plane_y_percent: 63.7,
          seat_front_x_percent: 21,
          seat_width_percent: 19,
          floor_y_percent: 88,
          seat_z_order: 3,
          backrest_z_order: 2,
        },
      },
      {
        /** The blue armchair on the right, angled towards the sofa. */
        id: "armchair-seated",
        type: "seated-person",
        kind: "seat",
        x_percent: 67,
        z_order: 4,
        footprint_percent: 16,
        allowed_pose_families: ["seated-guest-neutral"],
        permitted_facings: ["front"],
        seat_contact: {
          seat_plane_y_percent: 68,
          seat_front_x_percent: 67,
          seat_width_percent: 14,
          floor_y_percent: 89,
          seat_z_order: 4,
          backrest_z_order: 3,
        },
      },
      {
        /** Open floor between the seating and the camera. */
        id: "living-room-floor-standing",
        type: "standing-person",
        kind: "floor-standing",
        x_percent: 47,
        z_order: 5,
        footprint_percent: 22,
        allowed_pose_families: ["standing-neutral", "standing-conversational"],
        permitted_facings: ["front"],
        floor_contact: { floor_y_percent: 95, max_foot_spread_percent: 10 },
      },
      {
        /** The floor in front of the doorway at the right edge. */
        id: "entry-side-standing",
        type: "standing-person",
        kind: "floor-standing",
        x_percent: 88,
        z_order: 2,
        footprint_percent: 13,
        allowed_pose_families: ["standing-neutral", "standing-listening"],
        permitted_facings: ["front"],
        floor_contact: { floor_y_percent: 82, max_foot_spread_percent: 8 },
      },
    ],

    foreground_occlusion_objects: [
      {
        id: "coffee-table-front",
        type: "furniture-foreground",
        z_order: 6,
        region_percent: {
          x_percent: 33,
          y_percent: 66,
          width_percent: 20,
          height_percent: 24,
        },
      },
    ],

    surface_slots: [
      {
        slot_id: "living-room-television",
        kind: "television",
        rect_percent: {
          x_percent: 46,
          y_percent: 43,
          width_percent: 12,
          height_percent: 14,
        },
        z_order: 1,
        allowed_content_classes: [
          "headline",
          "election-result",
          "briefing-slide",
        ],
        fallback_decoration: "a dark screen with nothing on it",
      },
      {
        slot_id: "living-room-wall-frame",
        kind: "picture-frame",
        rect_percent: {
          x_percent: 12,
          y_percent: 23,
          width_percent: 13,
          height_percent: 20,
        },
        z_order: 0,
        allowed_content_classes: ["neutral-art", "officeholder-portrait"],
        fallback_decoration: "the landscape print painted into the plate",
      },
      {
        slot_id: "living-room-window",
        kind: "window-view",
        rect_percent: {
          x_percent: 44,
          y_percent: 19,
          width_percent: 22,
          height_percent: 35,
        },
        z_order: 0,
        allowed_content_classes: ["neutral-art"],
        fallback_decoration: "the painted overcast daylight",
      },
      {
        slot_id: "coffee-table-papers",
        kind: "desk-document",
        rect_percent: {
          x_percent: 37,
          y_percent: 66,
          width_percent: 10,
          height_percent: 4,
        },
        z_order: 7,
        allowed_content_classes: ["document-body"],
        fallback_decoration: "the folded newspaper painted on the table",
      },
    ],

    explicit_unknowns: [...DOMESTIC_UNKNOWNS],
  };
