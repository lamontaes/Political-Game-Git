import { expect, it } from "vitest";
import { paymentSaid } from "./payment-words";

// The credit engine's loan kinds (LoanRow.kind in src/core2/modules/credit.ts):
// every one is named, so a missed payment on any of them can be said.
const LOAN_KINDS = [
  "personal",
  "startup",
  "mortgage",
  "small-dollar",
  "medical",
];

it("names the payment on every kind of loan the credit engine keeps", () => {
  for (const kind of LOAN_KINDS)
    expect(paymentSaid(kind), kind).toMatch(/^the /);
  expect(paymentSaid("no-such-kind")).toBeNull();
  expect(paymentSaid(undefined)).toBeNull();
});
