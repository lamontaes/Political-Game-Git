import { describe, expect, it } from "vitest";
import {
  allGovernmentUnits,
  governmentUnitsForPlace,
} from "../../src/simulation/government-units";
import {
  candidacyPackById,
  deserializeWorld,
  electiveOfficesForJurisdiction,
  lifePlaceByKey,
  localGoverningBodiesForJurisdiction,
  localGoverningBodyIdentityForOfficeKey,
  serializeWorld,
} from "../../src/simulation";
import { localChiefExecutiveRules } from "../../src/simulation/nationwide-world/local-chief-executive-rules";
import {
  placePopulation,
  placePopulationCoverage,
} from "../../src/simulation/nationwide-world/place-population";
import { localChiefExecutiveIdentity } from "../../src/simulation/nationwide-world/local-governing-body-candidacy-packs";
import { municipalGovernmentForUnit } from "../../src/simulation/rule-capability-resolver";
import {
  installMunicipalGovernment,
  municipalSeats,
  seatMunicipalMember,
} from "../../src/simulation/municipal-public-work";
import { organizationParticipationStateAt } from "../../src/simulation/life-queries";
import { activeOrganizationParticipationsAt } from "../../src/simulation/life-queries";
import { addDays } from "../../src/simulation/dates";
import type { EntityId, IsoDate, World } from "../../src/simulation";
import {
  campaignElectionDate,
  fileForOffice,
  projectCampaign,
} from "../../src/presentation/campaign-projection";
import {
  localGoverningSeatFor,
  townSeatRulesSentence,
} from "../../src/presentation/local-governing-seat";
import { projectCampaignOffices } from "../../src/presentation/campaign-office-discovery";
import { projectWorkRole } from "../../src/presentation/day-overview";
import { projectGovernmentBrowser } from "../../src/presentation/politics-government";
import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import { openOrdinaryLife } from "../../src/presentation/ordinary-life";
import { runToElection, suppliedWin } from "../fixtures/state-executive-entry";

/**
 * A town's mayor, where the town's voters elect one.
 *
 * Towns are spread on purpose, none of them Kentucky: a Minnesota city whose
 * government the game has read (Duluth) and one it has not (Ely), a New Mexico
 * spa town, an Idaho capital, and three towns whose councils choose the mayor.
 */

const ELY = "2719142";
const DULUTH = "2717000";
const BOISE = "1608830";
const TRUTH_OR_CONSEQUENCES = "3579840";
const IOWA_CITY = "1938595";
const BANGOR = "2302795";
const CHARLOTTESVILLE = "5114968";

const rulesAt = (placeGeoid: string) => {
  const rules = governmentUnitsForPlace(placeGeoid)
    .map((unit) => localChiefExecutiveRules(unit))
    .filter((entry) => entry !== null);
  expect(rules).toHaveLength(1);
  return rules[0]!;
};

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

const mayorOffice = (world: World, personId: EntityId) =>
  localGoverningBodiesForJurisdiction(
    world.people[personId]!.homeJurisdictionId,
  ).find((office) => office.seat === "chief-executive");

describe("how a town's mayor is chosen", () => {
  it.each([
    // "Elected at large", in the city's own record.
    ["Boise, Idaho", BOISE],
    // A separately elected chief executive in a mayor-council city.
    ["Duluth, Minnesota", DULUTH],
  ])("%s: the voters elect the mayor, by the city's own rules", (_, geoid) => {
    expect(rulesAt(geoid).directlyElected).toEqual({
      value: true,
      basis: "read",
    });
  });

  it.each([
    ["Iowa City, Iowa", IOWA_CITY],
    ["Bangor, Maine", BANGOR],
    ["Charlottesville, Virginia", CHARLOTTESVILLE],
  ])(
    "%s: the council chooses the mayor, so there is no mayor's race",
    (_, geoid) => {
      expect(rulesAt(geoid).directlyElected).toEqual({
        value: false,
        basis: "read",
      });
      const place = lifePlaceByKey(geoid)!;
      expect(
        localGoverningBodiesForJurisdiction(place.context.jurisdiction.id).map(
          (office) => office.seat,
        ),
      ).toEqual(["governing-body"]);
    },
  );

  it("reads a mayor's own term apart from the council's", () => {
    // Charlottesville: councilors serve 4 years, the mayor 2.
    expect(rulesAt(CHARLOTTESVILLE).termYears).toEqual({
      value: 2,
      basis: "read",
    });
  });

  it("across the country, unread towns come out in ICMA's national shares", () => {
    // ICMA 2018 as ChatGPT reported it: direct election 75.6%; a 4-year
    // chief's term 49.4%, a 2-year one 28.6%.
    const unread = allGovernmentUnits()
      .filter((unit) => unit.placeGeoid !== null)
      .map((unit) => localChiefExecutiveRules(unit))
      .filter(
        (rules) => rules !== null && rules.researchedGovernmentKey === null,
      );
    expect(unread.length).toBeGreaterThan(19_000);
    const share = (pick: (r: (typeof unread)[number]) => boolean) =>
      unread.filter(pick).length / unread.length;
    expect(share((r) => r!.directlyElected.value)).toBeCloseTo(0.756, 1);
    expect(share((r) => r!.termYears.value === 4)).toBeCloseTo(0.494, 1);
    expect(share((r) => r!.termYears.value === 2)).toBeCloseTo(0.286, 1);
    // The same town draws the same mayor every time it is asked.
    expect(rulesAt(ELY)).toEqual(rulesAt(ELY));
  });

  it("every mayor's office key resolves back to itself, and its pack too", () => {
    let offered = 0;
    for (const unit of allGovernmentUnits()) {
      if (unit.placeGeoid === null) continue;
      const mayor = localChiefExecutiveIdentity(unit);
      if (!mayor) continue;
      offered += 1;
      expect(
        localGoverningBodyIdentityForOfficeKey(mayor.officeKey)?.officeKey,
      ).toBe(mayor.officeKey);
      expect(
        candidacyPackById(mayor.candidacyPackId)?.offices[0]?.office,
      ).toEqual(expect.objectContaining({ title: mayor.officeTitle }));
    }
    expect(offered).toBeGreaterThan(14_000);
  });
});

