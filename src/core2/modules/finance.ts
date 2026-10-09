/** Recorded counterparties, indexed monthly reviews and bills; no daily population scan. */
import type { CoreAPI, CoreModule } from "../types";

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
  for (const id of dueIds(finance.reviewsDueAt, api.state.date))
    api.reviewBusiness(id);
  // Standing household purchases fund actual suppliers before those suppliers' expenses.
  const ids = dueIds(finance.contractsDueAt, api.state.date).sort((a, b) => {
    const left = finance.contracts.get(a)!,
      right = finance.contracts.get(b)!;
    const rank = (householdId?: string) =>
      householdId ? api.parameter("zero") : api.parameter("one");
    return (
      rank(left.householdId) - rank(right.householdId) || a.localeCompare(b)
    );
  });
  for (const id of ids)
    if (!finance.contracts.get(id)!.endedAt) api.settleFinanceContract(id);
}

export const FINANCE_MODULE: CoreModule = {
  id: "core2-recorded-finance-v1",
  onDay: runFinanceDay,
  onAfterDay: (api) => api.finishFinanceDay(),
};
