import { describe, expect, it } from "vitest";

import { addDays } from "../dates";
import { enactmentStatuteDateContext } from "../enacted-rule-changes";
import { bodyForChamber } from "../legislation-scenarios";
import {
  enrollMeasure,
  measurePosition,
  presentMeasureToExecutive,
  recordEnactment,
  takeFloorVote,
  requireMeasure,
} from "../legislation";
import { deserializeWorld, serializeWorld } from "../serialization";
import type { EntityId, IsoDate, World } from "../types";
import {
  AUTHORED,
  CHAMBER,
  billOnTheFloor,
  everyone,
  type Setup,
} from "../vote-bundle.fixture";
import { assertWorldIntegrity } from "../world";
import {
  considerSessionAdjournment,
  type SessionLeaders,
} from "./leaders-adjourn";
import {
  measureSessionIsClosed,
  recordGovernorDecisionOnMeasure,
} from "./legislative-clock";
import {
  recordedSessionAdjournment,
  sessionLegalLimit,
} from "./session-adjournments";
import { stateStatuteOperativeAt } from "./statute-effective-date";

/**
 * A legislature ends its regular session on the day its leaders choose, once
 * the budget has passed and none of their own caucus's bills is still before
 * the chambers, and never past its legal limit (Claude CTO ruling,
 * September 29, 2026, 12:54 a.m.). The waiting period for a new law counts
 * from that recorded day.
 *
 * Nebraska's one-house legislature, from the shared vote fixture; its
 * leaders are passed in, because the fixture's chamber is not seated with
 * the living world's legislators.
 */

function on(world: World, date: IsoDate): World {
  return {
    ...world,
    currentDate: date,
    currentMoment: { ...world.currentMoment, date },
  };
}

/** Takes the budget through every floor stage, a legislative day apart. */
function passTheChamber(setup: Setup, world: World): World {
  let next = world;
  for (let step = 0; step < 8; step += 1) {
    if (measurePosition(next, setup.measureId).phase !== "on-floor")
      return next;
    next = takeFloorVote(on(next, addDays(next.currentDate, 1)), {
      stableKey: `leaders-adjourn:floor:${step}`,
      measureId: setup.measureId,
      dispositions: everyone(setup, "yea"),
      electedMembers: bodyForChamber(setup.scenario, CHAMBER).members.length,
      provenance: AUTHORED,
    });
  }
  throw new Error("The budget never left the floor.");
}

/** The other bill in the fixture's session, still in the chamber. */
function otherBill(setup: Setup): EntityId {
  return setup.scenario.measureId;
}

const leadersWith =
  (members: readonly EntityId[]): SessionLeaders =>
  () =>
    new Map([[CHAMBER, new Set(members)]]);

function setupInSession(): { setup: Setup; world: World; limit: IsoDate } {
  const setup = billOnTheFloor("appropriation");
  const year = Number(setup.world.currentDate.slice(0, 4));
  const limit = sessionLegalLimit(setup.scenario.pack, year);
  if (!limit) throw new Error("Nebraska's session limit was not read.");
  return { setup, world: setup.world, limit };
}

