import { describe, expect, it } from "vitest";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import {
  openOrdinaryLife,
  passOrdinaryDays,
} from "../presentation/ordinary-life";
import { searchLifePlaces, stateJurisdictionForKey } from "./life-places";
import { ensureStateJurisdiction } from "./nationwide-world/state-executives";
import { ensureCampaignOpponents } from "./campaigns";
import {
  CAMPAIGN_UNIT_PRICES,
  campaignOperatingSpending,
  payRecordedCampaignOperatingBill,
  planCampaignOperatingWeek,
  quoteCampaignPurchase,
  suggestedCampaignUnits,
} from "./campaign-operating-costs";
import { contributeOwnMoneyToCampaign } from "./campaign-money-sources";
import { fileCampaign } from "./campaigns";
import { addDays } from "./dates";
import { createOrganization } from "./life";
import { stateExecutiveIdentity } from "./nationwide-world/state-executive-candidacy-packs";
import {
  resourcePositionAt,
  resourceTransferOutcomesOfFlows,
} from "./resource-queries";
import {
  createResourceFlow,
  createResourcePosition,
  makeCurrencyCode,
  recordResourceTransferOutcome,
} from "./resources";
import { SeededRng } from "./rng";
import { STATES } from "./state-reference";

function race() {
  const seed = "a66-recorded-bills";
  const places = Object.keys(STATES);
  const place = places[new SeededRng(seed).integer(0, places.length)]!;
  const home = searchLifePlaces("", 1, {
    stateJurisdictionKey: `US-${place}`,
    scope: "locality",
  })[0]!;
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: home.key,
      startAge: 40,
      questionnaire: "skipped",
    }),
  ).game!;
  const candidatePersonId = game.playerPersonId;
  const jurisdictionId = stateJurisdictionForKey(`US-${place}`)!.id;
  const opened = openOrdinaryLife(game.world, candidatePersonId);
  const opponents = ensureCampaignOpponents(
    ensureStateJurisdiction(opened, place),
    {
      stableKey: "a66:bill-opponents",
      jurisdictionId,
      count: 1,
      excludePersonIds: [candidatePersonId],
    },
  );
  const fixture = { world: opponents.world };
  const officeKey = stateExecutiveIdentity(place)!.officeKey;
  const currency = makeCurrencyCode("USD");
  const filed = fileCampaign(fixture.world, {
    stableKey: "a66:bill-race",
    candidatePersonId,
    jurisdictionId,
    officeKey,
    districtBinding: null,
    electionDate: addDays(fixture.world.currentDate, 28),
    rivalPersonIds: opponents.personIds,
    existingContestId: null,
    committeeName: "Recorded bill committee",
    donorPoolName: "Legacy pool",
    advertisingVendorName: "Recorded media vendor",
    staffPersonIds: [],
    treasuryCurrency: currency,
  });
  let world = filed.world;
  if (
    !resourcePositionAt(
      world,
      { kind: "person", personId: candidatePersonId },
      currency,
    )
  ) {
    world = createResourcePosition(world, {
      stableKey: "a66:candidate-cash",
      owner: { kind: "person", personId: candidatePersonId },
      openedAt: world.currentDate,
      openingBalance: { minorUnits: 10000, currency },
      provenance: { kind: "authored", note: "Recorded test account" },
    });
  }
  world = createOrganization(world, {
    stableKey: "a66:fixture-employer",
    formedAt: world.currentDate,
    detailLevel: "lightweight",
    provenance: { kind: "authored", note: "Recorded fixture employer" },
    initialProfile: {
      name: "Fixture employer",
      classification: "enterprise:employer",
      locationJurisdictionId: jurisdictionId,
    },
  });
  const employerId = world.history.organizations.at(-1)!.id;
  const wages = { minorUnits: 10000, currency };
  const provenance = { kind: "authored" as const, note: "Saved fixture wages" };
  world = createResourcePosition(world, {
    stableKey: "a66:employer-cash",
    owner: { kind: "organization", organizationId: employerId },
    openedAt: world.currentDate,
    openingBalance: wages,
    provenance,
  });
  world = createResourceFlow(world, {
    stableKey: "a66:fixture-wages",
    source: { kind: "organization", organizationId: employerId },
    recipient: { kind: "person", personId: candidatePersonId },
    startsAt: world.currentDate,
    amount: wages,
    cadenceKind: "schedule:one-time",
    basisKind: "compensation:wages",
    basisReference: { kind: "general" },
    restrictionKind: null,
    jurisdictionId,
    provenance,
  });
  world = recordResourceTransferOutcome(world, {
    stableKey: "a66:fixture-wages-paid",
    resourceFlowId: world.history.resourceFlows.at(-1)!.id,
    periodStartsAt: world.currentDate,
    periodEndsAt: world.currentDate,
    occurredAt: world.currentDate,
    status: "completed",
    attemptedAmount: wages,
    transferredAmount: wages,
    reasonKind: null,
    note: null,
    provenance,
  });
  world = contributeOwnMoneyToCampaign(world, candidatePersonId, 5000);
  return { world, campaign: filed.campaign, place, seed };
}