describe("running for mayor", () => {
  it.each([
    // A town nobody has read, which draws a directly elected mayor.
    ["Ely, Minnesota", ELY, "2026-11-03", false],
    ["Truth or Consequences, New Mexico", TRUTH_OR_CONSEQUENCES, null, false],
    // A city whose government the game has read.
    ["Duluth, Minnesota", DULUTH, "2026-11-03", true],
  ])(
    "%s: offered beside the council, filed, won, and seated as mayor",
    (_, placeKey, electionDay, cityScreen) => {
      const { world, personId } = adultLifeAt(placeKey, `mayor-${placeKey}`);
      const home = world.people[personId]!.homeJurisdictionId;
      const mayor = mayorOffice(world, personId)!;
      expect(mayor).toBeDefined();
      expect(mayor.officeTitle).toBe("Mayor");

      // Listed after the council, as a local office anybody here may seek.
      const offices = electiveOfficesForJurisdiction(home);
      expect(offices.at(-1)!.officeKey).toBe(mayor.officeKey);
      expect(offices.at(-1)!.office.title).toBe("Mayor");
      const listed = projectCampaignOffices(world, personId).find(
        (office) => office.officeKey === mayor.officeKey,
      );
      expect(listed?.governmentLevel).toBe("Local government");
      expect(listed?.eligible).toBe(true);

      // The mayor's race falls on the town's election day, like the council's.
      if (electionDay)
        expect(campaignElectionDate(world, home, mayor.officeKey)).toBe(
          electionDay,
        );

      const filed = fileForOffice(
        world,
        personId,
        null,
        mayor.officeKey,
        addDays(world.currentDate, 28),
      );
      const decided = runToElection(filed, personId, suppliedWin(personId));
      expect(projectCampaign(decided, personId).phase).toBe("won");

      const seat = localGoverningSeatFor(decided, personId)!;
      expect(seat.office).toBe("mayor");
      expect(seat.mayorTitle).toBe("Mayor");
      expect(seat.hasCityScreen).toBe(cityScreen);
      expect(seat.seats).toBeNull();
      expect(seat.termYears?.value).toBeGreaterThan(0);
      expect(townSeatRulesSentence(seat)).toMatch(/mayor serves/);
      expect(projectWorkRole(decided, personId).sentence).toBe(
        `Your role: Mayor, ${seat.governmentName}.`,
      );

      // Never a council seat, and never the state's legislature.
      expect(
        activeOrganizationParticipationsAt(decided, personId).map(
          (active) => active.state.roleKind,
        ),
      ).toEqual(expect.arrayContaining(["leader:municipal-mayor"]));
      expect(
        activeOrganizationParticipationsAt(decided, personId).some(
          (active) => active.state.roleKind === "leader:municipal-member",
        ),
      ).toBe(false);

      // The town's row on the government screen names its mayor.
      if (!cityScreen) {
        const row = projectGovernmentBrowser(
          decided,
          personId,
        ).localGovernments.find(
          (entry) => entry.key === `unit:${mayor.unit.id}`,
        );
        expect(row?.holderPersonId).toBe(personId);
        expect(row?.detail).toBe(
          "Mayor. Other government details are limited.",
        );
      }

      const reloaded = deserializeWorld(serializeWorld(decided));
      expect(localGoverningSeatFor(reloaded, personId)?.office).toBe("mayor");
    },
    120_000,
  );

  it("Duluth, Minnesota: the sitting mayor's term ends as the winner's begins", () => {
    const { world: opening, personId } = adultLifeAt(DULUTH, "mayor-succeeds");
    const mayor = mayorOffice(opening, personId)!;
    const government = municipalGovernmentForUnit(mayor.unit)!;
    const sitting = Object.values(opening.people).find(
      (person) =>
        person.id !== personId &&
        person.birthDate < addDays(opening.currentDate, -365 * 30),
    )!;
    let world = installMunicipalGovernment(opening, {
      governmentKey: government.key,
      jurisdictionId: opening.people[personId]!.homeJurisdictionId,
      formedAt: opening.currentDate,
    });
    world = seatMunicipalMember(world, {
      governmentKey: government.key,
      personId: sitting.id,
      startedAt: world.currentDate as IsoDate,
      role: "mayor",
      seatLabel: "Mayor",
    });
    expect(
      municipalSeats(world, government.key).filter(
        (seat) => seat.role === "mayor",
      ),
    ).toHaveLength(1);

    world = fileForOffice(
      world,
      personId,
      null,
      mayor.officeKey,
      addDays(world.currentDate, 28),
    );
    world = runToElection(world, personId, suppliedWin(personId));

    const mayors = municipalSeats(world, government.key).filter(
      (seat) => seat.role === "mayor",
    );
    expect(mayors.map((seat) => seat.personId)).toEqual([personId]);
    const ended = world.history.organizationParticipations.find(
      (participation) => participation.personId === sitting.id,
    )!;
    const state = organizationParticipationStateAt(world, ended.id)!;
    expect(state.status).toBe("ended");
    expect(state.effectiveAt).toBe(
      localGoverningSeatFor(world, personId)!.since,
    );
  }, 120_000);

  it("Ely, Minnesota: a mayor re-elected keeps one mayoralty", () => {
    const { world: opening, personId } = adultLifeAt(ELY, "mayor-again");
    const mayor = mayorOffice(opening, personId)!;
    let world = opening;
    for (let race = 0; race < 2; race += 1) {
      expect(projectCampaign(world, personId, mayor.officeKey).phase).toBe(
        "can-file",
      );
      world = fileForOffice(
        world,
        personId,
        null,
        mayor.officeKey,
        addDays(world.currentDate, 28),
      );
      world = runToElection(world, personId, suppliedWin(personId));
      expect(projectCampaign(world, personId).phase).toBe("won");
      expect(
        activeOrganizationParticipationsAt(world, personId).filter(
          (active) => active.state.roleKind === "leader:municipal-mayor",
        ),
      ).toHaveLength(1);
    }
  }, 120_000);
});

