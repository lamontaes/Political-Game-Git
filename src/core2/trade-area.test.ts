import { expect, it } from "vitest";
import { addTradeArea } from "./opening-outside-market";
import type { CoreInput } from "./types";

// A firm whose books call for more than its town's buyers and the sourced
// outside share supply is raised to its books by trade-area customers; a firm
// already met, or without outside buyers, is untouched.
const flow = (id: string, kind: string, payeeId: string, amountMinor: number) =>
  ({
    id,
    kind,
    payeeId,
    amountMinor,
    cadence: { kind: "days", every: 7 },
    source: { tag: "ESTIMATED", asOf: "2025-01-01", citation: "x" },
  }) as never;

it("raises the outside flow to the firm's books and no further", () => {
  const weeks = 52;
  const input = {
    finance: {
      businesses: [
        { organizationId: "a", annualDemandMinor: 100 * weeks },
        { organizationId: "b", annualDemandMinor: 10 * weeks },
      ],
      contracts: [
        {
          payeeId: "a",
          salesReceipt: true,
          amountMinor: 120,
          periodMonths: 12,
        },
      ],
    },
    residents: {
      flows: [
        flow("p:a", "purchase", "a", 20),
        flow("o:a", "outside-sales", "a", 30),
        flow("o:b", "outside-sales", "b", 30),
      ],
    },
  } as unknown as CoreInput;
  const out = addTradeArea(input, { weeksPerYear: weeks } as never);
  const amount = (id: string) =>
    out.residents!.flows.find((f) => f.id === id)!.amountMinor;
  // a: books 5200, town buys 20*52 + 120 = 1160, outside 30*52 = 1560; gap 2480 = 47.69 a week.
  expect(amount("o:a")).toBe(30 + Math.round((5200 - 1160 - 1560) / weeks));
  expect(amount("o:b")).toBe(30);
});
