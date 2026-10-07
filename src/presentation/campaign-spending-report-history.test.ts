import { describe, expect, it } from "vitest";
import { SeededRng } from "../simulation/rng";
import { STATES } from "../simulation/state-reference";

import {
  addDays,
  campaignOpponentRecords,
  ensureCampaignOpponents,
  ensureStateJurisdiction,
  fileCampaign,
  makeCurrencyCode,
  searchLifePlaces,
  stateExecutiveIdentity,
  stateJurisdictionForKey,
} from "../simulation";
import type { CampaignRecord, EntityId, World } from "../simulation";
import {
  campaignOperatingPayments,
  planCampaignOperatingWeek,
} from "../simulation/campaign-operating-costs";
import { campaignSpendingReports } from "../simulation/press";
import { recordOrganizationProfile } from "../simulation/life";
import { organizationProfileHistory } from "../simulation/life-queries";
import {
  createOrganization,
  createResourceFlow,
  createResourcePosition,
  recordResourceTransferOutcome,
} from "../simulation";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";

/** An ordinary 40-year-old life in a town in the state, filed for governor. */
function governorRace(electionInDays: number) {
  const seed = "a66-recorded-bills";
  const places = Object.keys(STATES);
  const usps = places[new SeededRng(seed).integer(0, places.length)]!;
  console.info(`S132 filed spending report place=${usps} seed=${seed}`);
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

describe("a filed campaign spending report", () => {
  it("is not rewritten by a vendor record written after it was filed", () => {
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
    expect(paid).toHaveLength(2);
    const filed = campaignSpendingReports(world, rival.committeeOrganizationId);
    const printing = filed
      .flatMap((report) => report.lines)
      .find((line) => line.payee === "Recorded printing supplier")!;
    expect(printing.purpose).toBe("printing");

    // The same payee is later renamed and reclassified. The record carries
    // the formation date, so its effective date alone would reach back over
    // every report; only its place in the history keeps the filing true.
    const printer = world.history.organizations.find(
      (organization) =>
        organizationProfileHistory(world, organization.id)[0]?.name ===
        "Recorded printing supplier",
    )!;
    const latest = organizationProfileHistory(world, printer.id).at(-1)!;
    const renamed = recordOrganizationProfile(world, {
      stableKey: "s132:printer-renamed",
      organizationId: printer.id,
      effectiveAt: printer.formedAt,
      name: "Renamed after filing",
      classification: "enterprise:campaign-vendor-travel",
      locationJurisdictionId: latest.locationJurisdictionId,
      supersedesProfileId: latest.id,
      provenance: { kind: "authored", note: "Later rename fixture" },
    });

    const reread = campaignSpendingReports(
      renamed,
      rival.committeeOrganizationId,
    );
    expect(reread).toEqual(filed);
    const line = reread
      .flatMap((report) => report.lines)
      .find((row) => row.flowId === printing.flowId)!;
    expect(line.payee).toBe("Recorded printing supplier");
    expect(line.purpose).toBe("printing");
  }, 300_000);

  it("leaves a quiet committee with no reports", () => {
    const race = governorRace(70);
    expect(
      campaignSpendingReports(race.world, race.campaign.organizationId),
    ).toEqual([]);
  }, 300_000);
});
