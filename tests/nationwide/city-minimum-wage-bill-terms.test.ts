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
import { CITY_PREMIUM_RATIO } from "../../src/simulation/minimum-wage";
import {
  nextPaydayDate,
  PAYDAY_TRANSITION_KEY,
  paydayHandler,
  townMinimumHourly,
  townMinimumHourlyAt,
} from "../../src/simulation/living-world/town-pay";
import { withWorldIntegrityDeferred } from "../../src/simulation/world";
import type {
  EntityId,
  FutureDueItem,
  IsoDate,
  LegislativeEnactmentRecord,
  LegislativeMeasureRecord,
  World,
} from "../../src/simulation";

const P = "us-policy-positions:";
const CITY_WAGE = `${P}labor-workforce.city-minimum-wage`;
const LOCAL_AUTHORITY = `${P}labor-workforce.local-minimum-wage-authority`;

let sequence = 0;

/** A law a body enacted on a question, as the enacted-law reader finds it. */
function lawOn(
  world: World,
  jurisdictionId: EntityId,
  questionKey: string,
  answer: "yes" | "no",
  effectiveAt: IsoDate,
  designation: string,
): World {
  sequence += 1;
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (definition) => definition.stableKey === questionKey,
  )!;
  const measureId = `test_measure_${sequence}` as EntityId;
  const measure: LegislativeMeasureRecord = {
    id: measureId,
    stableKey: `test-city-wage:${sequence}`,
    sequence: 90_000 + sequence,
    jurisdictionId,
    rulePackId: "test",
    designation,
    shortTitle: "A minimum wage law",
    summary: "A minimum wage law.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: "council",
    sponsorPersonId: null,
    introducedAt: world.currentDate,
    sourceDocumentKey: null,
    policyAlternativeIds: [],
    propositionIds: [proposition.id],
    propositionAnswers: [{ propositionId: proposition.id, answer }],
  } as LegislativeMeasureRecord;
  const enactment: LegislativeEnactmentRecord = {
    id: `test_enactment_${sequence}` as EntityId,
    stableKey: `test-city-wage:${sequence}:enactment`,
    sequence: 91_000 + sequence,
    measureId,
    resolvedAt: world.currentDate,
    outcome: "enacted",
    actDesignation: designation,
    effectiveAt,
    // No recorded event: the raise's provenance is then the authored note.
    outcomeEventId: "" as EntityId,
  } as LegislativeEnactmentRecord;
  return {
    ...world,
    history: {
      ...world.history,
      legislativeMeasures: [
        ...(world.history.legislativeMeasures ?? []),
        measure,
      ],
      legislativeEnactments: [
        ...(world.history.legislativeEnactments ?? []),
        enactment,
      ],
    },
  };
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
      world = paydayHandler(world, {
        stableKey: `town-pay-v2:payday:${paidThrough}`,
        transitionKey: PAYDAY_TRANSITION_KEY,
      } as FutureDueItem).world;
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
    it("Omaha's ordinance sets the state rate plus the average premium, from its effective date, and a later no ends it", () => {
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
      const before = townMinimumHourly(omaha)!;
      const during = Math.round(before * 100 * (1 + CITY_PREMIUM_RATIO)) / 100;
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
      const ordinance = lawOn(
        game,
        lexington,
        CITY_WAGE,
        "yes",
        effectiveAt,
        "Ordinance 1",
      );
      const before = townMinimumHourly(lexington)!;
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
      const world = lawOn(
        game,
        town("3137000"),
        CITY_WAGE,
        "yes",
        effectiveAt,
        "Ordinance 1",
      );
      for (const key of ["3651000", "0644000", "4819000", "5363000"])
        expect(
          townMinimumHourlyAt(world, town(key), addDays(effectiveAt, 5)),
          key,
        ).toBe(townMinimumHourly(town(key)));
    });
  },
);
