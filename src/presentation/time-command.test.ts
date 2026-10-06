import { describe, expect, it, vi } from "vitest";

import {
  addDays,
  campaignForCandidate,
  compareSimulationMoments,
  createScheduledActivity,
  createStableId,
  type EntityId,
  deserializeWorld,
  electionContestResult,
  serializeWorld,
  scheduledActivityState,
  simulationMomentAtLocalTime,
} from "../simulation";
import { fileForOffice } from "../../tests/fixtures/campaign-fixture";
import { smallWorld } from "../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../tests/support/random-place";
import {
  careerOfferAccepted,
  careerReplyBy,
  respondCareerOffer,
  seekCareerOffer,
  startCareerWork,
} from "../simulation/career-path7";
import { workStatusAt } from "../simulation/life-queries";
import { CAREER_PROVIDERS } from "./career-path7-provider";
import { projectToday } from "./day-overview";
import { QUIET_ADULT_STEPS } from "./life-story";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { createExplicitGeographyLife } from "./new-game-geography";
import { acceptedOfferStarts } from "./offer-deadlines";
import { openOrdinaryLife } from "./ordinary-life";
import { declineVenueActivity } from "./venue-activity";
import { declineCalendarActivity } from "./calendar-time-control";
import * as routineOutcome from "./routine-outcome";
import {
  describeTimeCommandPreview,
  nextKnownCalendarItem,
  previewTimeCommand,
  recentTimeCommandReceipts,
  submitTimeCommand,
  type TimeCommand,
} from "./time-command";

function adultLife(seed = "governing-time-command") {
  const built = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed,
    startAge: 34,
    placeKey: "2146027",
    gender: "male",
    pronouns: "he-him",
    questionnaire: "skipped",
  });
  const personId = built.playerPersonId;
  return { world: openOrdinaryLife(built.world, personId), personId };
}

let counter = 0;
function request(
  world: ReturnType<typeof adultLife>["world"],
  personId: EntityId,
  command: TimeCommand,
) {
  counter += 1;
  return {
    requestId: `test-${counter}`,
    personId,
    sourceMoment: world.currentMoment,
    command,
  };
}

const fixedClock = () => 0;

