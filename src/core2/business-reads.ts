/** The business engine's front door for reads: who owns a firm, what a month of trading was, when a firm was founded. Each function answers one question; none returns a table. */
import { BUSINESS_MODULE_ID } from "./business-module-id";
import type { BusinessTradingMonth } from "./modules/business";
import type { CoreAPI, CoreState } from "./types";

/** One firm's owner, as the business engine keeps it. */
export interface BusinessOwnerRow {
  readonly id: string;
  readonly ownerId: string;
}

/** When a firm opened its doors, from the ages the opening keeps and the foundings play adds. */
export interface BusinessFounding {
  readonly organizationId: string;
  readonly date: string;
}

function store(api: CoreAPI) {
  return api.moduleState(BUSINESS_MODULE_ID);
}

/** Whether this world keeps the business engine. */
export function businessKept(api: CoreAPI): boolean {
  return (api.state as CoreState).modules.has(BUSINESS_MODULE_ID);
}

/** Every firm's owner. */
export function allBusinessOwners(api: CoreAPI): readonly BusinessOwnerRow[] {
  if (!businessKept(api)) return [];
  return store(api).table("owners").rows() as unknown as BusinessOwnerRow[];
}

/** The person who owns a firm, if the business engine keeps one for it. */
export function ownerOfBusiness(
  api: CoreAPI,
  organizationId: string,
): string | undefined {
  if (!businessKept(api)) return undefined;
  return (
    store(api).table("owners").get(organizationId) as
      { ownerId?: string } | undefined
  )?.ownerId;
}

/** One kept month of a firm's trading by its record id. */
export function tradingMonthOf(
  api: CoreAPI,
  tradingId: string,
): BusinessTradingMonth | undefined {
  if (!businessKept(api)) return undefined;
  return store(api).table("trading").get(tradingId) as unknown as
    BusinessTradingMonth | undefined;
}

/** Every kept month of trading. */
export function allTradingMonths(
  api: CoreAPI,
): readonly BusinessTradingMonth[] {
  if (!businessKept(api)) return [];
  return store(api)
    .table("trading")
    .rows() as unknown as BusinessTradingMonth[];
}

/** The record ids of a firm's months of outside costs. */
export function outsideCostRecordIds(
  api: CoreAPI,
  organizationId: string,
): readonly string[] {
  if (!businessKept(api)) return [];
  return (
    store(api)
      .table("outsideCosts")
      .query("byOrganization", [organizationId]) as unknown as {
      id: string;
    }[]
  ).map((row) => row.id);
}

/** When each firm was founded: the opening's ages first, then the foundings play has made. */
export function businessFoundings(api: CoreAPI): readonly BusinessFounding[] {
  if (!businessKept(api)) return [];
  const business = store(api);
  return [
    ...(
      business.table("ages").rows() as unknown as {
        id: string;
        foundedAt: string;
      }[]
    ).map((row) => ({ organizationId: row.id, date: row.foundedAt })),
    ...(
      business.table("foundings").rows() as unknown as BusinessFounding[]
    ).map((row) => ({ organizationId: row.organizationId, date: row.date })),
  ];
}
