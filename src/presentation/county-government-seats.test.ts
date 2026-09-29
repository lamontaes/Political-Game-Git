import { describe, expect, it } from "vitest";

import { activeOrganizationParticipationsAt } from "../simulation/life-queries";
import { countyGovernmentUnit } from "../simulation/government-units";
import {
  countyGoverningBodyRules,
  municipioUnit,
} from "../simulation/nationwide-world/county-governing-body-rules";
import { homeLocalGovernmentUnits } from "../simulation/nationwide-world/local-governments";
import {
  COUNTY_BOARD_MEMBER,
  localGovernmentSeatsKey,
  sittingLocalOfficers,
} from "../simulation/living-world/local-government-seats";
import { playerTown } from "../simulation/living-world/town-residents";
import type { World } from "../simulation/types";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import {
  observerPlace,
  observerSetup,
  openObserverWorld,
} from "./observer-world";

/**
 * Build 25, CTO ruling of September 29, 1:54 a.m.: "No county board is seated
 * anywhere" and "Puerto Rico's 78 municipios have no government". Each is
 * now seated at the size its law sets.
 */

function open(placeKey: string, seed: string) {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      placeKey,
      seed,
      startKind: "custom",
      startAge: 34,
      household: "shares-a-home",
    }),
  ).game!;
  return { world: game.world, personId: game.playerPersonId };
}

function seatedEvent(world: World, unitId: string) {
  return world.history.events.find(
    (event) => event.stableKey === localGovernmentSeatsKey(unitId),
  );
}

describe("a county board or municipal legislature at its lawful size", () => {
  it("reads each size from the law, or the national average, labeled", () => {
    // California: Gov. Code § 25000(a), five supervisors.
    const alameda = countyGoverningBodyRules(countyGovernmentUnit("06001")!)!;
    expect(alameda).toMatchObject({
      seats: 5,
      basis: "state-law",
      bodyName: "Board of Supervisors",
    });
    // Arizona and Nevada set the size by the county's population
    // (A.R.S. § 11-211(A); NRS 244.011, 244.014, 244.016).
    const size = (geoid: string) =>
      countyGoverningBodyRules(countyGovernmentUnit(geoid)!)!.seats;
    expect(size("04013")).toBe(5); // Maricopa, 175,000 or more
    expect(size("04001")).toBe(3); // Apache, fewer
    expect(size("32003")).toBe(7); // Clark, 700,000 or more
    expect(size("32031")).toBe(5); // Washoe, 100,000 to 699,999
    expect(size("32001")).toBe(3); // Churchill, under 100,000
    // A state whose law is not read yet takes the national average.
    const unread = countyGoverningBodyRules(countyGovernmentUnit("48453")!)!;
    expect(unread).toMatchObject({ seats: 7, basis: "estimated" });
    expect(unread.citation).toMatch(/^ESTIMATED FROM AVERAGE/);
    // Puerto Rico's Municipal Code, Article 1.020, by population.
    const seats = (geoid: string) =>
      countyGoverningBodyRules(municipioUnit(geoid)!)!.seats;
    expect(seats("72001")).toBe(12); // Adjuntas, 17,960 residents
    expect(seats("72003")).toBe(14); // Aguada, 37,758
    expect(seats("72005")).toBe(16); // Aguadilla, 54,137
    expect(seats("72127")).toBe(17); // San Juan, by name in the article
    expect(seats("72049")).toBe(5); // Culebra, by name in the article
    expect(municipioUnit("06001")).toBeNull();
    // A body whose own name is read keeps it while its size is estimated:
    // Assumption Parish has a police jury, Jefferson Parish a council.
    const assumption = countyGoverningBodyRules(
      countyGovernmentUnit("22007")!,
    )!;
    expect(assumption).toMatchObject({
      bodyName: "Police Jury",
      memberTitle: "Police juror",
      basis: "estimated",
    });
    expect(
      countyGoverningBodyRules(countyGovernmentUnit("22051")!)!.bodyName,
    ).toBe("Parish Council");
  });

  it(
    "seats San Juan's municipal legislature and its mayor",
    { timeout: 300_000 },
    () => {
      const { world, personId } = open("7276770", "build-25:municipio:1");
      const units = homeLocalGovernmentUnits(world, personId);
      expect(units.counties.map((unit) => unit.id)).toEqual([
        "municipio:72127",
      ]);
      const unit = units.counties[0]!;
      expect(unit.name).toBe("San Juan Municipio");
      const event = seatedEvent(world, unit.id)!;
      expect(event.tags).toContain("seats-basis:municipal-code");
      const officers = sittingLocalOfficers(world, unit);
      expect(officers.filter((seat) => seat.mayor)).toHaveLength(1);
      expect(officers.filter((seat) => !seat.mayor)).toHaveLength(17);
      console.log(event.summary);
    },
  );

  it(
    "seats the home county's board in a watched place",
    { timeout: 300_000 },
    () => {
      const seed = "build-25:county:1";
      const place = observerPlace(seed);
      const { world, anchorPersonId } = openObserverWorld(observerSetup(seed));
      const units = homeLocalGovernmentUnits(world, anchorPersonId);
      const town = playerTown(world, anchorPersonId);
      console.log(
        JSON.stringify({
          seed,
          place: `${place.displayName} (${place.key})`,
          counties: units.counties.map((unit) => {
            const rules = countyGoverningBodyRules(unit);
            return {
              unit: unit.id,
              seats: rules?.seats,
              basis: rules?.basis,
              seated: sittingLocalOfficers(world, unit).length,
              summary: seatedEvent(world, unit.id)?.summary,
            };
          }),
        }),
      );
      if (!town) return;
      for (const unit of units.counties) {
        const rules = countyGoverningBodyRules(unit);
        if (!rules) continue;
        const officers = sittingLocalOfficers(world, unit);
        expect(officers.length).toBeGreaterThan(0);
        expect(officers.length).toBeLessThanOrEqual(rules.seats);
        for (const officer of officers) {
          const role = activeOrganizationParticipationsAt(
            world,
            officer.personId,
          ).find((row) => row.participation.id === officer.participationId)
            ?.state.roleKind;
          expect(role).toBe(
            rules.chiefTitle === null
              ? COUNTY_BOARD_MEMBER
              : officer.mayor
                ? "leader:municipal-mayor"
                : "leader:municipal-member",
          );
        }
      }
    },
  );
});