describe("the owner's interim rule for large cities", () => {
  // lamontae, 2026-09-23: until a city's own rule is read, a city of more than
  // 100,000 people elects its mayor. Sizes are the Census Bureau's Vintage 2025
  // estimates (July 1, 2025).
  it("holds a Census 2025 size for every incorporated place, and unknown stays unknown", () => {
    expect(placePopulationCoverage()).toBe(19_482);
    expect(placePopulation("4260000")).toBeGreaterThan(1_000_000);
    // The Census Bureau counts Carbonate, Colorado as 0; that is a real 0.
    expect(placePopulation("0812030")).toBe(0);
    // Urban Honolulu is a census-designated place, not a governed town.
    expect(placePopulation("1571550")).toBeNull();
    expect(placePopulation("9999999")).toBeNull();
  });

  it("gives unread big cities an elected mayor with no supplied size", () => {
    const unitAt = (geoid: string) =>
      governmentUnitsForPlace(geoid).find(
        (unit) => localChiefExecutiveRules(unit) !== null,
      )!;
    for (const geoid of ["4260000", "2758000", "3240000", "4865000"]) {
      expect(localChiefExecutiveRules(unitAt(geoid))!.directlyElected).toEqual({
        value: true,
        basis: "owner-interim",
      });
    }
  });

  it("gives an unread large city an elected mayor, and never overrides a read rule", () => {
    const unitAt = (geoid: string) =>
      governmentUnitsForPlace(geoid).find(
        (unit) => localChiefExecutiveRules(unit) !== null,
      )!;
    // Philadelphia's record does not say how its mayor is chosen. Without its
    // size, the national draw gives it a council-chosen one.
    const philadelphia = unitAt("4260000");
    expect(
      localChiefExecutiveRules(philadelphia, () => null)!.directlyElected,
    ).toEqual({ value: false, basis: "typical" });
    expect(
      localChiefExecutiveRules(philadelphia, () => 1_573_916)!.directlyElected,
    ).toEqual({ value: true, basis: "owner-interim" });
    // At or below the line, the draw stands.
    expect(
      localChiefExecutiveRules(philadelphia, () => 100_000)!.directlyElected
        .basis,
    ).toBe("typical");
    // Iowa City's council chooses its mayor by its own rules, whatever its size.
    expect(
      localChiefExecutiveRules(unitAt(IOWA_CITY), () => 500_000)!
        .directlyElected,
    ).toEqual({ value: false, basis: "read" });
  });
});
