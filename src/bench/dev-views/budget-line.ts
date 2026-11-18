import { coreAPI } from "../../core2/state";
import { budgetInForce } from "../../core2/budgets-treasury";
import { governmentOfJurisdiction } from "../../core2/modules/budgets";
import {
  billJurisdiction,
  type BillRow,
} from "../../core2/modules/legislature";
import type { DevView } from "../dev-views";

/**
 * Dev mode's Budget bill: the spending lines of the budget in force for the government a lawmaking
 * body belongs to, so the panel can pick one and introduce a bill that changes it (dev mode's
 * `introduce` takes `line` and `deltaMinor`). It reads the same government and budget `introduce`
 * reads, so a line listed here is a line the bill can change (Laws and effects, item 8c: every
 * budget line can be fired from the panel).
 */
const view: DevView = {
  name: "budget-line",
  client: "budget-line.mjs",
  labels: {
    title: "Budget bill",
    body: "Body",
    line: "Budget line",
    change: "Change a year, in dollars",
    introduce: "Introduce budget bill",
    now: "In force",
    noLines: "This body's government has no adopted budget",
  },
  routes: {
    "GET budget-lines": ({ mode, q }) => {
      const api = coreAPI(mode.core);
      const gov = governmentOfJurisdiction(
        api,
        billJurisdiction(api, { bodyOfficeId: q("bodyOfficeId") } as BillRow),
      );
      const budget = gov ? budgetInForce(api, gov.id) : undefined;
      return {
        government: gov?.id ?? null,
        lines: Object.entries(budget?.spendingMinor ?? {})
          .map(([line, spendingMinor]) => ({ line, spendingMinor }))
          .sort((a, b) => a.line.localeCompare(b.line)),
      };
    },
  },
};

export default view;
