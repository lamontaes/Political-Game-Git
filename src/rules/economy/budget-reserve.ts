/** Supporting retained reserve-target source selector; missing own laws retain the native median proxy. */
import rules from "../../../data/research/money/state-reserve-rules.json";
import type { PublicBudgetGovernment } from "../../simulation/public-budgets/store";
export interface ReserveRule {
  readonly floorShare: number;
  readonly depositShare: number;
  readonly basis: string;
}
interface StateRule {
  readonly target: number | null;
  readonly targetBasis: string;
  readonly deposit: number | null;
  readonly depositBasis: string;
}
const STATES: Readonly<Record<string, StateRule>> = rules.states;
// stopgapId: "economy.budget-reserve-source-median"
export const MEDIAN_RESERVE_TARGET: number = rules.median.target;
export const MEDIAN_RESERVE_DEPOSIT: number = rules.median.deposit;
export function reserveRule(
  government: Pick<PublicBudgetGovernment, "key" | "level">,
): ReserveRule {
  const own =
    government.level === "state"
      ? STATES[government.key.replace(/^US-/, "")]
      : undefined;
  const average = `ESTIMATED FROM AVERAGE: the median of the ${rules.median.targetStates} state rainy-day laws that set a size (NASBO 2021)`;
  return {
    floorShare: own?.target ?? MEDIAN_RESERVE_TARGET,
    depositShare: own?.deposit ?? MEDIAN_RESERVE_DEPOSIT,
    basis:
      own?.target != null
        ? `${own.targetBasis} (NASBO 2021)`
        : own
          ? `${own.targetBasis}; ${average}`
          : `${average}; this government's own reserve policy is not read yet`,
  };
}
