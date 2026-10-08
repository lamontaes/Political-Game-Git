import { describe, expect, it } from "vitest";
import staging from "../../art/backdrops/staging.json" with { type: "json" };
import surfaces from "../../art/backdrops/surfaces.json" with { type: "json" };
import { BODY_POSES } from "./appearance-engine/pack";
import { spotPose, spotView, type SpotFacing } from "./backdrop-people";
import { SCENE_REGISTRY } from "./scene-registry";

// Staging is the source of truth for room people and their painted surfaces.
const expectedViews: Record<SpotFacing, string> = {
  viewer: "front",
  left: "three-quarter",
  right: "three-quarter",
  away: "back",
};

describe("one staging slot contract", () => {
  it("maps each staging facing to its required view and keeps lean as a pose", () => {
    const facingGaps = Object.entries(expectedViews)
      .map(([facing, expected]) => ({
        facing,
        expected,
        actual: spotView({ x: 50, y: 75, facing: facing as SpotFacing }),
      }))
      .filter(({ expected, actual }) => expected !== actual);
    expect(facingGaps).toEqual([]);
    expect(BODY_POSES).toContain("lean");
    expect(
      spotPose({ x: 50, y: 75, pose: "lean" }, "idle", "slot-contract"),
    ).toBe("lean");
  });

  it("declares every staged place in the surface registry", () => {
    const missing = Object.keys(staging.places).filter(
      (place) => !Object.hasOwn(surfaces.places, place),
    );
    process.stdout.write(
      `Slot surface coverage: ${Object.keys(staging.places).length} staged places; ${Object.keys(surfaces.places).length} declarations; missing: ${JSON.stringify(missing)}.\n`,
    );
    expect(missing).toEqual([]);
    for (const stage of Object.values(staging.places)) {
      expect(Array.isArray(stage.surfaceSlots)).toBe(true);
    }
  });

  it("keeps measured surface slots linked to their declarations", () => {
    let checked = 0;
    const declared = surfaces.places as Record<
      string,
      { surfaces: readonly { id: string; kind: string }[] }
    >;
    for (const [place, stage] of Object.entries(staging.places)) {
      for (const slot of stage.surfaceSlots) {
        const surface = declared[place]?.surfaces.find(
          (candidate) => candidate.id === slot.surfaceId,
        );
        expect(surface, `${place}: ${slot.surfaceId}`).toBeDefined();
        expect(surface?.kind, `${place}: ${slot.surfaceId}`).toBe(slot.kind);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(0);
    process.stdout.write(`Slot measured surface references: ${checked}.\n`);
  });

  it("lists fixture exceptions and retained anchors in painted production rooms", () => {
    const scenes = [...SCENE_REGISTRY.scenes.values()];
    const fixtures = scenes
      .filter(
        (scene) =>
          scene.presentationStatus === "development-fixture" &&
          scene.anchors.size > 0,
      )
      .map((scene) => ({ scene: scene.sceneId, anchors: scene.anchors.size }));
    process.stdout.write(
      `Retained fixture anchors: ${JSON.stringify(fixtures)}.\n`,
    );
    const painted = scenes.filter(
      (scene) => scene.presentationStatus === "production" && scene.raster,
    );
    expect(painted.length).toBeGreaterThan(0);
    const legacy = painted
      .filter((scene) => scene.anchors.size > 0)
      .map((scene) => ({ scene: scene.sceneId, anchors: scene.anchors.size }));
    process.stdout.write(
      `Retained production anchors: ${JSON.stringify(legacy)}.\n`,
    );
    expect(legacy.length).toBeGreaterThan(0);
  });
});
