import { describe, expect, it } from "vitest";
import {
  type EntityId,
  advanceWorldMinutes,
  deserializeWorld,
  serializeWorld,
  scheduledActivityState,
  simulationMinutesBetween,
  performScheduledActivity,
  householdMembershipsAt,
  recordHouseholdLocation,
} from "../simulation";
import { openOrdinaryLifeRecords } from "../simulation/life-opportunities";
import {
  localCouncilChair,
  postedMeetingVote,
} from "../simulation/living-world/local-council-meetings";
import {
  recordOrdinaryMeetingPresence,
  enterOrdinaryMeeting,
  speakAtOrdinaryMeeting,
  ordinaryMeetingEntry,
} from "../simulation/ordinary-meeting-presence";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { walkOpeningNeighborhood } from "./life-scene-flow";
import { performVenueActivity } from "./venue-activity";
import {
  goBrieflyToOrdinaryMeeting,
  leaveOrdinaryMeeting,
  ordinaryMeetingLeaveOffer,
} from "./ordinary-meeting-actions";
import { projectOrdinaryMeetingScene } from "./ordinary-meeting-scene";
import { previewTimeCommand, submitTimeCommand } from "./time-command";
import { observerPlace } from "./observer-world";
import { activeOrganizationParticipationsAt } from "../simulation/life-queries";
import { homeLocalGovernmentUnits } from "../simulation/nationwide-world/local-governments";
import { sittingLocalOfficers } from "../simulation/living-world/local-government-seats";
import { personName } from "../simulation/people";

function start(placeKey: string) {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      placeKey,
      seed: `meeting-presence:${placeKey}`,
      startKind: "custom",
      startAge: 34,
      household: "shares-a-home",
    }),
  ).game!;
  const world = openOrdinaryLifeRecords(game.world, game.playerPersonId);
  const activity = world.history.scheduledActivities.find(
    (entry) => entry.location.locationKey === "ordinary-life:meeting-room",
  )!;
  return { world, personId: game.playerPersonId, activity };
}

