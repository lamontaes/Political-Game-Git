// STOPGAP(RULES3-GOV-004): see docs/plans/rules3/governing-stopgaps.json.
// KEEP math from governing/public-program.ts:1012-1031; writer remains legacy.
import type { MoneyAmount } from "../../simulation/types";
import { dollars } from "./program-money";
/** The original precedence: lapse overrides the payment reason; cash is next. */
export function installmentRefusal(
  today: string,
  availableThrough: string,
  paymentAmount: MoneyAmount,
  cash: { readonly liquidBalance: MoneyAmount } | null,
  paymentReason: string | null,
): string | null {
  let reason: string | null = paymentReason;
  if (today > availableThrough)
    reason = "The appropriation lapsed before this payment fell due.";
  else if (
    !reason &&
    (!cash || cash.liquidBalance.minorUnits < paymentAmount.minorUnits)
  )
    reason = `The account held ${cash ? dollars(cash.liquidBalance) : "no recorded cash"}, short of the ${dollars(paymentAmount)} due. An appropriation is not cash.`;
  return reason;
}
