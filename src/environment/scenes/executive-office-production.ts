import type { EnvironmentSceneSpec } from "../environment-scene-spec";

/**
 * An executive private study, authored as CANDIDATE art.
 *
 * CANDIDATE ART. Its raster is derived from the swept 5504x3072 master
 * `IMG_5189.JPG` preserved byte-for-byte under candidate references and carried
 * into the runtime as two deterministic Lanczos-3 downscales via
 * `npm run derive:scene-tiers`. Nothing was enlarged: 1376x768 is an exact 1/4
 * reduction and 2752x1536 is an exact 1/2 reduction.
 *
 * ANSWERS OPEN REQUEST: `env-executive-office-4k-master` in `art/requests/asset-requests.json`.
 * Replaces the banked 1672x941 master (`env_office_executive_private_lincoln_1672x941_v1`)
 * which failed the 4608px environment master minimum.
 *
 * CANDIDATE ISOLATION: Preserves candidate intake and release boundaries.
 * The scene is declared with candidate presentation status ("development-fixture")
 * and is quarantined from normal-play reachability pending human visual acceptance.
 *
 * WHAT THE SCENE CONTAINS: A formal wood-panelled private working study with a
 * coffered ceiling and brass chandelier. Stone fireplace and windows on the left;
 * tall multi-pane windows looking onto trees in the background (no capitol dome,
 * state flag, or real landmark); large executive wood desk with leather high-backed
 * swivel chair, brass desk lamp, books, blotter, and computer monitor in the center;
 * two green leather wingback armchairs with a small round wooden table on an oriental
 * rug in the foreground; floor-to-ceiling built-in bookcases with books and framed
 * drawings on the right. Zero baked people, seals, or legible text exist in the source plate.
 *
 * DYNAMIC CONTENT: Executive daily agendas, working bill drafts, and briefing
 * items are fed through declared surface slots bound to canonical World state.
 */
