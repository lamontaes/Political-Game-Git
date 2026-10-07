import { describe, expect, it } from "vitest";
import staging from "../../art/backdrops/staging.json" with { type: "json" };
import surfaces from "../../art/backdrops/surfaces.json" with { type: "json" };
import { BODY_POSES } from "./appearance-engine/pack";
import { spotView, type SpotFacing } from "./backdrop-people";
import { SCENE_REGISTRY } from "./scene-registry";

// The audit records current gaps without supplying art or changing runtime data.
const expectedViews: Record<SpotFacing, string> = {
  viewer: "front",
  left: "three-quarter",
  right: "three-quarter",
  away: "back",
};

describe("one staging slot contract", () => {
  it("records facing and pose gaps without changing the runtime contract", () => {
    const facingGaps = Object.entries(expectedViews)
      .map(([facing, expected]) => ({
        facing,
        expected,
        actual: spotView({ x: 50, y: 75, facing: facing as SpotFacing }),
      }))
      .filter(({ expected, actual }) => expected !== actual);
    const leanMissing = !BODY_POSES.includes(
      "lean" as (typeof BODY_POSES)[number],
    );
    process.stdout.write(
      `Unresolved facing gaps: ${JSON.stringify(facingGaps)}; lean missing: ${leanMissing}.\n`,
    );
    expect(facingGaps.length).toBeGreaterThan(0);
    expect(leanMissing).toBe(true);
  });

  it("records staged places without surface declarations", () => {
    const missing = Object.keys(staging.places).filter(
      (place) => !Object.hasOwn(surfaces.places, place),
    );
    process.stdout.write(
      `Slot surface coverage: ${Object.keys(staging.places).length} staged places; ${Object.keys(surfaces.places).length} declarations; missing: ${JSON.stringify(missing)}.\n`,
    );
    expect(missing.length).toBeGreaterThan(0);
  });

  it("references measured surfaces without inventing new geometry", () => {
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
