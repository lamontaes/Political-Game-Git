import { expect, it } from "vitest";
import { paymentSaid } from "./payment-words";

// Only kinds a played borrower was seen to miss and be held to a promise are
// named (src/director/promises.test.ts); the credit engine's other kinds
// (mortgage, medical, startup) have no name, so their talk never fires
// (src/director/promise-talk-names.test.ts).
it("names the payment on the loan kinds a played borrower was seen to miss", () => {
  for (const kind of ["personal", "small-dollar"])
    expect(paymentSaid(kind), kind).toMatch(/^the /);
  for (const kind of ["mortgage", "medical", "startup", "no-such-kind"])
    expect(paymentSaid(kind), kind).toBeNull();
  expect(paymentSaid(undefined)).toBeNull();
});
