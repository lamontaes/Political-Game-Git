import { describe, expect, it } from "vitest";

import {
  campaignForCandidate,
  campaignState,
  requireLifePlace,
  searchLifePlaces,
} from "../simulation";
import type { LifePlace } from "../simulation";
import { canonicalSupportBasisPoints } from "../simulation/campaigns";
import { buildProductionWorld } from "./production-world";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";
import { resolvePlayerCapabilities } from "./player-capabilities";
import {
  fileForOffice,
  projectCampaign,
  spendAnAfternoon,
} from "./campaign-projection";

function adultLife(seed: string, placeKey: string) {
  return adultLifeInPlace(seed, requireLifePlace(placeKey));
}

function adultLifeInPlace(seed: string, place: LifePlace) {
  const built = buildProductionWorld({
    seed,
    place,
    age: 34,
    givenName: null,
    familyName: null,
    startingLife: "ordinary-life",
    household: "lives-alone",
    depth: "summarize-earlier-life",
  });
  // The player's session opens ordinary life the moment it starts, which puts
  // the week's errands and a posted public meeting on the calendar. Campaign
  // work has to fit around those, so the fixture has them too.
  return {
    world: openOrdinaryLife(built.world, built.playerPersonId),
    personId: built.playerPersonId,
  };
}

/** Every number this screen would put in front of a player. */
function numbersOn(value: unknown, found: number[] = []): number[] {
  if (typeof value === "number") found.push(value);
  else if (Array.isArray(value))
    value.forEach((item) => numbersOn(item, found));
  else if (value && typeof value === "object") {
    Object.values(value).forEach((item) => numbersOn(item, found));
  }
  return found;
}

/* -------------------------------------------------------------------------- */

describe("what the game will and will not offer", () => {
  it("offers a candidacy where an accepted pack establishes the office", () => {
    const life = adultLife("offer-kentucky", "kentucky");
    const view = projectCampaign(life.world, life.personId);
    expect(view.phase).toBe("can-file");
    expect(view.officeTitle).toMatch(/seat in the/i);
    // It says how it knows, and what it still does not know.
    expect(view.officeAuthority).toMatch(/as .* records it/i);
    // The seat count is not attributed to a rule that does not establish it.
    expect(view.officeAuthority).not.toMatch(/rule \d+|const\./i);
    expect(view.openQuestions.join(" ")).toMatch(
      /no instrument establishing the size of the chamber/i,
    );
    expect(view.openQuestions.length).toBeGreaterThan(0);
    expect(resolvePlayerCapabilities(life.world).campaign).toBe(true);
  });

  it("offers a Lexington life the Kentucky seats it can actually stand for", () => {
    // This test used to assert the opposite, and the opposite was the bug the
    // owner play hit: a Kentuckian told nobody had written down the offices
    // where they live. Lexington still declares no council of its own; the
    // state above it declares a General Assembly, and that is what is offered.
    const life = adultLife("offer-lexington", "lexington-fayette");
    const view = projectCampaign(life.world, life.personId);
    expect(view.phase).not.toBe("unavailable");
    expect(view.officeTitle).not.toBeNull();

    const capabilities = resolvePlayerCapabilities(life.world);
    expect(capabilities.campaign).toBe(true);
    expect(
      capabilities.withheld.some((entry) => entry.surface === "campaign"),
    ).toBe(false);
    // The rest of the life is untouched by the offer.
    expect(capabilities.formativeYears).toBe(false);
    expect(
      passOrdinaryDays(life.world).currentDate > life.world.currentDate,
    ).toBe(true);
  });

  it("still says nothing is on offer where the state has no accepted pack", () => {
    // The fail-closed rule is unchanged; only its boundary moved from "this is
    // not the state" to "this state has no source".
    const ohio = searchLifePlaces("Cleveland", 80).find(
      (place) => place.displayName === "Cleveland, Ohio",
    )!;
    const life = adultLifeInPlace("offer-cleveland", ohio);
    const view = projectCampaign(life.world, life.personId);
    expect(view.phase).toBe("unavailable");
    expect(view.unavailableReason).toMatch(/has not read this state/i);
    expect(view.officeTitle).toBeNull();

    const capabilities = resolvePlayerCapabilities(life.world);
    expect(capabilities.campaign).toBe(false);
    // Losing the ballot does not take the rest of the life away.
    expect(
      passOrdinaryDays(life.world).currentDate > life.world.currentDate,
    ).toBe(true);
  });

  it("does not offer a child a ballot, and does not pretend the law said so", () => {
    const built = buildProductionWorld({
      seed: "offer-child",
      place: requireLifePlace("kentucky"),
      age: 12,
      givenName: null,
      familyName: null,
      startingLife: "ordinary-life",
      household: "shares-a-home",
      depth: "summarize-earlier-life",
    });
    const view = projectCampaign(built.world, built.playerPersonId);
    expect(view.phase).toBe("unavailable");
    expect(view.unavailableReason).toMatch(/its own adult rule/i);
    expect(view.unavailableReason).not.toMatch(/law says/i);
  });
});

