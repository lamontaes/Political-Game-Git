import type { EnvironmentSceneSpec } from "../environment-scene-spec";

/** Exact 18E-R1A Drive ID 1SPvoi-0L7T4mK156yFg1dpOW82ggb4J6 / IMG_5202.
 * Existing AX-92B1 intake; unverified native detail and unknown rights.
 * Review-only image-space geometry, not physical measurements or attendance.
 */
export const PRESS_BRIEFING_ROOM_CANDIDATE_SCENE: EnvironmentSceneSpec = {
  environment_id: "environment:press-briefing-room:candidate:v1",
  scene_id: "press-briefing-room-candidate",
  family_id: "press-briefing-room",
  label: "A press briefing room (candidate)",
  presentation_status: "development-fixture",
  fidelity_tier: "F4",
  coordinate_system: "plate-normalized",
  units: "plate-percent",
  plate: { width: 1376, height: 768 },
  camera_policy: {
    minimum_aspect_ratio: 1.5,
    maximum_aspect_ratio: 2.4,
    horizontal_focus: 0.5,
    vertical_focus: 0.65,
  },
  safe_area: { x: 96, y: 120, width: 1184, height: 648 },
  essential_content_area: { x: 350, y: 160, width: 950, height: 540 },
  raster: {
    asset_id: "env_press_briefing_room_candidate_v1",
    tiers: [
      {
        width: 1376,
        height: 768,
        path: "art/families/press-briefing-room/env_press_briefing_room_candidate_v1-1376.png",
        hash: "f36ddf9b0161e182711c3496adbc5e678a5864e382322b0a1b9d1a96fa00e4f8",
        derivation: "deterministic-downscale",
      },
      {
        width: 2752,
        height: 1536,
        path: "art/families/press-briefing-room/env_press_briefing_room_candidate_v1-2752.png",
        hash: "9ba4ba3e5eea2dddcbdc70a15b4a3a4f3c87fea6553c32e528d29f835e2986a5",
        derivation: "deterministic-downscale",
      },
    ],
  },
  anchors: [
    {
      id: "lectern-speaker",
      type: "standing-person",
      kind: "floor-standing",
      x_percent: 69,
      z_order: 2,
      footprint_percent: 7.5,
      allowed_pose_families: ["standing-neutral", "standing-podium-or-lectern"],
      permitted_facings: ["front"],
      floor_contact: { floor_y_percent: 59, max_foot_spread_percent: 5 },
    },
    {
      id: "stage-side-standing",
      type: "standing-person",
      kind: "floor-standing",
      x_percent: 86,
      z_order: 2,
      footprint_percent: 7.5,
      allowed_pose_families: ["standing-neutral", "standing-listening"],
      permitted_facings: ["front"],
      floor_contact: { floor_y_percent: 59, max_foot_spread_percent: 5 },
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
          "Silhouette traced against IMG_5202: wooden reading board and front panel; excludes microphone and shadow. Plate percentages, review only, edge uncertainty roughly 3 pixels at 1376px.",
        points: [
          { x: 64.7, y: 36.6 },
          { x: 71.3, y: 36.8 },
          { x: 74.1, y: 40.2 },
          { x: 73.2, y: 40.7 },
          { x: 72.9, y: 58.1 },
          { x: 71.3, y: 60.5 },
          { x: 65.1, y: 59.3 },
          { x: 65.1, y: 38.4 },
          { x: 64.7, y: 37.6 },
        ],
      },
    },
  ],
  surface_slots: [
    {
      slot_id: "briefing-screen",
      kind: "monitor-or-bulletin-board",
      rect_percent: {
        x_percent: 27,
        y_percent: 18,
        width_percent: 11,
        height_percent: 14,
      },
      z_order: 0,
      allowed_content_classes: ["headline", "document-body"],
      information_access: "public-record",
      fallback_decoration: "a blank wall screen",
    },
    {
      slot_id: "lectern-nameplate",
      kind: "office-nameplate",
      rect_percent: {
        x_percent: 66,
        y_percent: 39,
        width_percent: 4.7,
        height_percent: 5.3,
      },
      z_order: 6,
      allowed_content_classes: ["jurisdiction-name"],
      information_access: "public-record",
      fallback_decoration: "a blank lectern panel",
    },
  ],
  explicit_unknowns: [
    "No floor calibration or standard body width is established. Every anchor, contact and silhouette is a visual-estimate read from the source; no physical dimensions are asserted.",
    "Native detail is unverified in AX-92B1; deterministic downscales preserve this uncertainty and do not establish native fidelity.",
    "Owner visual, floor-plane and rights acceptance are pending. This room is not released and has no canonical press activity/location producer.",
    "Seated attendees are not authored: cushions are occluded and no source-grounded seat-to-floor pair is established. Rows of empty chairs are decor, never attendance evidence.",
    "This press room is not a hearing room, courtroom, school or chamber.",
  ],
};
