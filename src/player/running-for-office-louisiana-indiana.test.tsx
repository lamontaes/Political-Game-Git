import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it } from "vitest";

import { CampaignWorkspace } from "./CampaignWorkspace";
import { NationwideCandidacyWorkspace } from "./NationwideCandidacyWorkspace";
import { projectCampaignOffices } from "../presentation/campaign-office-discovery";
import { resolvePlayerCapabilities } from "../presentation/player-capabilities";
import {
  fileForStateExecutiveOffice,
  stateExecutiveCandidacyForPerson,
} from "../presentation/nationwide-candidacy";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { openOrdinaryLife } from "../presentation/ordinary-life";
import {
  ageOnDate,
  campaigns,
  countyEquivalentTerm,
  searchLifePlaces,
} from "../simulation";
import type { EntityId, World } from "../simulation";

/**
 * Regional playtest lives in Lake Charles, Louisiana and Indianapolis,
 * Indiana read two minimum ages on the Politics page beside the governor. The
 * 24 was the state House seat's requirement: with no office fileable, the
 * "Running for office" section above the governor printed the first refusal
 * alone and unlabeled. The 21 was the governor's own. Each age now sits with
 * its own office, and the governor's is the age the filing enforces. Lake
 * Charles's screen also named "Calcasieu Parish" and then spoke of counties;
 * Louisiana has parishes and Alaska boroughs.
 */

const PROVENANCE = /has not read|the game|compiled|rule pack|census|listing/i;

interface Life {
  readonly world: World;
  readonly personId: EntityId;
}

function openLife(
  placeName: string,
  stateKey: string,
  seed: string,
  startAge = 18,
): Life {
  const place = searchLifePlaces(placeName, 1, {
    stateJurisdictionKey: stateKey,
    scope: "locality",
  })[0]!;
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
      startAge,
      questionnaire: "skipped",
    }),
  ).game!;
  return {
    world: openOrdinaryLife(game.world, game.playerPersonId),
    personId: game.playerPersonId,
  };
}

