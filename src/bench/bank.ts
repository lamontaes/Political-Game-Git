/** The Money screen reads the bank's published books and the household's claim. */
import { bankDeposit } from "../core2/accounts";
import { coreAPI } from "../core2/state";
import type { CoreState } from "../core2/types";

export function bankView(core: CoreState, personId: string) {
  const person = core.people.get(personId);
  if (!person || !core.modules.has("credit")) return null;
  const store = coreAPI(core).moduleState("credit");
  const bank = store.table("banks").get("credit:bank");
  const bankId = String(bank?.organizationId ?? "");
  const organization = core.organizations.get(bankId);
  if (!organization) return null;
  const latest = [...store.table("books").rows()].sort((a, b) =>
    String(b.date).localeCompare(String(a.date)),
  )[0];
  const deposit = bankDeposit(core, bankId, person.householdId);
  const books = latest
    ? {
        id: latest.id,
        date: String(latest.date),
        cashMinor: Number(latest.cash),
        businessLoansMinor: Number(latest.principal),
        householdLoansMinor: Number(latest.loans),
        mortgagesMinor: Number(latest.mortgagesMinor),
        depositsMinor: Number(latest.deposits),
        mortgageFundingMinor: Number(latest.openingMortgageFundingMinor),
        equityMinor: Number(latest.equity),
      }
    : null;
  return {
    id: bankId,
    name: organization.name,
    householdId: person.householdId,
    depositId: deposit?.id,
    savingsMinor: deposit?.balanceMinor ?? 0,
    savingsDate: core.date,
    books: books && {
      ...books,
      assetsMinor:
        books.cashMinor +
        books.businessLoansMinor +
        books.householdLoansMinor +
        books.mortgagesMinor,
      liabilitiesAndEquityMinor:
        books.depositsMinor + books.mortgageFundingMinor + books.equityMinor,
    },
  };
}
