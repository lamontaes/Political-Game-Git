import { describe, expect, it } from "vitest";
import { allGovernmentUnits } from "../../src/simulation/government-units";
import {
  candidacyEligibility,
  candidacyPackById,
  deserializeWorld,
  electiveOfficesForJurisdiction,
  lifePlaceByKey,
  localGoverningBodiesForJurisdiction,
  localGoverningBodyIdentity,
  localGoverningBodyIdentityForOfficeKey,
  localGovernmentOrganizationKey,
  searchLifePlaces,
  serializeWorld,
} from "../../src/simulation";
import { activeOrganizationParticipationsAt } from "../../src/simulation/life-queries";
import { personName } from "../../src/simulation";
import { projectCampaignGuidance } from "../../src/simulation/campaign-life-activities";
import { projectWorkRole } from "../../src/presentation/day-overview";
import { projectGovernmentBrowser } from "../../src/presentation/politics-government";
import type { EntityId, World } from "../../src/simulation";
import {
  fileForOffice,
  projectCampaign,
} from "../../src/presentation/campaign-projection";
import { localGoverningSeatFor } from "../../src/presentation/local-governing-seat";
import { projectCampaignOffices } from "../../src/presentation/campaign-office-discovery";
import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import { openOrdinaryLife } from "../../src/presentation/ordinary-life";
import { runToElection, suppliedWin } from "../fixtures/state-executive-entry";

/**
 * A town's own governing body, offered in every town that has a government.
 *
 * The count is pinned so that a change to which units are offered is a
 * deliberate edit here, not a quiet drift: every active municipality the
 * Census listing joins to a place.
 */

const BOWLING_GREEN = "2108902";
const BOISE = "1608830";
const PADUCAH = "2158836";
const AMERICAN_FALLS = "1601900";
const ELY = "2719142";

function adultLifeAt(placeKey: string, seed: string) {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey,
      startAge: 40,
      questionnaire: "skipped",
    }),
  ).game!;
  return {
    world: openOrdinaryLife(game.world, game.playerPersonId),
    personId: game.playerPersonId,
  };
}

function jurisdictionOf(placeKey: string): EntityId {
  const place = lifePlaceByKey(placeKey);
  if (!place) throw new Error(`No place ${placeKey}.`);
  return place.context.jurisdiction.id;
}