describe("the campaign a player can see", () => {
  it("opens a committee with nothing in it and a date to work towards", () => {
    const life = adultLife("player-file", "kentucky");
    const filed = fileForOffice(life.world, life.personId);
    const view = projectCampaign(filed, life.personId);

    expect(view.phase).toBe("active");
    expect(view.committeeName).not.toBeNull();
    expect(view.treasury.minorUnits).toBe(0);
    expect(view.opponentNames.length).toBeGreaterThan(0);
    expect(view.daysLeft).toBeGreaterThan(0);
    // Nothing has been counted, and the screen says so rather than guessing.
    expect(view.reading).toBeNull();
    expect(view.offers.map((offer) => offer.kind)).toEqual([
      "fundraising",
      "outreach",
      "advertising",
    ]);
    // Advertising is refused honestly rather than hidden.
    expect(
      view.offers.find((offer) => offer.kind === "advertising")?.unavailable,
    ).toMatch(/nothing in the account/i);
  });

  it("shows the memo the candidate was given, not the electorate", () => {
    const life = adultLife("player-memo", "kentucky");
    const filed = fileForOffice(life.world, life.personId);
    const worked = spendAnAfternoon(filed, life.personId, "outreach");
    const view = projectCampaign(worked, life.personId);

    expect(view.reading).not.toBeNull();
    expect(view.reading!.summary).toMatch(/give or take/i);
    expect(view.reading!.marginPercent).toBeGreaterThan(0);
    // A margin is an admission, so the screen must carry one.
    expect(view.sessions.some((session) => session.done)).toBe(true);
  });

  it("never puts canonical support on the screen", () => {
    let checked = 0;
    for (let index = 0; index < 10; index += 1) {
      const life = adultLife(`no-leak-${index}`, "kentucky");
      const filed = fileForOffice(life.world, life.personId);
      const worked = spendAnAfternoon(filed, life.personId, "outreach");
      const campaign = campaignForCandidate(worked, life.personId)!;
      const truthPercent =
        canonicalSupportBasisPoints(worked, campaign, life.personId) / 100;
      const view = projectCampaign(worked, life.personId);
      if (view.reading!.percent === truthPercent) continue;
      checked += 1;
      // The truth is a number this screen has no way to reach, so it appears
      // nowhere on it — not as the memo, not as a tally, not anywhere else.
      expect(numbersOn(view)).not.toContain(truthPercent);
    }
    expect(checked).toBeGreaterThan(5);
  });

  it("spends the committee's money once it has some", () => {
    const life = adultLife("player-money", "kentucky");
    let world = fileForOffice(life.world, life.personId);
    world = spendAnAfternoon(world, life.personId, "fundraising");
    const raised = projectCampaign(world, life.personId).treasury;
    expect(raised.minorUnits).toBeGreaterThan(0);

    world = spendAnAfternoon(world, life.personId, "advertising");
    const after = projectCampaign(world, life.personId).treasury;
    expect(after.minorUnits).toBeLessThan(raised.minorUnits);
    expect(after.minorUnits).toBeGreaterThan(0);
  });
});

describe("election day, and the morning after", () => {
  function playToTheEnd(seed: string, sessions: number) {
    const life = adultLife(seed, "kentucky");
    let world = fileForOffice(life.world, life.personId);
    for (let index = 0; index < sessions; index += 1) {
      // A day only has so much afternoon in it, so the weeks pass between.
      world = spendAnAfternoon(world, life.personId, "outreach");
      world = passOrdinaryDays(world, 1);
    }
    // Getting on with the week is what reaches election day.
    while (projectCampaign(world, life.personId).phase === "active") {
      world = passOrdinaryDays(world, 7);
    }
    return { world, personId: life.personId };
  }

  it("reaches a result by living the weeks, not by pressing a button", () => {
    const played = playToTheEnd("election-run", 3);
    const view = projectCampaign(played.world, played.personId);
    expect(["won", "lost"]).toContain(view.phase);
    expect(view.tallies.length).toBeGreaterThanOrEqual(2);
    expect(view.tallies.some((tally) => tally.isThisCandidate)).toBe(true);
    expect(view.offers).toEqual([]);
  });

  it("lets a lost election be a thing that happened, not an ending", () => {
    // Whichever way this seed falls, the morning after has to work.
    const played = playToTheEnd("election-after", 0);
    const view = projectCampaign(played.world, played.personId);
    expect(view.afterword).not.toBeNull();
    if (view.phase === "lost") {
      expect(view.afterword).toMatch(/not the end of them/i);
    }

    const nextWeek = passOrdinaryDays(played.world, 7);
    expect(nextWeek.currentDate > played.world.currentDate).toBe(true);
    // The character is still here, still playable, still carrying the record.
    const capabilities = resolvePlayerCapabilities(nextWeek);
    expect(capabilities.personId).toBe(played.personId);
    expect(capabilities.campaign).toBe(true);
    const campaign = campaignForCandidate(nextWeek, played.personId)!;
    expect(campaignState(nextWeek, campaign.id).status).toBe(view.phase);
  });
});

