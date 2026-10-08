import { afterAll, describe, expect, it } from "vitest";
import table from "../../data/research/government/county-row-offices-by-state.json" with { type: "json" };
import {
  electiveOfficesForJurisdiction,
  localGoverningBodiesForJurisdiction,
  localGoverningBodyIdentityForOfficeKey,
} from "../../src/simulation";
import type { EntityId, World } from "../../src/simulation";
import { countyGovernmentUnit } from "../../src/simulation/government-units";
import { municipioUnit } from "../../src/simulation/nationwide-world/county-governing-body-rules";
import {
  COUNTY_ROW_OFFICE_KEYS,
  countyElectedRowOffices,
  countyRowOfficeFromRoleKind,
  countyRowOfficeRule,
} from "../../src/simulation/nationwide-world/county-row-offices";
import {
  countyRowOfficeOrganizationId,
  sittingCountyRowOfficers,
  sittingLocalOfficers,
} from "../../src/simulation/living-world/local-government-seats";
import {
  activeOrganizationParticipationsAt,
  organizationParticipationStateAt,
} from "../../src/simulation/life-queries";
import { contestIncumbentPersonId } from "../../src/simulation/election-contests";
import { addDays } from "../../src/simulation/dates";
import { fileForOffice } from "../../src/presentation/campaign-projection";
import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import { openOrdinaryLife } from "../../src/presentation/ordinary-life";
import { observerPlace } from "../../src/presentation/observer-world";
import { playerHousemates } from "../../src/simulation/living-world/local-government-seats";
import { suppliedWin } from "../fixtures/state-executive-entry";
import { resolveThroughOwnElection } from "../fixtures/due-item-clock";

/**
 * CO-2: a county's row offices (sheriff, prosecutor, clerk, treasurer,
 * assessor, coroner) are offices a generated person holds and a resident may
 * stand for. One rule answers for every county: the table in
 * `data/research/government/county-row-offices-by-state.json`. Places are drawn
 * from all of the places the game opens in, by seed, never named here.
 */

const SEEDS = ["co2-row-offices-a", "co2-row-offices-b", "co2-row-offices-c"];

const opened = new Map<string, { world: World; personId: EntityId }>();
afterAll(() => opened.clear());

function life(seed: string) {
  const known = opened.get(seed);
  if (known) return known;
  const place = observerPlace(seed);
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: `co2-${seed}`,
      placeKey: place.key,
      startAge: 40,
      questionnaire: "skipped",
    }),
  ).game!;
  const value = {
    world: openOrdinaryLife(game.world, game.playerPersonId),
    personId: game.playerPersonId,
  };
  opened.set(seed, value);
  return value;
}

describe("the table of county row offices", () => {
  it("marks every answer read or estimated, with where it came from", () => {
    for (const office of COUNTY_ROW_OFFICE_KEYS) {
      const rule = countyRowOfficeRule("KY", office);
      expect(rule.title.length).toBeGreaterThan(0);
      expect(rule.source.length).toBeGreaterThan(0);
      if (rule.basis === "estimated")
        expect(rule.source).toMatch(/ESTIMATED FROM AVERAGE|estimated/i);
    }
  });

  it("has a row for each of the fifty states, D.C. holding none, each estimate naming its regional pattern", () => {
    const fifty =
      "AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split(
        " ",
      );
    expect(fifty).toHaveLength(50);
    const states = table.states as Record<string, Record<string, unknown>>;
    expect(Object.keys(states).sort()).toEqual([...fifty].sort());
    expect(states["DC"]).toBeUndefined();
    for (const stateUsps of fifty)
      for (const office of COUNTY_ROW_OFFICE_KEYS) {
        const row = states[stateUsps]![office] as
          { basis?: string; estimatedFrom?: string } | undefined;
        if (row?.basis === "estimated" && "estimatedFrom" in row)
          expect(row.estimatedFrom!.length).toBeGreaterThan(10);
      }
    for (const stateUsps of ["AL", "TX", "WI", "PA"]) {
      const sheriff = countyRowOfficeRule(stateUsps, "sheriff");
      expect(sheriff.basis).toBe("read");
      expect(sheriff.source).toMatch(/https:/);
    }
    expect(countyRowOfficeRule("FL", "treasurer").source).toMatch(
      /ESTIMATED FROM the Southern/,
    );
    expect(countyRowOfficeRule("FL", "treasurer").elected).toBe(false);
  });

  it("is one reader for every state: where a state does not elect an office the county has none", () => {
    // Offices the table records as not elected in some state are left out of
    // that state's counties, and no county anywhere is handed an office its
    // state does not elect.
    for (const stateUsps of ["AK", "CT", "HI", "RI"])
      expect(countyRowOfficeRule(stateUsps, "sheriff").elected).toBe(false);
    expect(countyRowOfficeRule("KY", "sheriff").elected).toBe(true);
    expect(countyRowOfficeFromRoleKind("leader:county-row-sheriff")).toBe(
      "sheriff",
    );
    expect(
      countyRowOfficeFromRoleKind("leader:county-board-member"),
    ).toBeNull();
  });

  it("gives a Puerto Rico municipio no row offices, and a county its state's", () => {
    expect(countyElectedRowOffices(municipioUnit("72127")!)).toEqual([]);
    const county = countyGovernmentUnit("06001")!;
    const rows = countyElectedRowOffices(county);
    expect(rows.map((row) => row.office)).toContain("sheriff");
    expect(rows.map((row) => row.office)).toContain("prosecutor");
  });
});

