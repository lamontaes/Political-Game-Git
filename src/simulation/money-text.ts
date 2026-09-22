/**
 * Money as an American reader writes it: "$1,234.50", "-$20.00".
 *
 * One formatter for every sentence a player reads, so a screen never says
 * "USD 0.00" in one line and "$0.00" in the next. A currency other than the
 * dollar keeps its code, because a "$" would claim it was dollars.
 */
export function moneyText(amount: {
  readonly minorUnits: number;
  readonly currency: string;
}): string {
  const sign = amount.minorUnits < 0 ? "-" : "";
  const value = (Math.abs(amount.minorUnits) / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return amount.currency === "USD"
    ? `${sign}$${value}`
    : `${amount.currency} ${sign}${value}`;
}
