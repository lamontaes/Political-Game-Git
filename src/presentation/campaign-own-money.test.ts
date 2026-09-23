import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { describe, expect, it } from "vitest";

import {
  addDays,
  campaignForCandidate,
  ensureCampaignOpponents,
  ensureStateJurisdiction,
  fileCampaign,
  makeCurrencyCode,
  searchLifePlaces,
  stateExecutiveIdentity,
  stateJurisdictionForKey,
} from "../simulation";
import {
  CANDIDATE_OWN_MONEY_EVENT,
  candidatePersonalBalance,
  contributeOwnMoneyToCampaign,
} from "../simulation/campaign-money-sources";
import { resourcePositionAt } from "../simulation/resource-queries";
import { CampaignOwnMoney } from "../player/CampaignOwnMoney";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { openOrdinaryLife } from "./ordinary-life";
import { createResourcePosition } from "../simulation/resources";

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
  const opponents = ensureCampaignOpponents(
    ensureStateJurisdiction(world, usps),
    {
      stableKey: `own-money-${usps}`,
      jurisdictionId,
      count: 1,
      excludePersonIds: [personId],
    },
  );
  const filed = fileCampaign(opponents.world, {
    stableKey: `own-money-${usps}`,
    candidatePersonId: personId,
    jurisdictionId,
    officeKey: stateExecutiveIdentity(usps)!.officeKey,
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
  return { world: filed.world, personId };
}

/** The same race, with $20,000 of the candidate's own money on record. */
function fundedRace(usps: string, seed: string) {
  const race = governorRace(usps, seed);
  const world = createResourcePosition(race.world, {
    stableKey: `own-money-${usps}:savings`,
    owner: { kind: "person", personId: race.personId },
    openedAt: race.world.currentDate,
    openingBalance: {
      minorUnits: 2_000_000,
      currency: makeCurrencyCode("USD"),
    },
    provenance: { kind: "authored", note: "Test savings." },
  });
  return { world, personId: race.personId };
}

describe("a candidate's own money", () => {
  it.each([
    ["NM", "own-money-nm"],
    ["ND", "own-money-nd"],
  ])(
    "moves from the candidate to the committee in %s, on the record",
    (usps, seed) => {
      const race = fundedRace(usps, seed);
      const campaign = campaignForCandidate(race.world, race.personId)!;
      const personal = candidatePersonalBalance(race.world, race.personId)!;
      expect(personal).toBe(2_000_000);
      const committee = (w: typeof race.world) =>
        resourcePositionAt(
          w,
          { kind: "organization", organizationId: campaign.organizationId },
          campaign.treasuryCurrency,
        )?.liquidBalance.minorUnits ?? 0;

      const after = contributeOwnMoneyToCampaign(
        race.world,
        race.personId,
        50_000,
      );
      expect(committee(after)).toBe(committee(race.world) + 50_000);
      expect(candidatePersonalBalance(after, race.personId)).toBe(
        personal - 50_000,
      );
      const event = after.history.events.at(-1)!;
      expect(event.type).toBe(CANDIDATE_OWN_MONEY_EVENT);
      expect(event.visibility).toBe("public");
      expect(event.summary).toContain("$500.00");

      // A second gift is its own record.
      const again = contributeOwnMoneyToCampaign(after, race.personId, 50_000);
      expect(committee(again)).toBe(committee(race.world) + 100_000);

      // Nobody gives money they do not have.
      expect(() =>
        contributeOwnMoneyToCampaign(race.world, race.personId, personal + 1),
      ).toThrow(/do not have that much/);
    },
    300_000,
  );

  it("offers only the amounts the candidate can afford", () => {
    const race = fundedRace("NM", "own-money-nm");
    const poorer = contributeOwnMoneyToCampaign(
      race.world,
      race.personId,
      1_900_000,
    );
    const html = renderToStaticMarkup(
      createElement(CampaignOwnMoney, {
        world: poorer,
        personId: race.personId,
        onWorldChange: () => undefined,
      }),
    );
    expect(html).toContain("You have $1,000 of your own");
    const buttons = [
      ...html.matchAll(/<button[^>]*>Put in ([^<]+)<\/button>/g),
    ];
    expect(buttons.map((b) => b[1])).toEqual(["$500", "$1,000", "$5,000"]);
    expect(buttons.map((b) => b[0].includes("disabled"))).toEqual([
      false,
      false,
      true,
    ]);
  }, 300_000);

  it("says so, rather than showing $0, when the game is not tracking the money", () => {
    const race = governorRace("ND", "own-money-nd");
    expect(candidatePersonalBalance(race.world, race.personId)).toBeNull();
    const html = renderToStaticMarkup(
      createElement(CampaignOwnMoney, {
        world: race.world,
        personId: race.personId,
        onWorldChange: () => undefined,
      }),
    );
    expect(html).toContain("not tracking your own money");
    expect(html).not.toContain("<button");
    expect(() =>
      contributeOwnMoneyToCampaign(race.world, race.personId, 50_000),
    ).toThrow(/not tracking/);
  }, 300_000);
});