describe("recorded campaign operating bills", () => {
  it("does not manufacture a bill, vendor, payment date, or cost from available cash", () => {
    const fixture = race();
    console.info(`A66 operating place=${fixture.place} seed=${fixture.seed}`);
    expect(
      planCampaignOperatingWeek(
        fixture.world,
        fixture.campaign,
        fixture.world.currentDate,
      ),
    ).toBe(fixture.world);
    expect(
      campaignOperatingSpending(fixture.world, fixture.campaign.organizationId),
    ).toBe(0);
  });

  it("pays the saved amount to the saved payee on the saved due date and never pays it again", () => {
    const fixture = race();
    let world = createOrganization(fixture.world, {
      stableKey: "a66:printer",
      formedAt: fixture.world.currentDate,
      detailLevel: "lightweight",
      provenance: { kind: "authored", note: "Recorded supplier fixture" },
      initialProfile: {
        name: "Recorded printer",
        classification: "enterprise:campaign-vendor-printing",
        locationJurisdictionId: fixture.campaign.jurisdictionId,
      },
    });
    const vendorId = world.history.organizations.at(-1)!.id;
    const amount = {
      minorUnits: 2000,
      currency: fixture.campaign.treasuryCurrency,
    };
    world = createResourcePosition(world, {
      stableKey: "a66:printer-cash",
      owner: { kind: "organization", organizationId: vendorId },
      openedAt: world.currentDate,
      openingBalance: { minorUnits: 0, currency: amount.currency },
      provenance: {
        kind: "authored",
        note: "Recorded supplier account fixture",
      },
    });
    const dueAt = addDays(world.currentDate, 3);
    world = createResourceFlow(world, {
      stableKey: "a66:printing-bill",
      source: {
        kind: "organization",
        organizationId: fixture.campaign.organizationId,
      },
      recipient: { kind: "organization", organizationId: vendorId },
      startsAt: dueAt,
      initialStatus: "expected",
      amount,
      cadenceKind: "schedule:one-time",
      basisKind: "custom:campaign-expenditure",
      basisReference: { kind: "general" },
      restrictionKind: "purpose:campaign",
      jurisdictionId: fixture.campaign.jurisdictionId,
      provenance: { kind: "authored", note: "Recorded printing order fixture" },
    });
    const flowId = world.history.resourceFlows.at(-1)!.id;
    const planned = planCampaignOperatingWeek(
      world,
      fixture.campaign,
      world.currentDate,
    );
    expect(
      planned.history.futureDueItems.find((row) =>
        row.entityIds.includes(flowId),
      )?.dueAt,
    ).toBe(dueAt);
    expect(payRecordedCampaignOperatingBill(planned, flowId)).toBe(planned);
    const due = passOrdinaryDays(planned, 3);
    const paid = payRecordedCampaignOperatingBill(due, flowId);
    const receipts = resourceTransferOutcomesOfFlows(paid, [flowId]);
    expect(receipts).toHaveLength(1);
    expect(receipts[0]).toMatchObject({
      status: "completed",
      occurredAt: dueAt,
      transferredAmount: amount,
    });
    expect(
      campaignOperatingSpending(paid, fixture.campaign.organizationId),
    ).toBe(2000);
    expect(
      resourcePositionAt(
        paid,
        {
          kind: "organization",
          organizationId: fixture.campaign.organizationId,
        },
        amount.currency,
      )!.liquidBalance.minorUnits,
    ).toBe(3000);
    expect(
      resourcePositionAt(
        paid,
        { kind: "organization", organizationId: vendorId },
        amount.currency,
      )!.liquidBalance.minorUnits,
    ).toBe(2000);
    expect(payRecordedCampaignOperatingBill(paid, flowId)).toBe(paid);
  });
});

describe("campaign purchase prices", () => {
  it("keeps unit prices fixed while place-sized quantities increase total cost", () => {
    const smallHouseholds = 120;
    const largeHouseholds = 12_000;
    const smallUnits = suggestedCampaignUnits("yard-sign", smallHouseholds);
    const largeUnits = suggestedCampaignUnits("yard-sign", largeHouseholds);
    const small = quoteCampaignPurchase("yard-sign", smallUnits);
    const large = quoteCampaignPurchase("yard-sign", largeUnits);

    expect(small.unitPriceMinorUnits).toBe(1_500);
    expect(large.unitPriceMinorUnits).toBe(small.unitPriceMinorUnits);
    expect(large.totalMinorUnits).toBeGreaterThan(small.totalMinorUnits);
    expect(small.totalMinorUnits).toBe(
      smallUnits * CAMPAIGN_UNIT_PRICES["yard-sign"].priceMinorUnits,
    );
    expect(large.totalMinorUnits).toBe(
      largeUnits * CAMPAIGN_UNIT_PRICES["yard-sign"].priceMinorUnits,
    );
  });

  it("marks fallback unit prices as estimates and rejects fractional units", () => {
    expect(
      Object.values(CAMPAIGN_UNIT_PRICES).every((price) => price.estimated),
    ).toBe(true);
    expect(() => quoteCampaignPurchase("postage", 1.5)).toThrow(/whole number/);
  });
});
