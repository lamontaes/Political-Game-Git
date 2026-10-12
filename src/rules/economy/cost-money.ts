/** Supporting retained exact money validation, not a new price or account rule. */
import type { MoneyAmount, CurrencyCode } from "../../simulation/types";
const CURRENCY_CODE = /^[A-Z]{3}$/;
export function makeCurrencyCode(value: string): CurrencyCode {
  if (!CURRENCY_CODE.test(value)) {
    throw new Error(`Currency code must be three uppercase letters: ${value}`);
  }
  return value as CurrencyCode;
}
export function money(minorUnits: number, currency: string): MoneyAmount {
  const amount = { minorUnits, currency: makeCurrencyCode(currency) };
  validateMoney(amount, "Money amount");
  return amount;
}
function validateMoney(
  amount: MoneyAmount,
  label: string,
  positive = false,
): void {
  makeCurrencyCode(amount.currency);
  if (
    !Number.isSafeInteger(amount.minorUnits) ||
    amount.minorUnits < 0 ||
    (positive && amount.minorUnits === 0)
  ) {
    throw new Error(
      `${label} must use non-negative safe integer minor units${positive ? " greater than zero" : ""}.`,
    );
  }
}
