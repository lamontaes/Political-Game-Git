import { describe, expect, it } from "vitest";

import { COMMITTEE_ROOM_FIXTURE_SCENE } from "../environment/scenes/committee-room-fixture";
import { OFFICE_COUNCIL_STAFF_FIXTURE_SCENE } from "../environment/scenes/office-council-staff-fixture";
import { validateEnvironmentSceneSpec } from "../environment/environment-scene-spec";
import {
  COMMITTEE_FIXTURE_SCENE_ID,
  createSceneRegistry,
  OFFICE_FIXTURE_SCENE_ID,
  registerScene,
  requireScene,
  requireSceneAnchor,
  SCENE_REGISTRY,
} from "./scene-registry";
import { OFFICE_VISUAL_SCENE } from "./visual-integration";

describe("scene registry", () => {
  it("registers every shipped scene from a validated EnvironmentSceneSpec", () => {
    for (const spec of [
      OFFICE_COUNCIL_STAFF_FIXTURE_SCENE,
      COMMITTEE_ROOM_FIXTURE_SCENE,
    ]) {
      const validation = validateEnvironmentSceneSpec(spec);
      expect(validation.errors, spec.scene_id).toEqual([]);
      expect(validation.valid).toBe(true);
    }
    expect([...SCENE_REGISTRY.scenes.keys()].sort()).toEqual([
      COMMITTEE_FIXTURE_SCENE_ID,
      OFFICE_FIXTURE_SCENE_ID,
    ]);
  });

  it("marks both shipped scenes as development fixtures rather than production", () => {
    for (const scene of SCENE_REGISTRY.scenes.values()) {
      expect(scene.presentationStatus, scene.sceneId).toBe(
        "development-fixture",
      );
    }
  });

  it("registers the office fixture's ladder truthfully, upscale and all", () => {
    const scene = requireScene(SCENE_REGISTRY, OFFICE_FIXTURE_SCENE_ID);
    expect(scene.raster).not.toBeNull();
    expect(scene.raster!.ladder.tiers.map((tier) => tier.width)).toEqual([
      1_024, 2_048,
    ]);
    expect(scene.raster!.ladder.tiers[1]!.derivation).toBe(
      "upscaled-development-fixture",
    );
    expect(scene.raster!.ladder.tiers[1]!.nativeDetailWidth).toBe(1_024);
  });

  /**
   * A room whose plate has not been made yet registers with no raster. The
   * contract is authorable ahead of the art, and the runtime says the picture
   * is missing rather than borrowing another room's.
   */
  it("registers a scene that has no plate yet without inventing one", () => {
    const scene = requireScene(SCENE_REGISTRY, COMMITTEE_FIXTURE_SCENE_ID);
    expect(scene.raster).toBeNull();
    expect(scene.anchors.size).toBeGreaterThan(0);
    expect(scene.surfaceSlots.length).toBeGreaterThan(0);
  });

  it("orders named occluders deterministically by z-order then id", () => {
    const scene = requireScene(SCENE_REGISTRY, OFFICE_FIXTURE_SCENE_ID);
    const order = scene.occluders.map((occluder) => occluder.id);
    expect(order).toEqual(["desk-front", "guest-chair-near-arm"]);
    for (let index = 1; index < scene.occluders.length; index += 1) {
      expect(scene.occluders[index]!.zOrder).toBeGreaterThanOrEqual(
        scene.occluders[index - 1]!.zOrder,
      );
    }
    // Re-registering the same spec must produce the same order every time.
    const again = registerScene(OFFICE_COUNCIL_STAFF_FIXTURE_SCENE);
    expect(again.occluders.map((occluder) => occluder.id)).toEqual(order);
  });

  it("gives each named occluder its own z-order instead of one flat mask", () => {
    const scene = requireScene(SCENE_REGISTRY, OFFICE_FIXTURE_SCENE_ID);
    const zOrders = scene.occluders.map((occluder) => occluder.zOrder);
    expect(new Set(zOrders).size).toBe(zOrders.length);
  });

  it("refuses an anchor with no floor line, because placement needs one", () => {
    expect(() =>
      registerScene({
        ...OFFICE_COUNCIL_STAFF_FIXTURE_SCENE,
        anchors: [{ id: "floating", type: "seated-person", x_percent: 50 }],
      }),
    ).toThrow("declares no floor line");
  });

  it("refuses a scene whose spec does not validate", () => {
    expect(() =>
      registerScene({
        ...OFFICE_COUNCIL_STAFF_FIXTURE_SCENE,
        floor_calibration: {
          near: { floor_y_percent: 55, scale: 0.75 },
          far: { floor_y_percent: 100, scale: 1.2 },
        },
      }),
    ).toThrow("Cannot register scene");
  });

  it("refuses two scenes claiming the same registry key", () => {
    expect(() =>
      createSceneRegistry([
        OFFICE_COUNCIL_STAFF_FIXTURE_SCENE,
        OFFICE_COUNCIL_STAFF_FIXTURE_SCENE,
      ]),
    ).toThrow("already holds");
  });

  it("names a missing scene or anchor instead of returning undefined", () => {
    expect(() => requireScene(SCENE_REGISTRY, "no-such-room")).toThrow(
      "no scene 'no-such-room'",
    );
    const scene = requireScene(SCENE_REGISTRY, OFFICE_FIXTURE_SCENE_ID);
    expect(() => requireSceneAnchor(scene, "no-such-anchor")).toThrow(
      "no anchor 'no-such-anchor'",
    );
  });
});

