import { describe, expect, it } from "vitest";

import {
  advanceWorldMinutes,
  createScheduledActivity,
  deserializeWorld,
  performScheduledActivity,
  scheduledActivitiesVisibleTo,
  serializeWorld,
  type EntityId,
  type World,
} from "../simulation";
import { validateEnvironmentSceneSpec } from "../environment/environment-scene-spec";
import { CAMPAIGN_STOREFRONT_PRODUCTION_SCENE } from "../environment/scenes/campaign-storefront-production";
import { PARK_COMMUNITY_PAVILION_CANDIDATE_SCENE } from "../environment/scenes/park-community-pavilion-production";
import { resolveLifeScene } from "./life-scene";
import { bindSceneSurfaces } from "./surface-binding";
import { createNewGameWorld, type NewGameSetup } from "./new-game";
import { openOrdinaryLife } from "./ordinary-life";
import {
  CAMPAIGN_STOREFRONT_SCENE_ID,
  PARK_COMMUNITY_PAVILION_SCENE_ID,
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

function anOrdinaryLife(seed: string): { world: World; personId: EntityId } {
  const setup: NewGameSetup = {
    placeKey: "kentucky",
    startAge: 34,
    depth: "summarize-earlier-life",
    startingLife: "ordinary-life",
    household: "shares-a-home",
    seed,
    givenName: null,
    familyName: null,
    questionnaire: "skipped",
    priors: [],
  };
  const created = createNewGameWorld(setup);
  return {
    world: openOrdinaryLife(created.world, created.playerPersonId),
    personId: created.playerPersonId,
  };
}

describe("campaign storefront production scene", () => {
  it("validates according to EnvironmentSceneSpec contract", () => {
    const validation = validateEnvironmentSceneSpec(
      CAMPAIGN_STOREFRONT_PRODUCTION_SCENE,
    );
    expect(validation.errors).toEqual([]);
    expect(validation.valid).toBe(true);
  });

  it("registers in SCENE_REGISTRY as production art with downscaled tiers", () => {
    const scene = requireScene(SCENE_REGISTRY, CAMPAIGN_STOREFRONT_SCENE_ID);
    expect(scene.presentationStatus).toBe("production");
    expect(scene.plate).toEqual({ width: 1376, height: 768 });
    expect(scene.raster).not.toBeNull();
    expect(scene.raster!.assetId).toBe("env_campaign_storefront_5504x3072_v1");

    const ladder = scene.raster!.ladder;
    expect(ladder.tiers).toHaveLength(2);
    expect(ladder.tiers[0]!.width).toBe(1376);
    expect(ladder.tiers[0]!.height).toBe(768);
    expect(ladder.tiers[0]!.derivation).toBe("deterministic-downscale");
    expect(ladder.tiers[0]!.hash).toBe(
      "35a37c8a6526a86eb569be61383558c1b90369abb9c185d21a7d5765d52edfc0",
    );

    expect(ladder.tiers[1]!.width).toBe(2752);
    expect(ladder.tiers[1]!.height).toBe(1536);
    expect(ladder.tiers[1]!.derivation).toBe("deterministic-downscale");
    expect(ladder.tiers[1]!.hash).toBe(
      "8ed3362367898887a638b78caf95e55600f98dcaf9aa154d197a0035fc467663",
    );

    expect(
      PRODUCTION_VISUAL_LIBRARY.has("env_campaign_storefront_5504x3072_v1"),
    ).toBe(true);
  });

  it("authors distinct standing and seated anchors with valid floor contacts", () => {
    const scene = requireScene(SCENE_REGISTRY, CAMPAIGN_STOREFRONT_SCENE_ID);
    expect(scene.anchors.size).toBe(3);

    const phoneBank = scene.anchors.get("phone-bank-standing")!;
    expect(phoneBank).toBeDefined();
    expect(phoneBank.xPercent).toBe(26);
    expect(phoneBank.contactFloorYPercent).toBe(82);
    expect(phoneBank.allowedPoseFamilies).toContain("standing-neutral");
    expect(phoneBank.allowedPoseFamilies).toContain("standing-listening");

    const organizer = scene.anchors.get("organizer-standing")!;
    expect(organizer).toBeDefined();
    expect(organizer.xPercent).toBe(62);
    expect(organizer.contactFloorYPercent).toBe(85);
    expect(organizer.allowedPoseFamilies).toContain("standing-neutral");
    expect(organizer.allowedPoseFamilies).toContain("standing-podium-or-lectern");

    const volunteerSeat = scene.anchors.get("volunteer-desk-chair")!;
    expect(volunteerSeat).toBeDefined();
    expect(volunteerSeat.xPercent).toBe(38);
    expect(volunteerSeat.seatContact).not.toBeNull();
    expect(volunteerSeat.seatContact!.seat_plane_y_percent).toBe(65);
    expect(volunteerSeat.contactFloorYPercent).toBe(82);
    expect(volunteerSeat.allowedPoseFamilies).toContain("seated-at-desk");
  });

  it("declares ordered foreground occluders and public dynamic surface slots", () => {
    const scene = requireScene(SCENE_REGISTRY, CAMPAIGN_STOREFRONT_SCENE_ID);
    expect(scene.occluders.length).toBe(2);
    expect(scene.occluders[0]!.id).toBe("stacked-boxes-foreground");
    expect(scene.occluders[0]!.zOrder).toBe(5);
    expect(scene.occluders[1]!.id).toBe("folding-table-foreground");
    expect(scene.occluders[1]!.zOrder).toBe(6);

    expect(scene.surfaceSlots.length).toBe(4);
    const slotIds = scene.surfaceSlots.map((s) => s.slot_id);
    expect(slotIds).toContain("storefront-window-banner");
    expect(slotIds).toContain("phone-bank-corkboard");
    expect(slotIds).toContain("strategy-whiteboard");
    expect(slotIds).toContain("table-literature-pamphlet");

    for (const slot of scene.surfaceSlots) {
      expect(slot.information_access).toBe("public-record");
    }
  });

  it("maps campaign-office and campaign-call-desk to the campaign storefront scene", () => {
    const officeVenue = sceneVenueForLocationKey("campaign-office");
    expect(officeVenue).not.toBeNull();
    expect(officeVenue!.sceneId).toBe(CAMPAIGN_STOREFRONT_SCENE_ID);
    expect(officeVenue!.isJourney).toBe(false);

    const callDeskVenue = sceneVenueForLocationKey("campaign-call-desk");
    expect(callDeskVenue).not.toBeNull();
    expect(callDeskVenue!.sceneId).toBe(CAMPAIGN_STOREFRONT_SCENE_ID);
    expect(callDeskVenue!.isJourney).toBe(false);

    expect(VENUE_REACHABLE_SCENE_IDS).toContain(CAMPAIGN_STOREFRONT_SCENE_ID);
    expect(VENUE_WITH_PRODUCTION_ACTIVITY).toContain(
      CAMPAIGN_STOREFRONT_SCENE_ID,
    );
  });

  it("resolves to the storefront scene only after actual completion of a campaign activity", () => {
    const life = anOrdinaryLife("campaign-resolution");
    const personId = life.personId;

    // Before performing the activity, resolveLifeScene returns home
    const initialResolution = resolveLifeScene(life.world, personId);
    expect(initialResolution.sceneId).not.toBe(CAMPAIGN_STOREFRONT_SCENE_ID);

    const existingActivity = scheduledActivitiesVisibleTo(life.world, personId)[0]!;

    // Schedule a campaign phone bank activity
    const createdWorld = createScheduledActivity(life.world, {
      stableKey: "test:campaign-phone-bank",
      title: "Calling voters from the storefront phone bank",
      summary: "Calling registered voters ahead of the election.",
      kind: "confirmed",
      start: { ...life.world.currentMoment },
      end: {
        ...life.world.currentMoment,
        minuteOfDay: life.world.currentMoment.minuteOfDay + 120,
      },
      participantPersonIds: [personId],
      responsiblePersonId: personId,
      location: {
        locationKey: "campaign-call-desk",
        label: "Storefront Phone Bank",
        jurisdictionId: null,
      },
      sourceEntityIds: [...existingActivity.sourceEntityIds],
      flexibility: { kind: "fixed" },
      access: { kind: "private", personIds: [personId] },
    });
    const campaignActivity = createdWorld.history.scheduledActivities.at(-1)!;

    // Fast-forward world clock to the end of the activity WITHOUT performing it
    const clockAdvancedWorld = {
      ...createdWorld,
      currentMoment: {
        ...createdWorld.currentMoment,
        minuteOfDay: createdWorld.currentMoment.minuteOfDay + 120,
      },
    };
    const unperformedResolution = resolveLifeScene(clockAdvancedWorld, personId);
    expect(unperformedResolution.sceneId).not.toBe(CAMPAIGN_STOREFRONT_SCENE_ID);

    // Reset clock and actually perform the activity
    const performedWorld = performScheduledActivity(
      createdWorld,
      campaignActivity.id,
    );

    // In the immediate aftermath of completed performance, the player is in the campaign storefront
    const performedResolution = resolveLifeScene(performedWorld, personId);
    expect(performedResolution.sceneId).toBe(CAMPAIGN_STOREFRONT_SCENE_ID);
    expect(performedResolution.reason).toContain("Storefront Phone Bank");

    // Advancing the clock expires the immediate activity aftermath
    const laterWorld = advanceWorldMinutes(performedWorld, 15);
    const laterResolution = resolveLifeScene(laterWorld, personId);
    expect(laterResolution.sceneId).not.toBe(CAMPAIGN_STOREFRONT_SCENE_ID);
  });

  it("does not mutate world state during scene resolution and survives serialization", () => {
    const life = anOrdinaryLife("campaign-roundtrip");
    const personId = life.personId;
    const existingActivity = scheduledActivitiesVisibleTo(life.world, personId)[0]!;

    const createdWorld = createScheduledActivity(life.world, {
      stableKey: "test:campaign-strategy-session",
      title: "Strategy session at campaign office",
      summary: "Reviewing neighborhood turnout metrics.",
      kind: "confirmed",
      start: { ...life.world.currentMoment },
      end: {
        ...life.world.currentMoment,
        minuteOfDay: life.world.currentMoment.minuteOfDay + 60,
      },
      participantPersonIds: [personId],
      responsiblePersonId: personId,
      location: {
        locationKey: "campaign-office",
        label: "Campaign Headquarters",
        jurisdictionId: null,
      },
      sourceEntityIds: [...existingActivity.sourceEntityIds],
      flexibility: { kind: "fixed" },
      access: { kind: "private", personIds: [personId] },
    });
    const activity = createdWorld.history.scheduledActivities.at(-1)!;
    const performedWorld = performScheduledActivity(createdWorld, activity.id);

    const serializedBefore = serializeWorld(performedWorld);
    const resolution1 = resolveLifeScene(performedWorld, personId);
    const serializedAfter = serializeWorld(performedWorld);

    expect(serializedAfter).toBe(serializedBefore);
    expect(resolution1.sceneId).toBe(CAMPAIGN_STOREFRONT_SCENE_ID);

    const roundtrippedWorld = deserializeWorld(serializedBefore);
    const resolution2 = resolveLifeScene(roundtrippedWorld, personId);
    expect(resolution2.sceneId).toBe(CAMPAIGN_STOREFRONT_SCENE_ID);
    expect(resolution2.reason).toBe(resolution1.reason);
  });

  it("binds dynamic surfaces with campaign payload and falls back to clean decorations", () => {
    const scene = requireScene(SCENE_REGISTRY, CAMPAIGN_STOREFRONT_SCENE_ID);

    // 1. When empty/unowned, all 4 slots show their fallback decorations
    const unownedBindings = bindSceneSurfaces(scene, () => undefined);
    expect(unownedBindings).toHaveLength(4);
    for (const binding of unownedBindings) {
      expect(binding.state).toBe("unowned");
      expect(binding.shows.length).toBeGreaterThan(0);
    }
    const windowUnowned = unownedBindings.find(
      (b) => b.slotId === "storefront-window-banner",
    )!;
    expect(windowUnowned.shows).toBe("bare storefront window glass");

    const corkboardUnowned = unownedBindings.find(
      (b) => b.slotId === "phone-bank-corkboard",
    )!;
    expect(corkboardUnowned.shows).toBe("plain brown cork with empty pushpins");

    // 2. When campaign payloads are provided, matching slots bind them
    const campaignPayloads: Record<string, string> = {
      "campaign-name": "Citizens for Fair Elections 2026",
      headline: "VOLUNTEER PHONE BANK - SHIFT 2",
      "document-body": "Precinct 4 Voter Turnout Target: 65%",
    };

    const bound = bindSceneSurfaces(
      scene,
      (contentClass) => campaignPayloads[contentClass] ?? undefined,
    );
    const windowBound = bound.find(
      (b) => b.slotId === "storefront-window-banner",
    )!;
    expect(windowBound.state).toBe("bound");
    expect(windowBound.shows).toBe("Citizens for Fair Elections 2026");
    expect(windowBound.contentClass).toBe("campaign-name");

    const corkboardBound = bound.find(
      (b) => b.slotId === "phone-bank-corkboard",
    )!;
    expect(corkboardBound.state).toBe("bound");
    expect(corkboardBound.shows).toBe("Precinct 4 Voter Turnout Target: 65%");
  });

  it("preserves candidate isolation for park community pavilion", () => {
    const candidateValidation = validateEnvironmentSceneSpec(
      PARK_COMMUNITY_PAVILION_CANDIDATE_SCENE,
    );
    expect(candidateValidation.valid).toBe(true);
    const candidateScene = requireScene(
      SCENE_REGISTRY,
      PARK_COMMUNITY_PAVILION_SCENE_ID,
    );
    expect(candidateScene.presentationStatus).toBe("development-fixture");
    expect(
      VENUE_DELIBERATELY_UNREACHED.has(PARK_COMMUNITY_PAVILION_SCENE_ID),
    ).toBe(true);
    expect(
      PRODUCTION_VISUAL_LIBRARY.has(
        "env_park_community_pavilion_candidate_5504x3072_v1",
      ),
    ).toBe(false);
  });
});
