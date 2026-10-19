/** Recorded counterparties, indexed monthly reviews and bills; no daily population scan. */
import type {
  CoreAPI,
  CoreModule,
  CountedWagesNotice,
  SalesReceiptNotice,
} from "../types";

/** Offer one payday of counted workers to every module that listens (e.g. the employer's payroll taxes). */
export function notifyCountedWages(
  api: CoreAPI,
  notice: CountedWagesNotice,
): void {
  for (const module of api.state.modules.values())
    module.onCountedWages?.(api, notice);
}

/** Offer one paid sale to every module that listens (e.g. sales tax). */
export function notifySalesReceipt(
  api: CoreAPI,
  sale: SalesReceiptNotice,
): void {
  for (const module of api.state.modules.values())
    module.onSalesReceipt?.(api, sale);
}
import { EVERYDAY_LIVING_KIND, settleLivingDay } from "../cost-of-living";
import { UnstaffedSupplierError } from "../finance-cash";
import { financeSettlementPhase } from "../finance-state";
import { observeWorkPayrollForFinance } from "../work-payroll-dispatch";

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
    for (const id of rows) {
      let receipt;
      try {
        receipt = api.settleFinanceContract(id);
      } catch (error) {
        // A supplier with no one left to make its product can't serve the agreement: it ends.
        if (!(error instanceof UnstaffedSupplierError)) throw error;
        api.endStandingContract(id);
        continue;
      }
      const terms = finance.contracts.get(id)!;
      if (terms.salesReceipt && receipt.paidMinor > 0)
        notifySalesReceipt(api, {
          id: receipt.id,
          date: api.state.date,
          sellerId: receipt.payeeId,
          buyerIds: terms.payerIds,
          kind: terms.kind,
          paidMinor: receipt.paidMinor,
          placeId: api.state.organizations.get(receipt.payeeId)?.placeId ?? "",
          counted: false,
        });
    }
    // Households spend on everyday living after income, before restocking.
    if (phase.id === api.state.data.finance!.defaultPhases.household)
      settleLivingDay(api, (sale) =>
        notifySalesReceipt(api, {
          ...sale,
          date: api.state.date,
          kind: EVERYDAY_LIVING_KIND,
          placeId: api.state.organizations.get(sale.sellerId)?.placeId ?? "",
          counted: false,
        }),
      );
  }
}

export const FINANCE_MODULE: CoreModule = {
  id: "core2-recorded-finance-v1",
  onDay: runFinanceDay,
  onWorkPayroll: observeWorkPayrollForFinance,
  onAfterDay: (api) => api.finishFinanceDay(),
};
