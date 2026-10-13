/**
 * What the federal budget in force adds to the nation's output. The budget
 * engine (OPUS-GOV) adopts each fiscal year's federal budget from its base
 * (the Treasury's fiscal 2025 outlays) plus what Congress has legislated; the
 * purchase lines' difference from that base, as a share of output, is what
 * the national step hears. Transfers and taxes add nothing yet: no matched
 * U.S. multiplier for them was found.
 */
import lines from "./data/macro/federal-lines.json" with { type: "json" };
import {
  BUDGETS_MODULE_ID,
  baseBudget,
  budgetsOf,
  governments,
} from "./modules/budgets";
import { stopgap } from "./stopgaps";
import type { CoreAPI, CoreState } from "./types";

const PURCHASES: readonly string[] = lines.purchases;

/** Federal purchases in the budget in force above their base, as a percent of output. */
export function federalPurchasesPct(api: CoreAPI): number {
  if (!(api.state as CoreState).modules.has(BUDGETS_MODULE_ID)) return 0;
  const federal = governments(api).find((g) => g.level === "federal");
  if (!federal) return 0;
  const date = api.state.date;
  let inForce: ReturnType<typeof budgetsOf>[number] | undefined;
  for (const budget of budgetsOf(api, federal.id))
    if (
      budget.startsOn <= date &&
      (!inForce || budget.startsOn > inForce.startsOn)
    )
      inForce = budget;
  if (!inForce) return 0;
  const base = baseBudget(api, federal, inForce.fiscalYear).spendingMinor;
  let above = 0,
    total = 0;
  for (const amount of Object.values(base)) total += amount;
  for (const line of PURCHASES)
    above += (inForce.spendingMinor[line] ?? 0) - (base[line] ?? 0);
  stopgap("SG-WORLD-macro-public-transfers");
  return total > 0
    ? (above / total) *
        api.parameter("macroFederalOutlaysShareOfOutput") *
        api.parameter("macroHundred")
    : 0;
}