describe("what winning opens, and only where it is supported", () => {
  function playUntilDecided(seed: string, sessions: number) {
    const life = adultLife(seed, "kentucky");
    let world = fileForOffice(life.world, life.personId);
    for (let index = 0; index < sessions; index += 1) {
      // A day only has so much afternoon in it, so the weeks pass between.
      world = spendAnAfternoon(world, life.personId, "outreach");
      world = passOrdinaryDays(world, 1);
    }
    while (projectCampaign(world, life.personId).phase === "active") {
      world = passOrdinaryDays(world, 7);
    }
    return { world, personId: life.personId };
  }

  it("puts the winner in the seat, through the same work records as any job", () => {
    // Seeds are searched rather than assumed, because the point of this system
    // is that campaigning improves the odds and does not decide the result.
    let won: ReturnType<typeof playUntilDecided> | null = null;
    let lost: ReturnType<typeof playUntilDecided> | null = null;
    for (let index = 0; index < 8 && (!won || !lost); index += 1) {
      const played = playUntilDecided(`outcome-${index}`, 3);
      const phase = projectCampaign(played.world, played.personId).phase;
      if (phase === "won" && !won) won = played;
      if (phase === "lost" && !lost) lost = played;
    }
    expect(won, "no seed produced a win").not.toBeNull();
    expect(lost, "no seed produced a loss").not.toBeNull();

    // Winning opens the office the accepted capability rules already know how
    // to open. Nothing new was invented to let the player through the door.
    const winnerCapabilities = resolvePlayerCapabilities(won!.world);
    expect(winnerCapabilities.office).toBe(true);
    expect(winnerCapabilities.legislation).toBe(true);
    expect(winnerCapabilities.legislativeScenarioKey).toBe("kentucky");

    // Losing opens nothing, withholds it in words, and takes nothing away.
    const loserCapabilities = resolvePlayerCapabilities(lost!.world);
    expect(loserCapabilities.office).toBe(false);
    expect(
      loserCapabilities.withheld.find((entry) => entry.surface === "office")
        ?.reason,
    ).toBeTruthy();
    expect(loserCapabilities.campaign).toBe(true);
    expect(
      passOrdinaryDays(lost!.world, 14).currentDate > lost!.world.currentDate,
    ).toBe(true);
  });
});

describe("campaign work fits into a life that already has things in it", () => {
  it("finds room today rather than booking on top of a commitment", () => {
    const life = adultLife("calendar-room", "kentucky");
    // The posted public meeting is already on this evening.
    expect(
      life.world.history.scheduledActivities.some(
        (activity) => activity.title === "Posted public meeting",
      ),
    ).toBe(true);

    const filed = fileForOffice(life.world, life.personId);
    const worked = spendAnAfternoon(filed, life.personId, "outreach");
    expect(worked).not.toBe(filed);

    const view = projectCampaign(worked, life.personId);
    expect(view.reading).not.toBeNull();
    expect(view.sessions).toHaveLength(1);
    expect(view.sessions[0]!.done).toBe(true);
    // And it did not shove the evening aside to do it.
    expect(view.sessions[0]!.blockedBy).toEqual([]);
  });

  it("says today is spoken for rather than leaving a dead session behind", () => {
    const life = adultLife("calendar-full", "kentucky");
    const filed = fileForOffice(life.world, life.personId);
    // Two sessions fit before the evening; a third does not.
    let world = filed;
    let sessions = 0;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const offer = projectCampaign(world, life.personId).offers.find(
        (candidate) => candidate.kind === "outreach",
      )!;
      if (offer.unavailable !== null) {
        expect(offer.unavailable).toMatch(/already spoken for/i);
        break;
      }
      world = spendAnAfternoon(world, life.personId, "outreach");
      sessions += 1;
    }
    expect(sessions).toBeGreaterThan(0);
    // Whatever was refused left nothing on the calendar behind it.
    const view = projectCampaign(world, life.personId);
    expect(view.sessions).toHaveLength(sessions);
    expect(view.sessions.every((session) => session.done)).toBe(true);

    // Tomorrow it is available again.
    const tomorrow = passOrdinaryDays(world, 1);
    expect(
      projectCampaign(tomorrow, life.personId).offers.find(
        (candidate) => candidate.kind === "outreach",
      )!.unavailable,
    ).toBeNull();
  });
});
