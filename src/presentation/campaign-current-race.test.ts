import { describe, expect, it } from "vitest";

import {
  adultLifeAt,
  runToElection,
} from "../../tests/fixtures/state-executive-entry";
import {
  campaignForCandidate,
  commitCampaignWeek,
  projectCampaignWeek,
  searchLifePlaces,
} from "../simulation";
import type { EntityId, World } from "../simulation";
import { contestDistrictGeography } from "../simulation/campaign-geography";
import { projectOpponentActivityPanel } from "./campaign-life-surface";
import { projectCampaignStrategy } from "./campaign-strategy";
import {
  congressCandidacyForPerson,
  fileForCongressSeat,
} from "./congress-candidacy";
import { passOrdinaryDays } from "./ordinary-life";

/*
 * A Seattle resident running for the U.S. House. Two things the campaign
 * screen had wrong: it listed a rival from an earlier race as if they were
 * running now, and it placed a House district race across the whole state.
 */

function allText(value: unknown): string {
  return JSON.stringify(value);
}

function seattleLife(seed: string) {
  const place = searchLifePlaces("Seattle", 1, {
    stateJurisdictionKey: "US-WA",
    scope: "locality",
  })[0];
  if (!place) throw new Error("Seattle is not a life place.");
  return adultLifeAt(place.key, seed);
}

function fileForFirstHouseSeat(world: World, personId: EntityId) {
  const seat = congressCandidacyForPerson(world, personId)!.seats.find(
    (candidate) =>
      candidate.identity.seat.chamberKey === "us-house" && candidate.eligible,
  );
  if (!seat) throw new Error("This player cannot stand for the House.");
  return {
    world: fileForCongressSeat(world, personId, seat.identity.officeKey),
    seat: seat.identity.seat,
  };
}

function untilOpponentActivityHeard(
  world: World,
  personId: EntityId,
  campaignId: EntityId,
): World {
  let next = world;
  for (let day = 0; day < 21; day += 1) {
    if (projectOpponentActivityPanel(next, personId, campaignId).length > 0)
      return next;
    next = passOrdinaryDays(next, 1);
  }
  return next;
}

describe("a Seattle House campaign names its own race", () => {
  it("places a House seat in its congressional district and a Senate seat in the state", () => {
    const office = {
      officeKey: "us-house:WA-07",
      title: "U.S. Representative",
      seatKey: "us-house:WA-07",
      occupationClassification: null,
    };
    expect(contestDistrictGeography(office)).toEqual({
      key: "district:us-house:WA-07",
      label: "Washington's 7th Congressional District",
    });
    expect(
      contestDistrictGeography({
        ...office,
        officeKey: "us-house:WY-00",
        seatKey: "us-house:WY-00",
      })?.label,
    ).toBe("Wyoming's At-Large Congressional District");
    const senate = "us-senate:WA:class-1";
    expect(
      contestDistrictGeography({
        ...office,
        officeKey: senate,
        seatKey: senate,
      }),
    ).toBeNull();
  });

  it("offers the district, not all of Washington, for the week's work", () => {
    const life = seattleLife("seattle-house-geography");
    const { world, seat } = fileForFirstHouseSeat(life.world, life.personId);
    const district = contestDistrictGeography({
      officeKey: seat.seatKey,
      title: "U.S. Representative",
      seatKey: seat.seatKey,
      occupationClassification: null,
    })!;
    expect(district.label).toMatch(
      /^Washington's (\d+(st|nd|rd|th)|At-Large) Congressional District$/,
    );

    const week = projectCampaignWeek(world, life.personId)!;
    expect(week.geographyChoices).toContainEqual({
      ...district,
      kind: "district",
    });
    const strategy = projectCampaignStrategy(world, life.personId)!;
    expect(strategy.geographyChoices.map((choice) => choice.label)).toEqual([
      district.label,
    ]);

    // A committed week's field and call sessions are placed in the district,
    // and the saved record passes the campaign's integrity checks.
    const committed = commitCampaignWeek(world, life.personId, {
      campaignId: week.campaignId,
      weekStart: week.weekStart,
      proposerPersonId: null,
      revision: week.revision,
      emphasis: "field",
      allocation: {
        fieldShifts: 1,
        fundraisingSessions: 1,
        advertisingBuys: 0,
      },
      advertising: null,
    });
    const placed = (committed.history.campaignActions ?? []).filter(
      (action) => action.campaignId === week.campaignId && action.strategy,
    );
    expect(placed.length).toBeGreaterThan(0);
    for (const action of placed) {
      expect(action.strategy!.geographyLabel).toBe(district.label);
    }
    expect(allText(committed.history.scheduledActivities)).toContain(
      district.label,
    );
  }, 900_000);

  it("shows only what the current race's rivals did, not an earlier race's", () => {
    const life = seattleLife("seattle-house-rivals");
    const first = fileForFirstHouseSeat(life.world, life.personId);
    const firstCampaign = campaignForCandidate(first.world, life.personId)!;
    const heard = untilOpponentActivityHeard(
      first.world,
      life.personId,
      firstCampaign.id,
    );
    const earlierRows = projectOpponentActivityPanel(
      heard,
      life.personId,
      firstCampaign.id,
    );
    expect(earlierRows.length).toBeGreaterThan(0);
    const earlierEventIds = new Set(earlierRows.map((row) => row.eventId));

    // The first race is decided; the player files again for the House.
    const decided = runToElection(heard, life.personId);
    const second = fileForFirstHouseSeat(decided, life.personId);
    const secondCampaign = campaignForCandidate(second.world, life.personId)!;
    expect(secondCampaign.contestId).not.toBe(firstCampaign.contestId);

    // Nothing is heard yet about the new race, and the earlier rival's
    // advertising is not shown in its place.
    expect(
      projectOpponentActivityPanel(
        second.world,
        life.personId,
        secondCampaign.id,
      ),
    ).toEqual([]);

    const later = untilOpponentActivityHeard(
      second.world,
      life.personId,
      secondCampaign.id,
    );
    const contest = later.history.electionContests!.find(
      (candidate) => candidate.id === secondCampaign.contestId,
    )!;
    const currentRivals = new Set(
      contest.candidatePersonIds.filter((id) => id !== life.personId),
    );
    for (const row of projectOpponentActivityPanel(
      later,
      life.personId,
      secondCampaign.id,
    )) {
      expect(currentRivals.has(row.opponentPersonId)).toBe(true);
      expect(earlierEventIds.has(row.eventId)).toBe(false);
    }
    // The earlier race's rows are still recorded; they belong to that race.
    expect(
      projectOpponentActivityPanel(later, life.personId, firstCampaign.id)
        .length,
    ).toBeGreaterThanOrEqual(earlierRows.length);
  }, 900_000);
});
