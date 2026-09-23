import type { MoneyAmount } from "../simulation";

/**
 * An amount of money as a player reads it: "$35,410" or "$17.03".
 *
 * Several screens printed the record's own shape, "USD 0.00", which is how an
 * account ledger stores a figure and not how anybody says one. Whole dollars
 * drop the cents; any other currency keeps its code, since the game should not
 * guess at a symbol.
 */
export function displayMoney(amount: MoneyAmount): string {
  const value = amount.minorUnits / 100;
  const whole = amount.minorUnits % 100 === 0;
  const digits = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(Math.abs(value));
  const sign = value < 0 ? "-" : "";
  return amount.currency === "USD"
    ? `${sign}$${digits}`
    : `${sign}${amount.currency} ${digits}`;
}