describe("the leaders adjourn the session", () => {
  it("reads Nebraska's legal limit", () => {
    const { setup, limit } = setupInSession();
    expect(setup.scenario.pack.jurisdictionKey).toBe("US-NE");
    expect(limit.slice(0, 4)).toBe(setup.world.currentDate.slice(0, 4));
  });

  it("waits for the budget", () => {
    const { setup, world } = setupInSession();
    const sponsor = requireMeasure(world, otherBill(setup)).sponsorPersonId;
    // The leaders' caucus carries nothing pending, but the budget has not
    // passed.
    expect(sponsor).not.toBeNull();
    const after = considerSessionAdjournment(
      world,
      setup.measureId,
      leadersWith([]),
    );
    expect(after.history.sessionAdjournments ?? []).toEqual([]);
  });

  it("adjourns once the budget passed and only other members' bills are pending", () => {
    const { setup, world: start, limit } = setupInSession();
    let world = passTheChamber(setup, start);
    expect(measurePosition(world, setup.measureId).phase).toBe(
      "awaiting-enrollment",
    );
    expect(world.currentDate <= limit).toBe(true);
    const pending = otherBill(setup);
    expect(measurePosition(world, pending).terminal).toBe(false);
    world = considerSessionAdjournment(world, setup.measureId, leadersWith([]));
    const year = Number(world.currentDate.slice(0, 4));
    const record = recordedSessionAdjournment(
      world,
      setup.scenario.pack.packId,
      year,
    );
    expect(record).toMatchObject({
      adjournedOn: world.currentDate,
      budgetMeasureId: setup.measureId,
      leftPendingMeasureIds: [pending],
    });
    expect(record!.rationale).toMatch(/both chambers passed LB 902/);
    expect(record!.rationale).toMatch(/1 bill other members carried/);
    assertWorldIntegrity(world);
    const reopened = deserializeWorld(serializeWorld(world));
    expect(reopened.history.sessionAdjournments).toEqual(
      world.history.sessionAdjournments,
    );

    // The session is over the next day: the pending bill stops, and the
    // budget, already past the chamber, still goes to the governor.
    const nextDay = on(world, addDays(world.currentDate, 1));
    expect(measureSessionIsClosed(nextDay, pending)).toEqual({
      closed: true,
      closedOn: world.currentDate,
    });
    // A second decision the same session changes nothing.
    expect(
      considerSessionAdjournment(nextDay, setup.measureId, leadersWith([])),
    ).toBe(nextDay);
  });

  it("stays in session while a bill the leaders' caucus carries is pending", () => {
    const { setup, world: start } = setupInSession();
    const world = passTheChamber(setup, start);
    const sponsor = requireMeasure(world, otherBill(setup)).sponsorPersonId;
    expect(sponsor).not.toBeNull();
    const after = considerSessionAdjournment(
      world,
      setup.measureId,
      leadersWith([sponsor!]),
    );
    expect(after.history.sessionAdjournments ?? []).toEqual([]);
    // A chamber split evenly has no majority: every bill holds it.
    const split: SessionLeaders = () => new Map([[CHAMBER, "everyone"]]);
    expect(
      considerSessionAdjournment(world, setup.measureId, split).history
        .sessionAdjournments ?? [],
    ).toEqual([]);
  });

  it("does not adjourn past the legal limit, which ended the session already", () => {
    const { setup, world: start, limit } = setupInSession();
    const passed = passTheChamber(setup, start);
    const late = on(passed, addDays(limit, 1));
    expect(
      considerSessionAdjournment(late, setup.measureId, leadersWith([])).history
        .sessionAdjournments ?? [],
    ).toEqual([]);
    expect(measureSessionIsClosed(late, otherBill(setup))).toEqual({
      closed: true,
      closedOn: limit,
    });
  });

  it("dates a new law from the day the leaders adjourned, not the limit", () => {
    const { setup, world: start, limit } = setupInSession();
    let world = passTheChamber(setup, start);
    world = considerSessionAdjournment(world, setup.measureId, leadersWith([]));
    const adjournedOn = world.currentDate;
    expect(adjournedOn < limit).toBe(true);
    world = enrollMeasure(world, {
      stableKey: "leaders-adjourn:enroll",
      measureId: setup.measureId,
    });
    world = presentMeasureToExecutive(world, {
      stableKey: "leaders-adjourn:present",
      measureId: setup.measureId,
    });
    world = recordGovernorDecisionOnMeasure(
      on(world, addDays(adjournedOn, 3)),
      setup.measureId,
      "signed",
      "The governor signed the budget.",
      setup.world.personOrder.find((id) => id !== setup.memberId)!,
    );
    if (measurePosition(world, setup.measureId).phase === "awaiting-enactment")
      world = recordEnactment(world, {
        stableKey: "leaders-adjourn:enacted",
        measureId: setup.measureId,
      });
    const enactment = world.history.legislativeEnactments!.find(
      (row) => row.measureId === setup.measureId,
    )!;
    const byRecord = stateStatuteOperativeAt(
      "US-NE",
      enactment.resolvedAt,
      enactmentStatuteDateContext(world, enactment),
    );
    const byLimit = stateStatuteOperativeAt("US-NE", enactment.resolvedAt);
    expect(byRecord).not.toBeNull();
    expect(byRecord! < byLimit!).toBe(true);
  });
});
