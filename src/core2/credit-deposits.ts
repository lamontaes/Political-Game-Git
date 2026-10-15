/**
 * Deposits at the town bank. Each month each counted group keeps about a
 * month of its income as cash to spend; what it doesn't need moves into its
 * deposits at the town bank, and they draw on their deposits when their cash
 * runs short. The bank pays them interest at a share of the policy rate. It
 * keeps a reserve of cash against its deposits and its own lending, and puts
 * the rest into securities outside the town at the ten-year Treasury yield,
 * selling them when it needs cash. Every movement goes through the ledger.
 */
import type { ModuleTable } from "./module-state";
import { stopgap } from "./stopgaps";
import { transferCash } from "./world-transfer";
import { residentsRuntime } from "./modules/residents";
import { fundBalance } from "./counted-money";
import type { CoreAPI, CoreState, Source } from "./types";

export interface DepositRow {
  id: string;
  /** The counted group's fund whose deposit this is. */
  accountId: string;
  balanceMinor: number;
  isDeposit: true;
}

export interface SecuritiesRow {
  id: string;
  balanceMinor: number;
}

const SECURITIES = "securities:bank";

function rates(api: CoreAPI): { policy: number; treasury: number } {
  const c = api.state as CoreState,
    hundred = api.parameter("macroHundred");
  if (!c.modules.has("macro")) return { policy: 0, treasury: 0 };
  const state = api.moduleState("macro").table("state").get("macro:state") as
    { policyRatePct?: number; latestMonth?: string } | undefined;
  const month = state?.latestMonth
    ? (api
        .moduleState("macro")
        .table("months")
        .get(`macro-month:${state.latestMonth}`) as
        { treasury10Pct?: number } | undefined)
    : undefined;
  return {
    policy: (state?.policyRatePct ?? 0) / hundred,
    treasury: (month?.treasury10Pct ?? 0) / hundred,
  };
}

/** What the bank's depositors hold, and its securities. */
export function bankBalances(tables: {
  deposits: ModuleTable;
  securities: ModuleTable;
}): { depositsMinor: number; securitiesMinor: number } {
  let deposits = 0;
  for (const row of tables.deposits.query("all", [
    true,
  ]) as unknown as DepositRow[])
    deposits += row.balanceMinor;
  const held = tables.securities.get(SECURITIES) as unknown as
    SecuritiesRow | undefined;
  return { depositsMinor: deposits, securitiesMinor: held?.balanceMinor ?? 0 };
}

/** A month at the bank: interest, the residents' deposits and withdrawals, then the bank's reserve against its securities. */
export function reviewDeposits(
  api: CoreAPI,
  tables: { deposits: ModuleTable; securities: ModuleTable },
  bank: { organizationId: string; openingEquityMinor: number },
  source: Source,
): void {
  const c = api.state as CoreState,
    p = (key: string) => api.parameter(key);
  const rt = residentsRuntime(c);
  if (!rt) return;
  // Only counted groups hold deposits; full households keep their own cash.
  stopgap("SG-WORLD-credit-full-household-deposits");
  const months = p("macroMonthsPerYear");
  const { policy, treasury } = rates(api);
  const outside = (placeId: string) =>
    [...c.organizations.values()].find(
      (row) => row.placeId === placeId && row.outsideFlow !== undefined,
    )?.id;
  const bankPlace = c.organizations.get(bank.organizationId)?.placeId ?? "";
  const market = outside(bankPlace);
  const securities = () =>
    (tables.securities.get(SECURITIES) as unknown as SecuritiesRow | undefined)
      ?.balanceMinor ?? 0;
  const setSecurities = (balanceMinor: number) =>
    tables.securities.put({ id: SECURITIES, balanceMinor });
  // Interest the securities earned last month, paid from outside the town.
  if (market && securities() > 0)
    transferCash(
      api,
      `securities-interest:${c.date}`,
      market,
      bank.organizationId,
      Math.round((securities() * treasury) / months),
      source,
    );
  const depositRate = Math.max(
    p("creditDepositRateFloor"),
    p("creditDepositRatePassThrough") * policy,
  );
  // Each counted group's money is its own (one model, two tiers): each group
  // keeps about a month of its own income in its fund and holds the rest on
  // deposit, drawing on it when its cash runs short.
  const bankAccount = c.cashJournal.residualAccountByOwner.get(
    bank.organizationId,
  );
  if (!bankAccount) return;
  const move = (id: string, from: string, to: string, amountMinor: number) =>
    amountMinor > 0
      ? api.accounts().transfer({
          id,
          from,
          to,
          amountMinor: Math.round(amountMinor),
          partial: true,
          reasonKey: "credit.deposit",
          source,
        }).paidMinor
      : 0;
  for (const [group, fundAccount] of [...rt.funds].sort(
    (x, y) => x[0] - y[0],
  )) {
    const groupId = rt.store.groups[group]?.id;
    if (!groupId) continue;
    const id = `deposit:${groupId}`;
    const deposit = (tables.deposits.get(id) as unknown as
      DepositRow | undefined) ?? {
      id,
      accountId: fundAccount,
      balanceMinor: 0,
      isDeposit: true as const,
    };
    let balance = deposit.balanceMinor;
    // Interest on what the group held last month.
    if (balance > 0)
      balance += move(
        `deposit-interest:${groupId}:${c.date}`,
        bankAccount,
        fundAccount,
        (balance * depositRate) / months,
      );
    // Cash to spend: about a month of the group's recent income.
    const history = rt.incomeHistory.get(`g:${group}`) ?? [];
    const income = history.length
      ? history.reduce((n, v) => n + v, 0) / history.length
      : 0;
    const keep = income * p("creditResidentsCashMonths");
    const cash = fundBalance(api, rt, group);
    if (income > 0 && cash > keep) {
      balance += move(
        `deposit:${groupId}:${c.date}`,
        fundAccount,
        bankAccount,
        Math.floor(cash - keep),
      );
    } else if (cash < keep && balance > 0) {
      // Drawing on deposits: the bank sells securities first if its cash won't cover it.
      const want = Math.min(balance, Math.ceil(keep - cash));
      const bankCash = c.organizations.get(bank.organizationId)!.liquidMinor;
      if (bankCash < want && market && securities() > 0) {
        const sold = transferCash(
          api,
          `securities-sale:${groupId}:${c.date}`,
          market,
          bank.organizationId,
          Math.min(securities(), want - bankCash),
          source,
        );
        setSecurities(securities() - sold);
      }
      balance -= move(
        `withdrawal:${groupId}:${c.date}`,
        bankAccount,
        fundAccount,
        want,
      );
    }
    tables.deposits.put({ ...deposit, balanceMinor: balance });
  }
  if (!market) return;
  // The bank's own cash: a reserve against deposits plus what it lends from; the rest in securities, or sold back.
  const { depositsMinor } = bankBalances(tables);
  const target =
    depositsMinor * p("creditBankReserveShare") + bank.openingEquityMinor;
  const cash = c.organizations.get(bank.organizationId)!.liquidMinor;
  if (cash > target) {
    const bought = transferCash(
      api,
      `securities-buy:${c.date}`,
      bank.organizationId,
      market,
      cash - target,
      source,
    );
    setSecurities(securities() + bought);
  } else if (cash < target && securities() > 0) {
    const sold = transferCash(
      api,
      `securities-sale:${c.date}`,
      market,
      bank.organizationId,
      Math.min(securities(), target - cash),
      source,
    );
    setSecurities(securities() - sold);
  }
}
