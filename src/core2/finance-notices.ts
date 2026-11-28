/**
 * The finance engine's notices: one counted payroll or one paid sale, offered to every module that listens (a module's onCountedWages and onSalesReceipt). src/core2/modules/finance.ts re-exports them.
 */
import type { CoreAPI, CountedWagesNotice, SalesReceiptNotice } from "./types";

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
