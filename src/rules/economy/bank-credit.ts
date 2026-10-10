import { ECONOMY_RULE_PARAMETERS } from "./parameters";

export interface BankCreditFacts {
  readonly liquid: number;
  readonly loans: number;
  readonly capital: number;
  readonly failed: boolean;
}

export interface BankDepositFact {
  readonly id: string;
  readonly deposits: number;
}

function capitalRatioFromFacts(bank: BankCreditFacts): number {
  const assets = bank.liquid + bank.loans;
  return assets > 0 ? bank.capital / assets : 0;
}

/** Select the open bank with the most deposits; ties use its recorded ID. */
export function largestDepositBankFromFacts(
  banks: readonly BankDepositFact[],
): string | null {
  // STOPGAP: economy.largest-bank-lender
  let best: BankDepositFact | null = null;
  for (const bank of banks) {
    if (
      best === null ||
      bank.deposits > best.deposits ||
      (bank.deposits === best.deposits && bank.id < best.id)
    ) {
      best = bank;
    }
  }
  return best?.id ?? null;
}

/** Whether an open bank honors a business's existing credit line. */
export function bankHonorsCreditLineFromFacts(
  bank: BankCreditFacts | null,
  lendingCapitalRatio: number,
): boolean {
  return (
    bank !== null &&
    !bank.failed &&
    capitalRatioFromFacts(bank) >= lendingCapitalRatio
  );
}

/** Whether the bank is open to a new line or an increase in current credit. */
export function bankExtendsNewCreditFromFacts(
  bank: BankCreditFacts | null,
  lendingCapitalRatio: number,
  economyTightness: number,
): boolean {
  // STOPGAP: economy.new-credit-tightness
  return (
    bank !== null &&
    !bank.failed &&
    capitalRatioFromFacts(bank) >= lendingCapitalRatio &&
    economyTightness <
      ECONOMY_RULE_PARAMETERS.maximumNewCreditEconomyTightness.value
  );
}
