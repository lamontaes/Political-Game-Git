import { describe, expect, it } from "vitest";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";
import { describeRoutineOutcome } from "./routine-outcome";
import {
  performVenueActivity,
  venueActivities,
  declineVenueActivity,
} from "./venue-activity";
import { enterLifePath, changeLifePathStatus } from "../simulation/life-paths2";
import {
  deserializeWorld,
  serializeWorld,
  scheduledActivityState,
  createScheduledActivity,
  simulationMomentAtLocalTime,
  addDays,
} from "../simulation";

function life(seed = "next24-routine-route") {
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    startAge: 35,
    household: "lives-alone",
    seed,
  });
  return {
    world: openOrdinaryLife(game.world, game.playerPersonId),
    personId: game.playerPersonId,
  };
}

describe("NEXT24 combined private-citizen routine route", () => {
  it("crosses a full 09–13 job window during Attend, arrives before attendance, pays once after reload", () => {
    const { world, personId } = life();
    const accepted = enterLifePath(world, "shop-assistant").world;
    const morning = passOrdinaryDays(accepted);
    expect(
      morning.history.events.filter(
        (e) => e.type === "life-paths2.work-session",
      ),
    ).toHaveLength(0);
    const entry = venueActivities(morning, personId).find(
      (e) => e.activity.title === "Posted public meeting",
    )!;
    expect(
      entry.refusal,
      JSON.stringify(
        venueActivities(morning, personId).map((e) => ({
          title: e.activity.title,
          refusal: e.refusal,
          journey: e.journey?.activity.title,
        })),
      ),
    ).toBeNull();
    expect(entry.journey?.journeyMinutes).toBe(20);
    const attended = performVenueActivity(morning, personId, entry.activity.id);
    expect(attended.currentMoment.minuteOfDay).toBe(19 * 60 + 45);
    const shifts = attended.history.events.filter(
      (e) => e.type === "life-paths2.work-session",
    );
    expect(shifts).toHaveLength(1);
    const shift = attended.history.scheduledActivities.find(
      (a) =>
        a.sourceEntityIds.some((id) =>
          shifts[0]!.involvedEntityIds.includes(id),
        ) && a.title === "Shop assistant",
    )!;
    expect(scheduledActivityState(attended, shift.id).start.minuteOfDay).toBe(
      540,
    );
    expect(scheduledActivityState(attended, shift.id).end.minuteOfDay).toBe(
      780,
    );
    expect(scheduledActivityState(attended, entry.activity.id).status).toBe(
      "completed",
    );
    const arrival = attended.history.events.find(
      (e) =>
        e.stableKey === `attend-journey:${entry.journey!.activity.id}:arrival`,
    )!;
    const attendance = attended.history.events.find(
      (e) =>
        e.id ===
        scheduledActivityState(attended, entry.activity.id).outcomeEventId,
    )!;
    expect(arrival.sequence).toBeLessThan(attendance.sequence);
    expect(describeRoutineOutcome(morning, attended, personId)).toContain(
      "1 ordinary work shift completed",
    );
    expect(describeRoutineOutcome(morning, attended, personId)).toContain(
      "has not posted yet",
    );
    const loaded = deserializeWorld(serializeWorld(attended));
    expect(performVenueActivity(loaded, personId, entry.activity.id)).toBe(
      loaded,
    );
    const paid = passOrdinaryDays(loaded);
    expect(
      paid.history.resourceTransferOutcomes.filter(
        (o) => o.transferredAmount.minorUnits === 7200,
      ),
    ).toHaveLength(1);
    expect(describeRoutineOutcome(loaded, paid, personId)).toContain(
      "Received USD: 72.00",
    );
    expect(
      passOrdinaryDays(paid).history.resourceTransferOutcomes.filter(
        (o) =>
          o.transferredAmount.minorUnits === 7200 &&
          o.periodStartsAt === shifts[0]!.occurredAt,
      ),
    ).toHaveLength(1);
  });
  it("cancels the included journey without time, pay, arrival or attendance", () => {
    const { world, personId } = life("next24-cancel");
    const entry = venueActivities(world, personId).find(
      (e) => e.activity.title === "Posted public meeting",
    )!;
    const declined = declineVenueActivity(world, personId, entry.activity.id);
    expect(declined.currentMoment).toEqual(world.currentMoment);
    expect(
      scheduledActivityState(declined, entry.journey!.activity.id).status,
    ).toBe("cancelled");
    expect(
      declined.history.events.filter((e) => e.type === "life.scene.arrived"),
    ).toEqual(
      world.history.events.filter((e) => e.type === "life.scene.arrived"),
    );
    expect(declineVenueActivity(declined, personId, entry.activity.id)).toBe(
      declined,
    );
  });
  it("stops a multi-day combined skip at a next-day conflicting commitment without pay or false arrival", () => {
    const { world, personId } = life("next24-conflict");
    const accepted = enterLifePath(world, "shop-assistant").world;
    const moment = (minuteOfDay: number) =>
      simulationMomentAtLocalTime({
        ...world.currentMoment,
        date: addDays(world.currentDate, 1),
        minuteOfDay,
      });
    const conflicted = createScheduledActivity(accepted, {
      stableKey: "next24:care-appointment",
      title: "Care appointment",
      summary: "A confirmed conflicting appointment.",
      kind: "confirmed",
      start: moment(600),
      end: moment(660),
      participantPersonIds: [personId],
      responsiblePersonId: personId,
      location: {
        locationKey: "next24:appointment",
        label: "Appointment",
        jurisdictionId: null,
      },
      sourceEntityIds: [personId],
      flexibility: { kind: "fixed" },
      access: { kind: "private", personIds: [personId] },
    });
    const stopped = passOrdinaryDays(conflicted, 3);
    expect(stopped.currentMoment).toEqual(moment(600));
    expect(
      stopped.history.events.filter(
        (e) => e.type === "life-paths2.work-session",
      ),
    ).toHaveLength(0);
    expect(stopped.history.resourceTransferOutcomes).toEqual(
      world.history.resourceTransferOutcomes,
    );
    expect(
      stopped.history.events.filter((e) => e.type === "life.scene.arrived"),
    ).toEqual(
      world.history.events.filter((e) => e.type === "life.scene.arrived"),
    );
    expect(
      describeRoutineOutcome(conflicted, stopped, personId, 3 * 1440),
    ).toContain("Stopped for Care appointment");
  });
  it("keeps unfunded period tuition pending without a credential or invented money", () => {
    const { world, personId } = life("next24-unfunded");
    const enrolled = enterLifePath(world, "college-office-certificate").world;
    const due = passOrdinaryDays(enrolled, 161);
    expect(
      due.history.futureDueItemStates.some(
        (s) =>
          s.status === "blocked" &&
          s.reasonKey === "education:insufficient-tuition",
      ),
    ).toBe(true);
    expect(describeRoutineOutcome(enrolled, due, personId)).toContain(
      "funds are insufficient",
    );
    expect(
      due.history.events.filter((e) => e.type === "life-paths2.credential"),
    ).toHaveLength(0);
    expect(due.history.resourceTransferOutcomes).toEqual(
      world.history.resourceTransferOutcomes,
    );
    const paused = changeLifePathStatus(
      due,
      due.history.educationEnrollments.at(-1)!.id,
      "pause",
    ).world;
    expect(deserializeWorld(serializeWorld(paused))).toEqual(paused);
  });
});
