import { describe, expect, it } from "vitest";
import { releasedSceneOccluders, scenePlateClips } from "./scene-occlusion";
import { CIVIC_COMMUNITY_MEETING_ROOM_SCENE } from "../environment/scenes/civic-community-meeting-room-production";
import { validateEnvironmentSceneSpec } from "../environment/environment-scene-spec";
import {
  OFFICE_FIXTURE_SCENE_ID,
  PRODUCTION_OFFICE_SCENE_ID,
  SCENE_REGISTRY,
} from "./scene-registry";

describe("scene backdrop alpha admission", () => {
  it("retains authored lectern clip geometry and rejects ambiguous or malformed clips", () => {
    expect(
      validateEnvironmentSceneSpec(CIVIC_COMMUNITY_MEETING_ROOM_SCENE).valid,
    ).toBe(true);
    const scene = SCENE_REGISTRY.scenes.get("civic-community-meeting-room")!;
    expect(scenePlateClips(scene)[0]?.clipPath).toContain("polygon(");
    expect(scenePlateClips(scene)[0]?.zOrder).toBe(5);
    for (const bad of [
      {
        points: [{ x: 0, y: 0 }],
        confidence: "visual-estimate",
        method_note: "test",
      },
      {
        points: [
          { x: 0, y: 0 },
          { x: 101, y: 0 },
          { x: 0, y: 1 },
        ],
        confidence: "visual-estimate",
        method_note: "test",
      },
    ]) {
      expect(
        validateEnvironmentSceneSpec({
          ...CIVIC_COMMUNITY_MEETING_ROOM_SCENE,
          foreground_occlusion_objects: [
            { id: "invalid", type: "test", plate_clip: bad },
          ],
        }).valid,
      ).toBe(false);
    }
    const clip =
      CIVIC_COMMUNITY_MEETING_ROOM_SCENE.foreground_occlusion_objects![0]!;
    expect(
      validateEnvironmentSceneSpec({
        ...CIVIC_COMMUNITY_MEETING_ROOM_SCENE,
        foreground_occlusion_objects: [{ ...clip, asset_id: "ambiguous-mask" }],
      }).valid,
    ).toBe(false);
  });
  it("carries the existing released desk alpha and its authored depth", () => {
    const layers = releasedSceneOccluders(
      SCENE_REGISTRY.scenes.get(OFFICE_FIXTURE_SCENE_ID)!,
    );
    expect(layers.map(({ id, zOrder }) => ({ id, zOrder }))).toEqual([
      { id: "desk-front", zOrder: 4 },
    ]);
    expect(layers[0]!.asset.url).toBeTruthy();
  });
  it("does not turn coarse bounds, absent art or candidate assets into opaque masks", () => {
    expect(
      releasedSceneOccluders(
        SCENE_REGISTRY.scenes.get(PRODUCTION_OFFICE_SCENE_ID)!,
      ),
    ).toEqual([]);
    expect(
      releasedSceneOccluders(
        SCENE_REGISTRY.scenes.get(OFFICE_FIXTURE_SCENE_ID)!,
        new Map(),
      ),
    ).toEqual([]);
    expect(releasedSceneOccluders(null)).toEqual([]);
  });
});
