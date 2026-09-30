import { beforeAll, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  activeWorkRelationshipsAt,
  recordWorldEvent,
  serializeWorld,
  type EntityId,
  type World,
} from "../simulation";
import {
  lifePlaceStateIdentities,
  searchLifePlaces,
  type LifePlace,
} from "../simulation/life-places";
import { placeLocalGovernmentUnits } from "../simulation/nationwide-world/local-governments";
import { SeededRng } from "../simulation/rng";
import {
  enterOrdinaryMeeting,
  speakAtOrdinaryMeeting,
} from "../simulation/ordinary-meeting-presence";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { openOrdinaryLifeRecords } from "../simulation/life-opportunities";
import { submitTimeCommand } from "./time-command";
import {
  currentStorySceneRequest,
  projectStoryMeetingScene,
  projectStorySceneDay,
} from "./story-scene-day";
import {
  revalidateStoryScenePlayerOffer,
  storyScenePlayerOffers,
} from "./story-scene-player-options";
import { StorySceneDayPanel } from "../player/StorySceneDayPanel";

const rng = new SeededRng("team5-day-mount:places");
const selected: LifePlace[] = [];
const states = [...lifePlaceStateIdentities()];
while (states.length > 0 && selected.length < 3) {
  const state = states.splice(rng.integer(0, states.length), 1)[0]!;
  const candidates = searchLifePlaces("", 5000, {
    stateJurisdictionKey: state.jurisdictionKey,
    scope: "locality",
  }).filter((place) => {
    if (selected.length < 2) return true;
    const units = placeLocalGovernmentUnits(place);
    return (
      units.municipal.length === 0 &&
      units.townships.length === 0 &&
      units.counties.length > 0
    );
  });
  if (candidates.length > 0) selected.push(rng.pick(candidates));
}
if (selected.length !== 3) throw new Error("Unincorporated test place missing");

