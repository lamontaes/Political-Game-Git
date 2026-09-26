import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { describe, expect, it } from "vitest";

import {
  activeCampaignForCandidate,
  addDays,
  candidacyEligibility,
  ensureCampaignOpponents,
  ensureStateJurisdiction,
  fileCampaign,
  campaignStatementStatus,
  fileCampaignStatement,
  makeCurrencyCode,
  publicCampaignComplianceDocuments,
  searchLifePlaces,
  unresearchedStatementDeadlineDays,
  UNRESEARCHED_CAMPAIGN_FILING_RULE,
  stateExecutiveIdentity,
  stateJurisdictionForKey,
} from "../simulation";
import { CampaignFilings } from "../player/CampaignFilings";
import { readableCampaignDate } from "../player/CampaignWorkspace";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { openOrdinaryLife } from "./ordinary-life";

/** An ordinary 40-year-old life in a town in the state, filed for governor. */
function governorRace(usps: string, seed: string) {
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
  const officeKey = stateExecutiveIdentity(usps)!.officeKey;
  const opponents = ensureCampaignOpponents(
    ensureStateJurisdiction(world, usps),
    {
      stableKey: `filings-${usps}`,
      jurisdictionId,
      count: 1,
      excludePersonIds: [personId],
    },
  );
  const filed = fileCampaign(opponents.world, {
    stableKey: `filings-${usps}`,
    candidatePersonId: personId,
    jurisdictionId,
    officeKey,
    districtBinding: null,
    electionDate: addDays(world.currentDate, 90),
    rivalPersonIds: opponents.personIds,
    existingContestId: null,
    committeeName: `Committee for the ${usps} fixture`,
    donorPoolName: "Supporters, in aggregate",
    advertisingVendorName: "Advertising, in aggregate",
    staffPersonIds: [],
    treasuryCurrency: makeCurrencyCode("USD"),
  });
  const campaignId = activeCampaignForCandidate(filed.world, personId)!.id;
  return {
    world: filed.world,
    personId,
    campaignId,
    jurisdictionId,
    officeKey,
  };
}

function renderFilings(race: ReturnType<typeof governorRace>) {
  return renderToStaticMarkup(
    createElement(CampaignFilings, {
      world: race.world,
      personId: race.personId,
      campaignId: race.campaignId,
      onWorldChange: () => undefined,
      readableDate: readableCampaignDate,
    }),
  );
}

describe("campaign filings on the campaign screen", () => {
  it.each([
    ["MT", "filings-montana"],
    ["ME", "filings-maine"],
    ["AZ", "filings-arizona"],
  ])(
    "gives %s a placeholder statement of organization, and files it as a public record",
    (usps, seed) => {
      const race = governorRace(usps, seed);
      const days = unresearchedStatementDeadlineDays(`US-${usps}`);
      const status = campaignStatementStatus(race.world, race.campaignId);
      expect(status.kind).toBe("due");
      if (status.kind !== "due") return;
      expect(status.rule.placeholder).toBe(true);
      expect(status.rule.documentKind).toBe("statement-of-organization");
      expect(status.dueOn).toBe(addDays(race.world.currentDate, days));
      expect(renderFilings(race)).toContain(
        "statement of organization is due with the state by",
      );

      const filed = fileCampaignStatement(race.world, race.campaignId);
      const records = publicCampaignComplianceDocuments(filed, race.campaignId);
      expect(records).toHaveLength(1);
      expect(records[0]!.kind).toBe("statement-of-organization");
      expect(records[0]!.rulePackId).toBe(
        UNRESEARCHED_CAMPAIGN_FILING_RULE.version,
      );
      expect(renderFilings({ ...race, world: filed })).toContain(
        "Statement of organization: filed",
      );
      expect(() => fileCampaignStatement(filed, race.campaignId)).toThrow(
        "already filed",
      );
      const late = {
        ...race.world,
        currentDate: addDays(race.world.currentDate, days + 1),
      };
      expect(campaignStatementStatus(late, race.campaignId).kind).toBe(
        "missed",
      );
      expect(renderFilings({ ...race, world: late })).toContain(
        "and it was never filed",
      );
    },
  );

  it("draws each unread state's deadline from the national range, the same every time", () => {
    const keys = [
      "US-AK",
      "US-HI",
      "US-ND",
      "US-VT",
      "US-WV",
      "US-GU",
      "US-TX",
    ];
    const days = keys.map(unresearchedStatementDeadlineDays);
    const { min, max } =
      UNRESEARCHED_CAMPAIGN_FILING_RULE.statementOfOrganizationWithinDays;
    for (const value of days) {
      expect(value).toBeGreaterThanOrEqual(min);
      expect(value).toBeLessThanOrEqual(max);
    }
    expect(new Set(days).size).toBeGreaterThan(1);
    expect(keys.map(unresearchedStatementDeadlineDays)).toEqual(days);
  });
});

describe("a second committee for the same office", () => {
  it("is refused in Minnesota in the statute's words once the law is known to apply", () => {
    const race = governorRace("MN", "filings-minnesota");
    const ask = (world: typeof race.world) =>
      candidacyEligibility(world, {
        personId: race.personId,
        jurisdictionId: race.jurisdictionId,
        officeKey: race.officeKey,
        alreadyACandidate: true,
      }).blocks.map((block) => block.reason);
    // The statute was read on 9/9/2026; before then the game cannot say it
    // applied, so its own rule against running twice speaks.
    expect(ask(race.world)).toEqual([
      "This character is already running for something.",
    ]);
    const later = {
      ...race.world,
      currentDate: addDays(race.world.currentDate, 250),
    };
    expect(ask(later)).toEqual([
      "A candidate cannot cause a second committee to be formed, and this character already has one running.",
    ]);
  });

  it.each([
    ["WY", "filings-wyoming"],
    ["NM", "filings-new-mexico"],
  ])("keeps the game's own sentence in %s", (usps, seed) => {
    const race = governorRace(usps, seed);
    const eligibility = candidacyEligibility(race.world, {
      personId: race.personId,
      jurisdictionId: race.jurisdictionId,
      officeKey: race.officeKey,
      alreadyACandidate: true,
    });
    expect(eligibility.blocks.map((block) => block.reason)).toContain(
      "This character is already running for something.",
    );
  });
});
