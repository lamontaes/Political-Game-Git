/** Pure, finite procurement plans from already received sales; never a cash writer. */
import { makeIsoDate } from "../simulation/dates";
import { P } from "./parameters";
import type { SalesReceiptBudgetAllocation } from "./finance-types";

export interface SalesReceiptBudgetRoute {
  id: string;
  payerId: string;
  payeeId: string;
  amountMinor: number;
  periodMonths: number;
}

export function projectSalesReceiptBudgetPool(
  input: {
    payerId: string;
    date: string;
    previousReceivedMinor: number;
    receivedThroughMinor: number;
    anchorAnnualDemandMinor: number;
    routes: readonly SalesReceiptBudgetRoute[];
  },
  parameters: Readonly<Record<string, number>> = P,
): SalesReceiptBudgetAllocation {
  const p = (key: string) => {
    const value = parameters[key];
    if (value === undefined || !Number.isFinite(value))
      throw new Error(`Missing finite sales-budget parameter: ${key}`);
    return value;
  };
  const zero = p("zero"),
    one = p("one"),
    monthsPerYear = p("monthsPerYear");
  if (!(monthsPerYear > zero))
    throw new Error("Invalid annual calendar basis.");
  const date = makeIsoDate(input.date);
  if (!input.payerId) throw new Error("Actual sales require a recorded payer.");
  for (const [field, value] of Object.entries({
    previousReceivedMinor: input.previousReceivedMinor,
    receivedThroughMinor: input.receivedThroughMinor,
  }))
    if (!Number.isSafeInteger(value) || value < zero)
      throw new Error(`Invalid integer sales cutoff: ${field}`);
  if (input.receivedThroughMinor < input.previousReceivedMinor)
    throw new Error(
      "Actual cumulative sales cannot move behind the prior cutoff.",
    );
  if (
    !Number.isFinite(input.anchorAnnualDemandMinor) ||
    input.anchorAnnualDemandMinor <= zero
  )
    throw new Error(
      "A sales-budget ratio requires a positive recorded demand anchor.",
    );
  const ids = new Set<string>();
  const routes = input.routes.map((route) => {
    if (
      !route.id ||
      ids.has(route.id) ||
      route.payerId !== input.payerId ||
      !route.payeeId ||
      route.payeeId === input.payerId
    )
      throw new Error(
        "Sales budgets require distinct named routes and non-self suppliers.",
      );
    ids.add(route.id);
    if (
      !Number.isSafeInteger(route.amountMinor) ||
      route.amountMinor < zero ||
      !Number.isSafeInteger(route.periodMonths) ||
      route.periodMonths <= zero
    )
      throw new Error(
        "Invalid recorded sales-budget amount or calendar period.",
      );
    // The standing amount is already derived from registered IRS ratios and
    // supplier allocation. It supplies a cost/revenue ratio, never an invoice.
    const ratio =
      (route.amountMinor * monthsPerYear) /
      (route.periodMonths * input.anchorAnnualDemandMinor);
    if (!Number.isFinite(ratio) || ratio < zero || ratio > one)
      throw new Error(
        "A procurement route cannot consume more than the sales pool.",
      );
    return { ...route, ratio };
  });
  const routeCostShare = routes.reduce((sum, row) => sum + row.ratio, zero);
  if (!Number.isFinite(routeCostShare) || routeCostShare > one)
    throw new Error(
      "Aggregate supplier ratios exceed the one finite sales pool.",
    );
  const receiptsMinor =
    input.receivedThroughMinor - input.previousReceivedMinor;
  const allocatedMinor = Math.floor(receiptsMinor * routeCostShare);
  if (!Number.isSafeInteger(allocatedMinor) || allocatedMinor > receiptsMinor)
    throw new Error("Sales-budget allocation exceeds actual received sales.");
  const allocations = routes.map((row) => {
    const exact = receiptsMinor * row.ratio;
    const requestedMinor = Math.floor(exact);
    return { id: row.id, requestedMinor, remainder: exact - requestedMinor };
  });
  let remainder =
    allocatedMinor -
    allocations.reduce((sum, row) => sum + row.requestedMinor, zero);
  for (const row of [...allocations].sort(
    (left, right) =>
      right.remainder - left.remainder || left.id.localeCompare(right.id),
  )) {
    if (remainder <= zero) break;
    row.requestedMinor += one;
    remainder -= one;
  }
  if (
    remainder !== zero ||
    allocations.reduce((sum, row) => sum + row.requestedMinor, zero) !==
      allocatedMinor
  )
    throw new Error(
      "Sales-budget rounding failed to preserve its finite pool.",
    );
  return {
    payerId: input.payerId,
    date,
    previousReceivedMinor: input.previousReceivedMinor,
    receivedThroughMinor: input.receivedThroughMinor,
    receiptsMinor,
    routeCostShare,
    allocatedMinor,
    allocatedByContract: new Map(
      allocations.map((row) => [row.id, row.requestedMinor]),
    ),
  };
}
