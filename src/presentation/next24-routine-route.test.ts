import { describe, expect, it } from "vitest";
import { projectLifeRecord } from "./life-record";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";
import {
  describeRoutineOutcome,
  formatRoutineElapsedMinutes,
} from "./routine-outcome";
import {
  performVenueActivity,
  venueActivities,
  declineVenueActivity,
} from "./venue-activity";
import {
  enterLifePath,
  changeLifePathStatus,
  performLifePathSession,
  scheduleLifePathSession,
  lifePaths2Handlers,
} from "../simulation/life-paths2";
import { recordedPayStubs } from "../simulation/resource-income";
import {
  ACTIVITY_LAPSED_EVENT,
  deserializeWorld,
  serializeWorld,
  scheduledActivityState,
  createScheduledActivity,
  simulationMomentAtLocalTime,
  addDays,
  advanceWorld,
  advanceWorldMinutes,
} from "../simulation";
import { createCampaignElectionTransitionRegistry } from "../simulation/campaigns";

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
  it("suppresses the routine notice for a recorded paycheck", () => {
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      startAge: 30,
      placeKey: "2743000",
      startingLife: "ordinary-life",
      household: "lives-alone",
      questionnaire: "skipped",
      priors: [],
      seed: "next24-no-paycheck-toast",
    });
    const personId = game.playerPersonId;
    const entered = enterLifePath(game.world, "shop-assistant");
    expect(entered.ok).toBe(true);
    const scheduled = scheduleLifePathSession(
      entered.world,
      entered.world.history.workRelationships.at(-1)!.id,
    );
    expect(scheduled.ok).toBe(true);
    const worked = performLifePathSession(
      scheduled.world,
      scheduled.world.history.scheduledActivities.at(-1)!.id,
    );
    expect(worked.ok).toBe(true);
    const paid = advanceWorld(worked.world, 1, lifePaths2Handlers());
    expect(recordedPayStubs(paid, personId)).toHaveLength(1);
    const notice = describeRoutineOutcome(worked.world, paid, personId);
    expect(notice).toBe("");
    expect(notice).not.toContain("Paycheck:");
    expect(notice).not.toContain("gross received");
    expect(notice).not.toContain("net received");
    expect(notice).not.toContain("Payment for the completed shift");
    expect(notice).not.toContain("Paid $");
    expect(notice).not.toContain("Received $");
  });

  it("does not repeat the clock in routine outcome notices", () => {
    const { world, personId } = life("next24-no-clock-toast");
    const advanced = advanceWorldMinutes(
      world,
      60,
      createCampaignElectionTransitionRegistry(),
    );
    expect(describeRoutineOutcome(world, advanced, personId)).not.toContain(
      "It is now",
    );
  });

  it("makes exact elapsed duration readable without changing the World", () => {
    expect(formatRoutineElapsedMinutes(0)).toBe("0 minutes");
    expect(formatRoutineElapsedMinutes(60)).toBe("1 hour");
    expect(formatRoutineElapsedMinutes(1310)).toBe("21 hours, 50 minutes");
    expect(formatRoutineElapsedMinutes(230340)).toBe("159 days, 23 hours");
    const { world, personId } = life("posthandoff26-read-only-outcome");
    const snapshot = serializeWorld(world);
    expect(describeRoutineOutcome(world, world, personId)).toBe(
      "No time passed.",
    );
    expect(serializeWorld(world)).toBe(snapshot);
  });
  it("resumes a kept mid-shift life before the included journey without duplicate pay", () => {
    const { world, personId } = life("next24-mid-shift-attend");
    const morning = passOrdinaryDays(
      enterLifePath(world, "shop-assistant").world,
    );
    const started = advanceWorldMinutes(
      morning,
      180,
      createCampaignElectionTransitionRegistry(),
    );
    expect(started.currentMoment.minuteOfDay).toBe(600);
    const loaded = deserializeWorld(serializeWorld(started));
    const meeting = venueActivities(loaded, personId).find(
      (e) => e.activity.title === "Posted public meeting",
    )!;
    expect(meeting.refusal).toBeNull();
    const arrived = performVenueActivity(loaded, personId, meeting.activity.id);
    expect(arrived.currentMoment.minuteOfDay).toBe(1110);
    const attended = performVenueActivity(
      arrived,
      personId,
      meeting.activity.id,
      createCampaignElectionTransitionRegistry(),
      { finishMeeting: true },
    );
    expect(attended.currentMoment.minuteOfDay).toBe(1185);
    expect(
      attended.history.events.filter(
        (e) => e.type === "life-paths2.work-session",
      ),
    ).toHaveLength(1);
    const paid = passOrdinaryDays(deserializeWorld(serializeWorld(attended)));
    const paychecks = recordedPayStubs(paid, personId);
    expect(paychecks).toHaveLength(1);
    expect(
      paid.history.resourceTransferOutcomes.filter(
        (o) => o.id === paychecks[0]!.paycheck.id,
      ),
    ).toHaveLength(1);
    const reopenedPaid = deserializeWorld(serializeWorld(paid));
    expect(recordedPayStubs(reopenedPaid, personId)).toEqual(paychecks);
    const paidAgain = passOrdinaryDays(reopenedPaid);
    expect(
      paidAgain.history.resourceTransferOutcomes.filter(
        (o) => o.id === paychecks[0]!.paycheck.id,
      ),
    ).toHaveLength(1);
  });
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
    const arrived = performVenueActivity(morning, personId, entry.activity.id);
    expect(arrived.currentMoment.minuteOfDay).toBe(1110);
    const attended = performVenueActivity(
      arrived,
      personId,
      entry.activity.id,
      createCampaignElectionTransitionRegistry(),
      { finishMeeting: true },
    );
    expect(attended.currentMoment.minuteOfDay).toBe(1185);
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
    expect(recordedPayStubs(attended, personId)).toHaveLength(0);
    const loaded = deserializeWorld(serializeWorld(attended));
    expect(performVenueActivity(loaded, personId, entry.activity.id)).toBe(
      loaded,
    );
    const paid = passOrdinaryDays(loaded);
    const paychecks = recordedPayStubs(paid, personId);
    expect(paychecks).toHaveLength(1);
    expect(
      paid.history.resourceTransferOutcomes.filter(
        (o) => o.id === paychecks[0]!.paycheck.id,
      ),
    ).toHaveLength(1);
    expect(
      paid.history.resourceTransferOutcomes.filter(
        (o) => o.id === paychecks[0]!.paycheck.id,
      ),
    ).toHaveLength(1);
    const reopenedPaid = deserializeWorld(serializeWorld(paid));
    expect(recordedPayStubs(reopenedPaid, personId)).toEqual(paychecks);
    expect(
      passOrdinaryDays(reopenedPaid).history.resourceTransferOutcomes.filter(
        (o) => o.id === paychecks[0]!.paycheck.id,
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
    ).toContain("Care appointment comes first.");
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

it("records an unanswered hold as lapsed and exposes its released calendar consequence", () => {
  const { world, personId } = life("w65-hold-lapse");
  const entry = venueActivities(world, personId).find(
    (e) => e.activity.title === "Posted public meeting",
  )!;
  const next = passOrdinaryDays(world, 2, { stopForTentativeHolds: false });
  // A lapse has its own event type. It used to share the refusal's, which is
  // what made a hold nobody was shown read downstream as one the player turned
  // down. See `src/simulation/scheduled-activity-answer.ts`.
  const lapse = next.history.events.find(
    (e) =>
      e.type === ACTIVITY_LAPSED_EVENT &&
      e.involvedEntityIds.includes(entry.activity.id),
  );
  expect(lapse?.tags).toContain("lapsed");
  expect(lapse?.context?.choice).toBeNull();
  expect(scheduledActivityState(next, entry.activity.id).status).toBe(
    "cancelled",
  );
  expect(scheduledActivityState(next, entry.journey!.activity.id).status).toBe(
    "cancelled",
  );
  const record = projectLifeRecord(next, personId);
  expect(
    record.chapters
      .flatMap((c) => c.entries)
      .some((e) => e.sentence === lapse?.summary),
  ).toBe(true);
  expect(
    projectLifeRecord(deserializeWorld(serializeWorld(next)), personId),
  ).toEqual(record);
});
