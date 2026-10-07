/** A Nashville game in which Congress has raised the federal minimum wage. */
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import {
  addDays,
  simulationMomentOnLocalDate,
} from "../../src/simulation/dates";
import { NATIONAL_ELECTION_JURISDICTION } from "../../src/simulation/national-election-geography";
import { createProductionPolicyCatalog } from "../../src/simulation/production-catalog";
import type { IsoDate, World } from "../../src/simulation";
import { authoredWageTerm } from "../fixtures/authored-wage-term";

export const NASHVILLE = "4752006";
const POLICY = createProductionPolicyCatalog();

/**
 * A Nashville game in which Congress has answered "should the federal minimum
 * wage go up?" yes, in force `effectiveInDays` after the game opens. The Act
 * is recorded the way the legislative route records one; it carries no
 * dollar figure, so the raise is the marked placeholder rate.
 */
export function nashvilleWithFederalRaise(effectiveInDays: number) {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "town-federal-minimum-wage-nashville",
      placeKey: NASHVILLE,
      startAge: 24,
      questionnaire: "skipped",
    }),
  ).game!;
  const opened = game.world.currentDate;
  const effectiveAt = addDays(opened, effectiveInDays);
  const world = authoredWageTerm(
    { ...game.world, policyCatalog: POLICY },
    {
      key: "test:federal-wage",
      jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
      questionKey:
        "us-federal-positions:labor-commerce.raise-federal-minimum-wage",
      answer: "yes",
      effectiveAt,
      designation: "H.R. 1",
      termKey: "floor",
      amountMinor: 1500,
    },
  );
  return { world, opened, effectiveAt };
}

export function onDate(world: World, date: IsoDate): World {
  return {
    ...world,
    currentDate: date,
    currentMoment: simulationMomentOnLocalDate(world.currentMoment, date),
  };
}