describe("a town's governing body, across the country", () => {
  it("covers every active municipality that reaches a place, and nothing else", () => {
    const units = allGovernmentUnits();
    const offered = units.filter(
      (unit) =>
        unit.placeGeoid !== null && localGoverningBodyIdentity(unit) !== null,
    );
    expect(offered.length).toBe(OFFERED_TOWN_GOVERNMENTS);
    // Counties and townships are not offered; a township joins to no place.
    expect(
      units.filter(
        (unit) =>
          unit.unitType !== "municipality" &&
          localGoverningBodyIdentity(unit) !== null,
      ),
    ).toEqual([]);
    // Every office key resolves back to its own unit, and its pack to itself,
    // so a filed campaign keeps its authority after a save is reloaded.
    for (const unit of offered) {
      const identity = localGoverningBodyIdentity(unit)!;
      expect(
        localGoverningBodyIdentityForOfficeKey(identity.officeKey)?.unit.id,
      ).toBe(unit.id);
      expect(candidacyPackById(identity.candidacyPackId)?.packId).toBe(
        identity.candidacyPackId,
      );
    }
  });

  it("offers Bowling Green's body beside Kentucky's seats, and invents nothing about it", () => {
    const here = jurisdictionOf(BOWLING_GREEN);
    const bodies = localGoverningBodiesForJurisdiction(here);
    expect(bodies).toHaveLength(1);
    const offices = electiveOfficesForJurisdiction(here);
    // The state's offices are still reached; the town's is added, not swapped.
    expect(offices.length).toBeGreaterThan(1);
    const body = offices.at(-1)!;
    expect(body.officeKey).toBe(bodies[0]!.officeKey);
    expect(body.chamberName).toBe("City of Bowling Green governing body");
    expect(body.seats.kind).toBe("unknown");
    expect(body.qualification.minimumAge.kind).toBe("unknown");
    expect(body.qualification.termYears.kind).toBe("unknown");
    // Nothing a player reads names where the listing came from.
    for (const gap of body.unresolvedGaps)
      expect(gap).not.toMatch(/census|listing|gus2025|http/i);
  });

  // Three states that had no legislature pack, where a candidate was told
  // there was nothing below governor to stand for.
  it.each([
    ["Augusta", "ME", "City of Augusta"],
    ["Atlanta", "GA", "City of Atlanta"],
    ["Phoenix", "AZ", "City of Phoenix"],
  ])(
    "%s, %s: the town's own body is the office on offer",
    (town, usps, government) => {
      const place = searchLifePlaces(town, 5, {
        stateJurisdictionKey: `US-${usps}`,
        scope: "locality",
      }).find((candidate) => candidate.displayName.startsWith(`${town},`))!;
      const offices = electiveOfficesForJurisdiction(
        place.context.jurisdiction.id,
      );
      // The city's own body is on offer whatever the state above it has read;
      // a state legislature, where one is added, sits before it, never instead.
      const local = offices.filter((office) =>
        localGoverningBodyIdentityForOfficeKey(office.officeKey),
      );
      expect(local.map((office) => office.recordedBy.packName)).toEqual([
        government,
      ]);
      expect(offices.at(-1)).toBe(local[0]);
    },
  );

  it("gives a place with no government of its own nothing to run for locally", () => {
    const cdp = searchLifePlaces("", 400, {
      stateJurisdictionKey: "US-KY",
      scope: "locality",
    }).find(
      (place) =>
        localGoverningBodiesForJurisdiction(place.context.jurisdiction.id)
          .length === 0,
    );
    expect(cdp).toBeDefined();
  });

  it("does not let a Boise resident stand for Bowling Green's body", () => {
    const { world, personId } = adultLifeAt(BOISE, "town-body-elsewhere");
    const bowlingGreen = localGoverningBodiesForJurisdiction(
      jurisdictionOf(BOWLING_GREEN),
    )[0]!;
    const refused = candidacyEligibility(world, {
      personId,
      jurisdictionId: world.people[personId]!.homeJurisdictionId,
      officeKey: bowlingGreen.officeKey,
    });
    expect(refused.eligible).toBe(false);
    expect(refused.blocks.map((block) => block.kind)).toContain(
      "no-sourced-office",
    );
    // Asked about Bowling Green itself, the body exists and they live elsewhere.
    const elsewhere = candidacyEligibility(world, {
      personId,
      jurisdictionId: jurisdictionOf(BOWLING_GREEN),
      officeKey: bowlingGreen.officeKey,
    });
    expect(elsewhere.eligible).toBe(false);
    expect(elsewhere.blocks.map((block) => block.kind)).toContain(
      "lives-elsewhere",
    );
  });
});