function visibleText(markup: string): string {
  return markup
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function ageMinimums(text: string): number[] {
  return [...text.matchAll(/(?:at least|under|minimum age of) (\d+)/g)].map(
    (match) => Number(match[1]),
  );
}

function renderRaceScreen({ world, personId }: Life): string {
  return renderToStaticMarkup(
    <NationwideCandidacyWorkspace
      world={world}
      personId={personId}
      onWorldChange={() => {}}
      onOpenCampaign={() => {}}
    />,
  );
}

describe.each([
  ["Lake Charles", "US-LA", "LA", "Governor of Louisiana"],
  ["Indianapolis", "US-IN", "IN", "Governor of Indiana"],
] as const)(
  "The governor's age from %s",
  (placeName, stateKey, usps, title) => {
    let life: Life;

    beforeAll(() => {
      life = openLife(placeName, stateKey, `governor-age-${usps}`);
    });

    it("shows one minimum age in the governor's section, in plain words", () => {
      expect(
        ageOnDate(
          life.world.people[life.personId]!.birthDate,
          life.world.currentDate,
        ),
      ).toBe(18);
      const markup = renderRaceScreen(life);
      const start = markup.indexOf('data-testid="state-executive-candidacy"');
      expect(start).toBeGreaterThan(-1);
      const governor = visibleText(markup.slice(start));
      expect(governor).toContain(title);
      const ages = ageMinimums(governor);
      expect(ages, governor).toHaveLength(1);
      expect(governor).toContain(
        `You must be at least ${ages[0]} to stand for this office.`,
      );
      expect(governor).not.toMatch(PROVENANCE);

      const candidacy = stateExecutiveCandidacyForPerson(
        life.world,
        life.personId,
      )!;
      expect(candidacy.identity.stateUsps).toBe(usps);
      expect(
        candidacy.blocks.flatMap((block) => ageMinimums(block.reason)),
      ).toEqual(ages);
    });

    it("keeps the state House's age with the House, not beside the governor", () => {
      // The Politics page puts "Running for office" directly above the
      // governor. When no office could be filed for, that section printed the
      // first refusal alone: the House seat's "at least 24", unlabeled.
      const capabilities = resolvePlayerCapabilities(life.world);
      expect(capabilities.campaign).toBe(true);
      expect(
        capabilities.withheld.some((entry) => entry.surface === "campaign"),
      ).toBe(false);
      const markup = renderToStaticMarkup(
        <CampaignWorkspace
          world={life.world}
          personId={life.personId}
          onWorldChange={() => {}}
        />,
      );
      expect(markup).not.toContain('data-testid="campaign-unavailable"');
      const offices = projectCampaignOffices(life.world, life.personId);
      const house = offices.find((office) =>
        office.title.includes("House of Representatives"),
      )!;
      expect(ageMinimums(house.eligibility)).toHaveLength(1);
      expect(markup).toContain(
        `data-testid="campaign-office-status-${house.officeKey}">${house.eligibility}<`,
      );
    });

    it("files at exactly the age it shows, and refuses a year below it", () => {
      const candidacy = stateExecutiveCandidacyForPerson(
        life.world,
        life.personId,
      )!;
      const [shown] = candidacy.blocks.flatMap((block) =>
        ageMinimums(block.reason),
      );
      expect(shown).toBeGreaterThan(18);

      // A life begun at each age, in the same place: nothing is backdated.
      const tooYoung = openLife(
        placeName,
        stateKey,
        `governor-age-${usps}-below`,
        shown! - 1,
      );
      expect(() =>
        fileForStateExecutiveOffice(tooYoung.world, tooYoung.personId),
      ).toThrow(`You must be at least ${shown} to stand for this office.`);

      const oldEnough = openLife(
        placeName,
        stateKey,
        `governor-age-${usps}-at`,
        shown!,
      );
      expect(
        ageOnDate(
          oldEnough.world.people[oldEnough.personId]!.birthDate,
          oldEnough.world.currentDate,
        ),
      ).toBe(shown);
      const now = stateExecutiveCandidacyForPerson(
        oldEnough.world,
        oldEnough.personId,
      )!;
      expect(now.blocks.flatMap((block) => ageMinimums(block.reason))).toEqual(
        [],
      );
      expect(now.eligible).toBe(true);
      const filed = fileForStateExecutiveOffice(
        oldEnough.world,
        oldEnough.personId,
      );
      expect(
        campaigns(filed).some(
          (campaign) =>
            campaign.candidatePersonId === oldEnough.personId &&
            campaign.officeKey === now.identity.officeKey,
        ),
      ).toBe(true);
    }, 60_000); // opens two more lives, one at each age
  },
);

function homeGovernments(life: Life): { markup: string; text: string } {
  const markup = renderRaceScreen(life);
  const start = markup.lastIndexOf(
    "<",
    markup.indexOf('data-testid="home-governments"'),
  );
  const section = markup.slice(start, markup.indexOf("</section>", start));
  return { markup: section, text: visibleText(section) };
}

const COUNTY_WORD = /\bcount(?:y|ies)\b/i;

// Each case opens its own life, which takes seconds on a loaded runner.
describe(
  "What a state calls its counties, on the race screen",
  {
    timeout: 60_000,
  },
  () => {
    it("is parish in Louisiana, borough in Alaska and county elsewhere", () => {
      expect(countyEquivalentTerm("US-LA")).toEqual({
        singular: "parish",
        plural: "parishes",
      });
      expect(countyEquivalentTerm("US-AK")).toEqual({
        singular: "borough",
        plural: "boroughs",
      });
      expect(countyEquivalentTerm("US-IN")).toEqual({
        singular: "county",
        plural: "counties",
      });
      expect(countyEquivalentTerm(null).plural).toBe("counties");
    });

    it("names Calcasieu Parish and says nothing about counties", () => {
      const home = homeGovernments(
        openLife("Lake Charles", "US-LA", "county-term-lake-charles"),
      );
      expect(home.text).toContain("Calcasieu Parish");
      expect(home.text).not.toMatch(COUNTY_WORD);
      expect(home.text).not.toMatch(PROVENANCE);
      // Lake Charles lies in one parish, so there is no spread to explain.
      expect(home.markup).not.toContain('data-testid="home-county-spread"');
    });

    it("counts the parishes a place actually lies in", () => {
      const home = homeGovernments(
        openLife("Shreveport", "US-LA", "county-term-shreveport"),
      );
      const listed = [
        ...home.markup
          .slice(home.markup.indexOf('data-testid="home-counties"'))
          .matchAll(/<li data-unit-id="[^"]+">([^<]+)</g),
      ].map((match) => match[1]!);
      expect(listed).toHaveLength(2);
      expect(listed.every((name) => name.includes(" Parish"))).toBe(true);
      expect(home.text).toContain(
        "This place lies in two parishes, and each is listed above.",
      );
      expect(home.text).not.toMatch(COUNTY_WORD);
      expect(home.text).not.toMatch(PROVENANCE);
    });

    it("speaks of a borough in Anchorage", () => {
      const home = homeGovernments(
        openLife("Anchorage", "US-AK", "county-term-anchorage"),
      );
      expect(home.text).toContain("Municipality of Anchorage");
      expect(home.text).toContain(
        "No separate borough government serves this city.",
      );
      expect(home.text).not.toMatch(COUNTY_WORD);
      expect(home.text).not.toMatch(PROVENANCE);
    });

    it("keeps counties in Indiana and Ohio", () => {
      const indianapolis = homeGovernments(
        openLife("Indianapolis", "US-IN", "county-term-indianapolis"),
      );
      expect(indianapolis.text).toContain(
        "No separate county government serves this city.",
      );
      expect(indianapolis.text).not.toMatch(PROVENANCE);

      const columbus = homeGovernments(
        openLife("Columbus", "US-OH", "county-term-columbus"),
      );
      expect(columbus.text).toContain(
        "This place lies in three counties, and each is listed above.",
      );
      expect(columbus.text).not.toMatch(PROVENANCE);
    });
  },
);
