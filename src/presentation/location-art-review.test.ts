import { describe, it, expect } from "vitest";
import {
  locationReviewVisuals,
  LOCATION_REVIEW_ASSET_IDS,
} from "./location-art-review";
import { PRODUCTION_VISUAL_LIBRARY } from "./visual-integration";
import { PRESS_BRIEFING_ROOM_CANDIDATE_SCENE } from "../environment/scenes/press-briefing-room-candidate";
import { validateEnvironmentSceneSpec } from "../environment/environment-scene-spec";
import { scenePlateClips } from "./scene-occlusion";
import { requireScene, SCENE_REGISTRY } from "./scene-registry";
import { SCENE_VENUES } from "./scene-venues";
import manifest from "../../art/manifest/asset_manifest.json";

describe("G finite location candidate lift", () => {
  it("never admits the reviewed assets to production or changes their manifest status", () => {
    const before = JSON.stringify(manifest);
    const production = locationReviewVisuals(false);
    const review = locationReviewVisuals(true);
    expect(production).toBe(PRODUCTION_VISUAL_LIBRARY);
    for (const id of LOCATION_REVIEW_ASSET_IDS) {
      expect(production.has(id)).toBe(false);
      expect(review.has(id)).toBe(true);
      expect(
        manifest.assets.find((a) => a.asset_id === id)?.runtime_release_status,
      ).toBe("unreleased");
    }
    expect(JSON.stringify(manifest)).toBe(before);
    expect(review.has("env_executive_office_candidate_5504x3072_v1")).toBe(
      false,
    );
  });
  it("keeps press engineering separate from a canonical venue and uses an image-space silhouette", () => {
    expect(
      validateEnvironmentSceneSpec(PRESS_BRIEFING_ROOM_CANDIDATE_SCENE).errors,
    ).toEqual([]);
    const scene = requireScene(SCENE_REGISTRY, "press-briefing-room-candidate");
    expect(scene.presentationStatus).toBe("development-fixture");
    expect(SCENE_VENUES.some((venue) => venue.sceneId === scene.sceneId)).toBe(
      false,
    );
    expect(scene.floorCalibration).toBeNull();
    expect(scenePlateClips(scene)).toHaveLength(1);
    expect(scene.anchors.has("lectern-speaker")).toBe(true);
  });
});