describe("standing for the town's governing body and taking the seat", () => {
  // Bowling Green's government has been read in depth; Paducah's and American
  // Falls' have not, and are seated in the government the listing records.
  it.each([
    ["Bowling Green, Kentucky", BOWLING_GREEN, true],
    ["Paducah, Kentucky", PADUCAH, false],
    ["American Falls, Idaho", AMERICAN_FALLS, false],
  ])(
    "%s: listed, filed, won, seated in the town's own government",
    (_, placeKey, expectCityScreen) => {
      const { world, personId } = adultLifeAt(
        placeKey,
        `town-body-${placeKey}`,
      );
      const home = world.people[personId]!.homeJurisdictionId;
      const body = localGoverningBodiesForJurisdiction(home)[0]!;

      const listed = projectCampaignOffices(world, personId).find(
        (office) => office.officeKey === body.officeKey,
      );
      expect(listed?.governmentLevel).toBe("Local government");
      expect(listed?.eligible).toBe(true);

      const filed = fileForOffice(world, personId, null, body.officeKey);
      const contest = filed.history.electionContests!.at(-1)!;
      expect(contest.office.officeKey).toBe(body.officeKey);
      expect(contest.jurisdictionId).toBe(home);

      const decided = runToElection(filed, personId, suppliedWin(personId));
      expect(projectCampaign(decided, personId).phase).toBe("won");

      // Seated in the town's own government, never in the state's legislature.
      const seat = localGoverningSeatFor(decided, personId);
      expect(seat).not.toBeNull();
      expect(seat!.since).toBe(contest.electionDate);
      expect(seat!.hasCityScreen).toBe(expectCityScreen);
      expect(
        decided.history.workRelationships.some(
          (relationship) =>
            relationship.personId === personId &&
            relationship.kind.startsWith("employment:legislative-"),
        ),
      ).toBe(false);
      if (!expectCityScreen)
        expect(
          decided.history.organizations.find(
            (organization) => organization.id === seat!.organizationId,
          )?.stableKey,
        ).toBe(localGovernmentOrganizationKey(body.unit));

      // A reloaded save keeps the seat and the campaign's authority.
      const reloaded: World = deserializeWorld(serializeWorld(decided));
      expect(projectCampaign(reloaded, personId).phase).toBe("won");
      expect(localGoverningSeatFor(reloaded, personId)?.organizationId).toBe(
        seat!.organizationId,
      );
    },
  );
});

describe("standing again after a race is over", () => {
  // Found in a playtest in Ely, Minnesota: after one council race the game
  // never offered another filing, and a sitting member's re-election refused
  // its own result.
  it("Ely, Minnesota: files, wins, and stands again twice, keeping one seat", () => {
    const { world: opening, personId } = adultLifeAt(ELY, "town-body-again");
    const home = opening.people[personId]!.homeJurisdictionId;
    const body = localGoverningBodiesForJurisdiction(home)[0]!;
    let world = opening;
    for (const race of [1, 2, 3]) {
      // Picking the office again offers the filing, whatever came before.
      expect(projectCampaign(world, personId, body.officeKey).phase).toBe(
        "can-file",
      );
      world = fileForOffice(world, personId, null, body.officeKey);
      expect(world.history.electionContests!.length).toBe(race);
      world = runToElection(world, personId, suppliedWin(personId));
      // Until another office is picked, the last race's result stays up.
      expect(projectCampaign(world, personId).phase).toBe("won");
      const seats = activeOrganizationParticipationsAt(world, personId).filter(
        (active) => active.state.roleKind === "leader:municipal-member",
      );
      expect(seats).toHaveLength(1);
      expect(localGoverningSeatFor(world, personId)).not.toBeNull();
    }

    // The seat reads as an office everywhere the life is described.
    const name = personName(world.people[personId]!);
    expect(projectWorkRole(world, personId).sentence).toBe(
      "Your role: Member of the governing body, City of Ely.",
    );
    const ely = projectGovernmentBrowser(world, personId).localGovernments.find(
      (entry) => entry.key === `unit:${body.unit.id}`,
    );
    expect(ely?.holderName).toBe(name);
    expect(ely?.detail).toContain("Member of the governing body.");
    // The county above it is named the way Minnesotans say it.
    expect(
      projectGovernmentBrowser(world, personId).alsoGoverning.map(
        (entry) => entry.title,
      ),
    ).toContain("St. Louis County");
    // A party host's advice knows the town's own seat.
    expect(
      projectCampaignGuidance(world, personId).offices.map(
        (office) => office.officeKey,
      ),
    ).toContain(body.officeKey);
  }, 120_000);
});

// 19,480 municipalities join to a place; 18 of them are not functionally active.
const OFFERED_TOWN_GOVERNMENTS = 19_462;
