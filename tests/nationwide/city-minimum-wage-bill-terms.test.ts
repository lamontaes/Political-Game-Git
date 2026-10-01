import { describe, expect, it } from "vitest";

import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import {
  addDays,
  simulationMomentOnLocalDate,
} from "../../src/simulation/dates";
import {
  lifePlaceByKey,
  stateJurisdictionForKey,
} from "../../src/simulation/life-places";
import { authoredWageTerm } from "../fixtures/authored-wage-term";
import {
  nextPaydayDate,
  PAYDAY_TRANSITION_KEY,
  paydayHandler,
  townMinimumHourlyAt,
} from "../../src/simulation/living-world/town-pay";
import { withWorldIntegrityDeferred } from "../../src/simulation/world";
import type { EntityId, IsoDate, World } from "../../src/simulation";

const P = "us-policy-positions:";
const CITY_WAGE = `${P}labor-workforce.city-minimum-wage`;
const LOCAL_AUTHORITY = `${P}labor-workforce.local-minimum-wage-authority`;

let sequence = 0;

const ADOPTED_CITY_TARGET_MINOR = 2000;

/** Authored reader control; the target is explicit adopted text, not a premium. */
function lawOn(
  world: World,
  jurisdictionId: EntityId,
  questionKey: string,
  answer: "yes" | "no",
  effectiveAt: IsoDate,
  designation: string,
): World {
  sequence += 1;
  return authoredWageTerm(world, {
    key: `test-city-wage:${sequence}`,
    jurisdictionId,
    questionKey,
    answer,
    effectiveAt,
    designation,
    termKey: "target",
    amountMinor:
      questionKey === CITY_WAGE && answer === "yes"
        ? ADOPTED_CITY_TARGET_MINOR
        : null,
  });
}

function omahaGame() {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "city-minimum-wage-bill-terms",
      placeKey: "3137000",
      startAge: 24,
      questionnaire: "skipped",
    }),
  ).game!;
  return { world: game.world, opened: game.world.currentDate };
}

function runPaydays(start: World, since: IsoDate, days: number): World {
  let world = start;
  let paidThrough = since;
  const until = addDays(since, days);
  withWorldIntegrityDeferred(() => {
    for (
      let payday = nextPaydayDate(world.currentDate);
      payday <= until;
      payday = nextPaydayDate(payday)
    ) {
      world = {
        ...world,
        currentDate: payday,
        currentMoment: simulationMomentOnLocalDate(world.currentMoment, payday),
      };
      const due = world.history.futureDueItems.find(
        (item) => item.transitionKey === PAYDAY_TRANSITION_KEY,
      );
      expect(due).toBeDefined();
      world = paydayHandler(world, {
        ...due!,
        stableKey: `town-pay-v2:payday:${paidThrough}`,
        transitionKey: PAYDAY_TRANSITION_KEY,
      }).world;
      paidThrough = payday;
    }
  });
  return world;
}

const town = (key: string) => lifePlaceByKey(key)!.context.jurisdiction.id;

