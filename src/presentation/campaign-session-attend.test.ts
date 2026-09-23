import { describe, expect, it } from "vitest";

import {
  campaignActionForActivity,
  campaignActionResult,
  commitCampaignWeek,
  compareSimulationMoments,
  deserializeWorld,
  projectCampaignWeek,
  scheduledActivityState,
  serializeWorld,
  type EntityId,
  type World,
} from "../simulation";
import { electiveOfficesForJurisdiction } from "../simulation/candidacy";
import { playCalendarActivity } from "./calendar-time-control";
import { fileForOffice } from "./campaign-projection";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { requireLocalityInState } from "./new-game-geography";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { passOrdinaryDays } from "./ordinary-life";
import { performVenueActivity, venueActivities } from "./venue-activity";

/**
 * A campaign's booked sessions are carried out from the calendar.
 *
 * Owner's playtest, 2026-09-23: running for mayor of Eufaula, Alabama, the
 * week's field shift and call session sat on the calendar as confirmed holds
 * that "Attend" refused — "You have no way to get from … to The campaign's
 * call desk" — and time would not step over them. Every campaign had the same
 * dead end; only the Campaigns tab's "Do it now" reached the writer.
 */
function mayoralWeekInEufaula(seed: string) {
  const home = requireLocalityInState("US-AL", "Eufaula");
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      startAge: 34,
      placeKey: home.key,
    }),
  ).game!;
  const personId = game.playerPersonId;
  const mayor = electiveOfficesForJurisdiction(
    game.world.people[personId]!.homeJurisdictionId,
  ).find((option) => option.office.title === "Mayor")!;
  expect(mayor).toBeDefined();
  const filed = fileForOffice(game.world, personId, null, mayor.officeKey);
  const week = projectCampaignWeek(filed, personId)!;
  const committed = commitCampaignWeek(filed, personId, {
    campaignId: week.campaignId,
    weekStart: week.weekStart,
    proposerPersonId: null,
    revision: week.revision,
    emphasis: "field",
    allocation: { fieldShifts: 1, fundraisingSessions: 1, advertisingBuys: 0 },
    advertising: null,
  });
  // Save and load before attending: the route must hold for a reloaded life.
  const world = deserializeWorld(serializeWorld(committed));
  const sessions = world.history.scheduledActivities
    .filter((activity) => campaignActionForActivity(world, activity.id))
    .sort((left, right) =>
      compareSimulationMoments(
        scheduledActivityState(world, left.id).start,
        scheduledActivityState(world, right.id).start,
      ),
    );
  return { world, personId, sessions };
}

function travelOrArrivalEvents(before: World, after: World) {
  return after.history.events
    .slice(before.history.events.length)
    .filter(
      (event) =>
        event.type === "life.scene.arrived" || event.type.includes("travel"),
    );
}

function expectRecordedResult(world: World, activityId: EntityId) {
  const action = campaignActionForActivity(world, activityId)!;
  const result = campaignActionResult(world, action.id);
  expect(result).not.toBeNull();
  if (action.kind === "fundraising")
    expect(result!.raisedAmount!.minorUnits).toBeGreaterThan(0);
  if (action.kind === "outreach")
    expect(
      world.history.events.some((event) => event.id === result!.outcomeEventId),
    ).toBe(true);
  expect(scheduledActivityState(world, activityId).status).toBe("completed");
}

describe("a campaign session attended from the calendar", () => {
  it("is offered as performable in place, never as one to give up", () => {
    const { world, personId, sessions } = mayoralWeekInEufaula(
      "eufaula-mayor-offered",
    );
    expect(sessions).toHaveLength(2);
    expect(
      sessions
        .map((session) => campaignActionForActivity(world, session.id)!.kind)
        .sort(),
    ).toEqual(["fundraising", "outreach"]);
    const first = venueActivities(world, personId).find(
      (entry) => entry.activity.id === sessions[0]!.id,
    )!;
    expect(first.refusal).toBeNull();
    expect(first.abandonable).toBe(false);
    expect(first.journey).toBeNull();
  });

  it("does the campaign's work through its writer when attended, with no journey", () => {
    const { world, personId, sessions } = mayoralWeekInEufaula(
      "eufaula-mayor-attend",
    );
    const [first, second] = sessions;

    // The Calendar's Attend control.
    const played = playCalendarActivity(world, personId, first!.id);
    expect(played.world).not.toBe(world);
    expectRecordedResult(played.world, first!.id);
    expect(travelOrArrivalEvents(world, played.world)).toEqual([]);
    expect(
      compareSimulationMoments(
        played.world.currentMoment,
        scheduledActivityState(played.world, first!.id).end,
      ),
    ).toBeGreaterThanOrEqual(0);

    // Today's "Use your time" control, for the week's next session.
    const attended = performVenueActivity(played.world, personId, second!.id);
    expectRecordedResult(attended, second!.id);
    expect(travelOrArrivalEvents(played.world, attended)).toEqual([]);

    // Nothing is left holding the clock.
    const moved = passOrdinaryDays(attended, 7);
    expect(moved.currentDate > attended.currentDate).toBe(true);
  });

  it("says why, and writes nothing, when the week's session is not the next one", () => {
    const { world, personId, sessions } = mayoralWeekInEufaula(
      "eufaula-mayor-order",
    );
    const later = venueActivities(world, personId).find(
      (entry) => entry.activity.id === sessions[1]!.id,
    )!;
    // The earlier session is a commitment that comes first.
    expect(later.refusal).not.toBeNull();
    expect(later.abandonable).toBe(false);
    const played = playCalendarActivity(world, personId, sessions[1]!.id);
    expect(played.world).toBe(world);
    expect(played.outcome).toBe(later.refusal);
  });
});
