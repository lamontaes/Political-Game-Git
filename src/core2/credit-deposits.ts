/** Savings decisions in the existing bank review; all cash uses accounts/postJournal. */
import { bankDeposit, moveBankDeposit } from "./accounts";
import { fundBalance, fundOf } from "./counted-money";
import { residentsRuntime } from "./modules/residents";
import { daysBetween, makeIsoDate } from "./kernel/dates";
import type { BusinessBooksState } from "./finance-types";
import type { CoreAPI, CoreState, Source } from "./types";

interface CashTarget {
  holderId: string;
  kind: "household" | "business";
  tier: "full" | "counted" | "business";
  cashMinor: number;
  reserveMinor: number;
  accounts: { id: string; cashMinor: number }[];
}

/** The same cost buffer for a household in either population tier. */
export function savingsTarget(
  cashMinor: number,
  monthlyCosts: number,
  months: number,
): number {
  return Math.trunc(cashMinor - Math.ceil(Math.max(0, monthlyCosts) * months));
}

/**
 * A business's costs in a month as it actually runs them. Its books name the
 * costs at the size the book was drawn (payroll and other costs a year), but
 * a firm's supplies follow what it takes in (residents.ts accrues the booked
 * cost share of each sale), so in a town opened at its Census size, where
 * sales run at the town's weight, the supplies run at that weight too. The
 * other costs are therefore the larger of the booked ones and the booked cost
 * share of the monthly sales received since the game began.
 */
export function businessMonthlyCosts(
  api: CoreAPI,
  book: Pick<
    BusinessBooksState,
    | "annualPayrollMinor"
    | "annualOtherCostsMinor"
    | "annualDemandMinor"
    | "receivedMinor"
  >,
): number {
  const core = api.state as CoreState;
  const months = api.parameter("macroMonthsPerYear");
  const elapsedMonths =
    daysBetween(makeIsoDate(core.startedAt), makeIsoDate(core.date)) /
    (api.parameter("jobsDaysPerYear") / months);
  const costShare =
    book.annualDemandMinor > 0
      ? book.annualOtherCostsMinor / book.annualDemandMinor
      : 0;
  // Less than a month in, there is no run rate to read: the books stand.
  const runOtherCosts =
    elapsedMonths >= 1 ? (book.receivedMinor / elapsedMonths) * costShare : 0;
  return (
    book.annualPayrollMinor / months +
    Math.max(book.annualOtherCostsMinor / months, runOtherCosts)
  );
}

export function reviewBankDeposits(api: CoreAPI, bankId: string): void {
  const core = api.state as CoreState;
  const bank = core.organizations.get(bankId);
  if (!bank) return;
  // stopgapId: SG-WORLD-deposit-wallet-buffer
  api.stopgap("SG-WORLD-deposit-wallet-buffer");
  const months = api.parameter("creditDepositWalletMonths");
  const daysPerMonth =
    api.parameter("jobsDaysPerYear") / api.parameter("macroMonthsPerYear");
  const accounts = api.accounts();
  const targets: CashTarget[] = [];
  for (const house of core.households.values()) {
    if (house.placeId !== bank.placeId) continue;
    const members = house.memberIds.flatMap((id) => {
      const person = core.people.get(id);
      return person?.alive && person.placeId === bank.placeId ? [person] : [];
    });
    if (!members.length) continue;
    const funds = members.map((person) => {
      const id = accounts.main(person.id);
      return { id, cashMinor: accounts.balance(id) };
    });
    targets.push({
      holderId: house.id,
      kind: "household",
      tier: "full",
      cashMinor: funds.reduce((sum, fund) => sum + fund.cashMinor, 0),
      reserveMinor: Math.ceil(
        members.reduce((sum, person) => sum + person.livingCostDailyMinor, 0) *
          daysPerMonth *
          months,
      ),
      accounts: funds,
    });
  }
  const rt = residentsRuntime(core);
  if (rt?.funded) {
    // Snapshot the groups before any payment, so later households do not receive
    // smaller shares merely because earlier households deposited first.
    const groups = new Map<
      number,
      { people: number; cash: number; account: string }
    >();
    const homes = [...rt.store.liveHouseholds()].filter(
      (h) => h.placeId === bank.placeId && !core.households.has(h.id),
    );
    for (const h of homes) {
      const group = groups.get(h.group) ?? {
        people: 0,
        cash: fundBalance(api, rt, h.group),
        account: fundOf(api, rt, h.group),
      };
      // A record stands for as many households as its weight says.
      group.people += rt.store.weightedCount(h);
      groups.set(h.group, group);
    }
    for (const h of homes) {
      const group = groups.get(h.group)!;
      const members = rt.store.countedMembers(h);
      if (!members.length || !group.people) continue;
      const weight = rt.store.weightOf(h);
      const cashMinor = Math.floor(
        (group.cash * members.length * weight) / group.people,
      );
      // The cushion is each real household's, times the households the record stands for.
      const dailyCosts =
        members.reduce((sum, member) => sum + rt.store.living[member]!, 0) *
        weight;
      targets.push({
        holderId: h.id,
        kind: "household",
        tier: "counted",
        cashMinor,
        reserveMinor: Math.ceil(dailyCosts * daysPerMonth * months),
        accounts: [{ id: group.account, cashMinor }],
      });
    }
  }
  for (const [id, book] of core.finance.businesses) {
    if (
      book.closedAt ||
      id === bankId ||
      core.organizations.get(id)?.placeId !== bank.placeId
    )
      continue;
    const account = accounts.main(id);
    const cashMinor = accounts.balance(account);
    targets.push({
      holderId: id,
      kind: "business",
      tier: "business",
      cashMinor,
      reserveMinor: Math.ceil(businessMonthlyCosts(api, book) * months),
      accounts: [{ id: account, cashMinor }],
    });
  }
  const source: Source = {
    tag: "ESTIMATED",
    asOf: core.date,
    citation:
      "JPMorgan Chase Institute, Cash is King: Flows, Balances, and Buffer Days (2016); current household costs and business books.",
    estimatedFrom:
      "Savings above a cost buffer; withdrawals replenish that buffer. Deposits remain claims belonging to the recorded household or business.",
  };
  // Inflows precede withdrawals; an unfunded withdrawal leaves the unpaid claim
  // on the bank, never a fabricated cash payment or a forgiven liability.
  for (const direction of ["deposit", "withdraw"] as const)
    for (const target of targets) {
      const gap = savingsTarget(target.cashMinor, target.reserveMinor, 1);
      if (direction === "deposit" ? gap <= 0 : gap >= 0) continue;
      const held =
        bankDeposit(core, bankId, target.holderId)?.balanceMinor ?? 0;
      let left = direction === "deposit" ? gap : Math.min(-gap, held);
      if (!left) continue;
      for (const [index, fund] of target.accounts.entries()) {
        if (!left) break;
        const requested =
          direction === "deposit"
            ? Math.min(left, Math.max(0, fund.cashMinor))
            : left;
        if (!requested) continue;
        const receipt = moveBankDeposit(core, api, {
          id: `bank-${direction}:${bankId}:${core.date}:${target.holderId}:${index}`,
          bankId,
          holderId: target.holderId,
          customerAccountId: fund.id,
          direction,
          amountMinor: requested,
          source,
        });
        left -= receipt.paidMinor;
      }
    }
}
