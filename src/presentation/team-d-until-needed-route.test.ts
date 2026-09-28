import { describe, expect, it } from "vitest";

import {
  campaignLifeActivityRecords,
  projectCampaignLifeActivities,
  compareSimulationMoments,
  deserializeWorld,
  homePartyChapters,
  scheduledActivityState,
  serializeWorld,
  type EntityId,
  type World,
} from "../simulation";
import { requestPartyWork } from "./campaign-life-actions";
import { declineCalendarActivity } from "./calendar-time-control";
import { openOrdinaryLife } from "./ordinary-life";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { projectCandidateGuidanceScene } from "./candidate-guidance-scene";
import { projectOrdinaryMeetingScene } from "./ordinary-meeting-scene";
import { openingLifeLocation } from "./life-scene-flow";
import { canCallOffCampaignLifeAppointment } from "./scheduled-activity-choice";
import { previewTimeCommand, submitTimeCommand } from "./time-command";
import { venueActivities } from "./venue-activity";

function press(
  world: World,
  personId: EntityId,
  command: "quiet-stretch" | "home" | EntityId,
) {
  const requested =
    command === "quiet-stretch"
      ? { kind: "quiet-stretch" as const }
      : command === "home"
        ? { kind: "walk" as const, destination: "home" as const }
        : { kind: "attend-activity" as const, activityId: command };
  return submitTimeCommand(world, {
    requestId: `until-needed:${world.history.nextSequence}:${command}`,
    personId,
    sourceMoment: world.currentMoment,
    command: requested,
  });
}

describe("continue until something needs me on a real civic week", () => {
  it("stops for the posted meeting and party appointment, preserving attend, skip, and return", () => {
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "team-d-three-day",
        startAge: 34,
        startKind: "custom",
        placeKey: "0406260",
      }),
    ).game!;
    const personId = game.playerPersonId;
    let world = openOrdinaryLife(game.world, personId);
    const meeting = world.history.scheduledActivities.find(
      (activity) => activity.title === "Posted public meeting",
    )!;
    world = requestPartyWork(
      world,
      personId,
      "candidate-guidance",
      homePartyChapters(world)[0]!.organizationId,
    );
    const guidance = campaignLifeActivityRecords(world).at(-1)!;

    for (const activityId of [meeting.id, guidance.scheduledActivityId]) {
      const activity = world.history.scheduledActivities.find(
        (entry) => entry.id === activityId,
      )!;
      const morning = press(world, personId, "quiet-stretch");
      expect(morning.receipt.status).toBe("accepted");
      expect(morning.world.currentDate).toBe(
        scheduledActivityState(world, activityId).start.date,
      );
      expect(scheduledActivityState(morning.world, activityId).status).toBe(
        "scheduled",
      );

      const preview = previewTimeCommand(morning.world, personId, {
        kind: "quiet-stretch",
      })!;
      const stopped = press(morning.world, personId, "quiet-stretch");
      expect(stopped.receipt.status).toBe("accepted");
      expect(stopped.receipt.stoppedEarly).toBe(true);
      // The receipt names what the stop is for: the meeting itself, or the
      // trip that has to start before the party appointment.
      expect(stopped.receipt.outcome).toContain(
        activityId === meeting.id
          ? "The public meeting starts at"
          : "comes first.",
      );
      expect(
        compareSimulationMoments(stopped.world.currentMoment, preview.target),
      ).toBeLessThan(0);
      expect(
        compareSimulationMoments(
          stopped.world.currentMoment,
          scheduledActivityState(stopped.world, activityId).start,
        ),
      ).toBeLessThanOrEqual(0);
      expect(scheduledActivityState(stopped.world, activityId).status).toBe(
        "scheduled",
      );
      const venue = venueActivities(stopped.world, personId).find(
        (entry) => entry.activity.id === activityId,
      );
      expect(venue?.refusal).toBeNull();
      expect(
        previewTimeCommand(stopped.world, personId, {
          kind: "attend-activity",
          activityId,
        }),
      ).not.toBeNull();
      const skipped = declineCalendarActivity(
        stopped.world,
        personId,
        activityId,
      );
      expect(
        scheduledActivityState(skipped.world, activityId).status,
        `${activity.title} (${activity.kind}): ${skipped.outcome}`,
      ).toBe("cancelled");
      expect(skipped.outcome.length).toBeGreaterThan(0);
      expect(
        canCallOffCampaignLifeAppointment(stopped.world, personId, activityId),
      ).toBe(activityId === guidance.scheduledActivityId);
      expect(
        canCallOffCampaignLifeAppointment(
          stopped.world,
          guidance.hostPersonId,
          activityId,
        ),
      ).toBe(false);
      const skippedReloaded = deserializeWorld(serializeWorld(skipped.world));
      expect(
        declineCalendarActivity(skippedReloaded, personId, activityId).world,
      ).toBe(skippedReloaded);
      if (activityId === guidance.scheduledActivityId) {
        expect(skipped.outcome).toContain(
          "The record does not say the host was notified.",
        );
        const callOff = skipped.world.history.events.at(-1)!;
        expect(callOff.type).toBe("life.scheduled-activity-declined");
        expect(callOff.tags).toContain("chosen");
        expect(callOff.context.choice).toContain("Call off");
        expect(callOff.participants.map((entry) => entry.personId)).toEqual([
          personId,
        ]);
        expect(
          skipped.world.history.knowledge.filter(
            (entry) => entry.personId === guidance.hostPersonId,
          ),
        ).toEqual(
          stopped.world.history.knowledge.filter(
            (entry) => entry.personId === guidance.hostPersonId,
          ),
        );
        expect(
          projectCampaignLifeActivities(skippedReloaded, personId).find(
            (entry) => entry.lifeActivityId === guidance.id,
          )?.state,
        ).toBe("declined");
        const journey = skippedReloaded.history.scheduledActivities.find(
          (entry) =>
            entry.kind === "travel" &&
            entry.sourceEntityIds.includes(activityId),
        )!;
        expect(scheduledActivityState(skippedReloaded, journey.id).status).toBe(
          "cancelled",
        );
        expect(
          compareSimulationMoments(
            press(skippedReloaded, personId, "quiet-stretch").world
              .currentMoment,
            skippedReloaded.currentMoment,
          ),
        ).toBeGreaterThan(0);
      }

      const arrived = press(stopped.world, personId, activityId);
      expect(arrived.receipt.status).toBe("accepted");
      expect(
        activityId === meeting.id
          ? projectOrdinaryMeetingScene(arrived.world, personId)?.phase
          : projectCandidateGuidanceScene(arrived.world, personId)?.phase,
      ).toBe("active");
      const saved = deserializeWorld(serializeWorld(arrived.world));
      const stayed = press(saved, personId, activityId);
      expect(stayed.receipt.status).toBe("accepted");
      expect(scheduledActivityState(stayed.world, activityId).status).toBe(
        "completed",
      );
      const home = press(stayed.world, personId, "home");
      expect(home.receipt.status).toBe("accepted");
      expect(openingLifeLocation(home.world, personId)?.setting).toBe("home");
      world = deserializeWorld(serializeWorld(home.world));
    }
  }, 15_000);
});
