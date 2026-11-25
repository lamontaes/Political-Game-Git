import { expect, it } from "vitest";
import type { CoreState } from "../core2/types";
import { quarrelFacts } from "./quarrel-facts";

// Edge case by hand: the two records a quarrel over money leaves (the credit
// engine's missed payment and the quarrel that cites it), read as the
// apology scene reads them. A played world rarely stages one (none in 150
// days at three drawn places, Nov 19), so the reader is checked here.
const core = (loanKind: string) =>
  ({
    durableLog: new Map<string, unknown>([
      [
        "event:credit.payment-missed:loan:1:2025-04-01",
        {
          id: "event:credit.payment-missed:loan:1:2025-04-01",
          kind: "credit.payment-missed",
          facts: { loanId: "loan:1", loanKind },
        },
      ],
      [
        "family.quarrel:a:b:2025-04-01",
        {
          id: "family.quarrel:a:b:2025-04-01",
          kind: "family.quarrel",
          facts: {
            about: "money",
            owes: "a",
            missedId: "event:credit.payment-missed:loan:1:2025-04-01",
          },
        },
      ],
    ]),
  }) as unknown as CoreState;

it("a quarrel over a missed payment names the payment by its loan's kind, citing both records", () => {
  expect(
    quarrelFacts(core("mortgage"), "family.quarrel:a:b:2025-04-01"),
  ).toEqual({
    payment: {
      text: "the mortgage",
      sourceRecordIds: [
        "family.quarrel:a:b:2025-04-01",
        "event:credit.payment-missed:loan:1:2025-04-01",
      ],
    },
  });
  expect(
    quarrelFacts(core("unheard-of"), "family.quarrel:a:b:2025-04-01"),
  ).toEqual({});
  expect(
    quarrelFacts(
      core("mortgage"),
      "event:credit.payment-missed:loan:1:2025-04-01",
    ),
  ).toEqual({});
});
