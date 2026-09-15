import { describe, expect, it } from "vitest";
import {
  placeSourceScenePose,
  type SourceScenePose,
} from "./scene-source-pose";
import {
  requireScene,
  requireSceneAnchor,
  SCENE_REGISTRY,
} from "./scene-registry";

const scene = requireScene(
  SCENE_REGISTRY,
  "residence-apartment-living-canonical-03",
);
const sofa = requireSceneAnchor(scene, "sofa-seated");
// Synthetic contact fixture; these are not source-art measurements.
const pose: SourceScenePose = {
  variantId: "test-only",
  pose: "seated-guest-neutral",
  facing: "front",
  canvas: { width: 600, height: 1200 },
  contacts: {
    crown: { x: 300, y: 60 },
    seatedPelvis: { x: 300, y: 620 },
    leftFoot: { x: 180, y: 970 },
    rightFoot: { x: 420, y: 970 },
  },
  alphaBounds: { x: 100, y: 60, width: 400, height: 910 },
  layers: [
    {
      assetId: "test-pose",
      kind: "body",
      layer: 1,
      url: "fixture",
      x: 0,
      y: 0,
      width: 600,
      height: 1200,
    },
  ],
};

describe("source pose scene contacts", () => {
  it("lands the same pelvis and both soles on their planes with a uniform scale", () => {
    const result = placeSourceScenePose(
      scene,
      sofa,
      "fixture",
      "fixture",
      pose,
    )!;
    expect(result.placement.seatedPelvisMarker?.yPercent).toBeCloseTo(59.7);
    for (const foot of result.placement.floorContactMarkers)
      expect(foot.yPercent).toBeCloseTo(79);
    const { widthPercent, heightPercent } = result.placement.box;
    expect((widthPercent * scene.plate.width) / pose.canvas.width).toBeCloseTo(
      (heightPercent * scene.plate.height) / pose.canvas.height,
    );
    expect(result.placement.diagnostics).toEqual([]);
  });
  it("uses visible paint for clearance, and padding cannot change the person", () => {
    const a = placeSourceScenePose(scene, sofa, "fixture", "fixture", pose)!;
    const b = placeSourceScenePose(scene, sofa, "fixture", "fixture", {
      ...pose,
      canvas: { width: 1000, height: 1600 },
      contacts: Object.fromEntries(
        Object.entries(pose.contacts).map(([id, p]) => [
          id,
          { x: p.x + 200, y: p.y + 200 },
        ]),
      ) as unknown as SourceScenePose["contacts"],
      alphaBounds: { ...pose.alphaBounds, x: 300, y: 260 },
    })!;
    expect(b.bounds.leftPercent).toBeCloseTo(a.bounds.leftPercent);
    expect(b.bounds.topPercent).toBeCloseTo(a.bounds.topPercent);
    expect(b.bounds.widthPercent).toBeCloseTo(a.bounds.widthPercent);
    expect(b.sourcePixelScale).toBeCloseTo(a.sourcePixelScale);
  });
  it("refuses a missing seat span and reports an incompatible facing", () => {
    expect(
      placeSourceScenePose(scene, sofa, "fixture", "fixture", {
        ...pose,
        contacts: { ...pose.contacts, seatedPelvis: undefined },
      }),
    ).toBeNull();
    const workroom = requireScene(
      SCENE_REGISTRY,
      "shared-workroom-office-production",
    );
    const chair = requireSceneAnchor(workroom, "left-task-chair");
    const result = placeSourceScenePose(
      workroom,
      chair,
      "fixture",
      "fixture",
      pose,
    )!;
    expect(
      result.placement.diagnostics.some(
        (d) => d.code === "facing-not-permitted-at-anchor",
      ),
    ).toBe(true);
  });
});
