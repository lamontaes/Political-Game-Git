/** Raw same-World budget/source facts. Shared person-principle, dated outcome and law-compiler receipts remain separately owned. */
import { currentStateExecutiveHolders } from "../../../simulation/nationwide-world/state-executives";
import { principledLeaning } from "../../../simulation/governing/officeholder-principles";
import { placeOutcomeAt } from "../../../simulation/outcome-web/place-outcome-store";
import { federalLawInForceAt } from "../../../simulation/federal-outlay-laws";
import { readFinalEnactedLawTerm } from "../../../simulation/governing/final-law-term-query";
import { FEDERAL_OUTLAYS } from "../../../simulation/public-budgets/federal-budget-categories";
import { GOVERNMENT_BUDGET_CATEGORIES } from "../../../simulation/public-budgets/store";
import federalSource from "../../../../data/research/federal/federal-outlay-terms-fy2025.json";
import { BUDGET_LAW_KEYS } from "../budget-policy";
import { TAX_QUESTION_EFFECTS } from "../budget-tax-policy";
import { SPENDING_QUESTION_EFFECTS } from "../budget-month-policy";
import {
  DEBT_LIMIT_CUTS_QUESTION,
  INCREASE_FOREIGN_AID_QUESTION,
} from "../../laws/recorded-outlays";
import { budgetMonthReceiptKey, type BudgetMonthFacts } from "../budget-month";
import { budgetFacts } from "./budget-facts";
import { cannabisBudgetFacts, cannabisReceiptDates } from "./cannabis-facts";
import type { World, EntityId, IsoDate } from "../../../simulation/types";
export function budgetMonthFacts(
  world: World,
  ids: readonly EntityId[],
  dates: readonly IsoDate[],
): BudgetMonthFacts {
  const additional = [
    ...TAX_QUESTION_EFFECTS,
    ...SPENDING_QUESTION_EFFECTS,
  ].map((row) => row.questionKey);
  const opening = budgetFacts(
    world,
    ids,
    cannabisReceiptDates(dates),
    additional,
  );
  const executives = currentStateExecutiveHolders(world);
  const principles = new Map<string, ReturnType<typeof principledLeaning>>();
  for (const holder of executives)
    for (const key of [BUDGET_LAW_KEYS.balanced, BUDGET_LAW_KEYS.reserve]) {
      const q = Object.values(world.policyCatalog.propositions).find(
        (row) => row.stableKey === key,
      );
      if (q)
        principles.set(
          budgetMonthReceiptKey(holder.personId, q.id),
          principledLeaning(world, holder.personId, q.id),
        );
    }
  const borrowing = new Map<string, ReturnType<typeof placeOutcomeAt>>();
  for (const state of opening.views.states
    ? Object.keys(opening.views.states)
    : []) {
    const id = opening.views.stateJurisdictionForKey("US-" + state)?.id;
    if (!id) continue;
    for (const date of dates)
      borrowing.set(
        budgetMonthReceiptKey("gov.borrowing-cost", id, date),
        placeOutcomeAt(world, "gov.borrowing-cost", id, date),
      );
  }
  const laws = new Map<string, ReturnType<typeof federalLawInForceAt>>();
  const terms = new Map<string, { readonly value: number } | null>();
  for (const key of [DEBT_LIMIT_CUTS_QUESTION, INCREASE_FOREIGN_AID_QUESTION])
    for (const date of dates) {
      const law = federalLawInForceAt(world, key, date);
      laws.set(`${key}:${date}`, law);
      if (law)
        for (const termKey of ["offset", "appropriation"])
          terms.set(
            `${law.measureId}:${key}:${termKey}:${date}`,
            readFinalEnactedLawTerm(world, law, {
              questionKey: key,
              termKey,
              unit: "dollars/year",
              onDate: date,
            }),
          );
    }
  return {
    opening,
    cannabis: cannabisBudgetFacts(world, ids, dates, opening.fiscal),
    finance: {
      onDate: world.currentDate,
      macroEconomy: world.macroEconomy,
      townFinances: world.townFinances,
    },
    outlays: {
      onDate: world.currentDate,
      months: world.publicBudgets?.federalGovernment?.months ?? [],
      lines: FEDERAL_OUTLAYS,
      nationalGdp: federalSource.nationalGdp2025,
      laws,
      terms,
    },
    executives,
    principles,
    borrowing,
    categories: GOVERNMENT_BUDGET_CATEGORIES,
    countyHearings: world.publicBudgets?.countyBudgetHearings ?? [],
  };
}
