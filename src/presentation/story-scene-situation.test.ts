import { beforeAll, describe, expect, it } from "vitest";
import {
  deserializeWorld,
  serializeWorld,
  type EntityId,
  type World,
} from "../simulation";
import {
  lifePlaceStateIdentities,
  searchLifePlaces,
} from "../simulation/life-places";
import { SeededRng } from "../simulation/rng";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import {
  currentStorySceneRequest,
  currentStorySceneSituation,
} from "./story-scene-day";
import { readStorySceneSituation } from "./story-scene-resolver";
import { projectToday } from "./day-overview";

const seed = "session4-live-place-block-one";
const random = new SeededRng(seed);
const state = random.pick(lifePlaceStateIdentities());
const places = searchLifePlaces("", 5000, {
  stateJurisdictionKey: state.jurisdictionKey,
  scope: "locality",
});
if (!places.length)
  throw new Error(
    "Selected jurisdiction has no locality in the existing place data.",
  );
const place = random.pick(places);

describe(
  "live place block through ordinary generation",
  { timeout: 120_000 },
  () => {
    let world: World;
    let viewer: EntityId;
    beforeAll(() => {
      const game = generateOpeningLife(
        prepareOpeningLife({
          ...DEFAULT_NEW_GAME_SETUP,
          seed,
          placeKey: place.key,
          startAge: 34,
          startingLife: "ordinary-life",
        }),
      ).game!;
      world = game.world;
      viewer = game.playerPersonId;
      process.stdout.write(
        `block one seed=${seed} world=${world.id} date=${world.currentDate} place=${place.key} viewer=${viewer}\n`,
      );
    });

    it("reads the actual initial place without creating occupants, speech or records", () => {
      const before = serializeWorld(world);
      const situation = currentStorySceneSituation(world, viewer);
      expect(situation).not.toBeNull();
      expect(situation!.status).toBe("current");
      expect(situation!.location?.sourceRecordIds.length).toBeGreaterThan(0);
      for (const id of situation!.location!.sourceRecordIds) {
        const source = world.history.events.find((event) => event.id === id)!;
        expect(source.context.location?.label).toBe(situation!.location!.label);
        expect(
          source.participants.some((person) => person.personId === viewer),
        ).toBe(true);
        expect(source.tags).toContain(
          `moment:${JSON.stringify(world.currentMoment)}`,
        );
      }
      expect(situation).not.toHaveProperty("presentPeople");
      expect(situation).not.toHaveProperty("lines");
      expect(situation!.quiet).toBe(
        situation!.pendingRequests.length === 0 &&
          situation!.currentActivity === null,
      );
      expect(serializeWorld(world)).toBe(before);
      process.stdout.write(
        `block one status=${situation!.status} quiet=${situation!.quiet} sources=${situation!.location!.sourceRecordIds.join(",")} pending=${situation!.pendingRequests.map((row) => row.eventId).join(",")}\n`,
      );
    });

    it("retains the same situation after a canonical save round trip", () => {
      const restored = deserializeWorld(serializeWorld(world));
      expect(currentStorySceneSituation(restored, viewer)).toEqual(
        currentStorySceneSituation(world, viewer),
      );
    });

    it("feeds the actual recorded location to the existing Day consumer", () => {
      const before = serializeWorld(world);
      const situation = currentStorySceneSituation(world, viewer)!;
      expect(projectToday(world, viewer).placeName).toBe(
        situation.location!.label,
      );
      expect(serializeWorld(world)).toBe(before);
    });

    it("refuses a different viewer, future moment, or unsupported place without mutations", () => {
      const request = currentStorySceneRequest(world, viewer)!;
      const before = serializeWorld(world);
      const other = world.personOrder.find((person) => person !== viewer)!;
      expect(
        readStorySceneSituation(world, { ...request, viewerPersonId: other })
          .status,
      ).toBe("invalid-viewer");
      expect(
        readStorySceneSituation(world, {
          ...request,
          moment: {
            ...request.moment,
            minuteOfDay: request.moment.minuteOfDay + 1,
          },
        }).status,
      ).toBe("unsupported-moment");
      expect(
        readStorySceneSituation(world, {
          ...request,
          place: { kind: "opened-scene", eventId: world.id },
        }).status,
      ).toBe("missing-place");
      expect(serializeWorld(world)).toBe(before);
    });
  },
);
