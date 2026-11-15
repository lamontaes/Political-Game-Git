/**
 * A payment as people name it, by the kind of loan behind it
 * (data/english/payment-words.json): "the loan", "the payday loan". Null
 * for a kind with no name, so a line that needs one is not chosen.
 */
import data from "../../data/english/payment-words.json" with { type: "json" };

const PAYMENTS = data.payments as Readonly<Record<string, string>>;

/** The payment on a loan of this kind, with its article. */
export function paymentSaid(loanKind: string | undefined): string | null {
  return (loanKind && PAYMENTS[loanKind]) || null;
}
