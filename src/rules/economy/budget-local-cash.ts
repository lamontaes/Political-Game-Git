// STOPGAP: economy.peer-cash-bracket-estimate Nearest population brackets, same-kind fallback and population-normalized peer cash produce an unweighted mean and population standard deviation.
/** Full retained nearest-population peer cash stock selection and population standard deviation; no draw or new opening level. */
import { readMonthFlows, type BudgetFlowFacts } from "./budget-flows";
import type { EntityId } from "../../simulation/types";
import type { BudgetCandidate } from "../../simulation/public-budgets/opening";
import type { PublicBudgetStore } from "../../simulation/public-budgets/store";
export interface BudgetCashFacts {
  readonly store: PublicBudgetStore | undefined;
  readonly flows: BudgetFlowFacts;
}
export interface Spread {
  readonly mean: number;
  readonly standardDeviation: number;
  readonly count: number;
}

export function spreadOf(values: readonly number[]): Spread {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return { mean, standardDeviation: Math.sqrt(variance), count: values.length };
}
export interface InGameOpeningCashEstimate {
  readonly amountMinorUnits: number;
  readonly spreadMinorUnits: number;
  readonly sourceNote: string;
  readonly peerGovernmentKeys: readonly string[];
  readonly peerRecordIds: readonly EntityId[];
}

export function estimateLocalOpeningCash(
  facts: BudgetCashFacts,
  candidate: BudgetCandidate,
): InGameOpeningCashEstimate | null {
  const store = facts.store;
  const target = store?.governments.find((row) => row.key === candidate.key);
  if (!store || !target || target.population <= 0) return null;
  const cash = readMonthFlows(facts.flows, store).flows.cash;
  const donors = store.governments.flatMap((government) => {
    const account = cash?.get(government.key);
    if (
      !account ||
      government.key === candidate.key ||
      government.population <= 0
    )
      return [];
    const spendable =
      account.balanceMinorUnits - (account.heldCashBailMinorUnits ?? 0);
    if (spendable < 0) return [];
    return [{ government, account, spendable }];
  });
  const sameKind = donors.filter(
    (row) => row.government.level === candidate.level,
  );
  const comparable = sameKind.length ? sameKind : donors;
  const below = comparable.filter(
    (row) => row.government.population <= target.population,
  );
  const above = comparable.filter(
    (row) => row.government.population >= target.population,
  );
  const lowerPopulation = Math.max(
    ...below.map((row) => row.government.population),
  );
  const upperPopulation = Math.min(
    ...above.map((row) => row.government.population),
  );
  const peers = comparable
    .filter(
      (row) =>
        row.government.population === lowerPopulation ||
        row.government.population === upperPopulation,
    )
    .sort((a, b) => a.government.key.localeCompare(b.government.key));
  if (!peers.length) return null;
  const values = peers.map(
    (row) => (row.spendable / row.government.population) * target.population,
  );
  const { mean, standardDeviation: spread } = spreadOf(values);
  const amountMinorUnits = Math.round(mean);
  if (!Number.isSafeInteger(amountMinorUnits))
    throw new Error("In-game peer cash exceeds the exact money range.");
  return {
    amountMinorUnits,
    spreadMinorUnits: spread,
    peerGovernmentKeys: peers.map((row) => row.government.key),
    peerRecordIds: peers.flatMap((row) => [
      row.account.organizationId,
      row.account.positionId,
    ]),
    sourceNote: `ESTIMATED: averaged from this game's similar government accounts now, with their current spread. Target ${candidate.key}, population ${target.population}. ${sameKind.length ? "Same government kind" : "No same-kind cash yet; existing government cash normalized by saved population"}; nearest population brackets. Mean ${mean} USD minor units; population standard deviation ${spread} USD minor units; no roll. Peers: ${peers.map((row) => `${row.government.key}/${row.government.level}: population=${row.government.population}, spendableCash=${row.spendable}, organization=${row.account.organizationId}, position=${row.account.positionId}`).join("; ")}. This is an estimated opening stock, never a tax receipt or payment.`,
  };
}
