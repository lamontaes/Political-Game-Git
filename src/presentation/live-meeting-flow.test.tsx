import { beforeAll, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  deserializeWorld,
  serializeWorld,
  scheduledActivityState,
  type EntityId,
  type World,
} from "../simulation";
import { openOrdinaryLifeRecords } from "../simulation/life-opportunities";
import { speakAtOrdinaryMeeting } from "../simulation/ordinary-meeting-presence";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { performVenueActivity, venueTimingLabel } from "./venue-activity";
import { playCalendarActivity } from "./calendar-time-control";
import { previewTimeCommand, submitTimeCommand } from "./time-command";
import { projectOrdinaryMeetingScene } from "./ordinary-meeting-scene";
import { projectToday } from "./day-overview";
import { OrdinaryMeetingPanel } from "../player/OrdinaryMeetingPanel";

// Reuse the three distinct logged random draws, including a county-only place.
const places = ["3220700", "2537385", "3556810"];
describe.each(places)(
  "live meeting entry in %s",
  { timeout: 60_000 },
  (placeKey) => {
    let world: World,
      viewer: EntityId,
      activityId: EntityId,
      journeyId: EntityId;
    beforeAll(() => {
      const game = generateOpeningLife(
        prepareOpeningLife({
          ...DEFAULT_NEW_GAME_SETUP,
          seed: `team5-live-meeting:${placeKey}`,
          placeKey,
          startKind: "custom",
          startAge: 22,
          household: "shares-a-home",
        }),
      ).game!;
      viewer = game.playerPersonId;
      world = openOrdinaryLifeRecords(game.world, viewer);
      activityId = world.history.scheduledActivities.find(
        (a) => a.location.locationKey === "ordinary-life:meeting-room",
      )!.id;
      journeyId = world.history.scheduledActivities.find(
        (a) => a.kind === "travel" && a.sourceEntityIds.includes(activityId),
      )!.id;
    });
    it("Today, calendar, time runner and separate journey open a live meeting without completing it", () => {
      const routes = [
        performVenueActivity(world, viewer, activityId),
        playCalendarActivity(world, viewer, activityId).world,
        submitTimeCommand(world, {
          requestId: `meeting:${placeKey}`,
          personId: viewer,
          sourceMoment: world.currentMoment,
          command: { kind: "attend-activity", activityId },
        }).world,
        performVenueActivity(world, viewer, journeyId),
      ];
      for (const arrived of routes) {
        expect(scheduledActivityState(arrived, activityId).status).toBe(
          "scheduled",
        );
        const scene = projectOrdinaryMeetingScene(arrived, viewer)!;
        expect(scene?.phase).toBe("active");
        expect(scene.actors.length).toBeGreaterThan(0);
        expect(scene.agendaItems).toHaveLength(4);
        expect(scene.speechChoices).toHaveLength(3);
        expect(venueTimingLabel(arrived, activityId)).toContain(
          "stay through the meeting",
        );
        expect(venueTimingLabel(arrived, activityId)).not.toContain(
          "Travel takes",
        );
        const before = serializeWorld(arrived);
        const html = renderToStaticMarkup(
          <OrdinaryMeetingPanel
            world={arrived}
            personId={viewer}
            onWorldChange={() => undefined}
            onOpenEntity={() => undefined}
            onOutcome={() => undefined}
          />,
        );
        expect(html).toContain("ordinary-meeting-agenda-order");
        expect(html).toContain("ordinary-meeting-people");
        expect(html).toContain("ordinary-meeting-roll-call");
        expect(html).toContain("Speak");
        expect(serializeWorld(arrived)).toBe(before);
        expect(
          previewTimeCommand(arrived, viewer, {
            kind: "attend-activity",
            activityId,
          })?.target,
        ).toEqual(arrived.currentMoment);
        expect(performVenueActivity(arrived, viewer, activityId)).toBe(arrived);
      }
    });
    it("speech/save retain the live meeting; explicit finish clears the waiting item", () => {
      const arrived = performVenueActivity(world, viewer, activityId);
      const spoken = speakAtOrdinaryMeeting(arrived, viewer, activityId, "ask");
      expect(spoken).not.toBe(arrived);
      const reloaded = deserializeWorld(serializeWorld(spoken));
      expect(projectOrdinaryMeetingScene(reloaded, viewer)?.phase).toBe(
        "active",
      );
      expect(
        projectOrdinaryMeetingScene(reloaded, viewer)?.spokenWords,
      ).toContain("how would the extra evening be funded");
      const finished = submitTimeCommand(reloaded, {
        requestId: `finish:${placeKey}`,
        personId: viewer,
        sourceMoment: reloaded.currentMoment,
        command: { kind: "finish-meeting", activityId },
      }).world;
      expect(scheduledActivityState(finished, activityId).status).toBe(
        "completed",
      );
      expect(
        projectToday(finished, viewer).waiting.some((item) =>
          /public meeting/i.test(item.sentence),
        ),
      ).toBe(false);
      expect(projectToday(finished, viewer).now).not.toContain("nobody else");
    });
    it("Until needed on the meeting morning stops at its departure rather than skipping the evening", () => {
      const morning = submitTimeCommand(world, {
        requestId: `morning:${placeKey}`,
        personId: viewer,
        sourceMoment: world.currentMoment,
        command: { kind: "days", days: 1 },
      }).world;
      const departure = scheduledActivityState(morning, journeyId).start;
      const preview = previewTimeCommand(morning, viewer, {
        kind: "quiet-stretch",
      })!;
      expect(preview).not.toBeNull();
      expect(preview.target).toEqual(departure);
      expect(preview.cappedBy?.title).toBe("Posted public meeting");
      const stopped = submitTimeCommand(morning, {
        requestId: `departure:${placeKey}`,
        personId: viewer,
        sourceMoment: morning.currentMoment,
        command: { kind: "quiet-stretch" },
      }).world;
      expect(stopped.currentMoment).toEqual(departure);
      expect(scheduledActivityState(stopped, activityId).status).toBe(
        "scheduled",
      );
    });
  },
);