// Each case opens a whole life and holds a council meeting whose members
// decide through the vote engine: several seconds of real work.
describe("prospective meeting presence", { timeout: 60_000 }, () => {
  it("opens the posted meeting at its start through the normal Attend command, then finishes on a second choice", () => {
    const { world, personId, activity } = start("2743000");
    const command = {
      kind: "attend-activity" as const,
      activityId: activity.id,
    };
    const preview = previewTimeCommand(world, personId, command)!;
    expect(preview.target).toEqual(
      scheduledActivityState(world, activity.id).start,
    );

    const first = submitTimeCommand(world, {
      requestId: "enter-posted-meeting",
      personId,
      sourceMoment: world.currentMoment,
      command,
    });
    expect(first.receipt.status).toBe("accepted");
    expect(first.receipt.stoppedEarly).toBe(false);
    expect(first.world.currentMoment).toEqual(preview.target);
    expect(scheduledActivityState(first.world, activity.id).status).toBe(
      "scheduled",
    );
    const active = projectOrdinaryMeetingScene(first.world, personId)!;
    expect(active.phase).toBe("active");
    expect(active.availableActions).toContain("speak");
    expect(active.speechChoices).toHaveLength(3);
    const words = active.speechChoices.find(
      (choice) => choice.key === "ask",
    )!.words;
    const beforeRead = serializeWorld(first.world);
    expect(
      projectOrdinaryMeetingScene(first.world, personId)?.agendaText,
    ).toContain("funding");
    expect(serializeWorld(first.world)).toBe(beforeRead);
    const spoken = speakAtOrdinaryMeeting(
      first.world,
      personId,
      activity.id,
      "ask",
    );
    expect(spoken.history.events.at(-1)?.context.choice).toBe(words);
    const comment = spoken.history.events.at(-1)!;
    const entry = first.world.history.events.find(
      (event) => event.id === active.eventId,
    )!;
    for (const listenerId of new Set(
      entry.participants
        .filter(
          (participant) =>
            participant.role === "presence:participant" ||
            participant.role === "coordination:chair",
        )
        .map((participant) => participant.personId),
    )) {
      expect(comment.involvedEntityIds).toContain(listenerId);
      expect(
        spoken.history.knowledge.some(
          (record) =>
            record.eventId === comment.id &&
            record.personId === listenerId &&
            record.source.kind === "direct",
        ),
      ).toBe(true);
    }
    expect(
      speakAtOrdinaryMeeting(spoken, personId, activity.id, "support"),
    ).toBe(spoken);

    const entered = deserializeWorld(serializeWorld(spoken));
    const second = submitTimeCommand(entered, {
      requestId: "stay-through-posted-meeting",
      personId,
      sourceMoment: entered.currentMoment,
      command,
    });
    expect(second.receipt.status).toBe("accepted");
    expect(scheduledActivityState(second.world, activity.id).status).toBe(
      "completed",
    );
    expect(projectOrdinaryMeetingScene(second.world, personId)?.phase).toBe(
      "immediate-aftermath",
    );
    expect(
      projectOrdinaryMeetingScene(second.world, personId)?.spokenWords,
    ).toBe(words);
    expect(
      simulationMinutesBetween(
        entered.currentMoment,
        second.world.currentMoment,
      ),
    ).toBe(75);
  });

  it.each(["2743000", "1150000"])(
    "records a local chair only on successful attendance in %s",
    (placeKey) => {
      const { world, personId, activity } = start(placeKey);
      const saved = serializeWorld(world);
      expect(projectOrdinaryMeetingScene(world, personId)).toBeNull();
      expect(
        recordOrdinaryMeetingPresence(world, world, personId, activity.id),
      ).toBe(world);
      const journey = world.history.scheduledActivities.find(
        (entry) =>
          entry.location.locationKey === "ordinary-life:to-meeting-room",
      )!;
      const arrived = performVenueActivity(world, personId, journey.id);
      const completed = performScheduledActivity(arrived, activity.id);
      expect(scheduledActivityState(completed, activity.id).status).toBe(
        "completed",
      );
      const recorded = recordOrdinaryMeetingPresence(
        world,
        completed,
        personId,
        activity.id,
      );
      const scene = projectOrdinaryMeetingScene(recorded, personId)!;
      expect(scene.phase).toBe("immediate-aftermath");
      // Where the town's council is seated, the posted meeting is its
      // meeting: a member chairs it and it ends with the council's vote.
      const town = activity.location.jurisdictionId!;
      const councilVote = postedMeetingVote(recorded, town);
      const councilChair = localCouncilChair(completed, town, personId);
      if (councilVote)
        expect(scene.caption).toContain(
          `voted ${councilVote.vote.tally.yea}-${councilVote.vote.tally.nay}`,
        );
      else
        expect(scene.caption).toContain("The discussion ended without a vote.");
      if (councilChair) expect(scene.actors[0]!.personId).toBe(councilChair);
      expect(scene.agendaText).toContain("one extra evening each week");
      const units = homeLocalGovernmentUnits(completed, personId);
      const unit = [
        ...units.municipal,
        ...units.townships,
        ...units.counties,
      ].find((candidate) =>
        sittingLocalOfficers(completed, candidate).some(
          (seat) => seat.personId === scene.actors[0]!.personId,
        ),
      );
      const officerIds = unit
        ? sittingLocalOfficers(completed, unit)
            .map((seat) => seat.personId)
            .filter((id) => id !== personId)
        : [];
      expect(scene.actors.map((actor) => actor.personId).sort()).toEqual(
        [...new Set(officerIds)].sort(),
      );
      expect(
        scene.actors.slice(1).every((actor) => actor.spokenLine === null),
      ).toBe(true);
      expect(
        recorded.people[scene.actors[0]!.personId]!.homeJurisdictionId,
      ).toBe(activity.location.jurisdictionId);
      // Everyone at the meeting is a neighbor already in the world: nobody
      // is made up for the evening.
      expect(recorded.personOrder).toEqual(completed.personOrder);
      for (const actor of scene.actors)
        expect(completed.people[actor.personId]!.homeJurisdictionId).toBe(town);
      expect(
        simulationMinutesBetween(
          completed.currentMoment,
          recorded.currentMoment,
        ),
      ).toBe(0);
      for (const key of Object.keys(
        completed.history,
      ) as (keyof typeof completed.history)[]) {
        if (!["events", "knowledge", "nextSequence"].includes(key))
          expect(recorded.history[key], key).toEqual(completed.history[key]);
      }
      expect(
        recordOrdinaryMeetingPresence(world, recorded, personId, activity.id),
      ).toBe(recorded);
      expect(
        recordOrdinaryMeetingPresence(
          completed,
          completed,
          personId,
          activity.id,
        ),
      ).toBe(completed);
      expect(projectOrdinaryMeetingScene(completed, personId)).toBeNull();
      const loaded = deserializeWorld(serializeWorld(recorded));
      expect(projectOrdinaryMeetingScene(loaded, personId)).toEqual(scene);
      expect(
        projectOrdinaryMeetingScene(advanceWorldMinutes(loaded, 1), personId),
      ).toBeNull();
      const home = walkOpeningNeighborhood(loaded, personId, "home");
      expect(home).not.toBe(loaded);
      expect(projectOrdinaryMeetingScene(home, personId)).toBeNull();
      expect(serializeWorld(world)).toBe(saved);
    },
  );
  it.each(["2743000", "1150000"])(
    "enters explicitly then stays through the remaining meeting exactly once in %s",
    (placeKey) => {
      const { world, personId, activity } = start(placeKey);
      expect(enterOrdinaryMeeting(world, personId, activity.id)).toBe(world);
      const journey = world.history.scheduledActivities.find(
        (entry) =>
          entry.location.locationKey === "ordinary-life:to-meeting-room",
      )!;
      const arrived = performVenueActivity(world, personId, journey.id);
      expect(arrived.currentMoment).toEqual(
        scheduledActivityState(arrived, activity.id).start,
      );
      expect(
        simulationMinutesBetween(
          scheduledActivityState(arrived, journey.id).start,
          scheduledActivityState(arrived, journey.id).end,
        ),
      ).toBe(20);
      expect(projectOrdinaryMeetingScene(arrived, personId)).toBeNull();
      const entered = enterOrdinaryMeeting(arrived, personId, activity.id);
      expect(entered.currentMoment).toEqual(arrived.currentMoment);
      expect(scheduledActivityState(entered, activity.id).status).toBe(
        "scheduled",
      );
      const scene = projectOrdinaryMeetingScene(entered, personId)!;
      expect(scene.phase).toBe("active");
      expect(scene.caption).toContain("chairs the meeting.");
      const entryRecord = entered.history.events.find(
        (event) => event.id === scene.eventId,
      )!;
      const seatTags = entryRecord.tags.filter((tag) =>
        tag.startsWith("attendance-seat:"),
      );
      expect(seatTags.length).toBeGreaterThan(0);
      expect(enterOrdinaryMeeting(entered, personId, activity.id)).toBe(
        entered,
      );
      const loaded = deserializeWorld(serializeWorld(entered));
      expect(projectOrdinaryMeetingScene(loaded, personId)).toEqual(scene);
      const completed = performVenueActivity(loaded, personId, activity.id);
      expect(
        simulationMinutesBetween(loaded.currentMoment, completed.currentMoment),
      ).toBe(75);
      const after = projectOrdinaryMeetingScene(completed, personId)!;
      expect(after.phase).toBe("immediate-aftermath");
      expect(after.actors[0]!.personId).toBe(scene.actors[0]!.personId);
      const attendanceRecord = completed.history.events.find(
        (event) => event.id === after.eventId,
      )!;
      expect(
        attendanceRecord.tags.filter((tag) => tag.startsWith("attendance-seat:")),
      ).toEqual(seatTags);
      const reloaded = deserializeWorld(serializeWorld(completed));
      expect(
        reloaded.history.events.find((event) => event.id === attendanceRecord.id)
          ?.tags,
      ).toEqual(attendanceRecord.tags);
      expect(completed.personOrder).toEqual(entered.personOrder);
      expect(performVenueActivity(completed, personId, activity.id)).toBe(
        completed,
      );
      expect(enterOrdinaryMeeting(completed, personId, activity.id)).toBe(
        completed,
      );
    },
  );
  // Places drawn by the watched-run rule: Hammond, Indiana and Tafuna,
  // American Samoa.
  it.each(["build-25:meeting:1", "build-25:meeting:2"])(
    "records the seated council at the meeting in a watched place (%s)",
    (seed) => {
      const place = observerPlace(seed);
      const { world, personId, activity } = start(place.key);
      if (!activity) return;
      const journey = world.history.scheduledActivities.find(
        (entry) =>
          entry.location.locationKey === "ordinary-life:to-meeting-room",
      )!;
      const completed = performScheduledActivity(
        performVenueActivity(world, personId, journey.id),
        activity.id,
      );
      const recorded = recordOrdinaryMeetingPresence(
        world,
        completed,
        personId,
        activity.id,
      );
      const scene = projectOrdinaryMeetingScene(recorded, personId);
      const town = activity.location.jurisdictionId!;
      const unitsAtHome = homeLocalGovernmentUnits(completed, personId);
      if (
        [
          ...unitsAtHome.municipal,
          ...unitsAtHome.townships,
          ...unitsAtHome.counties,
        ].every((unit) => sittingLocalOfficers(completed, unit).length === 0)
      ) {
        // This place has no recorded council or named notice host. The reader
        // cannot manufacture an attendee to make an entry control work.
        expect(recorded).toBe(completed);
        expect(scene).toBeNull();
        const arrived = performVenueActivity(world, personId, journey.id);
        expect(ordinaryMeetingEntry(arrived, personId, activity.id)).toBeNull();
        expect(enterOrdinaryMeeting(arrived, personId, activity.id)).toBe(
          arrived,
        );
        expect(projectOrdinaryMeetingScene(arrived, personId)).toBeNull();
        expect(deserializeWorld(serializeWorld(arrived))).toEqual(arrived);
        return;
      }
      expect(scene).not.toBeNull();
      const presentScene = scene!;
      const belongs = (id: EntityId) =>
        activeOrganizationParticipationsAt(completed, id).length;
      console.log(
        JSON.stringify({
          seed,
          place: `${place.displayName} (${place.key})`,
          councilChair: localCouncilChair(completed, town, personId) !== null,
          actors: presentScene.actors.map((actor) => ({
            name: personName(recorded.people[actor.personId]!),
            belongs: belongs(actor.personId),
            line: actor.spokenLine ?? null,
          })),
        }),
      );
      expect(recorded.personOrder).toEqual(completed.personOrder);
      for (const actor of presentScene.actors)
        expect(completed.people[actor.personId]!.homeJurisdictionId).toBe(town);
      const units = homeLocalGovernmentUnits(completed, personId);
      const chairId = presentScene.actors[0]!.personId;
      const unit = [
        ...units.municipal,
        ...units.townships,
        ...units.counties,
      ].find((candidate) =>
        sittingLocalOfficers(completed, candidate).some(
          (seat) => seat.personId === chairId,
        ),
      );
      const officers = unit ? sittingLocalOfficers(completed, unit) : [];
      expect(presentScene.actors.map((actor) => actor.personId).sort()).toEqual(
        [
          ...new Set(
            officers
              .map((seat) => seat.personId)
              .filter((id) => id !== personId),
          ),
        ].sort(),
      );
      expect(
        presentScene.actors.every((actor) => actor.spokenLine === null),
      ).toBe(true);
    },
  );

  it("leaves without attendance credit, charges only the recorded return and refuses a changed home endpoint", () => {
    const { world, personId, activity } = start("2309585");
    const journey = world.history.scheduledActivities.find(
      (entry) => entry.location.locationKey === "ordinary-life:to-meeting-room",
    )!;
    const arrived = performVenueActivity(world, personId, journey.id);
    const entered = enterOrdinaryMeeting(arrived, personId, activity.id);
    const unchanged = serializeWorld(entered);
    expect(
      ordinaryMeetingLeaveOffer(entered, personId, activity.id),
    ).toMatchObject({
      kind: "available",
      route: { duration: { minutes: 20 } },
    });
    expect(serializeWorld(entered)).toBe(unchanged);
    const residence = householdMembershipsAt(entered, personId).find(
      (entry) => entry.state.residenceRole === "primary",
    )!;
    const moved = recordHouseholdLocation(entered, {
      stableKey: "fixture:changed-meeting-home",
      householdId: residence.household.id,
      supersedesLocationId: residence.location!.id,
      effectiveAt: entered.currentDate,
      jurisdictionId: residence.location!.jurisdictionId,
      label: "A different home",
      kind: "residence:home",
      provenance: {
        kind: "authored",
        note: "Actual endpoint change blocks the old return route",
      },
    });
    expect(ordinaryMeetingLeaveOffer(moved, personId, activity.id).kind).toBe(
      "unavailable",
    );
    expect(leaveOrdinaryMeeting(moved, personId, activity.id)).toBe(moved);
    const home = leaveOrdinaryMeeting(
      deserializeWorld(serializeWorld(entered)),
      personId,
      activity.id,
    );
    expect(
      simulationMinutesBetween(entered.currentMoment, home.currentMoment),
    ).toBe(20);
    expect(scheduledActivityState(home, activity.id).status).toBe("cancelled");
    expect(
      home.history.events.some(
        (event) => event.type === "civic.meeting-attended",
      ),
    ).toBe(false);
    expect(
      home.history.events.some((event) => event.type === "civic.meeting-left"),
    ).toBe(true);
    expect(home.history.events.at(-1)?.context.location?.setting).toBe("home");
    expect(projectOrdinaryMeetingScene(home, personId)).toBeNull();
    expect(leaveOrdinaryMeeting(home, personId, activity.id)).toBe(home);
  });
  it("records a short visit and returns home without full meeting credit", () => {
    const { world, personId, activity } = start("2309585");
    const first = submitTimeCommand(world, {
      requestId: "visit-posted-meeting",
      personId,
      sourceMoment: world.currentMoment,
      command: { kind: "attend-activity", activityId: activity.id },
    });
    const visited = goBrieflyToOrdinaryMeeting(
      first.world,
      personId,
      activity.id,
    );
    expect(visited).not.toBe(first.world);
    expect(
      simulationMinutesBetween(
        first.world.currentMoment,
        visited.currentMoment,
      ),
    ).toBe(35);
    expect(scheduledActivityState(visited, activity.id).status).toBe(
      "cancelled",
    );
    expect(
      visited.history.events.some(
        (event) => event.type === "civic.meeting-brief-visit",
      ),
    ).toBe(true);
    expect(
      visited.history.events.some(
        (event) => event.type === "civic.meeting-attended",
      ),
    ).toBe(false);
    expect(projectOrdinaryMeetingScene(visited, personId)).toBeNull();
  });
  it("does not author presence for another person", () => {
    const { world, personId, activity } = start("2309585");
    const completed = performVenueActivity(world, personId, activity.id);
    const other = world.personOrder.find((id) => id !== personId)!;
    expect(
      recordOrdinaryMeetingPresence(world, completed, other, activity.id),
    ).toBe(completed);
    expect(projectOrdinaryMeetingScene(completed, other)).toBeNull();
  });
});
