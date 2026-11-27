/** The finance engine's front door for reads: a contract, a business's books, a facility, an employer's closure. Each function answers one question; none hands back a map. */
import type {
  BusinessBooksState,
  CreditFacilityState,
  EmployerClosure,
  FinanceContractState,
  FinanceReceipt,
} from "./finance-types";
import type { CoreState } from "./types";

/** One standing contract by its id. */
export function financeContractOf(
  core: CoreState,
  contractId: string,
): FinanceContractState | undefined {
  return core.finance.contracts.get(contractId);
}

/** Whether a contract with this id is kept. */
export function hasFinanceContract(
  core: CoreState,
  contractId: string,
): boolean {
  return core.finance.contracts.has(contractId);
}

/** Every standing contract. */
export function allFinanceContracts(
  core: CoreState,
): Iterable<FinanceContractState> {
  return core.finance.contracts.values();
}

/** The ids of a person's income contracts (wages, benefits, pensions), if they have any. */
export function incomeContractIdsOf(
  core: CoreState,
  personId: string,
): ReadonlySet<string> | undefined {
  return core.finance.incomeContractsByPerson.get(personId);
}

/** One business's books by its organization id. */
export function businessBooksOf(
  core: CoreState,
  organizationId: string,
): BusinessBooksState | undefined {
  return core.finance.businesses.get(organizationId);
}

/** Whether an organization keeps business books. */
export function hasBusinessBooks(
  core: CoreState,
  organizationId: string,
): boolean {
  return core.finance.businesses.has(organizationId);
}

/** Every business's books. */
export function allBusinessBooks(
  core: CoreState,
): Iterable<BusinessBooksState> {
  return core.finance.businesses.values();
}

/** The organization ids of the businesses in a place. */
export function businessIdsInPlace(
  core: CoreState,
  placeId: string,
): ReadonlySet<string> | undefined {
  return core.finance.businessesByPlace.get(placeId);
}

/** The ids of the jobs an organization holds. */
export function jobIdsOfOrganization(
  core: CoreState,
  organizationId: string,
): ReadonlySet<string> | undefined {
  return core.finance.jobsByOrganization.get(organizationId);
}

/** An employer's closure record, once it has closed. */
export function closureOf(
  core: CoreState,
  organizationId: string,
): EmployerClosure | undefined {
  return core.finance.closures.get(organizationId);
}

/** The latest receipt a contract settled with. */
export function latestReceiptOf(
  core: CoreState,
  contractId: string,
): FinanceReceipt | undefined {
  return core.finance.latestReceiptsByContract.get(contractId);
}

/** One credit facility by its id. */
export function creditFacilityOf(
  core: CoreState,
  facilityId: string,
): CreditFacilityState | undefined {
  return core.finance.facilities.get(facilityId);
}

/** The ids of the credit facilities a borrower holds. */
export function facilityIdsOfBorrower(
  core: CoreState,
  borrowerId: string,
): ReadonlySet<string> | undefined {
  return core.finance.facilitiesByBorrower.get(borrowerId);
}
