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
import { addDays, makeIsoDate } from "../../src/simulation/dates";
import { campaignElectionDate } from "../../src/presentation/campaign-projection";
import {
  FILING_LEAD_DAYS,
  nextTownElection,
} from "../../src/simulation/nationwide-world/town-election-calendar";
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
import {
  passUntil,
  runToElection,
  suppliedWin,
} from "../fixtures/state-executive-entry";
import { electionContestResult } from "../../src/simulation/election-contests";
import {
  LOCAL_ELECTION_FILING,
  localCampaignSeat,
} from "../../src/simulation/living-world/local-elections";
import { sittingLocalOfficers } from "../../src/simulation/living-world/local-government-seats";
import { localGoverningBodyRules } from "../../src/simulation/nationwide-world/local-governing-body-rules";

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

const openedLives = new Map<string, { world: World; personId: EntityId }>();

/**
 * A grown adult's life opened in a place, built once per place and shared by
 * every case there: a World is an immutable value, so each case advances its
 * own copy from the same opening. Building a life is most of this file's
 * time, so one opening per place keeps the file's every place and assertion
 * at a fraction of the cost. The seed names the place.
 */
function adultLifeAt(placeKey: string) {
  const known = openedLives.get(placeKey);
  if (known) return known;
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: `town-body-${placeKey}`,
      placeKey,
      startAge: 40,
      questionnaire: "skipped",
    }),
  ).game!;
  const opened = {
    world: openOrdinaryLife(game.world, game.playerPersonId),
    personId: game.playerPersonId,
  };
  openedLives.set(placeKey, opened);
  return opened;
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
    // The body, and the mayor the city's voters elect at large.
    expect(bodies.map((office) => office.seat)).toEqual([
      "governing-body",
      "chief-executive",
    ]);
    const offices = electiveOfficesForJurisdiction(here);
    // The state's offices are still reached; the town's are added, not swapped.
    expect(offices.length).toBeGreaterThan(2);
    const body = offices.at(-2)!;
    expect(body.officeKey).toBe(bodies[0]!.officeKey);
    // The body the city's own government names, not a generic label.
    expect(body.chamberName).toBe("Bowling Green Board of Commissioners");
    expect(body.office.title).toBe(
      "Member of the Bowling Green Board of Commissioners",
    );
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
      // The body first, then the mayor where the town's voters elect one.
      expect(local[0]!.recordedBy.packName).toBe(government);
      expect(local[0]!.office.title).toBe("Council member");
      expect(
        local
          .slice(1)
          .map((office) => [office.recordedBy.packName, office.office.title]),
      ).toEqual(local.length > 1 ? [[government, "Mayor"]] : []);
      expect(offices.slice(-local.length)).toEqual(local);
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
    const { world, personId } = adultLifeAt(BOISE);
    const bowlingGreen = localGoverningBodiesForJurisdiction(
      jurisdictionOf(BOWLING_GREEN),
    )[0]!;
    const refused = candidacyEligibility(world, {
      personId,
      jurisdictionId: world.people[personId]!.homeJurisdictionId,
      officeKey: bowlingGreen.officeKey,
      alreadyACandidate: false,
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
      alreadyACandidate: false,
    });
    expect(elsewhere.eligible).toBe(false);
    expect(elsewhere.blocks.map((block) => block.kind)).toContain(
      "lives-elsewhere",
    );
  }, 60_000);
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
      const { world, personId } = adultLifeAt(placeKey);
      const home = world.people[personId]!.homeJurisdictionId;
      const body = localGoverningBodiesForJurisdiction(home)[0]!;

      const listed = projectCampaignOffices(world, personId).find(
        (office) => office.officeKey === body.officeKey,
      );
      expect(listed?.governmentLevel).toBe("Local government");
      expect(listed?.eligible).toBe(true);

      // The town's own calendar is proved in the calendar test below; the
      // race here is authored four weeks out so seating is what is tested.
      const filed = fileForOffice(
        world,
        personId,
        null,
        body.officeKey,
        addDays(world.currentDate, 28),
      );
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
    60_000,
  );
});