describe("the canonical time command", () => {
  it("derives routine outcome text only when a receipt reader requests it", () => {
    const { world, personId } = adultLife("lazy-routine-outcome");
    const describe = vi.spyOn(routineOutcome, "describeRoutineOutcome");
    const advanced = submitTimeCommand(
      world,
      request(world, personId, { kind: "days", days: 1 }),
      fixedClock,
    );

    expect(advanced.receipt.status).toBe("accepted");
    expect(describe).not.toHaveBeenCalled();
    expect(recentTimeCommandReceipts().at(-1)).not.toHaveProperty("outcome");

    const notice = advanced.receipt.outcome;
    expect(typeof notice).toBe("string");
    expect(describe).toHaveBeenCalledTimes(1);
    expect(advanced.receipt.outcome).toBe(notice);
    expect(describe).toHaveBeenCalledTimes(1);
    describe.mockRestore();
  });

  it("advances a child's day and week through the same clock", () => {
    const built = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "child-day-week-controls",
      startAge: 6,
      questionnaire: "skipped",
    });
    const personId = built.playerPersonId;
    const world = openOrdinaryLife(built.world, personId);
    const day = submitTimeCommand(
      world,
      request(world, personId, { kind: "days", days: 1 }),
      fixedClock,
    );
    expect(day.receipt.status).toBe("accepted");
    expect(day.world.currentDate > world.currentDate).toBe(true);
    const week = submitTimeCommand(
      day.world,
      request(day.world, personId, { kind: "days", days: 7 }),
      fixedClock,
    );
    expect(week.receipt.status).toBe("accepted");
    expect(week.world.currentDate > day.world.currentDate).toBe(true);
  });

  it("moves a single ordinary day to the next morning", () => {
    const { world, personId } = adultLife();
    const { world: next, receipt } = submitTimeCommand(
      world,
      request(world, personId, { kind: "days", days: 1 }),
      fixedClock,
    );
    expect(receipt.status).toBe("accepted");
    expect(next.currentDate > world.currentDate).toBe(true);
    expect(receipt.requestedTarget?.date).toBe(next.currentDate);
    expect(receipt.stoppedEarly).toBe(false);
  });

  it("moves an explicit week and an explicit long interval as asked", () => {
    const { world, personId } = adultLife();
    const week = submitTimeCommand(
      world,
      request(world, personId, { kind: "days", days: 7 }),
      fixedClock,
    );
    expect(week.receipt.requestedTarget?.date).toBe(
      previewTimeCommand(world, personId, { kind: "days", days: 7 })
        ?.targetDate,
    );
    const long = submitTimeCommand(
      week.world,
      request(week.world, personId, { kind: "days", days: 180 }),
      fixedClock,
    );
    expect(long.receipt.status).toBe("accepted");
    // A deliberate long skip is still honored; it can only stop early for a
    // real commitment, and then it says so.
    expect(long.world.currentDate > week.world.currentDate).toBe(true);
    if (!long.receipt.stoppedEarly)
      expect(long.world.currentDate).toBe(long.receipt.requestedTarget?.date);
  });

  it("names the commitment that stops an advance before its requested morning", () => {
    const built = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "named-time-stop",
      startAge: 34,
      placeKey: "2146027",
      questionnaire: "skipped",
    });
    const world = built.world;
    const personId = built.playerPersonId;
    const start = simulationMomentAtLocalTime({
      date: addDays(world.currentDate, 1),
      minuteOfDay: 18 * 60,
      timeZone: world.currentMoment.timeZone,
      preferredUtcOffsetMinutes: world.currentMoment.utcOffsetMinutes,
    });
    const end = simulationMomentAtLocalTime({
      ...start,
      minuteOfDay: 19 * 60,
    });
    const booked = createScheduledActivity(world, {
      stableKey: "named-time-stop:meeting",
      title: "Neighborhood meeting",
      summary: "A meeting on the calendar.",
      kind: "confirmed",
      start,
      end,
      participantPersonIds: [personId],
      responsiblePersonId: personId,
      location: {
        locationKey: "named-time-stop:room",
        label: "Community room",
        jurisdictionId: null,
      },
      sourceEntityIds: [personId],
      flexibility: { kind: "fixed" },
      access: { kind: "private", personIds: [personId] },
    });
    const { receipt } = submitTimeCommand(
      booked,
      request(booked, personId, { kind: "days", days: 2 }),
      fixedClock,
    );
    expect(receipt.stoppedEarly).toBe(true);
    expect(receipt.outcome).toContain("Neighborhood meeting comes first.");
  });

  it("refuses a stale request so one click never advances twice", () => {
    const { world, personId } = adultLife();
    const click = request(world, personId, { kind: "quiet-stretch" });
    const first = submitTimeCommand(world, click, fixedClock);
    expect(first.receipt.status).toBe("accepted");
    // The same request delivered again (a repeated callback, a double click
    // that arrives after the first commit) is refused.
    const repeat = submitTimeCommand(first.world, click, fixedClock);
    expect(repeat.receipt.status).toBe("stale");
    expect(repeat.world).toBe(first.world);
    // A control rendered from the older World cannot commit on the newer one.
    const late = submitTimeCommand(
      first.world,
      { ...request(world, personId, { kind: "days", days: 1 }) },
      fixedClock,
    );
    expect(late.receipt.status).toBe("stale");
    expect(late.world).toBe(first.world);
    expect(
      recentTimeCommandReceipts()
        .slice(-3)
        .map((receipt) => receipt.status),
    ).toEqual(["accepted", "stale", "stale"]);
  });

  it("discloses the quiet stretch before it runs, and lands on that date", () => {
    const { world, personId } = adultLife();
    const preview = previewTimeCommand(world, personId, {
      kind: "quiet-stretch",
    })!;
    expect(preview.days).toBeGreaterThanOrEqual(1);
    expect(preview.days).toBeLessThanOrEqual(Math.max(...QUIET_ADULT_STEPS));
    expect(describeTimeCommandPreview(preview)).toContain(
      String(Number(preview.targetDate.slice(0, 4))),
    );
    const { world: next, receipt } = submitTimeCommand(
      world,
      request(world, personId, { kind: "quiet-stretch" }),
      fixedClock,
    );
    expect(receipt.status).toBe("accepted");
    if (!receipt.stoppedEarly)
      expect(next.currentDate).toBe(preview.targetDate);
  });

  it("never runs a quiet stretch past a known dated item for the character", () => {
    const built = adultLife("governing-time-command-filed");
    const world = fileForOffice(built.world, built.personId);
    const next = nextKnownCalendarItem(world, built.personId);
    const preview = previewTimeCommand(world, built.personId, {
      kind: "quiet-stretch",
    })!;
    if (next) expect(preview.targetDate <= next.date).toBe(true);
    const campaign = campaignForCandidate(world, built.personId)!;
    let current = world;
    // Ordinary quiet stretches still reach election day and resolve it once.
    for (let step = 0; step < 12; step += 1) {
      if (electionContestResult(current, campaign.contestId)) break;
      // Choose Stay home for an incoming meeting through its saved travel join.
      // Repeating a quiet stretch is not an answer to that calendar choice.
      const journey = current.history.scheduledActivities.find(
        (activity) =>
          activity.kind === "travel" &&
          activity.location.locationKey === "ordinary-life:to-meeting-room" &&
          activity.responsiblePersonId === built.personId &&
          scheduledActivityState(current, activity.id).status === "scheduled" &&
          compareSimulationMoments(
            current.currentMoment,
            scheduledActivityState(current, activity.id).start,
          ) === 0,
      );
      const meeting = journey
        ? current.history.scheduledActivities.find(
            (activity) =>
              journey.sourceEntityIds.includes(activity.id) &&
              activity.location.locationKey === "ordinary-life:meeting-room" &&
              activity.participantPersonIds.includes(built.personId) &&
              scheduledActivityState(current, activity.id).status ===
                "scheduled",
          )
        : null;
      if (meeting) {
        const stayHome = declineCalendarActivity(
          current,
          built.personId,
          meeting.id,
        );
        expect(stayHome.world).not.toBe(current);
        expect(stayHome.reached).toEqual(current.currentMoment);
        current = stayHome.world;
      }
      current = submitTimeCommand(
        current,
        request(current, built.personId, { kind: "quiet-stretch" }),
        fixedClock,
      ).world;
    }
    expect(electionContestResult(current, campaign.contestId)).toBeDefined();
    expect(
      current.history.electionContestResults?.filter(
        (result) => result.contestId === campaign.contestId,
      ),
    ).toHaveLength(1);
  });

  it("a quiet stretch hands back a live offer and an accepted work start after reload", () => {
    const built = createExplicitGeographyLife({
      placeKey: "3825700",
      seed: "time-command-career-start",
      startAge: 24,
    });
    const personId = built.game.playerPersonId;
    const world = openOrdinaryLife(built.game.world, personId);
    const shop = CAREER_PROVIDERS.find(
      (provider) => provider.pathId === "shop-assistant",
    )!;
    const sought = seekCareerOffer(world, shop);
    expect(sought.ok).toBe(true);
    const offer = sought.world.history.workRelationships.find(
      (work) =>
        work.personId === personId &&
        work.stableKey.startsWith(`career-path7:${shop.id}:`),
    )!;
    const replyBy = careerReplyBy(sought.world, offer.id);
    const firstStop = submitTimeCommand(
      sought.world,
      request(sought.world, personId, { kind: "quiet-stretch" }),
      fixedClock,
    );
    expect(firstStop.world.currentDate).toBe("2026-01-06");
    expect(
      previewTimeCommand(sought.world, personId, { kind: "quiet-stretch" })
        ?.cappedBy?.title,
    ).toBe("Posted public meeting");
    expect(firstStop.receipt.requestedTarget?.date).toBe(
      firstStop.world.currentDate,
    );
    expect(careerReplyBy(firstStop.world, offer.id)).toBe(replyBy);
    const meeting = firstStop.world.history.scheduledActivities.find(
      (activity) => activity.title === "Posted public meeting",
    )!;
    const declined = declineVenueActivity(
      firstStop.world,
      personId,
      meeting.id,
    );
    expect(declined).not.toBe(firstStop.world);
    expect(
      previewTimeCommand(declined, personId, { kind: "quiet-stretch" }),
    ).toMatchObject({
      targetDate: replyBy,
      cappedBy: { title: "Answer work offer", date: replyBy },
    });
    const unanswered = submitTimeCommand(
      declined,
      request(declined, personId, { kind: "quiet-stretch" }),
      fixedClock,
    );
    expect(unanswered.world.currentDate).toBe(replyBy);
    expect(unanswered.receipt.status).toBe("accepted");
    expect(unanswered.receipt.stoppedEarly).toBe(false);
    expect(careerReplyBy(unanswered.world, offer.id)).toBe(replyBy);
    expect(workStatusAt(unanswered.world, offer.id)?.status).toBe("expected");
    expect(careerOfferAccepted(unanswered.world, offer.id)).toBe(false);
    expect(
      unanswered.world.history.events.some(
        (event) =>
          event.type === "career-path7.offer-lapsed" &&
          event.involvedEntityIds.includes(offer.id),
      ),
    ).toBe(false);
    expect(
      projectToday(unanswered.world, personId).waiting.some((entry) =>
        entry.key.startsWith("work-offer:"),
      ),
    ).toBe(true);
    expect(
      previewTimeCommand(unanswered.world, personId, {
        kind: "quiet-stretch",
      }),
    ).toBeNull();
    const stillWaiting = submitTimeCommand(
      unanswered.world,
      request(unanswered.world, personId, { kind: "quiet-stretch" }),
      fixedClock,
    );
    expect(stillWaiting.world).toBe(unanswered.world);
    expect(stillWaiting.receipt.status).toBe("refused");
    expect(stillWaiting.receipt.outcome).toMatch(/needs an answer under Work/);

    const accepted = respondCareerOffer(sought.world, offer.id, shop, true);
    expect(accepted.ok).toBe(true);
    const reloaded = deserializeWorld(serializeWorld(accepted.world));
    expect(acceptedOfferStarts(reloaded, personId)).toContainEqual({
      key: `career-start:${offer.id}`,
      startOn: offer.startedAt,
    });
    expect(
      previewTimeCommand(reloaded, personId, { kind: "quiet-stretch" }),
    ).toMatchObject({
      targetDate: offer.startedAt,
      cappedBy: { date: offer.startedAt },
    });
    const reached = submitTimeCommand(
      reloaded,
      request(reloaded, personId, { kind: "quiet-stretch" }),
      fixedClock,
    );
    expect(reached.world.currentDate).toBe(offer.startedAt);
    expect(reached.receipt.status).toBe("accepted");
    expect(reached.receipt.requestedTarget?.date).toBe(offer.startedAt);
    expect(workStatusAt(reached.world, offer.id)?.status).toBe("expected");
    expect(careerOfferAccepted(reached.world, offer.id)).toBe(true);
    expect(reached.receipt.outcome).not.toContain("under Work");
    expect(
      previewTimeCommand(reached.world, personId, { kind: "quiet-stretch" }),
    ).toBeNull();
    const stillStartable = submitTimeCommand(
      reached.world,
      request(reached.world, personId, { kind: "quiet-stretch" }),
      fixedClock,
    );
    expect(stillStartable.world).toBe(reached.world);
    expect(stillStartable.receipt.status).toBe("refused");
    expect(stillStartable.receipt.outcome).toMatch(/can begin under Work/);
    const started = startCareerWork(reached.world, offer.id, shop);
    expect(started.ok).toBe(true);
    expect(workStatusAt(started.world, offer.id)?.status).toBe("active");
  });

  it("waits until a recorded activity and refuses one already begun", () => {
    const { world, personId } = adultLife();
    const refused = submitTimeCommand(
      world,
      request(world, personId, {
        kind: "until-activity",
        activityId: createStableId("scheduled-activity", "no-such-activity"),
      }),
      fixedClock,
    );
    expect(refused.receipt.status).toBe("refused");
    expect(refused.world).toBe(world);
  });

  for (const sample of [0, 1, 2]) {
    it(`names the due calendar choice without calling it work (${sample})`, () => {
      const seed = `quiet-stretch-calendar-choice:${sample}`;
      const { world, personId } = smallWorld({
        seed,
        place: drawRandomPlace(seed).key,
      });
      const booked = createScheduledActivity(world, {
        stableKey: `${seed}:meeting`,
        title: "Resident meeting",
        summary: "A recorded calendar choice.",
        kind: "confirmed",
        start: world.currentMoment,
        end: simulationMomentAtLocalTime({
          ...world.currentMoment,
          minuteOfDay: world.currentMoment.minuteOfDay + 30,
        }),
        participantPersonIds: [personId],
        responsiblePersonId: personId,
        location: {
          locationKey: `${seed}:room`,
          label: "Meeting room",
          jurisdictionId: world.people[personId]!.homeJurisdictionId,
        },
        sourceEntityIds: [personId],
        flexibility: { kind: "fixed" },
        access: { kind: "private", personIds: [personId] },
      });
      const reloaded = deserializeWorld(serializeWorld(booked));
      expect(
        previewTimeCommand(reloaded, personId, { kind: "quiet-stretch" }),
      ).toBeNull();
      const refused = submitTimeCommand(
        reloaded,
        request(reloaded, personId, { kind: "quiet-stretch" }),
        fixedClock,
      );
      expect(refused.world).toBe(reloaded);
      expect(refused.receipt.reached).toEqual(reloaded.currentMoment);
      expect(refused.receipt.status).toBe("refused");
      expect(refused.receipt.outcome).toBe(
        "Resident meeting is waiting on your calendar. Decide whether to attend or decline before another quiet stretch.",
      );
      expect(refused.receipt.outcome).not.toContain("under Work");
      expect(refused.world.history.scheduledActivityStates).toEqual(
        reloaded.history.scheduledActivityStates,
      );
    });
  }

  it("survives save and reload with the same source moment", () => {
    const { world, personId } = adultLife();
    const reloaded = deserializeWorld(serializeWorld(world));
    const { receipt } = submitTimeCommand(
      reloaded,
      request(world, personId, { kind: "days", days: 1 }),
      fixedClock,
    );
    expect(receipt.status).toBe("accepted");
  });
});
