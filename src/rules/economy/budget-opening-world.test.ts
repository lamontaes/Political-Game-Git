import { savedLaw } from "./test-support/saved-law";
import { BUDGET_LAW_KEYS } from "./budget-policy";
import { describe, it, expect } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import { makeIsoDate } from "../../simulation/dates";
import * as native from "../../simulation/public-budgets/opening";
import * as nativeFiscal from "../../simulation/public-budgets/fiscal";
import { budgetCandidates, openGovernmentBudget } from "./budget-opening";
import { openingPension, actuarialContribution } from "./budget-pension";
import {
  fiscalYearContaining,
  firstOfPreviousMonth,
  budgetObligationPayment,
  budgetLawReadings,
  nominalEconomyIndex,
} from "./budget-fiscal";
import { budgetFacts } from "./test-support/budget-facts";
describe("economy budget source joins, private opening helpers and pensions through unchanged native public owners", () => {
  for (const usps of Object.keys(STATES))
    it(usps, () => {
      const { world } = smallWorld({
        place: "US-" + usps,
        date: "2026-01-05",
        seed: "rules2:economy:budget:" + usps,
      });
      const nativeCandidates = native.budgetCandidates(world);
      const dates = [
        world.currentDate,
        makeIsoDate("2026-06-30"),
        makeIsoDate("2026-07-01"),
      ];
      const facts = budgetFacts(
        world,
        nativeCandidates.candidates.map((c) => c.lawJurisdictionId),
        dates,
      );
      const own = budgetCandidates(facts);
      expect(own).toEqual(nativeCandidates);
      const selected = own.candidates.filter(
        (c) => c.stateKey === "US-" + usps,
      );
      expect(selected.some((c) => c.level === "state")).toBe(true);
      for (const candidate of selected)
        for (const date of dates) {
          expect(openGovernmentBudget(facts, candidate, date)).toEqual(
            native.openGovernmentBudget(world, candidate, date),
          );
          for (const local of [false, true])
            expect(
              budgetLawReadings(
                facts.fiscal,
                candidate.lawJurisdictionId,
                date,
                local,
              ),
            ).toEqual(
              nativeFiscal.budgetLawReadings(
                world,
                candidate.lawJurisdictionId,
                date,
                local,
              ),
            );
          expect(
            nominalEconomyIndex(facts.fiscal, candidate.jurisdictionId, date),
          ).toEqual(
            nativeFiscal.nominalEconomyIndex(
              world,
              candidate.jurisdictionId,
              date,
            ),
          );
          for (const start of ["01-01", "07-01", "10-01"])
            expect(fiscalYearContaining(date, start)).toEqual(
              nativeFiscal.fiscalYearContaining(date, start),
            );
          expect(firstOfPreviousMonth(date)).toEqual(
            nativeFiscal.firstOfPreviousMonth(date),
          );
        }
      for (const candidate of selected) {
        const enacted = savedLaw(
          world,
          BUDGET_LAW_KEYS.pensions,
          candidate.lawJurisdictionId,
          0.35,
          "contribution",
          "ratio",
        );
        const enactedFacts = budgetFacts(
          enacted,
          selected.map((c) => c.lawJurisdictionId),
          dates,
        );
        for (const date of dates) {
          expect(openGovernmentBudget(enactedFacts, candidate, date)).toEqual(
            native.openGovernmentBudget(enacted, candidate, date),
          );
          for (const local of [true, false])
            expect(
              budgetLawReadings(
                enactedFacts.fiscal,
                candidate.lawJurisdictionId,
                date,
                local,
              ),
            ).toEqual(
              nativeFiscal.budgetLawReadings(
                enacted,
                candidate.lawJurisdictionId,
                date,
                local,
              ),
            );
        }
      }
      // Labeled boundary controls; source-selected pension records are also compared inside complete opening outputs above.
      for (const spending of [0, 1, 12500000])
        for (const funded of [0, 0.75, 1, 1.2]) {
          const p = openingPension(spending, 0.8, funded, 0.02, 2.5);
          expect(p).toEqual(
            native.openingPension(spending, 0.8, funded, 0.02, 2.5),
          );
          expect(actuarialContribution(p.pension, 0.02)).toEqual(
            native.actuarialContribution(p.pension, 0.02),
          );
          for (const answer of ["yes", "no", "unknown"] as const)
            for (const share of [undefined, 0, 0.5, 1.2]) {
              const law = {
                answer,
                measureId: null,
                level: null,
                ...(share === undefined
                  ? {}
                  : { requiredContributionShare: share }),
              };
              expect(budgetObligationPayment(p.required, 0.8, law)).toEqual(
                nativeFiscal.budgetObligationPayment(p.required, 0.8, law),
              );
            }
        }
    });
});
