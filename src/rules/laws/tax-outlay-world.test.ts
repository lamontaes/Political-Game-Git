import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import { makeIsoDate } from "../../simulation/dates";
import { chiefExecutiveJurisdiction } from "../../simulation/nationwide-world/government-jurisdiction";
import { censusRegionOf } from "../../simulation/world-setup/census-regions";
import * as oldState from "../../simulation/state-income-tax-law";
import * as oldFederal from "../../simulation/federal-top-income-tax-law";
import * as oldOutlays from "../../simulation/federal-outlay-laws";
import {
  defenseBuildUpShare as oldDefense,
  GROW_DEFENSE_SPENDING_QUESTION,
} from "../../simulation/federal-defense-spending";
import { FEDERAL_OUTLAYS } from "../../simulation/public-budgets/federal-budget-categories";
import {
  readFinalEnactedLawTerm,
  readFinalEnactedLawSchedule,
} from "../../simulation/governing/final-law-term-query";
import { lawInForce as oldLaw } from "../../simulation/governing/law-in-force";
import { researchRuleTable } from "../../simulation/research-rule-tables";
import stateTaxData from "../../../data/research/money/state-income-tax-2026.json";
import incomes from "../../../data/research/money/state-household-income-cps-2023.json";
import outlayData from "../../../data/research/federal/federal-outlay-terms-fy2025.json";
import { lawFacts } from "./test-support/law-facts";
import {
  stateIncomeTaxUnderLaw,
  finalTermReceiptKey,
  type TaxLawFacts,
} from "./tax-law-schedules";
import { federalIncomeTaxUnderLaw } from "./federal-tax-law";
import * as outlays from "./recorded-outlays";
import type { World, EntityId } from "../../simulation/types";
function result(call: () => unknown) {
  try {
    return { value: call() };
  } catch (error) {
    return { name: (error as Error).name, message: (error as Error).message };
  }
}
const regions = new Map(
  Object.keys(stateTaxData.places).map((key) => [
    key.slice(3),
    censusRegionOf(key.slice(3)),
  ]),
);
describe("laws: recorded tax-year and monthly outlay public owners", () => {
  it.each(Object.keys(STATES))(
    "matches the actual starting tax corpus and saved outlay chronology in %s",
    (usps) => {
      const { world } = smallWorld({
        place: `US-${usps}`,
        seed: `rules2-laws-tax-outlay:${usps}`,
      });
      const taxKeys = [
        oldState.ADOPT_STATE_INCOME_TAX_QUESTION,
        oldState.GRADUATED_STATE_INCOME_TAX_QUESTION,
        oldFederal.RAISE_TOP_FEDERAL_RATE_QUESTION,
      ];
      const questions = Object.values(world.policyCatalog.propositions).filter(
        (q) => taxKeys.includes(q.stableKey),
      );
      const years = ["2026-01-01", "2027-01-01"].map(makeIsoDate);
      const state = chiefExecutiveJurisdiction(usps);
      const raw = lawFacts(
        world,
        questions.map((q) => q.id),
        years,
        [undefined],
      );
      const terms = new Map<
        string,
        ReturnType<typeof readFinalEnactedLawTerm>
      >();
      const schedules = new Map<
        string,
        ReturnType<typeof readFinalEnactedLawSchedule>
      >();
      for (const question of questions)
        for (const date of years) {
          const jurisdiction = question.stableKey.startsWith("us-federal")
            ? raw.federalId
            : state?.id;
          if (!jurisdiction) continue;
          for (const scope of ["all", "enacted-only"] as const) {
            const law = oldLaw(world, jurisdiction, question.id, date, scope);
            if (!law) continue;
            for (const [termKey, unit] of [
              ["rate", "ratio"],
              ["threshold", "minor"],
            ] as const) {
              const query = {
                questionKey: question.stableKey,
                termKey,
                unit,
                onDate: date,
              };
              terms.set(
                finalTermReceiptKey(law.measureId, query),
                readFinalEnactedLawTerm(world, law, query),
              );
            }
            for (const termKey of ["rate", "brackets"]) {
              const query = {
                questionKey: question.stableKey,
                termKey,
                onDate: date,
              };
              schedules.set(
                finalTermReceiptKey(law.measureId, query),
                readFinalEnactedLawSchedule(world, law, query),
              );
            }
          }
        }
      const facts: TaxLawFacts = {
        ...raw,
        places: stateTaxData.places,
        householdIncomes: incomes.medianHouseholdIncomeDollarsByState,
        regions,
        sourceUrl: stateTaxData.source.url,
        governingJurisdictions: new Map(
          Object.keys(STATES).flatMap((key) => {
            const j = chiefExecutiveJurisdiction(key);
            return j ? [[key, j] as const] : [];
          }),
        ),
        finalTerms: terms,
        finalSchedules: schedules,
      };
      const fed = {
        ...facts,
        federalSchedules: researchRuleTable("federalIncomeTaxes"),
      };
      for (const date of years)
        for (const status of [
          "single",
          "married-filing-jointly",
          "head-of-household",
        ] as const) {
          expect(
            result(() =>
              stateIncomeTaxUnderLaw(facts, `US-${usps}`, status, date),
            ),
          ).toEqual(
            result(() =>
              oldState.stateIncomeTaxUnderLaw(
                world,
                `US-${usps}`,
                status,
                date,
              ),
            ),
          );
          expect(
            result(() => federalIncomeTaxUnderLaw(fed, status, date)),
          ).toEqual(
            result(() =>
              oldFederal.federalIncomeTaxUnderLaw(world, status, date),
            ),
          );
        }
      const date = world.currentDate;
      const keys = [
        outlays.DEBT_LIMIT_CUTS_QUESTION,
        outlays.INCREASE_FOREIGN_AID_QUESTION,
        GROW_DEFENSE_SPENDING_QUESTION,
      ];
      const laws = new Map(
        keys.map((key) => [
          `${key}:${date}`,
          oldOutlays.federalLawInForceAt(world, key, date),
        ]),
      );
      const outlayTerms = new Map<string, { readonly value: number } | null>();
      for (const key of keys) {
        const law = laws.get(`${key}:${date}`);
        if (law)
          for (const termKey of ["offset", "appropriation"])
            outlayTerms.set(
              `${law.measureId}:${key}:${termKey}:${date}`,
              readFinalEnactedLawTerm(world, law, {
                questionKey: key,
                termKey,
                unit: "dollars/year",
                onDate: date,
              }),
            );
      }
      const rows = Array.from({ length: 12 }, (_, i) => ({
        month: makeIsoDate(`2025-${String(i + 1).padStart(2, "0")}-01`),
        spending: FEDERAL_OUTLAYS.map((_, line) => 100 + line + i),
      }));
      for (const months of [
        [],
        rows,
        rows.slice(1),
        rows.map((r) => ({ ...r, spending: r.spending.map(() => 0) })),
        rows.map((r) => ({ ...r, spending: r.spending.map(() => -1) })),
        [
          ...rows.slice(0, 11),
          { ...rows[11]!, month: makeIsoDate("2026-02-01") },
        ],
      ]) {
        // Authored saved-month controls, not a claim of a generated fiscal year. Native reader sees this same World.
        const saved = {
          ...world,
          publicBudgets: {
            ...world.publicBudgets,
            federalGovernment: {
              ...world.publicBudgets?.federalGovernment,
              months,
            },
          } as unknown as World["publicBudgets"],
        };
        const selected = {
          onDate: date,
          months,
          lines: FEDERAL_OUTLAYS,
          nationalGdp: outlayData.nationalGdp2025,
          laws,
          terms: outlayTerms,
        };
        for (const line of [null, 0, 1, 100])
          for (const allowZero of [false, true])
            expect(
              outlays.recordedFederalAnnualSpendingBefore(
                selected,
                line,
                makeIsoDate("2026-01-01"),
                allowZero,
              ),
            ).toEqual(
              oldOutlays.recordedFederalAnnualSpendingBefore(
                saved,
                line,
                makeIsoDate("2026-01-01"),
                allowZero,
              ),
            );
        expect(outlays.federalOutlayChangeAt(selected, date)).toEqual(
          oldOutlays.federalOutlayChangeAt(saved, date),
        );
        expect(outlays.federalOutlayLawLineChangesAt(selected, date)).toEqual(
          oldOutlays.federalOutlayLawLineChangesAt(saved, date),
        );
        expect(outlays.federalDeficitChangePctOfGdp(selected, date)).toEqual(
          oldOutlays.federalDeficitChangePctOfGdp(saved, date),
        );
        expect(outlays.federalAidFactor(selected, date)).toEqual(
          oldOutlays.federalAidFactor(saved, date),
        );
        expect(outlays.defenseBuildUpShare(selected, date)).toEqual(
          oldDefense(saved, date),
        );
      }
      expect(raw.federalId as EntityId).toBeDefined();
    },
  );
});
