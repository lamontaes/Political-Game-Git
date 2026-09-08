import type { EnvironmentSceneSpec } from "../environment-scene-spec";

/**
 * A civic community meeting room, authored as the game's first PRODUCTION
 * title tableau.
 *
 * PRODUCTION ART. Its raster is the owner-approved title master
 * `PG_TITLE_BG_COMMUNITY_MEETING_HERO_SLOT_02_5504x3072.png`, preserved
 * byte-for-byte under `art/references/masters/scene-environment/` and carried
 * into the runtime as two deterministic Lanczos-3 DOWNSCALES. Nothing here
 * enlarged anything.
 *
 * WHY THIS ROOM IS THE NEUTRAL TITLE. It is a generic public meeting hall: a
 * lectern, folding chairs, an attentive audience, and no seal, no map, no
 * jurisdiction and no readable word anywhere in it. That is what lets it stand
 * behind the title of a game whose character has not been chosen yet. It is
 * NOT a committee room — it has no dais, no member bench and no witness table
 * — and it is not a private room, so it is never offered to domestic or
 * bilateral consumers.
 *
 * THE AUDIENCE IS PAINTED INTO THE PLATE. Roughly fourteen people are baked
 * into the right two thirds. They are decor, not characters: no anchor is
 * declared on any of their chairs, because a runtime sprite cannot occupy a
 * seat that already has somebody in it. The two anchors below are the two
 * places a person could actually stand.
 */
