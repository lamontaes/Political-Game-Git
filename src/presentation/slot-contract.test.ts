import { describe, expect, it } from "vitest";
import staging from "../../art/backdrops/staging.json" with { type: "json" };
import surfaces from "../../art/backdrops/surfaces.json" with { type: "json" };
import { BODY_POSES } from "./appearance-engine/pack";
import { spotView, type SpotFacing } from "./backdrop-people";
import { SCENE_REGISTRY } from "./scene-registry";

// Expected requirements do not authorize art substitution.
const requiredViews: Record<SpotFacing, string> = {
  viewer: "front",
  left: "three-quarter",
  right: "three-quarter",
  away: "back",
};

describe("one staging slot contract", () => {
  for (const [facing, view] of Object.entries(requiredViews)) {
    it(`requires ${view} for ${facing}`, () => {
      expect(spotView({ x: 50, y: 75, facing: facing as SpotFacing })).toBe(
        view,
      );
    });
  }

  it("recognizes lean as a body pose", () => {
    expect(BODY_POSES).toContain("lean");
  });

  it("has a surface declaration for every staged place", () => {
    const missing = Object.keys(staging.places).filter(
      (place) => !Object.hasOwn(surfaces.places, place),
    );
    process.stdout.write(
      `Slot surface coverage: ${Object.keys(staging.places).length} staged places; ${Object.keys(surfaces.places).length} declarations; ${missing.length} missing.\n`,
    );
    expect(
      missing,
      `Missing surface declarations: ${missing.join(", ")}`,
    ).toEqual([]);
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

  it("lists fixture exceptions and retires anchors in painted production rooms", () => {
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
    expect(legacy, "Production rooms still use RegisteredSceneAnchor").toEqual(
      [],
    );
  });
});