export const EXECUTIVE_OFFICE_CANDIDATE_SCENE: EnvironmentSceneSpec = {
  environment_id: "environment:executive-office:candidate:v1",
  scene_id: "executive-office-candidate",
  family_id: "executive-private-office",
  label: "An executive private study (candidate)",
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

  safe_area: { x: 112, y: 195, width: 1152, height: 573 },
  essential_content_area: { x: 130, y: 220, width: 1120, height: 530 },

  ui_safe_zones: [
    { id: "lower-shell", edge: "bottom-left", width: 620, height: 120 },
    { id: "navigation-flyout", edge: "top-left", width: 320, height: 300 },
  ],

  raster: {
    asset_id: "env_executive_office_candidate_5504x3072_v1",
    tiers: [
      {
        width: 1376,
        height: 768,
        path: "art/families/executive-private-office/env_executive_office_v1.png",
        hash: "1f77a0b5f908cd43a4aa99d56df42e000fc8514a26ded64c178f032ece55e4b6",
        derivation: "deterministic-downscale",
      },
      {
        width: 2752,
        height: 1536,
        path: "art/families/executive-private-office/env_executive_office_runtime_2x_v1.png",
        hash: "71f7043510a374d2d27936a058c170729de6d4ba6924682c1090b44868ccfe6b",
        derivation: "deterministic-downscale",
      },
    ],
  },

  anchors: [
    {
      /** Seated in the executive leather swivel chair behind the executive desk. */
      id: "executive-desk-seated",
      type: "seated-person",
      kind: "seat",
      x_percent: 50,
      z_order: 2,
      footprint_percent: 10,
      allowed_pose_families: ["seated-at-desk"],
      permitted_facings: ["front"],
      seat_contact: {
        seat_plane_y_percent: 62,
        seat_front_x_percent: 50,
        seat_width_percent: 9,
        floor_y_percent: 76,
        seat_z_order: 2,
        backrest_z_order: 1,
      },
    },
    {
      /** Seated in the left green leather visitor wingback armchair. */
      id: "visitor-left-seated",
      type: "seated-person",
      kind: "seat",
      x_percent: 27,
      z_order: 5,
      footprint_percent: 11,
      allowed_pose_families: ["seated-at-desk", "standing-listening"],
      permitted_facings: ["front"],
      seat_contact: {
        seat_plane_y_percent: 74,
        seat_front_x_percent: 27,
        seat_width_percent: 11,
        floor_y_percent: 88,
        seat_z_order: 5,
        backrest_z_order: 4,
      },
    },
    {
      /** Seated in the right green leather visitor wingback armchair. */
      id: "visitor-right-seated",
      type: "seated-person",
      kind: "seat",
      x_percent: 72,
      z_order: 5,
      footprint_percent: 11,
      allowed_pose_families: ["seated-at-desk", "standing-listening"],
      permitted_facings: ["front"],
      seat_contact: {
        seat_plane_y_percent: 74,
        seat_front_x_percent: 72,
        seat_width_percent: 11,
        floor_y_percent: 88,
        seat_z_order: 5,
        backrest_z_order: 4,
      },
    },
    {
      /** Standing in consultation near the desk and stone fireplace. */
      id: "executive-consultation-standing",
      type: "standing-person",
      kind: "floor-standing",
      x_percent: 26,
      z_order: 3,
      footprint_percent: 12,
      allowed_pose_families: [
        "standing-neutral",
        "standing-listening",
        "standing-conversational",
      ],
      permitted_facings: ["front"],
      floor_contact: { floor_y_percent: 72, max_foot_spread_percent: 8 },
    },
  ],

  foreground_occlusion_objects: [
    {
      /** Executive wooden desk in the middle ground, occluding the seated executive. */
      id: "executive-desk-foreground",
      type: "furniture-foreground",
      z_order: 3,
      region_percent: {
        x_percent: 32,
        y_percent: 61,
        width_percent: 36,
        height_percent: 24,
      },
    },
    {
      /** Left green leather visitor armchair in the foreground. */
      id: "visitor-left-armchair",
      type: "furniture-foreground",
      z_order: 6,
      region_percent: {
        x_percent: 18,
        y_percent: 64,
        width_percent: 22,
        height_percent: 32,
      },
    },
    {
      /** Right green leather visitor armchair in the foreground. */
      id: "visitor-right-armchair",
      type: "furniture-foreground",
      z_order: 6,
      region_percent: {
        x_percent: 61,
        y_percent: 64,
        width_percent: 22,
        height_percent: 32,
      },
    },
    {
      /** Round wooden coffee table between the visitor armchairs. */
      id: "foreground-coffee-table",
      type: "furniture-foreground",
      z_order: 7,
      region_percent: {
        x_percent: 43,
        y_percent: 81,
        width_percent: 14,
        height_percent: 18,
      },
    },
  ],

  surface_slots: [
    {
      /** Landscape painting over the fireplace mantel. */
      slot_id: "fireplace-wall-art",
      kind: "picture-frame",
      rect_percent: {
        x_percent: 4,
        y_percent: 12,
        width_percent: 11,
        height_percent: 29,
      },
      z_order: 0,
      allowed_content_classes: ["headline", "document-body"],
      information_access: "public-record",
      fallback_decoration: "framed landscape oil painting in ornate gilt frame",
    },
    {
      /** Daily executive briefing folder or document blotter on the desk. */
      slot_id: "desk-working-document",
      kind: "desk-document",
      rect_percent: {
        x_percent: 44,
        y_percent: 61,
        width_percent: 11,
        height_percent: 4,
      },
      z_order: 4,
      allowed_content_classes: [
        "bill-number",
        "bill-title",
        "document-body",
        "calendar-date",
      ],
      information_access: "institutional-working",
      fallback_decoration: "leather desk pad blotter with daily executive agenda folder",
    },
    {
      /** Computer workstation display on the right side of the desk. */
      slot_id: "executive-monitor-screen",
      kind: "monitor-or-screen",
      rect_percent: {
        x_percent: 58,
        y_percent: 52,
        width_percent: 8,
        height_percent: 12,
      },
      z_order: 4,
      allowed_content_classes: ["headline", "agenda", "briefing-slide"],
      information_access: "institutional-working",
      fallback_decoration: "dark desktop workstation monitor with state system lock screen",
    },
    {
      /** Framed architectural drawing mounted on the built-in bookcase. */
      slot_id: "bookcase-architectural-sketch",
      kind: "picture-frame",
      rect_percent: {
        x_percent: 87,
        y_percent: 26,
        width_percent: 6,
        height_percent: 23,
      },
      z_order: 0,
      allowed_content_classes: ["jurisdiction-seal", "officeholder-portrait"],
      civic_symbol_policy: "canonical-source-only",
      information_access: "public-record",
      fallback_decoration: "framed architectural facade elevation sketch in wooden frame",
    },
  ],

  explicit_unknowns: [
    "Every anchor contact, floor line, and occlusion boundary is a VISUAL ESTIMATE read from the swept candidate master IMG_5189.JPG. No architectural survey or construction blueprint exists.",
    "This is a candidate executive private office that answers open request 'env-executive-office-4k-master'. It is kept candidate-isolated from normal production play reachability pending human visual acceptance.",
    "No real executive office, specific governor's mansion, or historical landmark is depicted.",
    "No baked text or state seals exist in the plate; all document titles, agency briefs, and official portraits are supplied dynamically by canonical World state.",
    "No floor calibration scale pair is established. Depth scaling is interpolated from visual-estimate floor contact lines.",
  ],
};