describe.each(SEEDS)("a county in a randomly drawn place (seed %s)", (seed) => {
  it(
    "seats a holder in every row office its state elects, and offers each to the player",
    { timeout: 600_000 },
    () => {
      const { world, personId } = life(seed);
      const place = observerPlace(seed);
      const home = world.people[personId]!.homeJurisdictionId;
      const offices = localGoverningBodiesForJurisdiction(home).filter(
        (office) => office.seat === "row-office",
      );
      const counties = new Set(offices.map((office) => office.unit.id));
      console.log(
        JSON.stringify({
          seed,
          place: `${place.displayName} (${place.key})`,
          counties: [...counties],
          offices: offices.map((office) => office.officeTitle),
        }),
      );
      const housemates = new Set(playerHousemates(world, personId));
      const offered = new Set(
        electiveOfficesForJurisdiction(home).map((option) => option.officeKey),
      );
      for (const office of offices) {
        expect(
          localGoverningBodyIdentityForOfficeKey(office.officeKey),
        ).toEqual(office);
        expect(offered.has(office.officeKey)).toBe(true);
      }
      for (const unitId of counties) {
        const unit = offices.find((office) => office.unit.id === unitId)!.unit;
        const expected = countyElectedRowOffices(unit).map((row) => row.office);
        const sitting = sittingCountyRowOfficers(world, unit);
        expect(sitting.map((row) => row.office).sort()).toEqual(
          [...expected].sort(),
        );
        // One person each; never the player's household, never a board member.
        const people = sitting.map((row) => row.personId);
        expect(new Set(people).size).toBe(people.length);
        for (const person of people) expect(housemates.has(person)).toBe(false);
        const board = new Set(
          sittingLocalOfficers(world, unit).map((seat) => seat.personId),
        );
        for (const person of people) expect(board.has(person)).toBe(false);
        // The holder's own record names the office and its title.
        for (const row of sitting) {
          const active = activeOrganizationParticipationsAt(
            world,
            row.personId,
          ).find((entry) => entry.participation.id === row.participationId)!;
          expect(active.state.roleKind).toBe(`leader:county-row-${row.office}`);
          expect(active.state.context).toBe(
            countyElectedRowOffices(unit).find(
              (rule) => rule.office === row.office,
            )!.title,
          );
        }
      }
    },
  );

  it("lets the player file for a row office, and seats the winner in place of the holder", () => {
    const { world, personId } = life(seed);
    const home = world.people[personId]!.homeJurisdictionId;
    const office = localGoverningBodiesForJurisdiction(home).find(
      (candidate) => candidate.seat === "row-office",
    );
    if (!office) return; // A place with no county government elects none.
    const holder = sittingCountyRowOfficers(world, office.unit).find(
      (row) => row.office === office.rowOffice,
    )!;
    const boardBefore = sittingLocalOfficers(world, office.unit).map(
      (seat) => seat.personId,
    );

    const filed = fileForOffice(
      world,
      personId,
      null,
      office.officeKey,
      addDays(world.currentDate, 3),
    );
    const contest = filed.history.electionContests!.at(-1)!;
    expect(contest.office.officeKey).toBe(office.officeKey);
    // The sitting holder is the incumbent when they stand in the same race.
    expect(
      contestIncumbentPersonId(
        {
          ...filed,
          history: {
            ...filed.history,
            electionContests: filed.history.electionContests!.map((row) =>
              row.id === contest.id
                ? {
                    ...row,
                    candidatePersonIds: [
                      ...row.candidatePersonIds,
                      holder.personId,
                    ],
                  }
                : row,
            ),
          },
        },
        contest.id,
      ),
    ).toBe(holder.personId);

    const decided = resolveThroughOwnElection(
      filed,
      personId,
      suppliedWin(personId),
    );
    const after = sittingCountyRowOfficers(decided, office.unit).filter(
      (row) => row.office === office.rowOffice,
    );
    expect(after.map((row) => row.personId)).toEqual([personId]);
    // The former holder's seat ended with the new term; the board is untouched.
    const former = decided.history.organizationParticipations.find(
      (participation) => participation.id === holder.participationId,
    )!;
    expect(organizationParticipationStateAt(decided, former.id)?.status).toBe(
      "ended",
    );
    expect(countyRowOfficeOrganizationId(decided, office.unit)).toBe(
      countyRowOfficeOrganizationId(world, office.unit),
    );
    expect(
      sittingLocalOfficers(decided, office.unit).map((seat) => seat.personId),
    ).toEqual(boardBefore);
    // The other row offices keep their holders.
    for (const other of sittingCountyRowOfficers(world, office.unit))
      if (other.office !== office.rowOffice)
        expect(
          sittingCountyRowOfficers(decided, office.unit).some(
            (row) =>
              row.office === other.office && row.personId === other.personId,
          ),
        ).toBe(true);
  }, 900_000);
});
