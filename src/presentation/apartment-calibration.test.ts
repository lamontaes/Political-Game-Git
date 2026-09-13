import { describe, expect, it } from "vitest";
import { SCENE_REGISTRY, requireScene } from "./scene-registry";
import {
  placeSubjectAtAnchor,
  resolvePerspectiveScale,
} from "./scene-placement";
import { scenePlateClips } from "./scene-occlusion";

describe("authored canonical apartment standing calibration", () => {
  const scene = requireScene(
    SCENE_REGISTRY,
    "residence-apartment-living-canonical-03",
  );
  it("keeps differently proportioned standing canvases on the floor without a second depth scale", () => {
    for (const id of ["living-room-floor-standing", "entry-side-standing"]) {
      const anchor = scene.anchors.get(id)!;
      for (const width of [800, 1024]) {
        const placed = placeSubjectAtAnchor(scene, anchor, {
          id: `contact-${width}`,
          bodyCanvas: { width, height: 1920 },
          root: { x: 0.5, y: 0.5 },
          contacts: {
            leftFoot: { x: 0.4, y: 0.97 },
            rightFoot: { x: 0.6, y: 0.97 },
          },
          bodyFamily: "standing-review",
          poseFamily: "standing-neutral",
          facing: "front",
          referenceWidthPercent: scene.standardBodyWidthPercent!,
        });
        expect(placed.diagnostics).toEqual([]);
        expect(
          Math.max(...placed.floorContactMarkers.map((p) => p.yPercent)),
        ).toBeCloseTo(anchor.contactFloorYPercent);
        expect(placed.box.widthPercent).toBeCloseTo(
          scene.standardBodyWidthPercent! *
            resolvePerspectiveScale(scene, anchor.contactFloorYPercent),
        );
        expect(placed.box.topPercent).toBeGreaterThan(20);
      }
    }
  });
  it("does not transplant calibration to the unsupported second apartment or turn debug rectangles into masks", () => {
    const second = requireScene(
      SCENE_REGISTRY,
      "residence-apartment-living-ordinary-02",
    );
    expect(second.floorCalibration).toBeNull();
    expect(second.standardBodyWidthPercent).toBeNull();
    expect(scene.spec.explicit_unknowns?.join(" ")).toContain(
      "authored image-space visual-estimate",
    );
    const clips = scenePlateClips(scene);
    expect(clips).toHaveLength(3);
    expect(
      scene.anchors.get("living-room-floor-standing")!.zOrder,
    ).toBeGreaterThan(Math.max(...clips.map((c) => c.zOrder)));
    expect(scene.anchors.get("entry-side-standing")!.zOrder).toBeLessThan(
      Math.min(...clips.map((c) => c.zOrder)),
    );
  });
});
