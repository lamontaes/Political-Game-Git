import { beforeAll, describe, expect, it } from "vitest";
import {
  createOrganization,
  householdMembershipsAt,
  lifePlaces,
  recordPersonDeath,
  serializeWorld,
  type World,
} from "../simulation";
import { SeededRng } from "../simulation/rng";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import {
  resolveStoryScene,
  type StorySceneRequest,
} from "./story-scene-resolver";
import {
  revalidateStoryScenePlayerOffer,
  storyScenePlayerOffers,
  type StoryScenePlayerOffer,
} from "./story-scene-player-options";

describe("player story options stay with their current records", () => {
  let world: World;
  let request: StorySceneRequest;
  let offered: StoryScenePlayerOffer;

  beforeAll(() => {
    const seed = "team8-story-resolver-part1";
    const places = lifePlaces().filter((place) => place.scope === "locality");
    const place = places[new SeededRng(seed).integer(0, places.length)]!;
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed,
        placeKey: place.key,
        startKind: "custom",
        startAge: 34,
        household: "shares-a-home",
      }),
    ).game!;
    world = game.world;
    request = {
      viewerPersonId: game.playerPersonId,
      place: {
        kind: "household",
        householdId: householdMembershipsAt(world, game.playerPersonId)[0]!
          .household.id,
      },
      moment: { ...world.currentMoment },
    };
    offered = storyScenePlayerOffers(world, request)[0]!;
    expect(offered).toBeDefined();
    process.stdout.write(
      `player options fixture seed=${seed} place=${place.key}\n`,
    );
  }, 60_000);

  it("returns the fresh canonical option without changing the world", () => {
    const before = serializeWorld(world);
    const validation = revalidateStoryScenePlayerOffer(world, request, offered);
    expect(validation.status).toBe("ready");
    if (validation.status !== "ready")
      throw new Error("Expected current offer");
    expect(resolveStoryScene(world, request).options).toContainEqual(
      validation.option,
    );
    expect(validation.option).not.toBe(offered.option);
    expect(serializeWorld(world)).toBe(before);
  });

  it("rejects another moment, place, viewer, or hearing request", () => {
    const changedRequests: StorySceneRequest[] = [
      {
        ...request,
        moment: {
          ...request.moment,
          minuteOfDay: request.moment.minuteOfDay + 1,
        },
      },
      {
        ...request,
        place: { kind: "activity", activityId: world.history.events[0]!.id },
      },
      {
        ...request,
        viewerPersonId: world.personOrder.find(
          (id) => id !== request.viewerPersonId,
        )!,
      },
      { ...request, audibility: "private" },
      {
        ...request,
        addressee: world.personOrder.find(
          (id) => id !== request.viewerPersonId,
        )!,
      },
    ];
    for (const changed of changedRequests)
      expect(revalidateStoryScenePlayerOffer(world, changed, offered)).toEqual({
        status: "stale-option",
      });
  });

  it("rejects a changed snapshot even when the option is still available", () => {
    const changed = createOrganization(world, {
      stableKey: "team5:player-options:unrelated-organization",
      formedAt: world.currentDate,
      provenance: { kind: "authored", note: "Stale option negative control" },
      initialProfile: {
        name: "Fixture office",
        classification: "sector:government",
        locationJurisdictionId:
          world.people[request.viewerPersonId]!.homeJurisdictionId,
      },
    });
    expect(storyScenePlayerOffers(changed, request).length).toBeGreaterThan(0);
    expect(revalidateStoryScenePlayerOffer(changed, request, offered)).toEqual({
      status: "stale-option",
    });
  });

  it("rejects edited option content and evidence", () => {
    expect(
      revalidateStoryScenePlayerOffer(world, request, {
        ...offered,
        option: { ...offered.option, evidence: [] },
      }),
    ).toEqual({ status: "stale-option" });
    expect(offered.option.kind).toBe("conversation");
    if (offered.option.kind !== "conversation")
      throw new Error("Expected conversation");
    expect(
      revalidateStoryScenePlayerOffer(world, request, {
        ...offered,
        option: { ...offered.option, listenerPersonIds: [] },
      }),
    ).toEqual({ status: "stale-option" });
  });

  it("returns no offer for a dead viewer and rejects their previous offer", () => {
    const dead = recordPersonDeath(world, {
      stableKey: "team5:player-options:death",
      personId: request.viewerPersonId,
      diedAt: world.currentDate,
      causeKey: "mortality:other",
      sourceEntityIds: [request.viewerPersonId],
      summary: "Fixture death",
      provenance: { kind: "authored", note: "Player option negative control" },
    });
    expect(storyScenePlayerOffers(dead, request)).toEqual([]);
    expect(revalidateStoryScenePlayerOffer(dead, request, offered)).toEqual({
      status: "unavailable",
    });
  });

  it("copies render inputs so later request edits cannot rewrite the offer", () => {
    const mutableRequest = { ...request, moment: { ...request.moment } };
    const copy = storyScenePlayerOffers(world, mutableRequest)[0]!;
    mutableRequest.moment.minuteOfDay += 1;
    expect(copy.request.moment).toEqual(world.currentMoment);
    expect(revalidateStoryScenePlayerOffer(world, request, copy).status).toBe(
      "ready",
    );
  });
});
