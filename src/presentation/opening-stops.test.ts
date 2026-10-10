import { describe, expect, it } from "vitest";

import { drawRandomPlace } from "../../tests/support/random-place";
import { immediateFamilyOf } from "../simulation/crisis/fatal-illness";
import { isTerritoryUsps } from "../simulation/state-reference";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { OPENING_STOP_ORDER, projectOpeningStops } from "./opening-stops";

/**
 * The approved opening (owner, October 8, 2026): six stops from the country
 * down to the player, people present at each, plaques only on the people who
 * matter to it, and every number in the Ledger. Places are drawn from all 56
 * by the named seeds; the territory case draws among the territories.
 */
function newLife(seed: string, filter: Parameters<typeof drawRandomPlace>[1]) {
  const place = drawRandomPlace(seed, filter);
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
      startAge: 34,
    }),
  ).game!;
  return { place, world: game.world, personId: game.playerPersonId };
}

const usps = (key: string) => key.replace(/^US-/, "");

describe("the six opening stops", { timeout: 300_000 }, () => {
  for (const seed of ["p4-open-a", "p4-open-b"]) {
    const life = newLife(
      seed,
      (place) =>
        place.scope === "locality" &&
        !isTerritoryUsps(usps(place.stateJurisdictionKey)) &&
        usps(place.stateJurisdictionKey) !== "DC",
    );
    it(`walks from the country to the player in ${life.place.displayName} (seed ${seed})`, () => {
      const { world, personId } = life;
      const view = projectOpeningStops(world, personId);
      expect(view.stops.map((stop) => stop.key)).toEqual(OPENING_STOP_ORDER);
      for (const stop of view.stops) {
        const ids = stop.people.map((person) => person.personId);
        expect(new Set(ids).size, stop.key).toBe(ids.length);
        // A plaque always has a relationship to say under the name.
        for (const person of stop.people.filter((entry) => entry.plaque))
          expect(
            person.title.length,
            `${stop.key} ${person.name}`,
          ).toBeGreaterThan(0);
      }
      const [country, representatives, state, town, home, you] = view.stops;

      const leaders = country!.people.filter((person) => person.plaque);
      expect(leaders.map((person) => person.title)).toEqual([
        expect.stringMatching(/^President of /),
        expect.stringMatching(/^Vice President of /),
      ]);

      // The President gives the address: the State of the Union from the
      // House rostrum to Congress in its seats, the Vice President seated
      // behind; an inaugural outside the Capitol. Both chamber cuts are the
      // same moment, so the same people are in the room for each.
      if (view.address === "state-of-the-union") {
        expect(country!.place).toBe("us-house-floor");
        expect(leaders.map((person) => person.role)).toEqual(["speaker", null]);
        expect(
          country!.people
            .filter((person) => !person.plaque)
            .every((person) => person.role === "member"),
        ).toBe(true);
        expect(
          new Set(representatives!.people.map((person) => person.personId)),
        ).toEqual(new Set(country!.people.map((person) => person.personId)));
      } else {
        expect(country!.place).toBe("us-capitol-exterior");
        expect(country!.people).toHaveLength(2);
      }

      // Congress sits in the chamber; the plaques are the player's two
      // senators from the home state and one House member.
      expect(representatives!.place).toBe("us-house-floor");
      const yours = representatives!.people.filter((person) => person.plaque);
      expect(
        yours.filter((person) => person.title.startsWith("U.S. Senator from ")),
      ).toHaveLength(2);
      expect(
        yours.filter((person) =>
          person.title.startsWith("U.S. Representative for "),
        ),
      ).toHaveLength(1);
      expect(yours).toHaveLength(3);
      // Congress is introduced once (owner playtest, October 8, 2026, A7):
      // no other cut names a member of Congress on a plaque.
      expect(
        view.stops
          .filter((stop) =>
            stop.people.some(
              (person) =>
                person.plaque &&
                /^U\.S\. (Senator|Representative) /.test(person.title),
            ),
          )
          .map((stop) => stop.key),
      ).toEqual(["representatives"]);

      expect(state!.people[0]!.title).toMatch(/^Governor of /);
      expect(state!.place).toBe("governor-office");

      // Whoever runs the town is the one plaque there, and they sit in its
      // government.
      expect(
        town!.people.filter((person) => person.plaque).length,
      ).toBeLessThanOrEqual(1);

      // The whole living family on record is at home, under a relationship.
      const homeIds = new Set(home!.people.map((person) => person.personId));
      for (const id of immediateFamilyOf(world, personId))
        expect(homeIds.has(id), id).toBe(true);
      expect(homeIds.has(personId)).toBe(false);

      // The room play opens in is first-person: the player is not drawn.
      expect(you!.people.map((person) => person.personId)).not.toContain(
        personId,
      );
      expect(you!.place).not.toBeNull();

      // Every number is in the Ledger: both chambers of Congress account for
      // every seat, and the economy is there.
      const senate = view.ledger.find(
        (row) => row.key === "congress:us-senate",
      )!;
      const seats = [...senate.value.matchAll(/(\d+) /g)].reduce(
        (sum, match) => sum + Number(match[1]),
        0,
      );
      expect(seats).toBe(100);
      expect(view.ledger.map((row) => row.key)).toEqual(
        expect.arrayContaining(["congress:us-house", "unemployment", "prices"]),
      );
    });
  }

  const territory = newLife("p4-open-territory", (place) =>
    isTerritoryUsps(usps(place.stateJurisdictionKey)),
  );
  it(`sends a territory's own member of the House and no senators (${territory.place.displayName}, seed p4-open-territory)`, () => {
    const view = projectOpeningStops(territory.world, territory.personId);
    const representatives = view.stops.find(
      (stop) => stop.key === "representatives",
    )!;
    const yours = representatives.people.filter((person) => person.plaque);
    expect(
      yours.filter((person) => person.title.startsWith("U.S. Senator")),
    ).toEqual([]);
    expect(yours.length).toBeLessThanOrEqual(1);
  });
});