describe("standing again after a race is over", () => {
  // Found in a playtest in Ely, Minnesota: after one council race the game
  // never offered another filing, and a sitting member's re-election refused
  // its own result.
  it("Ely, Minnesota: files, wins, and stands again twice, keeping one seat", () => {
    const { world: opening, personId } = adultLifeAt(ELY);
    const home = opening.people[personId]!.homeJurisdictionId;
    const body = localGoverningBodiesForJurisdiction(home)[0]!;
    let world = opening;
    for (const race of [1, 2, 3]) {
      // Picking the office again offers the filing, whatever came before.
      expect(projectCampaign(world, personId, body.officeKey).phase).toBe(
        "can-file",
      );
      world = fileForOffice(
        world,
        personId,
        null,
        body.officeKey,
        addDays(world.currentDate, 28),
      );
      expect(
        world.history.electionContests!.filter((contest) =>
          contest.candidatePersonIds.includes(personId),
        ).length,
      ).toBe(race);
      world = runToElection(world, personId, suppliedWin(personId));
      // Until another office is picked, the last race's result stays up.
      expect(projectCampaign(world, personId).phase).toBe("won");
      const seats = activeOrganizationParticipationsAt(world, personId).filter(
        (active) => active.state.roleKind === "leader:municipal-member",
      );
      expect(seats).toHaveLength(1);
      expect(localGoverningSeatFor(world, personId)).not.toBeNull();
    }

    // The seat reads as an office everywhere the life is described. A small
    // town's council is part-time, so the job the person started with stays.
    const name = personName(world.people[personId]!);
    expect(projectWorkRole(world, personId).sentence).toBe(
      "Your roles: Sales clerk; Member of the City Council, City of Ely.",
    );
    const ely = projectGovernmentBrowser(world, personId).localGovernments.find(
      (entry) => entry.key === `unit:${body.unit.id}`,
    );
    // The town's council is seated from its residents, so the player is one
    // member on its roster, not the town's only officeholder.
    expect(ely?.roster?.map((row) => row.holderName)).toContain(name);
    expect(ely?.detail).toContain("Members of the Ely City Council.");
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

describe("a player's campaign and the town's own race", () => {
  it("Ely, Minnesota: the town leaves the player's seat off its ballot, and the winner keeps it", () => {
    const { world: opening, personId } = adultLifeAt(ELY);
    const home = opening.people[personId]!.homeJurisdictionId;
    const body = localGoverningBodiesForJurisdiction(home)[0]!;
    let world = fileForOffice(opening, personId, null, body.officeKey);
    const electionDate = world.history.electionContests!.at(-1)!.electionDate;
    const seat = localCampaignSeat(body.unit, false, electionDate);
    expect(seat).not.toBeNull();
    world = runToElection(world, personId, suppliedWin(personId));
    expect(projectCampaign(world, personId).phase).toBe("won");
    // Past the town's own count for the same election day.
    world = passUntil(world, addDays(electionDate, 14));

    const townRaces = world.history.electionContests!.filter(
      (contest) =>
        contest.stableKey.includes(`:${body.unit.id}:${electionDate}:`) &&
        !contest.candidatePersonIds.includes(personId),
    );
    expect(townRaces.length).toBeGreaterThan(0);
    expect(
      townRaces.some((contest) => contest.office.seatKey === `seat-${seat}`),
    ).toBe(false);

    const officers = sittingLocalOfficers(world, body.unit);
    const mine = officers.find((row) => row.personId === personId);
    expect(mine?.seatLabel).toMatch(new RegExp(`seat ${seat}$`));
    const members = officers.filter((row) => !row.mayor);
    expect(members).toHaveLength(
      localGoverningBodyRules(body.unit)!.seats!.value!,
    );
  }, 120_000);
  it("Ely, Minnesota: a campaign filed after the town's field closed calls off the town's race for that seat", () => {
    const { world: opening, personId } = adultLifeAt(ELY);
    const home = opening.people[personId]!.homeJurisdictionId;
    const body = localGoverningBodiesForJurisdiction(home)[0]!;
    // The town's field closes the filing lead (85 days) before its
    // November 3 election's first vote; the campaign files the day after.
    const fieldCloses = opening.history.futureDueItems.find(
      (item) =>
        item.transitionKey === LOCAL_ELECTION_FILING &&
        item.jurisdictionId === home,
    )!.dueAt;
    let world = passUntil(opening, addDays(fieldCloses, 1));
    const electionDate = makeIsoDate("2026-11-03");
    const seat = localCampaignSeat(body.unit, false, electionDate)!;
    const townRace = () =>
      world.history.electionContests!.find(
        (contest) =>
          contest.stableKey.includes(`:${body.unit.id}:${electionDate}:`) &&
          contest.office.seatKey === `seat-${seat}`,
      );
    expect(townRace()).toBeDefined();
    world = fileForOffice(world, personId, null, body.officeKey, electionDate);
    world = runToElection(world, personId, suppliedWin(personId));
    world = passUntil(world, addDays(electionDate, 14));
    expect(projectCampaign(world, personId).phase).toBe("won");
    expect(electionContestResult(world, townRace()!.id)).toBeNull();
    const mine = sittingLocalOfficers(world, body.unit).find(
      (row) => row.personId === personId,
    );
    expect(mine?.seatLabel).toMatch(new RegExp(`seat ${seat}$`));
  }, 120_000);
});

describe("when a town's race is held", () => {
  // Filed on the opening day, January 5, 2026.
  it.each([
    // Minnesota and Kentucky elect towns on the even-year November general
    // election day; Idaho on the odd-year one.
    ["Ely, Minnesota", ELY, "2026-11-03"],
    ["Paducah, Kentucky", PADUCAH, "2026-11-03"],
    ["American Falls, Idaho", AMERICAN_FALLS, "2027-11-02"],
  ])(
    "%s is elected on the day state law sets",
    (_, placeKey, expected) => {
      const { world, personId } = adultLifeAt(placeKey);
      const home = world.people[personId]!.homeJurisdictionId;
      const body = localGoverningBodiesForJurisdiction(home)[0]!;
      expect(world.currentDate).toBe("2026-01-05");
      expect(campaignElectionDate(world, home, body.officeKey)).toBe(expected);
      const filed = fileForOffice(world, personId, null, body.officeKey);
      expect(filed.history.electionContests!.at(-1)!.electionDate).toBe(
        expected,
      );
    },
    60_000,
  );

  it("a town whose state law leaves the timing open, and names no day, keeps the estimated filing lead", () => {
    // Maine lets each town choose town meeting day or November; the choice
    // the most state packs name among those is town meeting day, whose date
    // has not been read, so the race is the filing lead out.
    expect(nextTownElection("ME", "2360825", "2026-01-05" as never)).toBeNull();
    const { world, personId } = adultLifeAt("2360825");
    const home = world.people[personId]!.homeJurisdictionId;
    const body = localGoverningBodiesForJurisdiction(home)[0]!;
    expect(campaignElectionDate(world, home, body.officeKey)).toBe(
      addDays(world.currentDate, FILING_LEAD_DAYS),
    );
  }, 60_000);

  it("never sets an election closer than the filing lead", () => {
    expect(nextTownElection("MN", "2719142", "2026-10-10" as never)).toEqual({
      electionDate: "2028-11-07",
      timing: "even-year-november-consolidated",
      basis: "state-law-unverified",
    });
  });
});

describe("a council campaign saved before the body had its own name", () => {
  it("still opens: the office's title is display text, not its identity", () => {
    // Saves written before a town's body was named recorded every council
    // contest's office as "Member of the governing body". The pack now says
    // "Council member", and the load check once compared the two titles, so
    // every such save refused to open (a San Antonio life, playtest 9/24).
    const { world, personId } = adultLifeAt(BOISE);
    const home = world.people[personId]!.homeJurisdictionId;
    const body = localGoverningBodiesForJurisdiction(home)[0]!;
    expect(body.officeTitle).not.toBe("Member of the governing body");
    const filed = fileForOffice(
      world,
      personId,
      null,
      body.officeKey,
      addDays(world.currentDate, 28),
    );
    const contests = filed.history.electionContests!;
    const saved: World = {
      ...filed,
      history: {
        ...filed.history,
        electionContests: contests.map((contest, index) =>
          index === contests.length - 1
            ? {
                ...contest,
                office: {
                  ...contest.office,
                  title: "Member of the governing body",
                },
              }
            : contest,
        ),
      },
    };
    const reloaded = deserializeWorld(serializeWorld(saved));
    expect(projectCampaign(reloaded, personId, body.officeKey).phase).toBe(
      projectCampaign(filed, personId, body.officeKey).phase,
    );
  }, 60_000);
});

// 19,480 municipalities join to a place; 18 of them are not functionally active.
const OFFERED_TOWN_GOVERNMENTS = 19_462;
