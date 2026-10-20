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
  // The household's last month as the credit engine kept it, and the latest
  // payments on the loans it owes: why the cash fell short.
  const months = store
    .table("households")
    .query("byHousehold", [person.householdId]) as unknown as Record<
    string,
    unknown
  >[];
  const month = [...months].sort((a, b) =>
    String(b.date).localeCompare(String(a.date)),
  )[0];
  const payments = (
    store
      .table("loans")
      .query("byHousehold", [person.householdId]) as unknown as {
      id: string;
    }[]
  )
    .flatMap(
      (loan) =>
        store.table("payments").query("byLoan", [loan.id]) as unknown as Record<
          string,
          unknown
        >[],
    )
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 3);
  return {
    id: bankId,
    name: organization.name,
    month: month && {
      id: String(month.id),
      date: String(month.date),
      housingMinor: Number(month.housingMinor),
      everydayMinor: Number(month.everydayMinor),
      paidMinor: Number(month.paidMinor),
      unpaidMinor: Number(month.unpaidMinor),
    },
    loanPayments: payments.map((row) => ({
      id: String(row.id),
      date: String(row.date),
      dueMinor: Number(row.dueMinor),
      paidMinor: Number(row.paidMinor),
    })),
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
