import { describe, expect, it } from "vitest";

import { stateNameForUsps } from "./state-name";
import {
  lifePlaceStateIdentities,
  searchLifePlaces,
} from "../simulation/life-places";
import { SeededRng, pickDistinct } from "../simulation/rng";
import { projectWorldOrientation } from "./living-world-orientation";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { projectOpeningYear } from "./opening-story";
import { openOrdinaryLife } from "./ordinary-life";
import { projectOrientationView } from "./world-orientation";

const BASE_SEED = "co3b-opening-government";

/**
 * Card 1 of a new game: the form of the home place's government is a record
 * value under a label, never a sentence under "In the news". Five places drawn
 * from all 56 by seed, each opened in a generated world.
 */
describe("the opening year shows the government as a labeled record value", () => {
  const rng = new SeededRng(BASE_SEED);
  const states = pickDistinct(rng, lifePlaceStateIdentities(), 5);

  it.each(states.map((state) => [state.jurisdictionKey, state] as const))(
    "%s",
    (_key, state) => {
      const towns = searchLifePlaces("", 5000, {
        stateJurisdictionKey: state.jurisdictionKey,
        scope: "locality",
      });
      const place = towns.length
        ? rng.pick(towns)
        : searchLifePlaces("", 5, {
            stateJurisdictionKey: state.jurisdictionKey,
            scope: "state",
          })[0]!;
      const game = generateOpeningLife(
        prepareOpeningLife({
          ...DEFAULT_NEW_GAME_SETUP,
          seed: `${BASE_SEED}:${state.jurisdictionKey}`,
          placeKey: place.key,
          startAge: 40,
          questionnaire: "skipped",
        }),
      ).game!;
      const world = openOrdinaryLife(game.world, game.playerPersonId);
      const year = projectOpeningYear(
        world,
        game.playerPersonId,
        projectOrientationView(
          projectWorldOrientation(world, game.playerPersonId),
          stateNameForUsps,
        ),
      );
      const context = `${place.key} (${state.jurisdictionKey})`;
      const headlines = year.publications.map(
        (publication) => publication.headline,
      );
      for (const headline of headlines)
        expect(headline, context).not.toMatch(/ is governed by /);
      for (const fact of year.facts.filter(
        (candidate) => candidate.label === "Local government",
      )) {
        expect(fact.value.length, context).toBeGreaterThan(0);
        expect(headlines, context).not.toContain(fact.value);
      }
    },
    180_000,
  );
});
