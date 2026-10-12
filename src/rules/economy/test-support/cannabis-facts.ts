/** Same-World raw records and source market; numeric law terms are receipts from the separate legal compiler owner. */
import market from "../../../../data/research/money/cannabis-retail-market.json";
import { lawInForce } from "../../../simulation/governing/law-in-force";
import { readFinalEnactedLawTerm } from "../../../simulation/governing/final-law-term-query";
import { legalTermReceiptKey } from "../../laws/minimum-authority";
import { CANNABIS_TAX_EFFECT } from "../budget-tax-policy";
import { budgetFacts } from "./budget-facts";
import type { BudgetFiscalFacts } from "../budget-fiscal";
import type { CannabisBudgetFacts } from "../budget-cannabis";
import type { World, EntityId, IsoDate } from "../../../simulation/types";
export function cannabisReceiptDates(
  dates: readonly IsoDate[],
): readonly IsoDate[] {
  const values = new Set(dates);
  for (const date of dates) {
    const months =
      Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7)) - 1 - 11;
    const day = date.slice(8, 10) > "28" ? "28" : date.slice(8, 10);
    values.add(
      `${Math.floor(months / 12)}-${String((months % 12) + 1).padStart(2, "0")}-${day}` as IsoDate,
    );
  }
  return [...values];
}
export function cannabisBudgetFacts(
  world: World,
  ids: readonly EntityId[],
  dates: readonly IsoDate[],
  existing?: BudgetFiscalFacts,
): CannabisBudgetFacts {
  const fiscal =
    existing ??
    budgetFacts(world, ids, cannabisReceiptDates(dates), [
      CANNABIS_TAX_EFFECT.questionKey,
    ]).fiscal;
  const terms = new Map(fiscal.finalTerms);
  const question = Object.values(world.policyCatalog.propositions).find(
    (row) => row.stableKey === CANNABIS_TAX_EFFECT.questionKey,
  );
  if (question)
    for (const id of ids)
      for (const date of dates) {
        const law = lawInForce(world, id, question.id, date);
        if (!law) continue;
        const query = {
          questionKey: CANNABIS_TAX_EFFECT.questionKey,
          termKey: "tax-rate",
          unit: "ratio" as const,
          onDate: date,
        };
        terms.set(
          legalTermReceiptKey(law, query),
          readFinalEnactedLawTerm(
            date > world.currentDate ? { ...world, currentDate: date } : world,
            law,
            query,
          ),
        );
      }
  return {
    onDate: world.currentDate,
    records: world.history,
    catalog: world.policyCatalog,
    market,
    fiscal: { ...fiscal, finalTerms: terms },
  };
}
