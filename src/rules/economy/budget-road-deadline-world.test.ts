import { savedLaw } from "./test-support/saved-law";
import { describe, it, expect } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import { makeIsoDate } from "../../simulation/dates";
import {
  lifePlaceByJurisdictionId,
  stateKeyForJurisdiction,
} from "../../simulation/life-places";
import { NATIONAL_ELECTION_JURISDICTION } from "../../simulation/national-election-geography";
import * as nativeDeadline from "../../simulation/governing/budget-stakes";
import * as nativeRoad from "../../simulation/public-budgets/road-usage-charge";
import {
  budgetDeadlineConsideration,
  daysToFiscalYear,
  fiscalYearStartFor,
} from "./budget-deadline";
import { roadChargeFactor, motorFuelShare } from "./budget-road";
import { MILEAGE_FEE_QUESTION } from "./budget-tax-policy";
import { budgetCandidates, openGovernmentBudget } from "./budget-opening";
import { budgetFacts } from "./test-support/budget-facts";
describe("economy full budget deadline and dated road-law/source selection", () => {
  for (const usps of Object.keys(STATES))
    it(usps, () => {
      const { world } = smallWorld({
        place: "US-" + usps,
        date: "2026-01-05",
        seed: "rules2:economy:budget-road:" + usps,
      });
      const dates = [
        world.currentDate,
        makeIsoDate("2028-01-05"),
        makeIsoDate("2036-01-05"),
      ];
      const facts = budgetFacts(world, [], dates, [MILEAGE_FEE_QUESTION]);
      const candidates = budgetCandidates(facts).candidates.filter(
        (c) => c.stateKey === "US-" + usps,
      );
      for (const c of candidates) {
        const government = openGovernmentBudget(facts, c, world.currentDate);
        if (typeof government === "string") continue;
        for (const date of dates)
          for (const erosion of dates)
            expect(
              roadChargeFactor(facts.fiscal, government, date, erosion),
            ).toEqual(
              nativeRoad.roadChargeFactor(world, government, date, erosion),
            );
        const enacted = savedLaw(
          world,
          MILEAGE_FEE_QUESTION,
          c.lawJurisdictionId,
          null,
        );
        const enactedFacts = budgetFacts(
          enacted,
          candidates.map((row) => row.lawJurisdictionId),
          dates,
          [MILEAGE_FEE_QUESTION],
        );
        for (const date of dates)
          for (const erosion of dates)
            expect(
              roadChargeFactor(enactedFacts.fiscal, government, date, erosion),
            ).toEqual(
              nativeRoad.roadChargeFactor(enacted, government, date, erosion),
            );
        expect(motorFuelShare(c.stateKey)).toEqual(
          nativeRoad.motorFuelShare(c.stateKey),
        );
      }
      const ids = [
        ...world.jurisdictionOrder,
        NATIONAL_ELECTION_JURISDICTION.id,
      ];
      const d = {
        onDate: world.currentDate,
        jurisdictions: world.jurisdictions,
        federalId: NATIONAL_ELECTION_JURISDICTION.id,
        stateKeys: new Map(
          ids.map((id) => [
            id,
            world.jurisdictions[id]
              ? stateKeyForJurisdiction(world.jurisdictions[id]!)
              : null,
          ]),
        ),
        placeKeys: new Map(
          ids.map((id) => [
            id,
            lifePlaceByJurisdictionId(id)?.stateJurisdictionKey ?? null,
          ]),
        ),
      };
      for (const id of ids) {
        expect(fiscalYearStartFor(d, id)).toEqual(
          nativeDeadline.fiscalYearStartFor(world, id),
        );
        for (const date of [
          world.currentDate,
          makeIsoDate("2026-04-02"),
          makeIsoDate("2026-06-01"),
          makeIsoDate("2026-06-30"),
          makeIsoDate("2026-07-01"),
        ]) {
          expect(
            budgetDeadlineConsideration({ ...d, onDate: date }, id),
          ).toEqual(
            nativeDeadline.budgetDeadlineConsideration(
              { ...world, currentDate: date },
              id,
            ),
          );
          for (const start of ["01-01", "07-01", "10-01"])
            expect(daysToFiscalYear(date, start)).toEqual(
              nativeDeadline.daysToFiscalYear(date, start),
            );
        }
      }
    });
});
