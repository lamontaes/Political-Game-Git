import { describe, expect, it } from "vitest";

import { CIVIC_COMMUNITY_MEETING_TITLE_SCENE } from "../environment/scenes/civic-community-meeting-title-production";
import { CIVIC_HEARING_ROOM_PRODUCTION_SCENE } from "../environment/scenes/civic-hearing-room-production";
import { COMMITTEE_ROOM_FIXTURE_SCENE } from "../environment/scenes/committee-room-fixture";
import {
  RESIDENCE_APARTMENT_LIVING_CANONICAL_03_SCENE,
  RESIDENCE_APARTMENT_LIVING_ORDINARY_02_SCENE,
} from "../environment/scenes/residence-apartment-living-production";
import { OFFICE_COUNCIL_STAFF_FIXTURE_SCENE } from "../environment/scenes/office-council-staff-fixture";
import { SHARED_WORKROOM_OFFICE_PRODUCTION_SCENE } from "../environment/scenes/shared-workroom-office-production";
import { validateEnvironmentSceneSpec } from "../environment/environment-scene-spec";
import {
  COMMITTEE_FIXTURE_SCENE_ID,
  createSceneRegistry,
  OFFICE_FIXTURE_SCENE_ID,
  DOMESTIC_CANONICAL_SCENE_ID,
  DOMESTIC_ORDINARY_SCENE_ID,
  HEARING_ROOM_SCENE_ID,
  PRODUCTION_OFFICE_SCENE_ID,
  TITLE_TABLEAU_SCENE_ID,
  registerScene,
  requireScene,
  requireSceneAnchor,
  SCENE_REGISTRY,
} from "./scene-registry";
import { OFFICE_VISUAL_SCENE } from "./visual-integration";

