import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  addDays,
  ensureCampaignOpponents,
  ensureStateJurisdiction,
  fileCampaign,
  makeCurrencyCode,
  searchLifePlaces,
  stateExecutiveIdentity,
  stateJurisdictionForKey,
} from "../simulation";
import { spendCampaignFundsPersonally } from "../simulation/press";
import { spendAnAfternoon } from "../presentation/campaign-projection";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import {
  openOrdinaryLife,
  passOrdinaryDays,
} from "../presentation/ordinary-life";
import { CampaignSpendingReports } from "./CampaignSpendingReports";

/** An Oregon candidate for governor who pays themselves once from the committee. */
function oregonCampaignAMonthLater() {
  const place = searchLifePlaces("", 1, {
    stateJurisdictionKey: "US-OR",
    scope: "locality",
  })[0]!;
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "spending-reports-or",
      placeKey: place.key,
      startAge: 40,
      questionnaire: "skipped",
    }),
  ).game!;
  const personId = game.playerPersonId;
  const world = openOrdinaryLife(game.world, personId);
  const jurisdictionId = stateJurisdictionForKey("US-OR")!.id;
  const opponents = ensureCampaignOpponents(
    ensureStateJurisdiction(world, "OR"),
    {
      stableKey: "spending-reports",
      jurisdictionId,
      count: 1,
      excludePersonIds: [personId],
    },
  );
  const filed = fileCampaign(opponents.world, {
    stableKey: "spending-reports",
    candidatePersonId: personId,
    jurisdictionId,
    officeKey: stateExecutiveIdentity("OR")!.officeKey,
    districtBinding: null,
    electionDate: addDays(world.currentDate, 480),
    rivalPersonIds: opponents.personIds,
    existingContestId: null,
    committeeName: "Committee for the Oregon fixture",
    donorPoolName: "Supporters, in aggregate",
    advertisingVendorName: "Advertising, in aggregate",
    staffPersonIds: [],
    treasuryCurrency: makeCurrencyCode("USD"),
  });
  const funded = spendAnAfternoon(filed.world, personId, "fundraising");
  const taken = spendCampaignFundsPersonally(funded, {
    stableKey: "spending-reports:misuse",
    amountMinorUnits: 12_345,
    purpose: "a car payment",
  });
  return { world: passOrdinaryDays(taken.world, 35), personId };
}

describe("the campaign screen's spending reports", () => {
  const { world, personId } = oregonCampaignAMonthLater();
  const html = renderToStaticMarkup(
    <CampaignSpendingReports world={world} personId={personId} />,
  );

  it("lists the payment to the candidate on a filed report", () => {
    expect(html).toContain("Spending reports");
    expect(html).toContain("Your committee&#x27;s spending reports");
    expect(html).toContain("Paid to the candidate");
    expect(html).toContain("$123.45");
  });

  it("never shows the private reason the candidate gave themselves", () => {
    expect(html).not.toContain("a car payment");
  });
});
