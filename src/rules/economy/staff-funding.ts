/** Full retained real public-program funding/read-index/initial-index closure; state IDs are raw compiled source receipts. */
import type { World, EntityId } from "../../simulation/types";
import type {
  BudgetProgram,
  PublicBudgetGovernment,
  StaffingBaseline,
} from "../../simulation/public-budgets/store";
import { BUDGET_PROGRAMS } from "./budget-policy";
import { CRUNCH46_PROVISIONAL_POLICY } from "./macro-policy";
import { nominalEconomyIndex } from "./budget-fiscal";
export interface StaffFundingFacts {
  readonly currentDate: World["currentDate"];
  readonly macroEconomy: World["macroEconomy"];
  readonly states: ReadonlyMap<string, { readonly id: EntityId }>;
}
// STOPGAP: economy.staff-funding-native-index-fallback
export function realProgramFunding(
  facts: StaffFundingFacts,
  government: PublicBudgetGovernment,
  program: BudgetProgram,
  baseline: StaffingBaseline | null = null,
): {
  readonly funding: number;
  readonly economyIndex: number;
} | null {
  const year = government.years.at(-1);
  if (!year) return null;
  const planned = year.appropriations[BUDGET_PROGRAMS.indexOf(program)] ?? 0;
  const state = facts.states.get(government.stateKey) ?? null;
  const economyIndex =
    year.economyAtAdoption ??
    (baseline?.yearStartsOn === year.startsOn
      ? baseline.economyIndex
      : state
        ? (nominalEconomyIndex(
            { months: facts.macroEconomy?.months ?? [] },
            state.id,
            facts.currentDate,
          ) ?? openingEconomyIndex(facts))
        : null);
  if (!economyIndex) return null;
  return {
    funding: (planned * (1 - government.cut)) / economyIndex,
    economyIndex,
  };
}
function openingEconomyIndex(facts: StaffFundingFacts): number | null {
  return facts.macroEconomy
    ? CRUNCH46_PROVISIONAL_POLICY.baseline.realOutputIndex * 100
    : null;
}