export const CIVIC_COMMUNITY_MEETING_TITLE_SCENE: EnvironmentSceneSpec = {
  environment_id: "environment:civic-community-meeting:title-hero-slot:v1",
  scene_id: "civic-community-meeting-title",
  family_id: "civic-community-meeting",
  label: "A community meeting, before it starts",
  presentation_status: "production",
  fidelity_tier: "F4",
  coordinate_system: "plate-normalized",
  units: "plate-percent",

  /**
   * The quarter-scale tier, an exact 1/4 of the 5504x3072 master in both axes,
   * so a percentage lands on the same feature in either tier.
   */
  plate: { width: 1376, height: 768 },

  /**
   * Focus is the subject, and the subject of this plate is the lectern at
   * x 22%-40%, not the middle of the room. On a wide screen the difference is
   * ten pixels; on a tall one, where a backdrop crops to a narrow vertical
   * slice, it is the difference between showing the lectern and showing the
   * front row's knees. Vertical focus is low because the top fifth is blank
   * wall and it is the first thing worth losing.
   */
  camera_policy: {
    minimum_aspect_ratio: 1.5,
    maximum_aspect_ratio: 12 / 5,
    horizontal_focus: 0.32,
    vertical_focus: 0.72,
  },

  /**
   * What survives every supported aspect under the focus above. At 1.5 the
   * plate loses 224 columns and keeps x 72..1224; at 2.4 it keeps 573 rows,
   * taken from y 195 down because the ceiling band carries nothing.
   */
  safe_area: { x: 72, y: 195, width: 1152, height: 573 },

  /**
   * The lectern, the front rows and the floor they sit on: measured at
   * x 21%-92%, y 32.5%-100%, held inside the safe area.
   */
  essential_content_area: { x: 290, y: 250, width: 974, height: 518 },

  ui_safe_zones: [
    { id: "lower-shell", edge: "bottom-left", width: 620, height: 120 },
    /** The blank wall the game's own title is set over. */
    { id: "title-block", edge: "top-left", width: 480, height: 260 },
  ],

  raster: {
    asset_id: "title_bg_civic_community_meeting_hero_slot_5504x3072_v1",
    tiers: [
      {
        width: 1376,
        height: 768,
        path: "art/families/civic-community-meeting/title_bg_civic_community_meeting_hero_slot_v1.png",
        hash: "7f40aaba49683ed011d57ff91f4bd3b202fdd39b941ab59e70b299337f7063e6",
        derivation: "deterministic-downscale",
      },
      {
        width: 2048,
        height: 1143,
        path: "art/families/civic-community-meeting/title_bg_civic_community_meeting_hero_slot_runtime_2048_v1.png",
        hash: "a1c6ed73a06ab71cd82ab9fa98f9f39228a4ffe74bbf4f8870d1d33fb55a2527",
        derivation: "deterministic-downscale",
      },
    ],
  },

  /**
   * NO floor calibration and NO standard body width. Both are refusals, not
   * omissions: this room's floor is plain carpet with no repeating unit to
   * measure, so there is no ruler in the picture and a near/far scale pair
   * would be a guess dressed as a measurement. The ingest manifest that
   * approved this master says the same — the calibration pair stays UNRESOLVED
   * until a compositor proof can be run against real body art, and no such art
   * exists. Until then this plate is a backdrop, and the runtime says so.
   */

  anchors: [
    {
      /**
       * Behind the lectern. The floor line is ESTIMATED: the lectern hides the
       * point where a speaker's feet would meet the floor, so it is read from
       * where the surrounding floor passes behind the lectern's base, not seen
       * directly.
       */
      id: "podium-speaker",
      type: "standing-person",
      kind: "floor-standing",
      x_percent: 31,
      z_order: 1,
      footprint_percent: 14,
      allowed_pose_families: ["standing-podium-or-lectern", "standing-neutral"],
      permitted_facings: ["front"],
      floor_contact: { floor_y_percent: 76, max_foot_spread_percent: 7 },
    },
    {
      /** Open floor stage-left of the lectern, clear of every chair. */
      id: "stage-left-standing",
      type: "standing-person",
      kind: "floor-standing",
      x_percent: 10,
      z_order: 2,
      footprint_percent: 12,
      allowed_pose_families: ["standing-neutral", "standing-listening"],
      permitted_facings: ["front"],
      floor_contact: { floor_y_percent: 84, max_foot_spread_percent: 8 },
    },
  ],

  foreground_occlusion_objects: [
    {
      /**
       * The lectern stands between the camera and anyone speaking at it.
       * Declared without an alpha, because nothing renders behind it yet.
       */
      id: "lectern-front",
      type: "furniture-foreground",
      z_order: 5,
      region_percent: {
        x_percent: 22,
        y_percent: 33,
        width_percent: 18,
        height_percent: 63,
      },
    },
  ],

  surface_slots: [
    {
      /** Blank wall left of the lectern; the one place a banner reads. */
      slot_id: "meeting-hall-banner",
      kind: "title-banner-safe",
      rect_percent: {
        x_percent: 3,
        y_percent: 8,
        width_percent: 34,
        height_percent: 22,
      },
      z_order: 0,
      allowed_content_classes: [
        "jurisdiction-name",
        "campaign-name",
        "headline",
      ],
      information_access: "public-record",
      fallback_decoration: "bare painted wall",
    },
    {
      /** The lectern's front panel, where a placard or seal would hang. */
      slot_id: "lectern-placard",
      kind: "podium-placard",
      rect_percent: {
        x_percent: 25.5,
        y_percent: 47,
        width_percent: 11,
        height_percent: 13,
      },
      z_order: 6,
      allowed_content_classes: [
        "jurisdiction-seal",
        "jurisdiction-name",
        "campaign-name",
      ],
      civic_symbol_policy: "canonical-source-only",
      information_access: "public-record",
      fallback_decoration: "plain wood, with nothing hung on it",
    },
    {
      /** The reading surface, seen almost edge-on. */
      slot_id: "lectern-notes",
      kind: "podium-speech-notes",
      rect_percent: {
        x_percent: 26,
        y_percent: 33,
        width_percent: 10,
        height_percent: 4,
      },
      z_order: 6,
      allowed_content_classes: ["document-body"],
      information_access: "public-record",
      fallback_decoration: "an empty reading surface",
    },
  ],

  explicit_unknowns: [
    "No floor calibration pair and no standard body width are declared. This room's floor is plain carpet with no repeating unit, so the plate contains no ruler; the approving ingest manifest lists the calibration pair as UNRESOLVED until a character compositor proof exists, and none can be run because no production body art exists.",
    "The podium speaker's floor line is an ESTIMATE. The lectern hides the contact point; 76% is read from where the floor passes behind the lectern base, and the manifest that approved this master records the same number as an estimate with a plus-or-minus of about two points.",
    "Roughly fourteen audience members are painted into the plate. They are decor and no anchor is declared on their chairs, because a runtime sprite cannot sit where somebody is already drawn sitting.",
    "The two empty folding chairs at the left edge are cropped by the frame and their seat planes are not declared, rather than being given plausible numbers.",
    "The lectern occluder region is declared without an authored alpha mask, because no production body renders behind it yet.",
    "This plate is an external upscale to 5504x3072 from a 2048-wide pass. Both runtime tiers are reductions, so each declares its own pixel width as its detail width; nothing above 2048 was ever asked for, so neither tier declares a detail shortfall.",
  ],
};