describe(
  "a city minimum wage ordinance sets the wage where the state lets cities set one",
  { timeout: 600_000 },
  () => {
    it("Omaha's ordinance reads its adopted $20 target, from its effective date, and a later no ends it", () => {
      const { world: game, opened } = omahaGame();
      const omaha = town("3137000");
      const effectiveAt = addDays(opened, 30);
      const repealAt = addDays(opened, 400);
      let world = lawOn(
        game,
        omaha,
        CITY_WAGE,
        "yes",
        effectiveAt,
        "Ordinance 1",
      );
      world = lawOn(world, omaha, CITY_WAGE, "no", repealAt, "Ordinance 2");
      world = { ...world, currentDate: repealAt };
      const before = townMinimumHourlyAt(
        world,
        omaha,
        addDays(effectiveAt, -1),
      )!;
      const during = ADOPTED_CITY_TARGET_MINOR / 100;
      expect(townMinimumHourlyAt(world, omaha, addDays(effectiveAt, -1))).toBe(
        before,
      );
      expect(townMinimumHourlyAt(world, omaha, effectiveAt)).toBe(during);
      expect(during).toBeGreaterThan(before);
      expect(townMinimumHourlyAt(world, omaha, addDays(repealAt, -1))).toBe(
        during,
      );
      expect(townMinimumHourlyAt(world, omaha, repealAt)).toBe(before);
    });

    it("raises the pay of every town job below it, and names the ordinance", () => {
      const { world: game, opened } = omahaGame();
      const omaha = town("3137000");
      const effectiveAt = addDays(opened, 30);
      const enacted = lawOn(
        game,
        omaha,
        CITY_WAGE,
        "yes",
        effectiveAt,
        "Ordinance 1",
      );
      const world = runPaydays(enacted, opened, 120);
      const raises = world.history.resourceFlowTerms.filter((terms) =>
        terms.stableKey.includes(":minimum-wage:"),
      );
      const floor = townMinimumHourlyAt(world, omaha, world.currentDate)!;
      expect(raises.length).toBeGreaterThan(0);
      for (const raise of raises)
        expect(raise.reason).toBe(
          `Ordinance 1 raised the city minimum wage to $${floor.toFixed(2)} an hour.`,
        );
      console.info(
        `Omaha ordinance: ${raises.length} town jobs raised to $${floor.toFixed(2)} an hour by ${world.currentDate}.`,
      );
    });

    it("sets nothing where the state bars cities, until a state law lets them", () => {
      const { world: game, opened } = omahaGame();
      const lexington = town("lexington-fayette");
      const kentucky = stateJurisdictionForKey("US-KY")!.id;
      const effectiveAt = addDays(opened, 30);
      const authoredOrdinance = lawOn(
        game,
        lexington,
        CITY_WAGE,
        "yes",
        effectiveAt,
        "Ordinance 1",
      );
      const ordinance = {
        ...authoredOrdinance,
        currentDate: addDays(effectiveAt, 200),
      };
      const before = townMinimumHourlyAt(
        ordinance,
        lexington,
        addDays(effectiveAt, -1),
      )!;
      // Kentucky's law bars a city wage: the ordinance is on the record and governs nothing.
      expect(
        townMinimumHourlyAt(ordinance, lexington, addDays(effectiveAt, 200)),
      ).toBe(before);
      // A Kentucky law that lets cities set their own wage brings it to life.
      const allowed = lawOn(
        ordinance,
        kentucky,
        LOCAL_AUTHORITY,
        "yes",
        addDays(effectiveAt, 60),
        "HB 1",
      );
      expect(
        townMinimumHourlyAt(allowed, lexington, addDays(effectiveAt, 59)),
      ).toBe(before);
      expect(
        townMinimumHourlyAt(allowed, lexington, addDays(effectiveAt, 60)),
      ).toBeGreaterThan(before);
      // And a later state law that takes the authority away ends it again.
      const barred = lawOn(
        allowed,
        kentucky,
        LOCAL_AUTHORITY,
        "no",
        addDays(effectiveAt, 120),
        "HB 2",
      );
      expect(
        townMinimumHourlyAt(barred, lexington, addDays(effectiveAt, 120)),
      ).toBe(before);
    });

    it("reaches the ordinance's own city alone", () => {
      const { world: game, opened } = omahaGame();
      const effectiveAt = addDays(opened, 30);
      const authored = lawOn(
        game,
        town("3137000"),
        CITY_WAGE,
        "yes",
        effectiveAt,
        "Ordinance 1",
      );
      const world = { ...authored, currentDate: addDays(effectiveAt, 5) };
      for (const key of ["3651000", "0644000", "4819000", "5363000"])
        expect(
          townMinimumHourlyAt(world, town(key), addDays(effectiveAt, 5)),
          key,
        ).toBe(townMinimumHourlyAt(game, town(key), opened));
    });
  },
);