describe.each(selected)(
  "day resolver mount in $key",
  { timeout: 60_000 },
  (place) => {
    let world: World;
    let viewer: EntityId;
    beforeAll(() => {
      const seed = `team5-day-mount:${place.key}`;
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
      viewer = game.playerPersonId;
      process.stdout.write(
        `day mount place=${place.key} seed=${seed} unincorporated=${placeLocalGovernmentUnits(place).municipal.length === 0}\n`,
      );
    });

    it("mounts the fresh roster as names and leaves the world unchanged", () => {
      const before = serializeWorld(world);
      const scene = projectStorySceneDay(world, viewer)!;
      expect(scene.status).toBe("resolved");
      expect(
        scene.presentPeople.some((person) => person.personId === viewer),
      ).toBe(true);
      const html = renderToStaticMarkup(
        <StorySceneDayPanel
          world={world}
          personId={viewer}
          onOpenEntity={() => undefined}
        />,
      );
      expect(html).toContain('data-testid="story-scene-day"');
      expect(html).toContain(
        scene.presentPeople.find((person) => person.personId === viewer)!.name,
      );
      expect(serializeWorld(world)).toBe(before);
    });

    it("selects a recorded work arrival without inferring a coworker roster", () => {
      const job = activeWorkRelationshipsAt(world, viewer)[0]!;
      expect(job).toBeDefined();
      const organizationId = job.relationship.organizationId;
      if (!organizationId)
        throw new Error("Fixture employment has no organization");
      const arrived = recordWorldEvent(world, {
        stableKey: `day-mount:work-arrival:${viewer}`,
        type: "life.scene.arrived",
        occurredAt: world.currentDate,
        recordedAt: world.currentDate,
        jurisdictionId: job.role.locationJurisdictionId,
        involvedEntityIds: [viewer, job.relationship.id, organizationId],
        participants: [
          {
            personId: viewer,
            role: "presence:participant",
            detail: "Recorded fixture work arrival",
          },
        ],
        personFactConstraints: [],
        visibility: "private",
        tags: ["fixture:work-arrival"],
        summary: "You are at your recorded workplace.",
        context: {
          location: {
            jurisdictionId: job.role.locationJurisdictionId,
            label: "Fixture employer",
            setting: "work",
          },
          socialContext: null,
          pressure: null,
          choice: null,
          motivation: null,
          immediateReaction: null,
        },
      });
      expect(currentStorySceneRequest(arrived, viewer)?.place).toMatchObject({
        kind: "workplace",
        organizationId: job.relationship.organizationId,
        jurisdictionId: job.role.locationJurisdictionId,
      });
      const result = projectStorySceneDay(arrived, viewer)!;
      expect(result.status).toBe("resolved");
      expect(result.presentPeople).toEqual([]);
      expect(result.options).toEqual([]);
      expect(
        renderToStaticMarkup(
          <StorySceneDayPanel
            world={arrived}
            personId={viewer}
            onOpenEntity={() => undefined}
          />,
        ),
      ).toBe("");
    });

    it("keeps an invitation expected and shows no invited roster or choices", () => {
      const invited = openOrdinaryLifeRecords(world, viewer);
      const activity = invited.history.scheduledActivities.find(
        (entry) => entry.location.locationKey === "ordinary-life:meeting-room",
      )!;
      expect(activity).toBeDefined();
      expect(projectStoryMeetingScene(invited, viewer)).toBeNull();
      const request = {
        viewerPersonId: viewer,
        place: { kind: "activity" as const, activityId: activity.id },
        moment: invited.currentMoment,
      };
      expect(storyScenePlayerOffers(invited, request)).toEqual([]);
    });

    it("reads actual meeting arrival, exact speech, and stale speech after the writer", () => {
      const invited = openOrdinaryLifeRecords(world, viewer);
      const activity = invited.history.scheduledActivities.find(
        (entry) => entry.location.locationKey === "ordinary-life:meeting-room",
      )!;
      let arrived = submitTimeCommand(invited, {
        requestId: `day-mount:${place.key}:arrive`,
        personId: viewer,
        sourceMoment: invited.currentMoment,
        command: { kind: "attend-activity", activityId: activity.id },
      }).world;
      const notice = arrived.history.events.find(
        (event) =>
          activity.sourceEntityIds.includes(event.id) &&
          event.type === "civic.meeting-notice",
      )!;
      const chair = arrived.personOrder.find(
        (id) =>
          id !== viewer &&
          arrived.people[id]!.homeJurisdictionId ===
            activity.location.jurisdictionId &&
          arrived.people[id]!.birthDate < "2000-01-01",
      )!;
      expect(chair).toBeDefined();
      // Explicit fixture chair, preserving original source IDs/dates/order.
      arrived = {
        ...arrived,
        history: {
          ...arrived.history,
          events: arrived.history.events.map((event) =>
            event.id !== notice.id
              ? event
              : {
                  ...event,
                  involvedEntityIds: [
                    ...new Set([...event.involvedEntityIds, chair]),
                  ].sort(),
                  participants: [
                    ...event.participants,
                    {
                      personId: chair,
                      role: "coordination:chair" as const,
                      detail: "Explicit fixture chair",
                    },
                  ].sort(
                    (a, b) =>
                      a.personId.localeCompare(b.personId) ||
                      a.role.localeCompare(b.role),
                  ),
                },
          ),
        },
      };
      const entered = enterOrdinaryMeeting(arrived, viewer, activity.id);
      const scene = projectStoryMeetingScene(entered, viewer)!;
      expect(scene.phase).toBe("active");
      expect(scene.speechChoices.length).toBeGreaterThan(0);
      const request = currentStorySceneRequest(entered, viewer)!;
      expect(request.place).toEqual({
        kind: "activity",
        activityId: activity.id,
      });
      const offers = storyScenePlayerOffers(entered, request);
      const speech = offers.find(
        (offer) => offer.option.kind === "meeting-speech",
      )!;
      expect(
        revalidateStoryScenePlayerOffer(entered, request, speech).status,
      ).toBe("ready");
      const choice = scene.speechChoices[0]!;
      const spoken = speakAtOrdinaryMeeting(
        entered,
        viewer,
        activity.id,
        choice.key,
      );
      expect(spoken).not.toBe(entered);
      expect(projectStoryMeetingScene(spoken, viewer)!.speechChoices).toEqual(
        [],
      );
      expect(
        revalidateStoryScenePlayerOffer(
          spoken,
          { ...request, moment: spoken.currentMoment },
          speech,
        ).status,
      ).toBe("stale-option");
      expect(
        spoken.history.events.some(
          (event) => event.context.choice === choice.words,
        ),
      ).toBe(true);
    });
  },
);
