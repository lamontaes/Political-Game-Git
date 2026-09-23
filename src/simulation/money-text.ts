/**
 * Money as an American reader writes it: "$35,410", "$17.03", "-$2.50".
 *
 * One formatter for every sentence a player reads, so a screen never says
 * "USD 0.00" in one line and "$0.00" in the next. Whole dollars drop the
 * cents, as a person says them. A currency other than the dollar keeps its
 * code, because a "$" would claim it was dollars.
 */
export function moneyText(amount: {
  readonly minorUnits: number;
  readonly currency: string;
}): string {
  const whole = amount.minorUnits % 100 === 0;
  const digits = (Math.abs(amount.minorUnits) / 100).toLocaleString("en-US", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  });
  const sign = amount.minorUnits < 0 ? "-" : "";
  return amount.currency === "USD"
    ? `${sign}$${digits}`
    : `${sign}${amount.currency} ${digits}`;
}
