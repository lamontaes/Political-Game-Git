import { beforeAll, describe, expect, it } from "vitest";
import {
  deserializeWorld,
  advanceWorldMinutes,
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
import {
  readStorySceneSituation,
  resolveStoryScene,
} from "./story-scene-resolver";
import { projectToday } from "./day-overview";
import { recordedRoomPresence } from "./recorded-room-presence";
import {
  createFormationContext,
  recordPrivateBelief,
} from "../simulation/politics";
import { recordWorldEvent } from "../simulation/world";
import {
  hearersOfPerson,
  tellViewToHearers,
} from "../simulation/living-world/official-views";
import { projectPeopleDirectory } from "./people-directory";

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

    it("uses recorded presence and heard knowledge in an authored encounter within the generated world", () => {
      const presentHolder = world.personOrder.find(
        (id) => id !== viewer && hearersOfPerson(world, id).includes(viewer),
      )!;
      expect(
        presentHolder,
        "A real confidant can reach the player",
      ).toBeDefined();
      const location = recordedRoomPresence(world, viewer)!.location;
      // The ordinary opening is correctly alone. Author one bounded encounter
      // through the canonical event writer; this is not automatic scene proof.
      const encounter = recordWorldEvent(world, {
        stableKey: "heard-views:authored-encounter",
        type: "life.scene.opened",
        occurredAt: world.currentDate,
        recordedAt: world.currentDate,
        jurisdictionId: location.jurisdictionId,
        involvedEntityIds: [viewer, presentHolder],
        participants: [viewer, presentHolder].map((personId) => ({
          personId,
          role: "presence:participant",
          detail: null,
        })),
        personFactConstraints: [],
        visibility: "private",
        tags: [
          `moment:${JSON.stringify(world.currentMoment)}`,
          "authored-fixture",
        ],
        summary: "Authored encounter for the knowledge-boundary fixture.",
        context: {
          location,
          socialContext: null,
          pressure: null,
          choice: null,
          motivation: null,
          immediateReaction: null,
        },
      });
      const presence = recordedRoomPresence(encounter, viewer)!;
      expect(presence).not.toBeNull();
      const absentHolder = world.personOrder.find(
        (id) => !presence.personIds.includes(id),
      )!;
      expect(absentHolder).toBeDefined();
      let withViews = encounter;
      const holdView = (holderId: EntityId) => {
        withViews = recordPrivateBelief(withViews, {
          stableKey: `heard-views:held:${holderId}`,
          personId: holderId,
          propositionId: null,
          subject: { kind: "official", personId: viewer },
          formedAt: withViews.currentDate,
          position: "oppose",
          conviction: "tentative",
          salience: "low",
          flexibility: "open",
          rationale: null,
          formation: createFormationContext("evidence:new", {
            note: "Authored view for the knowledge-boundary fixture.",
          }),
          supersedesBeliefId: null,
        });
      };
      holdView(presentHolder);
      holdView(absentHolder);
      const before = serializeWorld(withViews);
      const situation = currentStorySceneSituation(withViews, viewer)!;
      expect(
        situation.presentOfficialViews.map((entry) => entry.holderId),
      ).toEqual([presentHolder]);
      expect(projectPeopleDirectory(withViews, viewer).heardViews).toEqual([]);
      expect(serializeWorld(withViews)).toBe(before);

      const tellerId = presentHolder;
      expect(
        tellerId,
        "A real confidant can reach the player in this generated world",
      ).toBeDefined();
      if (tellerId !== presentHolder && tellerId !== absentHolder)
        holdView(tellerId);
      withViews = recordWorldEvent(withViews, {
        stableKey: "heard-views:generated-world-reflection",
        type: "people.law-reflection",
        occurredAt: withViews.currentDate,
        recordedAt: withViews.currentDate,
        jurisdictionId: null,
        involvedEntityIds: [tellerId],
        participants: [
          { personId: tellerId, role: "focus:subject", detail: null },
        ],
        personFactConstraints: [],
        visibility: "private",
        tags: ["people.official-view"],
        summary: "Authored reflection for the knowledge-boundary fixture.",
        context: {
          location: null,
          socialContext: null,
          pressure: null,
          choice: null,
          motivation: null,
          immediateReaction: null,
        },
      });
      const eventId = withViews.history.events.at(-1)!.id;
      const told = tellViewToHearers(withViews, {
        holderId: tellerId,
        officialId: viewer,
        eventId,
        stableKey: "heard-views:generated-world",
      });
      const heard = projectPeopleDirectory(told, viewer).heardViews;
      expect(heard).toHaveLength(1);
      expect(heard[0]).toMatchObject({
        holderId: tellerId,
        officialId: viewer,
        position: "oppose",
        eventId,
      });
      expect(
        told.history.privateBeliefs.filter(
          (row) =>
            row.personId === viewer &&
            row.subject?.kind === "official" &&
            row.subject.personId === viewer,
        ),
      ).toEqual([]);
      expect(
        projectPeopleDirectory(deserializeWorld(serializeWorld(told)), viewer)
          .heardViews,
      ).toEqual(heard);
      process.stdout.write(
        `heard-view seed=${seed} world=${world.id} date=${world.currentDate} place=${place.key} holder=${tellerId} listener=${viewer} event=${eventId} knowledge=${heard[0]!.knowledgeId}\n`,
      );
    });

    it("resolves a recorded place without substituting a household or expected roster", () => {
      const before = serializeWorld(world);
      const request = currentStorySceneRequest(world, viewer)!;
      expect(request.place.kind).toBe("recorded-place");
      const scene = resolveStoryScene(world, request);
      expect(scene.status).toBe("resolved");
      expect(scene.presentPeople.map((person) => person.personId)).toEqual([
        viewer,
      ]);
      expect(scene.expectedPeople).toEqual([]);
      expect(scene.options).toEqual([]);
      expect(serializeWorld(world)).toBe(before);
    });

    it("selects only recorded initial participants and expires initial placement after time passes", () => {
      const before = serializeWorld(world);
      const presence = recordedRoomPresence(world, viewer)!;
      expect(presence).not.toBeNull();
      expect(presence.personIds).toEqual([viewer]);
      expect(presence.eventId).toBe(
        currentStorySceneSituation(world, viewer)!.location!.sourceRecordIds[0],
      );
      const later = advanceWorldMinutes(world, 1);
      expect(recordedRoomPresence(later, viewer)).toBeNull();
      expect(currentStorySceneSituation(later, viewer)!.status).toBe(
        "missing-place",
      );
      expect(serializeWorld(world)).toBe(before);
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
