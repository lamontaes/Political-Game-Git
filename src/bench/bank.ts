/** The Money screen reads the bank's published books and the household's claim. */
import { bankDeposit } from "../core2/accounts";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { HOUSING_MODULE_ID } from "../core2/modules/housing";
import { coreAPI } from "../core2/state";
import type { CoreState } from "../core2/types";

/** How many of the credit engine's monthly rows the sheet lists. */
// stopgapId: SG-BENCH-money-recent-months
const RECENT_MONTHS = 6;
const MONTH_LENGTH = "YYYY-MM".length;
/** The ledger's reason on a household's everyday spending (EVERYDAY_LIVING_KIND, src/core2/cost-of-living.ts, outside the screens' import reach). */
const EVERYDAY_LIVING_KIND = "household.everyday-living";

interface SpendingLine {
  reasonKey: string;
  requestedMinor: number;
  paidMinor: number;
  ids: string[];
}

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
  const household = core.households.get(person.householdId);
  const members = (household?.memberIds ?? [])
    .map((id) => core.people.get(id))
    .filter((member) => member?.alive);
  // Cash: what the household's members hold now, and what the credit engine
  // kept of it at each of its monthly reviews.
  const cash = {
    nowMinor: members.reduce((n, member) => n + member!.liquidMinor, 0),
    memberIds: members.map((member) => member!.id),
    months: [...months]
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      .slice(0, RECENT_MONTHS)
      .map((row) => ({
        id: String(row.id),
        date: String(row.date),
        cashMinor: Number(row.cashMinor),
      })),
  };
  // Where last month's money went, by the ledger's reason: each standing bill's
  // latest receipt, and the household's everyday living plan.
  // stopgapId: SG-BENCH-money-spending-reasons
  const spending = new Map<string, SpendingLine>();
  const addSpending = (
    reasonKey: string,
    requestedMinor: number,
    paidMinor: number,
    id: string,
  ) => {
    const line = spending.get(reasonKey) ?? {
      reasonKey,
      requestedMinor: 0,
      paidMinor: 0,
      ids: [],
    };
    line.requestedMinor += requestedMinor;
    line.paidMinor += paidMinor;
    line.ids.push(id);
    spending.set(reasonKey, line);
  };
  // The month before the credit engine's latest review: the one just closed.
  const since = addDays(
    makeIsoDate(
      `${String(month?.date ?? core.date).slice(0, MONTH_LENGTH)}-01`,
    ),
    -1,
  ).slice(0, MONTH_LENGTH);
  for (const id of core.finance.obligationsByHousehold.get(
    person.householdId,
  ) ?? []) {
    const receipt = core.finance.latestReceiptsByContract.get(id);
    if (receipt && String(receipt.date).slice(0, MONTH_LENGTH) >= since)
      addSpending(
        receipt.kind,
        receipt.requestedMinor,
        receipt.paidMinor,
        receipt.id,
      );
  }
  const plan = core.finance.livingPlans.get(person.householdId);
  if (plan?.lastAt && plan.lastAt.slice(0, MONTH_LENGTH) >= since)
    addSpending(
      EVERYDAY_LIVING_KIND,
      plan.lastRequestedMinor,
      plan.lastPaidMinor,
      `living:${person.householdId}:${plan.lastAt}`,
    );
  // Assets: the deposit at the bank, and a home the household owns.
  const housing = core.modules.has(HOUSING_MODULE_ID)
    ? coreAPI(core).moduleState(HOUSING_MODULE_ID)
    : undefined;
  const dwelling = housing
    ?.table("dwellings")
    .get(`dwelling:${person.householdId}`) as unknown as
    { id: string; tenure: string; valueMinor?: number } | undefined;
  const assets = [
    ...(deposit && deposit.balanceMinor > 0
      ? [
          {
            kind: "savings",
            id: deposit.id,
            valueMinor: deposit.balanceMinor,
          },
        ]
      : []),
    ...(dwelling?.tenure === "own" && dwelling.valueMinor !== undefined
      ? [{ kind: "home", id: dwelling.id, valueMinor: dwelling.valueMinor }]
      : []),
  ];
  // Debts: the household's open loans in the credit engine, and the opening
  // mortgages the housing engine keeps, each with what is still owed.
  const loans = store
    .table("loans")
    .query("byHousehold", [person.householdId]) as unknown as {
    id: string;
    open: boolean;
    kind: string;
    balanceMinor: number;
    pastDueMinor: number;
  }[];
  const mortgages = (housing?.table("mortgages").rows() ?? []) as unknown as {
    id: string;
    householdId: string;
    balanceMinor: number;
    monthsLeft: number;
    foreclosedAt?: string;
  }[];
  const debts = [
    ...loans
      .filter((loan) => loan.open && loan.balanceMinor > 0)
      .map((loan) => ({
        kind: loan.kind,
        id: loan.id,
        owedMinor: loan.balanceMinor,
        pastDueMinor: loan.pastDueMinor,
      })),
    ...mortgages
      .filter(
        (row) =>
          row.householdId === person.householdId &&
          row.monthsLeft > 0 &&
          !row.foreclosedAt,
      )
      .map((row) => ({
        kind: "mortgage",
        id: row.id,
        owedMinor: row.balanceMinor,
        pastDueMinor: 0,
      })),
  ];
  return {
    id: bankId,
    name: organization.name,
    cash,
    spending: [...spending.values()],
    assets,
    debts,
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
