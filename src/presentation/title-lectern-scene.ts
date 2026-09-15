import { CIVIC_COMMUNITY_MEETING_TITLE_SCENE } from "../environment/scenes/civic-community-meeting-title-production";
import { registerScene } from "./scene-registry";
import type { RuntimeVisualLibrary } from "./visual-integration";
import { TITLE41_CORRECTED_URL as correctedUrl } from "./title41-private-inputs";

const width = 1672,
  height = 941;
const percent = ([x, y]: readonly number[]) => ({
  x: (x! / width) * 100,
  y: (y! / height) * 100,
});
/** Actual corrected file, visual estimates in its own pixel space. No physical ruler. */
export const TITLE_LECTERN_SCENE = registerScene({
  ...CIVIC_COMMUNITY_MEETING_TITLE_SCENE,
  scene_id: "title41-community-portrait",
  environment_id: "environment:title41:community-portrait",
  label: "A community hall",
  plate: { width, height },
  camera_policy: {
    minimum_aspect_ratio: 1.3,
    maximum_aspect_ratio: 2.4,
    horizontal_focus: 0.35,
    vertical_focus: 0.5,
  },
  safe_area: { x: 0, y: 0, width, height },
  essential_content_area: { x: 200, y: 40, width: 700, height: 880 },
  raster: {
    asset_id: "title41-corrected-audience",
    tiers: [
      {
        width,
        height,
        path: "art/authoring/title41/inputs/corrected-audience.png",
        hash: "f0491da97647b490c447396b3868f3bd806a7ceb8b61695cc056da3e2894dde7",
        derivation: "native-master",
      },
    ],
  },
  anchors: [
    {
      id: "title41-speaker",
      type: "standing-person",
      kind: "floor-standing",
      x_percent: 25,
      z_order: 1,
      footprint_percent: 40,
      allowed_pose_families: ["standing-podium-or-lectern"],
      permitted_facings: ["rear-three-quarter-right"],
      floor_contact: { floor_y_percent: 85, max_foot_spread_percent: 20 },
    },
  ],
  foreground_occlusion_objects: [
    {
      id: "title41-lectern",
      type: "furniture-foreground",
      z_order: 5,
      plate_clip: {
        confidence: "visual-estimate",
        method_note:
          "Vertices traced from corrected 1672x941 owner source; physical dimensions unknown.",
        points: [
          [370, 375],
          [560, 304],
          [675, 323],
          [675, 345],
          [614, 367],
          [614, 867],
          [670, 880],
          [671, 908],
          [492, 932],
          [405, 864],
          [406, 844],
          [447, 835],
          [447, 405],
          [370, 392],
        ].map(percent),
      },
    },
  ],
  surface_slots: [],
  explicit_unknowns: [
    "All contacts and occluder vertices are visual estimates measured from corrected source 1SBz4LrIX2XSJrsDprorQ7P8tjNZMCYY0. Physical dimensions and camera calibration are unknown.",
    "Private, labeled title portrait; no meeting attendance, speech, office or history is asserted.",
    "Corrected source is 1672x941. Native detail provenance beyond supplied pixels and rights remain unknown. No upscale or synthetic higher tier.",
  ],
});
export const TITLE_LECTERN_VISUALS: RuntimeVisualLibrary = new Map(
  correctedUrl
    ? [
        [
          "title41-corrected-audience",
          {
            assetId: "title41-corrected-audience",
            finalPath: "art/authoring/title41/inputs/corrected-audience.png",
            hash: "f0491da97647b490c447396b3868f3bd806a7ceb8b61695cc056da3e2894dde7",
            url: correctedUrl,
            tierLadder: TITLE_LECTERN_SCENE.raster!.ladder,
            tierUrls: new Map([[width, correctedUrl]]),
          },
        ],
      ]
    : [],
);
