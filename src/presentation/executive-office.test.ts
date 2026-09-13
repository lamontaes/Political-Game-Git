import { describe, expect, it } from "vitest";

import { validateEnvironmentSceneSpec } from "../environment/environment-scene-spec";
import { EXECUTIVE_OFFICE_CANDIDATE_SCENE } from "../environment/scenes/executive-office-production";
import { bindSceneSurfaces } from "./surface-binding";
import {
  EXECUTIVE_OFFICE_SCENE_ID,
  requireScene,
  SCENE_REGISTRY,
} from "./scene-registry";
import {
  sceneVenueForLocationKey,
  VENUE_DELIBERATELY_UNREACHED,
  VENUE_REACHABLE_SCENE_IDS,
  VENUE_WITH_PRODUCTION_ACTIVITY,
} from "./scene-venues";
import { PRODUCTION_VISUAL_LIBRARY } from "./visual-integration";

describe("executive private office candidate scene", () => {
  it("validates according to EnvironmentSceneSpec contract", () => {
    const validation = validateEnvironmentSceneSpec(
      EXECUTIVE_OFFICE_CANDIDATE_SCENE,
    );
    expect(validation.errors).toEqual([]);
    expect(validation.valid).toBe(true);
  });

  it("registers in SCENE_REGISTRY as development-fixture with deterministic downscaled tiers", () => {
    const scene = requireScene(SCENE_REGISTRY, EXECUTIVE_OFFICE_SCENE_ID);
    expect(scene.presentationStatus).toBe("development-fixture");
    expect(scene.plate).toEqual({ width: 1376, height: 768 });
    expect(scene.raster).not.toBeNull();
    expect(scene.raster!.assetId).toBe(
      "env_executive_office_candidate_5504x3072_v1",
    );

    const ladder = scene.raster!.ladder;
    expect(ladder.tiers).toHaveLength(2);
    expect(ladder.tiers[0]!.width).toBe(1376);
    expect(ladder.tiers[0]!.height).toBe(768);
    expect(ladder.tiers[0]!.derivation).toBe("deterministic-downscale");
    expect(ladder.tiers[0]!.hash).toBe(
      "1f77a0b5f908cd43a4aa99d56df42e000fc8514a26ded64c178f032ece55e4b6",
    );

    expect(ladder.tiers[1]!.width).toBe(2752);
    expect(ladder.tiers[1]!.height).toBe(1536);
    expect(ladder.tiers[1]!.derivation).toBe("deterministic-downscale");
    expect(ladder.tiers[1]!.hash).toBe(
      "71f7043510a374d2d27936a058c170729de6d4ba6924682c1090b44868ccfe6b",
    );

    // Unreleased candidate asset must NOT be in production visual library
    expect(
      PRODUCTION_VISUAL_LIBRARY.has(
        "env_executive_office_candidate_5504x3072_v1",
      ),
    ).toBe(false);
  });

  it("authors distinct seated and standing anchors with floor contact and seat lines", () => {
    const scene = requireScene(SCENE_REGISTRY, EXECUTIVE_OFFICE_SCENE_ID);
    expect(scene.anchors.size).toBe(4);

    const deskSeated = scene.anchors.get("executive-desk-seated")!;
    expect(deskSeated).toBeDefined();
    expect(deskSeated.xPercent).toBe(50);
    expect(deskSeated.seatContact?.seat_plane_y_percent).toBe(62);
    expect(deskSeated.contactFloorYPercent).toBe(76);
    expect(deskSeated.allowedPoseFamilies).toContain("seated-at-desk");

    const visitorLeft = scene.anchors.get("visitor-left-seated")!;
    expect(visitorLeft).toBeDefined();
    expect(visitorLeft.xPercent).toBe(27);
    expect(visitorLeft.seatContact?.seat_plane_y_percent).toBe(74);
    expect(visitorLeft.contactFloorYPercent).toBe(88);

    const visitorRight = scene.anchors.get("visitor-right-seated")!;
    expect(visitorRight).toBeDefined();
    expect(visitorRight.xPercent).toBe(72);
    expect(visitorRight.seatContact?.seat_plane_y_percent).toBe(74);
    expect(visitorRight.contactFloorYPercent).toBe(88);

    const standing = scene.anchors.get("executive-consultation-standing")!;
    expect(standing).toBeDefined();
    expect(standing.xPercent).toBe(26);
    expect(standing.contactFloorYPercent).toBe(72);
    expect(standing.allowedPoseFamilies).toContain("standing-neutral");
    expect(standing.allowedPoseFamilies).toContain("standing-conversational");
  });

  it("authors foreground occluders with ascending z-orders", () => {
    const scene = requireScene(SCENE_REGISTRY, EXECUTIVE_OFFICE_SCENE_ID);
    expect(scene.occluders.length).toBe(4);

    const deskOccluder = scene.occluders.find(
      (o) => o.id === "executive-desk-foreground",
    )!;
    expect(deskOccluder).toBeDefined();
    expect(deskOccluder.zOrder).toBe(3);

    const leftArmchair = scene.occluders.find(
      (o) => o.id === "visitor-left-armchair",
    )!;
    expect(leftArmchair).toBeDefined();
    expect(leftArmchair.zOrder).toBe(6);

    const rightArmchair = scene.occluders.find(
      (o) => o.id === "visitor-right-armchair",
    )!;
    expect(rightArmchair).toBeDefined();
    expect(rightArmchair.zOrder).toBe(6);

    const coffeeTable = scene.occluders.find(
      (o) => o.id === "foreground-coffee-table",
    )!;
    expect(coffeeTable).toBeDefined();
    expect(coffeeTable.zOrder).toBe(7);
  });

  it("binds dynamic surfaces with executive payloads and falls back to clean decorations", () => {
    const scene = requireScene(SCENE_REGISTRY, EXECUTIVE_OFFICE_SCENE_ID);

    // 1. Fallback unowned state
    const unownedBindings = bindSceneSurfaces(scene, () => undefined);
    expect(unownedBindings).toHaveLength(4);
    for (const binding of unownedBindings) {
      expect(binding.state).toBe("unowned");
      expect(binding.shows.length).toBeGreaterThan(0);
    }
    const deskDocUnowned = unownedBindings.find(
      (b) => b.slotId === "desk-working-document",
    )!;
    expect(deskDocUnowned.shows).toBe(
      "leather desk pad blotter with daily executive agenda folder",
    );

    const monitorUnowned = unownedBindings.find(
      (b) => b.slotId === "executive-monitor-screen",
    )!;
    expect(monitorUnowned.shows).toBe(
      "dark desktop workstation monitor with state system lock screen",
    );

    // 2. Bound state with executive payloads
    const payloads: Record<string, string> = {
      "bill-title": "Clean Water Infrastructure Bond Act",
      agenda: "Cabinet Budget Review 10:00 AM",
      headline: "Governor Signs Clean Water Executive Order",
      "officeholder-portrait": "Governor Eleanor Vance (Official Portrait)",
    };

    const bound = bindSceneSurfaces(
      scene,
      (contentClass) => payloads[contentClass] ?? undefined,
    );

    const deskDocBound = bound.find(
      (b) => b.slotId === "desk-working-document",
    )!;
    expect(deskDocBound.state).toBe("bound");
    expect(deskDocBound.shows).toBe("Clean Water Infrastructure Bond Act");

    const monitorBound = bound.find(
      (b) => b.slotId === "executive-monitor-screen",
    )!;
    expect(monitorBound.state).toBe("bound");
    expect(monitorBound.shows).toBe(
      "Governor Signs Clean Water Executive Order",
    );

    const portraitBound = bound.find(
      (b) => b.slotId === "bookcase-architectural-sketch",
    )!;
    expect(portraitBound.state).toBe("bound");
    expect(portraitBound.shows).toBe(
      "Governor Eleanor Vance (Official Portrait)",
    );
  });

  it("strictly isolates candidate art from production gameplay reachability", () => {
    // 1. Must be quarantined in VENUE_DELIBERATELY_UNREACHED
    expect(VENUE_DELIBERATELY_UNREACHED.has(EXECUTIVE_OFFICE_SCENE_ID)).toBe(
      true,
    );
    expect(
      VENUE_DELIBERATELY_UNREACHED.get(EXECUTIVE_OFFICE_SCENE_ID),
    ).toContain("Candidate scene");

    // 2. Canonical venue table maps executive-office to null
    const venue = sceneVenueForLocationKey("executive-office");
    expect(venue).not.toBeNull();
    expect(venue!.sceneId).toBeNull();
    expect(venue!.reason).toContain(
      "remains unreleased pending human visual acceptance",
    );

    // 3. Not in reachable or production activity lists
    expect(VENUE_REACHABLE_SCENE_IDS).not.toContain(EXECUTIVE_OFFICE_SCENE_ID);
    expect(VENUE_WITH_PRODUCTION_ACTIVITY).not.toContain(
      EXECUTIVE_OFFICE_SCENE_ID,
    );
  });
});
