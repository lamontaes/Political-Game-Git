import { describe, expect, it } from "vitest";
import { SeededRng } from "../simulation/rng";
import { STATES } from "../simulation/state-reference";

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
  campaignOperatingSpending,
  planCampaignOperatingWeek,
} from "../simulation/campaign-operating-costs";
import { campaignSpendingReports } from "../simulation/press";
import { resourcePositionAt } from "../simulation/resource-queries";
import { cancelScheduledActivity } from "../simulation/time-work";
import {
  createOrganization,
  createResourceFlow,
  createResourcePosition,
  recordResourceTransferOutcome,
} from "../simulation";
import { projectCampaignSpendingReports } from "./campaign-spending-reports";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";

/** An ordinary 40-year-old life in a town in the state, filed for governor. */
function governorRace(electionInDays: number) {
  const seed = "a66-recorded-bills";
  const places = Object.keys(STATES);
  const usps = places[new SeededRng(seed).integer(0, places.length)]!;
  console.info(`A66 recorded bill report place=${usps} seed=${seed}`);
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

function recordedCash(
  world: World,
  organizationId: EntityId,
  amountMinorUnits: number,
) {
  const currency = makeCurrencyCode("USD");
  const provenance = {
    kind: "authored" as const,
    note: "Recorded committee funding fixture",
  };
  let next = createOrganization(world, {
    stableKey: `fixture:funding:${organizationId}`,
    formedAt: world.currentDate,
    detailLevel: "lightweight",
    provenance,
    initialProfile: {
      name: "Recorded contributor",
      classification: "enterprise:contributor",
      locationJurisdictionId: null,
    },
  });
  const sourceId = next.history.organizations.at(-1)!.id;
  const amount = { minorUnits: amountMinorUnits, currency };
  next = createResourcePosition(next, {
    stableKey: `fixture:funding-cash:${organizationId}`,
    owner: { kind: "organization", organizationId: sourceId },
    openedAt: next.currentDate,
    openingBalance: amount,
    provenance,
  });
  next = createResourceFlow(next, {
    stableKey: `fixture:funding-flow:${organizationId}`,
    source: { kind: "organization", organizationId: sourceId },
    recipient: { kind: "organization", organizationId },
    startsAt: next.currentDate,
    amount,
    cadenceKind: "schedule:one-time",
    basisKind: "custom:campaign-contribution",
    basisReference: { kind: "general" },
    restrictionKind: "purpose:campaign",
    jurisdictionId: null,
    provenance,
  });
  return recordResourceTransferOutcome(next, {
    stableKey: `fixture:funding-paid:${organizationId}`,
    resourceFlowId: next.history.resourceFlows.at(-1)!.id,
    periodStartsAt: next.currentDate,
    periodEndsAt: next.currentDate,
    occurredAt: next.currentDate,
    status: "completed",
    attemptedAmount: amount,
    transferredAmount: amount,
    reasonKind: null,
    note: null,
    provenance,
  });
}

function savedBill(
  world: World,
  campaign: CampaignRecord,
  committeeId: EntityId,
  key: string,
  category: string,
  amountMinorUnits: number,
  dueInDays: number,
) {
  const provenance = {
    kind: "authored" as const,
    note: "Recorded vendor order fixture",
  };
  const next = createOrganization(world, {
    stableKey: `fixture:vendor:${key}`,
    formedAt: world.currentDate,
    detailLevel: "lightweight",
    provenance,
    initialProfile: {
      name: `Recorded ${category} supplier`,
      classification: `enterprise:campaign-vendor-${category}`,
      locationJurisdictionId: campaign.jurisdictionId,
    },
  });
  const vendorId = next.history.organizations.at(-1)!.id;
  return createResourceFlow(next, {
    stableKey: `fixture:bill:${key}`,
    source: { kind: "organization", organizationId: committeeId },
    recipient: { kind: "organization", organizationId: vendorId },
    startsAt: addDays(world.currentDate, dueInDays),
    initialStatus: "expected",
    amount: {
      minorUnits: amountMinorUnits,
      currency: campaign.treasuryCurrency,
    },
    cadenceKind: "schedule:one-time",
    basisKind: "custom:campaign-expenditure",
    basisReference: { kind: "general" },
    restrictionKind: "purpose:campaign",
    jurisdictionId: campaign.jurisdictionId,
    provenance,
  });
}

const operatingPayments = campaignOperatingPayments;

describe("campaign operating costs", () => {
  it("pays a rival's saved bills on their recorded dates, never overdrawing, and reports them", () => {
    const race = governorRace(70);
    const started = passOrdinaryDays(race.world, 7);
    const rival = campaignOpponentRecords(started).find(
      (opponent) => opponent.rivalCampaignId === race.campaign.id,
    )!;
    let funded = recordedCash(started, rival.committeeOrganizationId, 9000);
    funded = savedBill(
      funded,
      race.campaign,
      rival.committeeOrganizationId,
      "printing",
      "printing",
      1501,
      2,
    );
    funded = savedBill(
      funded,
      race.campaign,
      rival.committeeOrganizationId,
      "postage",
      "postage",
      1001,
      4,
    );
    const world = passOrdinaryDays(
      planCampaignOperatingWeek(funded, race.campaign, funded.currentDate),
      7,
    );
    const paid = operatingPayments(world, rival.committeeOrganizationId);
    // Bills start after the first weekly boundary and fall on their own days.
    expect(paid).toHaveLength(2);
    expect(paid.map((row) => row.transferredAmount.minorUnits)).toEqual([
      1501, 1001,
    ]);
    expect(new Set(paid.map((outcome) => outcome.occurredAt)).size).toBe(
      paid.length,
    );
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
    expect(operating.every((line) => line.payee.startsWith("Recorded "))).toBe(
      true,
    );

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

  it("keeps recorded money back for an advertising buy already approved", () => {
    const race = governorRace(60);
    let world = recordedCash(race.world, race.campaign.organizationId, 10000);
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
    const scheduled = scheduleCampaignAction(world, {
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
    });
    world = savedBill(
      scheduled.world,
      campaign,
      campaign.organizationId,
      "reserved",
      "printing",
      2000,
      3,
    );
    world = planCampaignOperatingWeek(world, campaign, world.currentDate);
    const later = passOrdinaryDays(world, 3);
    expect(operatingPayments(later, campaign.organizationId).length).toBe(0);
    expect(
      balance(later, campaign.organizationId, campaign),
    ).toBeGreaterThanOrEqual(reserved);

    // A refusal does not settle the bill: releasing cash later permits its one payment.
    const released = cancelScheduledActivity(
      later,
      scheduled.action.scheduledActivityId,
    );
    const nextDay = passOrdinaryDays(released, 1);
    const retried = planCampaignOperatingWeek(
      nextDay,
      campaign,
      nextDay.currentDate,
    );
    expect(campaignOperatingSpending(retried, campaign.organizationId)).toBe(
      2000,
    );
    expect(
      planCampaignOperatingWeek(retried, campaign, retried.currentDate),
    ).toBe(retried);

    // A buy the candidate lets go holds nothing back.
    const dropped = passOrdinaryDays(
      cancelScheduledActivity(world, scheduled.action.scheduledActivityId),
      3,
    );
    expect(
      campaignOperatingSpending(dropped, campaign.organizationId),
    ).toBeGreaterThan(
      campaignOperatingSpending(later, campaign.organizationId),
    );
  }, 300_000);

  it("does not invent operating dates when no bill is saved", () => {
    const race = governorRace(12);
    const world = passOrdinaryDays(race.world, 11);
    const electionDate = race.world.history.electionContests!.find(
      (contest) => contest.id === race.campaign.contestId,
    )!.electionDate;
    const due = world.history.futureDueItems.filter(
      (item) => item.transitionKey === CAMPAIGN_OPERATING_PAYMENT_KEY,
    );
    expect(due).toHaveLength(0);
    expect(due.every((item) => item.dueAt < electionDate)).toBe(true);
  }, 300_000);
});
