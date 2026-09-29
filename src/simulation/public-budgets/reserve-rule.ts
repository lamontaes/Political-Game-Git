import rules from "../../../data/research/money/state-reserve-rules.json" with { type: "json" };
import type { PublicBudgetGovernment } from "./store";

/**
 * What a minimum-reserve law requires of one government: the share of a
 * year's spending its rainy-day fund is filled to, and the most the adopted
 * budget moves into it in one year.
 *
 * A state reads its own rainy-day law, as NASBO's "Budget Processes in the
 * States" (2021), Table 13, reports it
 * (`data/research/money/state-reserve-rules.json`, transcribed by
 * `scripts/research/export-state-reserve-rules.py`): the required minimum
 * where the law sets one, else the fund's maximum size. A state whose law sets
 * no share, and every county and city, whose own reserve policies are not
 * read yet, takes the median of the states whose laws set one: ESTIMATED FROM
 * AVERAGE.
 */
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
