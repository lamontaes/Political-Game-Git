/**
 * The record a screen would read for a business's books (business audit,
 * owner ruling 5, Oct 14): whether a player sees another business's books is
 * the owner's open decision (registered as an owner decision), so this builds
 * the record only, from the books and the records other engines keep, and
 * holds no text. Read-only: it spends no game time and creates no facts.
 */
import type { CoreAPI, CoreState } from "./types";
import { stopgap } from "./stopgaps";
import {
  EMPLOYER_TAXES_MODULE_ID,
  employerArrears,
  profitTaxArrears,
  type EmployerTaxRecord,
  type ProfitTaxRecord,
} from "./modules/employer-taxes";

export const BOOKS_VIEW_DECISION = "SG-WORLD-owner-decision-business-books";

export interface BusinessBooksView {
  readonly organizationId: string;
  readonly kindId: string;
  readonly asOf: string;
  readonly cashMinor: number;
  /** Since the opening, from the books. */
  readonly salesMinor: number;
  readonly operatingCostsMinor: number;
  readonly wagesPaidMinor: number;
  readonly wagesUnpaidMinor: number;
  readonly profitMinor: number;
  /** Payroll and profit taxes paid, and still owed, from their records. */
  readonly taxesPaidMinor: number;
  readonly taxesOwedMinor: number;
  readonly creditLine?: {
    readonly id: string;
    readonly limitMinor: number;
    readonly drawnMinor: number;
    readonly active: boolean;
  };
  readonly closedAt?: string;
  /** The records each figure came from. */
  readonly recordIds: readonly string[];
}

/** The books of one business as a screen would show them, or undefined for none. */
export function businessBooksView(
  api: CoreAPI,
  organizationId: string,
): BusinessBooksView | undefined {
  // stopgapId: SG-WORLD-owner-decision-business-books
  stopgap(BOOKS_VIEW_DECISION);
  const core = api.state as CoreState;
  const books = core.finance.businesses.get(organizationId);
  if (!books) return undefined;
  let taxesPaid = 0;
  const recordIds: string[] = [organizationId];
  if (core.modules.has(EMPLOYER_TAXES_MODULE_ID)) {
    const state = api.moduleState(EMPLOYER_TAXES_MODULE_ID);
    for (const row of state
      .table("shares")
      .query("byEmployer", [organizationId]) as unknown as EmployerTaxRecord[])
      taxesPaid += row.paidMinor;
    for (const row of state
      .table("profits")
      .query("byBusiness", [organizationId]) as unknown as ProfitTaxRecord[]) {
      taxesPaid += row.paidMinor;
      recordIds.push(row.id);
    }
  }
  const facility = books.creditFacilityId
    ? core.finance.facilities.get(books.creditFacilityId)
    : undefined;
  if (facility) recordIds.push(facility.id);
  return {
    organizationId,
    kindId: books.kindId,
    asOf: core.date,
    cashMinor: api.accounts().balance(`cash:${organizationId}:residual`),
    salesMinor: books.salesReceivedMinor,
    operatingCostsMinor: books.operatingPaidMinor,
    wagesPaidMinor: books.wagesPaidMinor,
    wagesUnpaidMinor: books.wagesUnpaidMinor,
    profitMinor:
      books.salesReceivedMinor -
      books.operatingPaidMinor -
      books.wagesPaidMinor,
    taxesPaidMinor: taxesPaid,
    taxesOwedMinor: core.modules.has(EMPLOYER_TAXES_MODULE_ID)
      ? employerArrears(api, organizationId) +
        profitTaxArrears(api, organizationId)
      : 0,
    ...(facility
      ? {
          creditLine: {
            id: facility.id,
            limitMinor: facility.limitMinor,
            drawnMinor: facility.principalMinor,
            active: facility.active,
          },
        }
      : {}),
    ...(books.closedAt ? { closedAt: books.closedAt } : {}),
    recordIds,
  };
}
