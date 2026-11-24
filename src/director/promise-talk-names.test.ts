import { expect, it } from "vitest";
import words from "../../data/english/payment-words.json";
import type { CoreState } from "../core2/types";
import { paymentNamed } from "./promise-talk";

// A check of the guard, not a played event: a pay-on-time promise broken by a
// missed payment on a kind of loan the words file does not name is never said
// (no fallback name, no empty slot). The missed-payment records here are
// hand-made; the named kinds are proved in play by promises.test.ts.
const CREDIT_KINDS = [
  "personal",
  "startup",
  "mortgage",
  "small-dollar",
  "medical",
];

function coreWith(loanKind: string): Readonly<CoreState> {
  const missed = { kind: "credit.payment-missed", facts: { loanKind } };
  return { durableLog: new Map([["missed", missed]]) } as unknown as CoreState;
}

const broken = (kind: string) => ({
  kind,
  sourceId: "reply",
  outcome: "broken",
  endedBy: "missed",
});

it("never says a pay-on-time promise on a loan kind it has no name for", () => {
  const named = Object.keys(words.payments);
  for (const kind of CREDIT_KINDS)
    expect(paymentNamed(coreWith(kind), broken("pay-on-time")), kind).toBe(
      named.includes(kind),
    );
  expect(paymentNamed(coreWith("mortgage"), broken("vote")), "vote").toBe(true);
});
