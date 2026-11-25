/**
 * A payment as people name it, by the kind of loan behind it
 * (data/english/payment-words.json): "the loan". Null
 * for a kind with no name, so a line that needs one is not chosen.
 */
import data from "../../data/english/payment-words.json" with { type: "json" };

const PAYMENTS = data.payments as Readonly<Record<string, string>>;

/** The payment on a loan of this kind, with its article. */
export function paymentSaid(loanKind: string | undefined): string | null {
  return (loanKind && PAYMENTS[loanKind]) || null;
}

const OWED = data.owed as Readonly<Record<string, string>>;

/**
 * What a household quarrel over a missed payment was about, by the loan's
 * kind ("the mortgage"); null for a kind with no name.
 */
export function owedSaid(loanKind: string | undefined): string | null {
  return (loanKind && OWED[loanKind]) || null;
}
