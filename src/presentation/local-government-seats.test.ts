import { describe, expect, it } from "vitest";

import {
  localGovernmentSeatsKey,
  sittingLocalOfficers,
} from "../simulation/living-world/local-government-seats";
import { playerTown } from "../simulation/living-world/town-residents";
import { localChiefExecutiveRules } from "../simulation/nationwide-world/local-chief-executive-rules";
import { localGoverningBodyRules } from "../simulation/nationwide-world/local-governing-body-rules";
import { homeLocalGovernmentUnits } from "../simulation/nationwide-world/local-governments";
import { ageOnDate } from "../simulation/dates";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";

/**
 * Lane C step 2: a life opens under a town government with people in it.
 * The council is filled to its seat count and the mayor seated where the town
 * elects one, each by a resident of the town.
 */

const TOWNS = [
  { name: "Lexington, Kentucky", placeKey: "2146027" },
  { name: "Columbus, Ohio", placeKey: "3918000" },
  { name: "Belzoni, Mississippi", placeKey: "2805140" },
  { name: "Albuquerque, New Mexico", placeKey: "3502000" },
  { name: "Minneapolis, Minnesota", placeKey: "2743000" },
] as const;

function openIn(placeKey: string, seed = "local-seats") {
  return generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      startAge: 34,
      placeKey,
    }),
  ).game!;
}

describe("the player's town government has people in it", () => {
  for (const town of TOWNS) {
    it(`${town.name} opens with a seated council`, () => {
      const game = openIn(town.placeKey);
      const world = game.world;
      const home = playerTown(world, game.playerPersonId);
      expect(home, town.name).not.toBeNull();
      const units = homeLocalGovernmentUnits(
        world,
        game.playerPersonId,
      ).municipal;
      expect(units.length, town.name).toBeGreaterThan(0);
      for (const unit of units) {
        const rules = localGoverningBodyRules(unit);
        if (!rules?.seats) continue;
        expect(
          world.history.events.some(
            (event) => event.stableKey === localGovernmentSeatsKey(unit.id),
          ),
          `${town.name} ${unit.id}`,
        ).toBe(true);
        const officers = sittingLocalOfficers(world, unit);
        const members = officers.filter((seat) => !seat.mayor);
        const mayors = officers.filter((seat) => seat.mayor);
        expect(members.length, town.name).toBe(rules.seats.value);
        expect(mayors.length, town.name).toBe(
          localChiefExecutiveRules(unit)?.directlyElected.value ? 1 : 0,
        );
        const ids = officers.map((seat) => seat.personId);
        expect(new Set(ids).size).toBe(ids.length);
        expect(ids).not.toContain(game.playerPersonId);
        for (const id of ids) {
          const person = world.people[id]!;
          expect(person.homeJurisdictionId, town.name).toBe(home);
          expect(
            ageOnDate(person.birthDate, world.currentDate),
          ).toBeGreaterThanOrEqual(21);
        }
      }
    });
  }

  it("seats the same people for the same seed", () => {
    const place = TOWNS[2].placeKey;
    const a = openIn(place, "same-seed");
    const b = openIn(place, "same-seed");
    const unit = homeLocalGovernmentUnits(a.world, a.playerPersonId)
      .municipal[0]!;
    expect(
      sittingLocalOfficers(a.world, unit).map((seat) => seat.personId),
    ).toEqual(sittingLocalOfficers(b.world, unit).map((seat) => seat.personId));
  });
});