describe("the office composition, now projected from the registry", () => {
  /**
   * The migration is only worth anything if it did not move the accepted
   * fixture. Every number the compositor uses must still be the number that was
   * accepted on main, sourced from the spec rather than a hand-written const.
   */
  it("reproduces the accepted camera, plate and safe areas exactly", () => {
    expect(OFFICE_VISUAL_SCENE.plate).toEqual({ width: 1_024, height: 572 });
    expect(OFFICE_VISUAL_SCENE.camera).toEqual({
      minimumAspectRatio: 1.5,
      maximumAspectRatio: 12 / 5,
      horizontalFocus: 0.5,
      verticalFocus: 0.75,
    });
    expect(OFFICE_VISUAL_SCENE.safeArea).toEqual({
      x: 86,
      y: 112,
      width: 850,
      height: 421,
    });
    expect(OFFICE_VISUAL_SCENE.essentialContentArea).toEqual({
      x: 185,
      y: 165,
      width: 730,
      height: 353.75,
    });
    expect(OFFICE_VISUAL_SCENE.uiSafeZones.map((zone) => zone.id)).toEqual([
      "lower-shell",
      "navigation-flyout",
    ]);
  });

  /**
   * Anchor scale is no longer a hand-tuned constant. It is interpolated from
   * the scene's two floor calibration pairs — and at the seated floor line that
   * interpolation lands on exactly the 0.95 the fixture was tuned to, so the
   * change is a change of authority, not of geometry.
   */
  it("derives anchor scale from floor calibration and lands on the accepted value", () => {
    for (const anchorId of [
      "primary-desk-chair",
      "left-guest-chair",
    ] as const) {
      const anchor = OFFICE_VISUAL_SCENE.anchors[anchorId];
      expect(anchor.scale, anchorId).toBeCloseTo(0.95, 10);
      expect(anchor.contactFloorYPercent, anchorId).toBe(84);
    }
  });

  it("keeps the seat plane as the anchor's y, so seated roots land where they did", () => {
    expect(OFFICE_VISUAL_SCENE.anchors["primary-desk-chair"].yPercent).toBe(
      63.5,
    );
    expect(OFFICE_VISUAL_SCENE.anchors["left-guest-chair"].yPercent).toBe(63);
    // The chair reads at 80.5% of plate width, but a body of the accepted
    // authored width centred there crops at the narrowest supported aspect.
    // 79.2% is the staging position that keeps the whole figure inside the
    // guaranteed safe area; the furniture did not move.
    expect(OFFICE_VISUAL_SCENE.anchors["primary-desk-chair"].xPercent).toBe(
      79.2,
    );
    expect(OFFICE_VISUAL_SCENE.anchors["left-guest-chair"].xPercent).toBe(28);
  });

  it("only composites occluders that actually have a mask raster", () => {
    // The guest chair's near arm is declared for footprint and debug purposes
    // but has no authored alpha yet, so it is not painted.
    expect(OFFICE_VISUAL_SCENE.occluders.map((entry) => entry.id)).toEqual([
      "desk-front",
    ]);
  });
});