describe("scene registry", () => {
  it("registers every shipped scene from a validated EnvironmentSceneSpec", () => {
    for (const spec of [
      SHARED_WORKROOM_OFFICE_PRODUCTION_SCENE,
      CIVIC_COMMUNITY_MEETING_TITLE_SCENE,
      CIVIC_HEARING_ROOM_PRODUCTION_SCENE,
      RESIDENCE_APARTMENT_LIVING_CANONICAL_03_SCENE,
      RESIDENCE_APARTMENT_LIVING_ORDINARY_02_SCENE,
      OFFICE_COUNCIL_STAFF_FIXTURE_SCENE,
      COMMITTEE_ROOM_FIXTURE_SCENE,
    ]) {
      const validation = validateEnvironmentSceneSpec(spec);
      expect(validation.errors, spec.scene_id).toEqual([]);
      expect(validation.valid).toBe(true);
    }
    expect([...SCENE_REGISTRY.scenes.keys()].sort()).toEqual(
      [
        TITLE_TABLEAU_SCENE_ID,
        HEARING_ROOM_SCENE_ID,
        COMMITTEE_FIXTURE_SCENE_ID,
        OFFICE_FIXTURE_SCENE_ID,
        DOMESTIC_CANONICAL_SCENE_ID,
        DOMESTIC_ORDINARY_SCENE_ID,
        PRODUCTION_OFFICE_SCENE_ID,
      ].sort(),
    );
  });

  /**
   * Every scene says which it is, and the two fixtures stay fixtures. This is
   * the assertion that stops a fixture from quietly presenting itself as
   * production art, which is the confusion the office review ran into.
   *
   * A production scene must also HAVE a plate. A scene marked production with
   * no raster would be the same claim made the other way round.
   */
  it("separates production scenes from the development fixtures", () => {
    const production = [...SCENE_REGISTRY.scenes.values()].filter(
      (scene) => scene.presentationStatus === "production",
    );
    expect(production.map((scene) => scene.sceneId).sort()).toEqual(
      [
        PRODUCTION_OFFICE_SCENE_ID,
        TITLE_TABLEAU_SCENE_ID,
        HEARING_ROOM_SCENE_ID,
        DOMESTIC_CANONICAL_SCENE_ID,
        DOMESTIC_ORDINARY_SCENE_ID,
      ].sort(),
    );
    for (const scene of production) {
      expect(scene.raster, scene.sceneId).not.toBeNull();
    }
    for (const sceneId of [
      OFFICE_FIXTURE_SCENE_ID,
      COMMITTEE_FIXTURE_SCENE_ID,
    ]) {
      expect(
        requireScene(SCENE_REGISTRY, sceneId).presentationStatus,
        sceneId,
      ).toBe("development-fixture");
    }
  });

  /**
   * MEASURED, OR SAID TO BE UNMEASURED. Never quietly absent.
   *
   * A perspective ramp is the number every placement in a room rests on, and
   * the temptation with an illustration is to fit one anyway and call the
   * residual rounding. So a production scene either declares the pair, or its
   * `explicit_unknowns` says in words that it does not and why. There is no
   * third state where the field is simply missing and a reader has to guess
   * whether anybody looked.
   */
  it("makes every production scene either calibrated or explicitly not", () => {
    for (const scene of SCENE_REGISTRY.scenes.values()) {
      if (scene.presentationStatus !== "production") continue;
      if (scene.floorCalibration !== null) continue;
      const unknowns = (scene.spec.explicit_unknowns ?? []).join(" ");
      expect(unknowns.toLowerCase(), scene.sceneId).toContain("calibration");
    }
  });

  /**
   * A body width with no ramp is a size with no perspective: it would paint
   * every person in the room at the same height whatever floor they stood on.
   */
  it("declares no body width without the ramp that scales it", () => {
    for (const scene of SCENE_REGISTRY.scenes.values()) {
      if (scene.standardBodyWidthPercent === null) continue;
      expect(scene.floorCalibration, scene.sceneId).not.toBeNull();
    }
  });

  /**
   * GEOMETRY IS MEASURED FROM THE PLATE BEING USED, NEVER TRANSPLANTED.
   *
   * Two rooms sharing a ramp or a body width to three decimal places did not
   * both measure out that way; one was copied. The office production scene was
   * added precisely because the fixture's numbers had been treated as the
   * project's numbers, so this is the assertion that stops it recurring.
   */
  it("shares no measured geometry between two different rooms", () => {
    const ramps = new Map<string, string>();
    const widths = new Map<number, string>();
    for (const scene of SCENE_REGISTRY.scenes.values()) {
      if (scene.floorCalibration) {
        const { near, far } = scene.floorCalibration;
        const key = `${near.floor_y_percent}/${near.scale}/${far.floor_y_percent}/${far.scale}`;
        expect(ramps.get(key), `${scene.sceneId} vs ${ramps.get(key)}`).toBe(
          undefined,
        );
        ramps.set(key, scene.sceneId);
      }
      if (scene.standardBodyWidthPercent !== null) {
        const width = scene.standardBodyWidthPercent;
        expect(
          widths.get(width),
          `${scene.sceneId} vs ${widths.get(width)}`,
        ).toBe(undefined);
        widths.set(width, scene.sceneId);
      }
    }
  });

  /**
   * A production plate must not be a room nobody measured a contact in. An
   * anchor without a floor line cannot be registered at all, so the check that
   * is worth making here is that a production room declares anchors and
   * surfaces rather than being a picture with nothing authored against it.
   */
  it("authors contacts and surfaces against every production plate", () => {
    for (const scene of SCENE_REGISTRY.scenes.values()) {
      if (scene.presentationStatus !== "production") continue;
      expect(scene.anchors.size, scene.sceneId).toBeGreaterThan(0);
      expect(scene.surfaceSlots.length, scene.sceneId).toBeGreaterThan(0);
      expect(
        (scene.spec.explicit_unknowns ?? []).length,
        scene.sceneId,
      ).toBeGreaterThan(0);
    }
  });

  /**
   * The quarantine, asserted rather than described. The Lexington plate is
   * jurisdiction-specific art with a Fayette County map on its wall, and the
   * only scene entitled to it is the Lexington fixture itself.
   */
  it("keeps the Lexington plate out of every other scene", () => {
    for (const scene of SCENE_REGISTRY.scenes.values()) {
      if (scene.sceneId === OFFICE_FIXTURE_SCENE_ID) continue;
      for (const tier of scene.raster?.ladder.tiers ?? []) {
        expect(tier.path, scene.sceneId).not.toContain("lexington");
        expect(tier.path, scene.sceneId).not.toContain("council-staff-office");
      }
    }
  });

  /**
   * No production plate rests on enlarged pixels, and the rule is asserted
   * across the whole registry rather than for the one scene that had it first.
   */
  it("registers no enlarged tier on any production scene", () => {
    for (const scene of SCENE_REGISTRY.scenes.values()) {
      if (scene.presentationStatus !== "production") continue;
      for (const tier of scene.raster?.ladder.tiers ?? []) {
        expect(tier.derivation, `${scene.sceneId} ${tier.width}`).toBe(
          "deterministic-downscale",
        );
      }
    }
  });

  /**
   * A production plate may not rest on enlarged pixels. Both tiers here are
   * deterministic downscales of the 5504x3072 master, so neither declares a
   * native-detail shortfall and the pixel width is the truth.
   */
  it("registers the production office ladder as downscale-only", () => {
    const scene = requireScene(SCENE_REGISTRY, PRODUCTION_OFFICE_SCENE_ID);
    expect(scene.presentationStatus).toBe("production");
    expect(scene.raster).not.toBeNull();
    expect(scene.raster!.ladder.tiers.map((tier) => tier.width)).toEqual([
      1_376, 2_752,
    ]);
    for (const tier of scene.raster!.ladder.tiers) {
      expect(tier.derivation).toBe("deterministic-downscale");
      expect(tier.nativeDetailWidth).toBeUndefined();
    }
  });

  /**
   * The production scene's geometry must not be the fixture's geometry. These
   * are different rooms; sharing a number would mean one of them was assumed.
   */
  it("measures production geometry independently of the development fixture", () => {
    const production = requireScene(SCENE_REGISTRY, PRODUCTION_OFFICE_SCENE_ID);
    const fixture = requireScene(SCENE_REGISTRY, OFFICE_FIXTURE_SCENE_ID);
    expect(production.plate).not.toEqual(fixture.plate);
    expect(production.standardBodyWidthPercent).not.toBe(
      fixture.standardBodyWidthPercent,
    );
    const productionAnchorIds = [...production.anchors.keys()].sort();
    const fixtureAnchorIds = new Set(fixture.anchors.keys());
    for (const id of productionAnchorIds) {
      expect(fixtureAnchorIds.has(id), id).toBe(false);
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
   * Anchor scale is interpolated from the scene's two floor calibration pairs.
   *
   * The two seats no longer share a scale, because they never shared a floor:
   * the desk chair stands nearer the camera than the guest chair, and the
   * single 84% line they both used to declare was derived from an unmeasured
   * seat plane rather than read off the plate. Each anchor now carries the
   * floor line measured under its own chair, and the ramp gives each the scale
   * that follows from it.
   */
  it("derives each anchor's scale from its own measured floor line", () => {
    const primary = OFFICE_VISUAL_SCENE.anchors["primary-desk-chair"];
    expect(primary.contactFloorYPercent).toBe(90.01);
    expect(primary.scale).toBeCloseTo(0.9875625, 10);

    const guest = OFFICE_VISUAL_SCENE.anchors["left-guest-chair"];
    expect(guest.contactFloorYPercent).toBe(75.17);
    expect(guest.scale).toBeCloseTo(0.8948125, 10);

    // Nearer the camera is larger. The ramp is monotonic, so this ordering is
    // a property of the geometry rather than of these two numbers.
    expect(primary.scale).toBeGreaterThan(guest.scale);
  });

  it("puts each anchor's seat plane on its own chair's cushion", () => {
    // One third forward of each cushion's measured back edge: a sitter with
    // their back against the backrest rests on the rear of the seat.
    expect(OFFICE_VISUAL_SCENE.anchors["primary-desk-chair"].yPercent).toBe(
      70.8,
    );
    expect(OFFICE_VISUAL_SCENE.anchors["left-guest-chair"].yPercent).toBe(
      62.93,
    );
    // Measured cushion centres. The desk chair's anchor used to sit at 79.2%,
    // a staging offset that existed only because the body was placed by its hip
    // joint instead of its seat contact; placing the contact removed the need
    // for it, so the anchor can describe the furniture again.
    expect(OFFICE_VISUAL_SCENE.anchors["primary-desk-chair"].xPercent).toBe(
      77.2,
    );
    expect(OFFICE_VISUAL_SCENE.anchors["left-guest-chair"].xPercent).toBe(29.2);
  });

  it("only composites occluders that actually have a mask raster", () => {
    // The guest chair's near arm is declared for footprint and debug purposes
    // but has no authored alpha yet, so it is not painted.
    expect(OFFICE_VISUAL_SCENE.occluders.map((entry) => entry.id)).toEqual([
      "desk-front",
    ]);
  });
});
