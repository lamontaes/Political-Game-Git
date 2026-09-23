import { describe, expect, it } from "vitest";

import {
  addDays,
  campaignForCandidate,
  campaignOpponentRecords,
  ensureCampaignOpponents,
  ensureStateJurisdiction,
  fileCampaign,
  makeCurrencyCode,
  scheduleCampaignAction,
  searchLifePlaces,
  simulationMomentAtLocalTime,
  stateExecutiveIdentity,
  stateJurisdictionForKey,
} from "../simulation";
import type { CampaignRecord, EntityId, World } from "../simulation";
import {
  CAMPAIGN_OPERATING_PAYMENT_KEY,
  campaignOperatingPayments,
  UNRESEARCHED_OPERATING_COSTS,
} from "../simulation/campaign-operating-costs";
import { campaignSpendingReports } from "../simulation/press";
import { resourcePositionAt } from "../simulation/resource-queries";
import { spendAnAfternoon } from "./campaign-projection";
import { projectCampaignSpendingReports } from "./campaign-spending-reports";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";

/** An ordinary 40-year-old life in a town in the state, filed for governor. */
function governorRace(usps: string, seed: string, electionInDays: number) {
  const place = searchLifePlaces("", 1, {
    stateJurisdictionKey: `US-${usps}`,
    scope: "locality",
  })[0]!;
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
      startAge: 40,
      questionnaire: "skipped",
    }),
  ).game!;
  const personId = game.playerPersonId;
  const world = openOrdinaryLife(game.world, personId);
  const jurisdictionId = stateJurisdictionForKey(`US-${usps}`)!.id;
  const opponents = ensureCampaignOpponents(
    ensureStateJurisdiction(world, usps),
    {
      stableKey: `operating-${usps}`,
      jurisdictionId,
      count: 1,
      excludePersonIds: [personId],
    },
  );
  const filed = fileCampaign(opponents.world, {
    stableKey: `operating-${usps}`,
    candidatePersonId: personId,
    jurisdictionId,
    officeKey: stateExecutiveIdentity(usps)!.officeKey,
    districtBinding: null,
    electionDate: addDays(world.currentDate, electionInDays),
    rivalPersonIds: opponents.personIds,
    existingContestId: null,
    committeeName: `Committee for the ${usps} fixture`,
    donorPoolName: "Supporters, in aggregate",
    advertisingVendorName: "Advertising, in aggregate",
    staffPersonIds: [],
    treasuryCurrency: makeCurrencyCode("USD"),
  });
  return { world: filed.world, personId, campaign: filed.campaign };
}

function balance(
  world: World,
  organizationId: EntityId,
  campaign: CampaignRecord,
): number {
  return (
    resourcePositionAt(
      world,
      { kind: "organization", organizationId },
      campaign.treasuryCurrency,
    )?.liquidBalance.minorUnits ?? 0
  );
}

const operatingPayments = campaignOperatingPayments;

describe("campaign operating costs", () => {
  it("pays a Montana rival's ordinary bills on separate days, never overdrawing, and reports them", () => {
    const race = governorRace("MT", "operating-mt", 70);
    const world = passOrdinaryDays(race.world, 63);
    const rival = campaignOpponentRecords(world).find(
      (opponent) => opponent.rivalCampaignId === race.campaign.id,
    )!;
    const paid = operatingPayments(world, rival.committeeOrganizationId);
    // Bills start after the first weekly boundary and fall on their own days.
    expect(paid.length).toBeGreaterThanOrEqual(6);
    expect(new Set(paid.map((outcome) => outcome.occurredAt)).size).toBe(
      paid.length,
    );
    for (const outcome of paid) {
      expect(outcome.transferredAmount.minorUnits).toBeGreaterThanOrEqual(
        UNRESEARCHED_OPERATING_COSTS.minimumPaymentMinorUnits,
      );
    }
    expect(
      balance(world, rival.committeeOrganizationId, race.campaign),
    ).toBeGreaterThanOrEqual(0);

    // The rival's public reports name each payee and what it was for.
    const lines = campaignSpendingReports(
      world,
      rival.committeeOrganizationId,
    ).flatMap((report) => report.lines);
    const operating = lines.filter((line) =>
      paid.some((outcome) => outcome.resourceFlowId === line.flowId),
    );
    expect(operating.length).toBeGreaterThan(0);
    expect(operating.every((line) => line.purpose !== "other")).toBe(true);
    expect(operating.some((line) => line.payee.includes("Montana"))).toBe(true);

    // The player reads the same lines, each with the running total.
    const view = projectCampaignSpendingReports(world, race.personId).find(
      (committee) => committee.key === rival.committeeOrganizationId,
    )!;
    const oldestFirst = [...view.reports].reverse().flatMap((r) => r.lines);
    expect(oldestFirst.at(-1)!.runningTotal).toBe(
      `$${(
        lines.reduce((sum, line) => sum + line.amountMinorUnits, 0) / 100
      ).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
    );
  }, 300_000);

  it("keeps money back in Vermont for an advertising buy already approved", () => {
    const race = governorRace("VT", "operating-vt", 60);
    let world = race.world;
    for (let day = 0; day < 4; day += 1) {
      world = passOrdinaryDays(
        spendAnAfternoon(world, race.personId, "fundraising"),
        1,
      );
    }
    const campaign = campaignForCandidate(world, race.personId)!;
    const raised = balance(world, campaign.organizationId, campaign);
    expect(raised).toBeGreaterThan(0);
    const reserved = Math.floor((raised * 9) / 10);
    const moment = simulationMomentAtLocalTime({
      date: addDays(world.currentDate, 30),
      minuteOfDay: 10 * 60,
      timeZone: world.currentMoment.timeZone,
      preferredUtcOffsetMinutes: world.currentMoment.utcOffsetMinutes,
    });
    world = scheduleCampaignAction(world, {
      campaignId: campaign.id,
      kind: "advertising",
      plan: {
        start: moment,
        end: { ...moment, minuteOfDay: moment.minuteOfDay + 60 },
        location: {
          locationKey: "campaign-advertising",
          label: "Campaign work",
          jurisdictionId: campaign.jurisdictionId,
        },
        title: "Radio buy",
        summary: "An approved advertising buy.",
      },
      spend: { minorUnits: reserved, currency: campaign.treasuryCurrency },
    }).world;
    const later = passOrdinaryDays(world, 25);
    expect(
      operatingPayments(later, campaign.organizationId).length,
    ).toBeGreaterThan(0);
    expect(
      balance(later, campaign.organizationId, campaign),
    ).toBeGreaterThanOrEqual(reserved);
  }, 300_000);

  it("puts no Oregon bill on or after election day", () => {
    const race = governorRace("OR", "operating-or", 12);
    const world = passOrdinaryDays(race.world, 11);
    const electionDate = race.world.history.electionContests!.find(
      (contest) => contest.id === race.campaign.contestId,
    )!.electionDate;
    const due = world.history.futureDueItems.filter(
      (item) => item.transitionKey === CAMPAIGN_OPERATING_PAYMENT_KEY,
    );
    expect(due.length).toBeGreaterThan(0);
    expect(due.every((item) => item.dueAt < electionDate)).toBe(true);
  }, 300_000);
});
