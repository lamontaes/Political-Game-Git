import type { EnvironmentSceneSpec } from "../environment-scene-spec";

/** Gameplay framing of the existing community-hall plate.
 * Baked audience figures are anonymous decor, never canonical participants.
 * Contacts and slots retain the accepted title plate's image-space estimates.
 * Body-scale calibration remains unknown. A visual-estimate vector silhouette
 * now clips the existing painted lectern; no source pixels are replaced.
 */
export const CIVIC_COMMUNITY_MEETING_ROOM_SCENE: EnvironmentSceneSpec = {
  environment_id: "environment:civic-community-meeting:public-room:v1",
  scene_id: "civic-community-meeting-room",
  family_id: "civic-community-meeting",
  label: "A public meeting room",
  presentation_status: "production",
  fidelity_tier: "F4",
  coordinate_system: "plate-normalized",
  units: "plate-percent",

  plate: { width: 1376, height: 768 },

  camera_policy: {
    minimum_aspect_ratio: 1.5,
    maximum_aspect_ratio: 12 / 5,
    horizontal_focus: 0.45,
    vertical_focus: 0.72,
  },

  safe_area: { x: 112, y: 195, width: 1152, height: 573 },
  /** The lectern, the front rows and the floor they sit on. */
  essential_content_area: { x: 290, y: 250, width: 974, height: 518 },

  /**
   * Only the shell. No title block: nothing is set over this room in play, and
   * a reserved band that nothing occupies is a crop that costs a third of the
   * room for a caption that is not there.
   */
  ui_safe_zones: [
    { id: "lower-shell", edge: "bottom-left", width: 620, height: 120 },
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

  anchors: [
    {
      /** Behind the lectern. Floor line estimated; see the title scene. */
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
      /** Open floor left of the lectern, clear of every chair. */
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
      id: "lectern-front",
      type: "furniture-foreground",
      z_order: 5,
      plate_clip: {
        confidence: "visual-estimate",
        method_note:
          "ENV-FINISH4 authored image-space silhouette traced against the released 1376x768 tier: lectern reading board, wooden stem and base. Points are plate percentages converted from inspected pixels, not physical measurements. Microphone and soft floor shadow are excluded. Edge uncertainty approximately 3 pixels at this tier; no changes to source art or native-detail lineage.",
        points: [
          { x: 22.1657, y: 39.974 },
          { x: 33.3576, y: 32.4219 },
          { x: 40.3343, y: 34.375 },
          { x: 40.3343, y: 36.7188 },
          { x: 36.7006, y: 39.4531 },
          { x: 36.7733, y: 92.5781 },
          { x: 40.1163, y: 94.0104 },
          { x: 40.1163, y: 96.4844 },
          { x: 29.4331, y: 98.8281 },
          { x: 24.2733, y: 92.4479 },
          { x: 24.2733, y: 89.974 },
          { x: 26.7442, y: 89.3229 },
          { x: 26.7442, y: 43.8802 },
          { x: 22.1657, y: 41.6667 },
        ],
      },
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
    "This scene shares its raster and tier ladder with civic-community-meeting-title. No floor calibration pair or standard body width is established. The podium floor line remains estimated; painted audience chairs and cropped left-edge chairs have no canonical seats. The gameplay lectern uses an explicitly authored image-space vector clip; the microphone and soft shadow are not masked.",
    "This plate is an external upscale to 5504x3072 from a 2048-wide pass. The inherited tier declarations are preserved; reduction does not establish native source detail.",
    "This is a generic public meeting hall. It names no jurisdiction and depicts no real room. Which meeting of which body it is standing for is canonical world truth supplied by the caller and is never read off the picture.",
  ],
};
