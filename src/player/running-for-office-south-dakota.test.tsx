import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it } from "vitest";

import { CampaignWorkspace } from "./CampaignWorkspace";
import { NationwideCandidacyWorkspace } from "./NationwideCandidacyWorkspace";
import { projectCampaignOffices } from "../presentation/campaign-office-discovery";
import { stateExecutiveCandidacyForPerson } from "../presentation/nationwide-candidacy";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { openOrdinaryLife } from "../presentation/ordinary-life";
import { resolvePlayerCapabilities } from "../presentation/player-capabilities";
import {
  ageOnDate,
  electiveOfficesForJurisdiction,
  searchLifePlaces,
} from "../simulation";
import type { EntityId, World } from "../simulation";

/**
 * Owner playtest: an eighteen-year-old in Rapid City, South Dakota opened
 * Politics > Campaigns > "Running for office" and read one unlabeled sentence
 * ("at least 24") where the offices should have been, then a governor's
 * section holding a second, different age ("under 21") explained in the
 * game's own provenance. Rapid City has a council and a mayor, and South
 * Dakota elects a House and a Senate; every one of them belongs on that
 * screen, each with its own single requirement, in words a player reads.
 */

const PROVENANCE = /has not read|the game|compiled|rule pack/i;

let world: World;
let personId: EntityId;

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
  return [...text.matchAll(/(?:at least|under) (\d+)/g)].map((match) =>
    Number(match[1]),
  );
}

beforeAll(() => {
  const place = searchLifePlaces("Rapid City", 1, {
    stateJurisdictionKey: "US-SD",
    scope: "locality",
  })[0]!;
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "running-for-office-rapid-city",
      placeKey: place.key,
      startAge: 18,
      questionnaire: "skipped",
    }),
  ).game!;
  world = openOrdinaryLife(game.world, game.playerPersonId);
  personId = game.playerPersonId;
});

describe("Running for office from Rapid City, South Dakota, at eighteen", () => {
  it("is an ordinary eighteen-year-old in Rapid City", () => {
    const person = world.people[personId]!;
    expect(ageOnDate(person.birthDate, world.currentDate)).toBe(18);
    const capabilities = resolvePlayerCapabilities(world);
    expect(capabilities.formativeYears).toBe(false);
  });

  it("opens the Campaigns surface on the offices the place elects, not the first refusal", () => {
    const capabilities = resolvePlayerCapabilities(world);
    // PlayerGame mounts CampaignWorkspace only when this is true; otherwise it
    // prints the first withheld reason alone, which is what the owner saw.
    expect(capabilities.campaign).toBe(true);
    expect(
      capabilities.withheld.some((entry) => entry.surface === "campaign"),
    ).toBe(false);

    const person = world.people[personId]!;
    const elective = electiveOfficesForJurisdiction(
      person.homeJurisdictionId,
    ).map((option) => option.officeKey);
    const offices = projectCampaignOffices(world, personId);
    expect(offices.map((office) => office.officeKey)).toEqual(elective);
    expect(offices.map((office) => [office.provider, office.title])).toEqual([
      ["South Dakota Legislature", "Seat in the House of Representatives"],
      ["South Dakota Legislature", "Seat in the Senate"],
      ["City of Rapid City", "Member of the governing body"],
      ["City of Rapid City", "Mayor"],
    ]);

    const markup = renderToStaticMarkup(
      <CampaignWorkspace
        world={world}
        personId={personId}
        onWorldChange={() => {}}
      />,
    );
    expect(markup).toContain('data-testid="campaign-office-browser"');
    for (const office of offices) {
      expect(markup).toContain(`value="${office.officeKey}"`);
      expect(markup).toContain(
        `data-testid="campaign-office-status-${office.officeKey}"`,
      );
    }
  });

  it("holds each office to one minimum age, the same wherever it is read", () => {
    const offices = projectCampaignOffices(world, personId);
    for (const office of offices) {
      expect(office.eligible).toBe(false);
      expect(
        new Set(ageMinimums(office.eligibility)).size,
        `${office.title}: ${office.eligibility}`,
      ).toBe(1);
      expect(office.eligibility).toMatch(
        /^You must be at least \d+ to stand for this office\.$/,
      );
    }
    const governor = stateExecutiveCandidacyForPerson(world, personId)!;
    expect(governor.identity.stateUsps).toBe("SD");
    const governorAges = governor.blocks.flatMap((block) =>
      ageMinimums(block.reason),
    );
    expect(new Set(governorAges).size).toBe(1);

    // Nothing on the rendered screen joins several offices' ages into one
    // unlabeled paragraph: every age sits in its own office's status.
    const markup = renderToStaticMarkup(
      <CampaignWorkspace
        world={world}
        personId={personId}
        onWorldChange={() => {}}
      />,
    );
    expect(markup).not.toContain('data-testid="campaign-unavailable"');
    const statuses = [
      ...markup.matchAll(
        /data-testid="campaign-office-status-([^"]+)">([^<]*)</g,
      ),
    ];
    expect(statuses).toHaveLength(offices.length);
    for (const [, officeKey, text] of statuses) {
      const office = offices.find((entry) => entry.officeKey === officeKey)!;
      expect(text).toBe(office.eligibility);
    }
  });

  it("tells the player the requirement, never where the game got it", () => {
    const campaign = visibleText(
      renderToStaticMarkup(
        <CampaignWorkspace
          world={world}
          personId={personId}
          onWorldChange={() => {}}
        />,
      ),
    );
    const statewide = visibleText(
      renderToStaticMarkup(
        <NationwideCandidacyWorkspace
          world={world}
          personId={personId}
          onWorldChange={() => {}}
          onOpenCampaign={() => {}}
        />,
      ),
    );
    expect(statewide).toContain("Governor of South Dakota");
    expect(statewide).toContain(
      "You must be at least 21 to stand for this office.",
    );
    for (const text of [campaign, statewide]) {
      expect(text).not.toMatch(PROVENANCE);
    }
  });
});
