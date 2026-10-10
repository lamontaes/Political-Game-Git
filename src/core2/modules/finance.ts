/** Recorded counterparties, indexed monthly reviews and bills; no daily population scan. */
import type { CoreAPI, CoreModule } from "../types";
import { financeSettlementPhase } from "../finance-state";

function dueIds(
  index: ReadonlyMap<string, ReadonlySet<string>>,
  at: string,
): string[] {
  const result: string[] = [];
  for (const date of [...index.keys()].filter((date) => date <= at).sort())
    for (const id of index.get(date)!) result.push(id);
  return result;
}

function runFinanceDay(api: CoreAPI): void {
  const finance = api.state.finance;
  for (const id of dueIds(finance.contractsEndingAt, api.state.date))
    api.retireFinanceBudget(id);
  for (const id of dueIds(finance.reviewsDueAt, api.state.date))
    api.reviewBusiness(id);
  const ids = dueIds(finance.contractsDueAt, api.state.date)
    .filter((id) => !finance.contracts.get(id)!.endedAt)
    .sort();
  const byPhase = new Map<string, string[]>();
  for (const id of ids) {
    const phase = financeSettlementPhase(api, finance.contracts.get(id)!);
    const rows = byPhase.get(phase.id) ?? [];
    rows.push(id);
    byPhase.set(phase.id, rows);
  }
  // The data orders finite funding, recipient income, purchases and procurement.
  for (const phase of api.state.data.finance!.settlementPhases) {
    const rows = byPhase.get(phase.id) ?? [];
    if (phase.operation === "procure") api.prepareFinanceProcurement(rows);
    for (const id of rows) api.settleFinanceContract(id);
  }
}

export const FINANCE_MODULE: CoreModule = {
  id: "core2-recorded-finance-v1",
  onDay: runFinanceDay,
  onAfterDay: (api) => api.finishFinanceDay(),
};
