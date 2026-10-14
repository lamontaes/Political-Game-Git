/**
 * What the federal budget in force adds to the nation's output. The budget
 * engine (OPUS-GOV) adopts each fiscal year's federal budget from its base
 * (the Treasury's fiscal 2025 outlays) plus what Congress has legislated; the
 * purchase lines' difference from that base, as a share of output, is what
 * the national step hears. Transfers to people above their base count too,
 * weighted by CBO's transfer multiplier against its purchases multiplier
 * (CBO's ARRA estimates, 2015); taxes add nothing yet, since budgets carry no
 * tax changes. The state's and its local governments' purchases and
 * transfers to people above their base move the state's regions the same
 * way, at an own-financed multiplier.
 */
import lines from "./data/macro/federal-lines.json" with { type: "json" };
import {
  BUDGETS_MODULE_ID,
  baseBudget,
  budgetsOf,
  governments,
} from "./modules/budgets";
import { lawChain } from "./modules/laws";
import { stopgap } from "./stopgaps";
import type { CoreAPI, CoreState } from "./types";

const PURCHASES: readonly string[] = lines.purchases;
const STATE_PURCHASES: readonly string[] = lines.statePurchases;
const TRANSFERS: readonly string[] = lines.transfersToPeople;
const STATE_TRANSFERS: readonly string[] = lines.stateTransfersToPeople;

/** A dollar of transfers to people moves output by this much of a dollar of purchases. */
function transferWeight(api: CoreAPI): number {
  return (
    api.parameter("macroTransfersMultiplier") /
    api.parameter("macroPurchasesMultiplier")
  );
}

/** Purchases above their base plus transfers to people above theirs at the transfer weight. */
function impulse(
  api: CoreAPI,
  budget: { now: Budget; base: Readonly<Record<string, number>> },
  purchases: readonly string[],
  transfers: readonly string[],
): number {
  return (
    above(budget, purchases) + transferWeight(api) * above(budget, transfers)
  );
}

type Budget = ReturnType<typeof budgetsOf>[number];
type Government = ReturnType<typeof governments>[number];

/** The government's budget in force today, and its base. */
function inForce(
  api: CoreAPI,
  gov: Government,
): { now: Budget; base: Readonly<Record<string, number>> } | undefined {
  const date = api.state.date;
  let now: Budget | undefined;
  for (const budget of budgetsOf(api, gov.id))
    if (budget.startsOn <= date && (!now || budget.startsOn > now.startsOn))
      now = budget;
  return now
    ? { now, base: baseBudget(api, gov, now.fiscalYear).spendingMinor }
    : undefined;
}

function above(
  budget: { now: Budget; base: Readonly<Record<string, number>> },
  lines: readonly string[],
): number {
  let sum = 0;
  for (const line of lines)
    sum += (budget.now.spendingMinor[line] ?? 0) - (budget.base[line] ?? 0);
  return sum;
}

/** The town's state government's purchases (and transfers to people, weighted) above their base, and its county's and city's, in minor units a year. */
export function statePurchasesAboveMinor(api: CoreAPI):
  | {
      usps: string;
      stateMinor: number;
      localMinor: number;
      townPlaceId: string;
    }
  | undefined {
  if (!(api.state as CoreState).modules.has(BUDGETS_MODULE_ID))
    return undefined;
  let state = 0,
    local = 0;
  for (const gov of governments(api)) {
    if (gov.level === "federal") continue;
    const budget = inForce(api, gov);
    if (!budget) continue;
    const amount = impulse(api, budget, STATE_PURCHASES, STATE_TRANSFERS);
    if (gov.level === "state") state += amount;
    else local += amount;
  }
  const chain = lawChain(api);
  return {
    usps: chain.stateKey.replace(/^US-/, ""),
    stateMinor: state,
    localMinor: local,
    townPlaceId: chain.townPlaceId,
  };
}

/** Federal purchases in the budget in force above their base, with transfers to people at their weight, as a percent of output. */
export function federalPurchasesPct(api: CoreAPI): number {
  if (!(api.state as CoreState).modules.has(BUDGETS_MODULE_ID)) return 0;
  const federal = governments(api).find((g) => g.level === "federal");
  if (!federal) return 0;
  const budget = inForce(api, federal);
  if (!budget) return 0;
  let total = 0;
  for (const amount of Object.values(budget.base)) total += amount;
  const purchases = impulse(api, budget, PURCHASES, TRANSFERS);
  // Taxes legislated above or below their base move nothing yet; see the stopgap.
  stopgap("SG-WORLD-macro-public-transfers");
  return total > 0
    ? (purchases / total) *
        api.parameter("macroFederalOutlaysShareOfOutput") *
        api.parameter("macroHundred")
    : 0;
}
