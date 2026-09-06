import type { EnvironmentSceneSpec } from "../environment-scene-spec";

/**
 * A legislative chamber floor, authored as production art.
 *
 * PRODUCTION ART. Its raster is the owner-approved candidate master
 * `OCD_CANDIDATE_SCENE_GENERIC_LEGISLATIVE_CHAMBER_FLOOR_5632x3072_01.jpg`,
 * preserved byte-for-byte under `art/references/masters/scene-environment/`
 * and carried in as two deterministic Lanczos-3 DOWNSCALES. The plate space is
 * the quarter-scale tier, an exact 1/4 of the master in both axes.
 *
 * WHY THIS IS A CHAMBER AND NOT ONE OF THE ROOMS ALREADY HERE. Tiered member
 * desks with fixed chairs, a raised rostrum reached by steps, a lectern on that
 * rostrum, and public galleries running above on two sides. The hearing room
 * has a single curved bench at floor level and no gallery; the courtroom has
 * pews and a witness box. Nothing in this room names a jurisdiction: the walls
 * carry no seal, no flag and no legible word, and the desk papers and the
 * monitor are blank.
 *
 * NOBODY IS PAINTED INTO IT, which is what lets the runtime put people in it
 * later without arguing with the picture.
 */
export const LEGISLATIVE_CHAMBER_PRODUCTION_SCENE: EnvironmentSceneSpec = {
  environment_id: "environment:legislative-chamber-floor:ocd-master:v1",
  scene_id: "legislative-chamber-production",
  family_id: "legislative-chamber",
  label: "A legislative chamber floor",
  presentation_status: "production",
  fidelity_tier: "F4",
  coordinate_system: "plate-normalized",
  units: "plate-percent",

  plate: { width: 1408, height: 768 },

  /**
   * Horizontal focus stays centred because this room's content genuinely runs
   * wall to wall: the member desks fill the left half and the rostrum the
   * right, and a crop that favours either loses the half that explains the
   * other. Vertical focus is low; the coffered ceiling is the first thing
   * worth losing.
   */
  camera_policy: {
    minimum_aspect_ratio: 1.5,
    maximum_aspect_ratio: 12 / 5,
    horizontal_focus: 0.5,
    vertical_focus: 0.7,
  },

  /**
   * What survives every supported aspect. At 1.5 the plate loses 256 columns
   * and keeps x 128..1280; at 2.4 it keeps 586 rows, taken from y 182 down.
   */
  safe_area: { x: 128, y: 182, width: 1152, height: 586 },

  /**
   * The member seating, the open well floor, the rostrum and the near desk
   * edge: measured at x 10%-91%, y 39%-100%, held inside the safe area.
   */
  essential_content_area: { x: 140, y: 300, width: 1140, height: 468 },

  ui_safe_zones: [
    { id: "lower-shell", edge: "bottom-left", width: 620, height: 120 },
    { id: "navigation-flyout", edge: "top-left", width: 320, height: 300 },
  ],

  raster: {
    asset_id: "env_legislative_chamber_floor_5632x3072_v1",
    tiers: [
      {
        width: 1408,
        height: 768,
        path: "art/families/legislative-chamber/env_legislative_chamber_floor_v1.png",
        hash: "ed0d0b9cdf433fbaea959967645568cdebda5d46aec8d6b62c8e6cd0c6ff8728",
        derivation: "deterministic-downscale",
      },
      {
        width: 2816,
        height: 1536,
        path: "art/families/legislative-chamber/env_legislative_chamber_floor_runtime_2x_v1.png",
        hash: "184a68b7a82a3fef6e0167cde0ceb3b373484253ddd6185265c89e254a52c493",
        derivation: "deterministic-downscale",
      },
    ],
  },

  anchors: [
    {
      /**
       * The open wooden floor of the well, clear of every desk and of the
       * rostrum steps. Floor contact read where the boards meet the near desk
       * run.
       */
      id: "well-floor-standing",
      type: "standing-person",
      kind: "floor-standing",
      x_percent: 60,
      z_order: 2,
      footprint_percent: 16,
      allowed_pose_families: ["standing-neutral", "standing-conversational"],
      permitted_facings: ["front"],
      floor_contact: { floor_y_percent: 92, max_foot_spread_percent: 9 },
    },
    {
      /**
       * Behind the lectern on the rostrum. The contact line here is the DECK
       * of the raised platform, not the chamber floor, read where the lectern
       * base meets it — a person standing here stands above the well, and
       * treating the well floor as their contact would sink them into it.
       */
      id: "rostrum-lectern-standing",
      type: "standing-person",
      kind: "floor-standing",
      x_percent: 83,
      z_order: 1,
      footprint_percent: 10,
      allowed_pose_families: ["standing-podium-or-lectern", "standing-neutral"],
      permitted_facings: ["front"],
      floor_contact: { floor_y_percent: 58, max_foot_spread_percent: 6 },
    },
  ],

  foreground_occlusion_objects: [
    {
      /** The near member desk, which everything in the well is seen past. */
      id: "near-member-desk",
      type: "furniture-foreground",
      z_order: 6,
      region_percent: {
        x_percent: 0,
        y_percent: 60,
        width_percent: 56,
        height_percent: 40,
      },
    },
    {
      /** The stone-fronted block at the base of the rostrum. */
      id: "rostrum-front-block",
      type: "furniture-foreground",
      z_order: 4,
      region_percent: {
        x_percent: 63,
        y_percent: 56,
        width_percent: 17,
        height_percent: 26,
      },
    },
  ],

  surface_slots: [
    {
      slot_id: "chamber-desk-monitor",
      kind: "monitor-or-screen",
      rect_percent: {
        x_percent: 32.5,
        y_percent: 60,
        width_percent: 12,
        height_percent: 17,
      },
      z_order: 7,
      allowed_content_classes: [
        "bill-number",
        "bill-title",
        "vote-tally",
        "document-body",
      ],
      information_access: "institutional-working",
      fallback_decoration: "a dark screen with no interface drawn on it",
    },
    {
      slot_id: "chamber-desk-papers",
      kind: "desk-document",
      rect_percent: {
        x_percent: 20,
        y_percent: 74,
        width_percent: 14,
        height_percent: 8,
      },
      z_order: 7,
      allowed_content_classes: ["document-body", "bill-title"],
      information_access: "institutional-working",
      fallback_decoration: "two blank sheets lying on the desk",
    },
    {
      slot_id: "rostrum-lectern-notes",
      kind: "podium-speech-notes",
      rect_percent: {
        x_percent: 79,
        y_percent: 42,
        width_percent: 8,
        height_percent: 4,
      },
      z_order: 5,
      allowed_content_classes: ["document-body"],
      information_access: "institutional-working",
      fallback_decoration: "an empty reading surface",
    },
  ],

  explicit_unknowns: [
    "No floor calibration pair and no standard body width are declared. This room's floor IS planked, but the planks run along the view axis rather than across it, so they give a vanishing direction and not a depth scale. The other repeating unit — the member chairs — sits on TIERED rows whose bases are not coplanar, so the two-depth solve that calibrated the workroom cannot be run here without assuming a flat floor the room does not have.",
    "Both anchor contacts are visual estimates read off this plate where an object visibly meets the surface it stands on.",
    "The rostrum anchor's contact is the raised platform deck at 58%, NOT the chamber floor. Any future perspective ramp for this room has to carry that step, or a speaker at the lectern will be placed as though standing in the well.",
    "No seat anchor is declared. Every member chair is behind a desk on a tiered row, and the presiding chair on the rostrum is seen at an angle with its cushion hidden, so no seat plane can be measured from this raster.",
    "Neither occluder region has an authored alpha mask, because no production body renders behind them yet.",
    "Nothing in this room identifies a jurisdiction, and the scene claims none. Binding it to a chamber, a session or a place is canonical world work.",
  ],
};
