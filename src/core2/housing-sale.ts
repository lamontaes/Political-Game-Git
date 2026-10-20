/**
 * Selling an owned home when its owners leave town (the replacement for
 * SG-P15-moves-owners-stay). An outside buyer pays the home's value from the
 * dwellings table; the lender is paid off from the price first, any surplus
 * goes to the household's first member, and a price under the payoff leaves
 * the lender to carry the rest as a loss, as at a foreclosure sale. The
 * mortgage ends, the home is no longer the household's, and the sale is a
 * record the housing ledger keeps.
 */
import { transferCash } from "./world-transfer";
import type { ModuleRow } from "./module-data";
import type { MortgageRow } from "./housing-foreclosure";
import type { CoreAPI, CoreState } from "./types";

const HOUSING = "housing";
const table = (api: CoreAPI, name: string) =>
  api.moduleState(HOUSING).table(name);

export interface HomeSale {
  readonly id: string;
  readonly householdId: string;
  readonly date: string;
  readonly mortgageIds: readonly string[];
  readonly priceMinor: number;
  readonly owedMinor: number;
  readonly toLenderMinor: number;
  readonly surplusMinor: number;
  readonly lossMinor: number;
  readonly reasonKey: string;
  /** The dead owner whose estate the sale belongs to, and the death that opened it. */
  readonly decedentId?: string;
  readonly deathEventId?: string;
}

/** A household's home sale on a date, if it sold. */
export function homeSaleOf(
  api: CoreAPI,
  householdId: string,
): HomeSale | undefined {
  return (table(api, "sales").rows() as unknown as HomeSale[])
    .filter((row) => row.householdId === householdId)
    .sort((a, b) => a.date.localeCompare(b.date))
    .at(-1);
}

/**
 * Sells the household's home for what it is worth, paying off its mortgages.
 * Returns the sale, or undefined when the household owns no recorded home.
 */
export function sellHome(
  api: CoreAPI,
  householdId: string,
  reasonKey: string,
  estate?: { decedentId: string; deathEventId: string },
): HomeSale | undefined {
  if (!api.state.modules.has(HOUSING)) return undefined;
  const c = api.state as CoreState;
  const dwelling = table(api, "dwellings").get(`dwelling:${householdId}`) as
    { tenure?: string; kind?: string; valueMinor?: number } | undefined;
  if (dwelling?.tenure !== "own") return undefined;
  const household = c.households.get(householdId);
  if (!household) return undefined;
  const mortgages = (
    table(api, "mortgages").rows() as unknown as MortgageRow[]
  ).filter((row) => row.householdId === householdId && row.balanceMinor > 0);
  const price = Math.round(dwelling.valueMinor ?? 0);
  const owed = mortgages.reduce((sum, row) => sum + row.balanceMinor, 0);
  // The town's outside market stands for the buyer.
  const buyer = [...c.organizations.values()]
    .filter(
      (org) =>
        org.outsideFlow !== undefined && org.placeId === household.placeId,
    )
    .sort((a, b) => a.id.localeCompare(b.id))[0];
  if (!buyer || price <= 0) return undefined;
  const source = {
    tag: "ESTIMATED" as const,
    asOf: c.date,
    citation:
      "Housing engine: the home's value in the dwellings table, paid by the outside market.",
    estimatedFrom: `${householdId} sold its home (${reasonKey}).`,
  };
  const stamp = `${householdId}:${c.date}`;
  let toLender = 0;
  let remaining = price;
  for (const mortgage of mortgages) {
    const paid = transferCash(
      api,
      `home-sale:${stamp}:${mortgage.id}`,
      buyer.id,
      mortgage.holderId,
      Math.min(remaining, mortgage.balanceMinor),
      source,
    );
    toLender += paid;
    remaining -= paid;
  }
  // A sale for an estate pays its surplus into the estate, for the heirs.
  const first =
    estate?.decedentId ??
    household.memberIds.find((id) => c.people.get(id)?.alive);
  const surplus =
    remaining > 0 && first
      ? transferCash(
          api,
          `home-sale-surplus:${stamp}`,
          buyer.id,
          first,
          remaining,
          source,
        )
      : 0;
  for (const mortgage of mortgages) {
    table(api, "mortgages").put({
      ...mortgage,
      balanceMinor: 0,
      monthsLeft: 0,
      soldAt: c.date,
    } as unknown as ModuleRow);
    if (
      c.finance.contracts.has(mortgage.id) &&
      !c.finance.contracts.get(mortgage.id)!.endedAt
    )
      api.endStandingContract(mortgage.id);
  }
  table(api, "dwellings").put({
    id: `dwelling:${householdId}`,
    householdId,
    tenure: "sold",
    kind: dwelling.kind ?? "house",
    since: c.date,
    basis: "sale",
  });
  const sale: HomeSale = {
    id: `home-sale:${stamp}`,
    householdId,
    date: c.date,
    mortgageIds: mortgages.map((row) => row.id),
    priceMinor: price,
    owedMinor: owed,
    toLenderMinor: toLender,
    surplusMinor: surplus,
    lossMinor: Math.max(0, owed - toLender),
    reasonKey,
    ...(estate
      ? { decedentId: estate.decedentId, deathEventId: estate.deathEventId }
      : {}),
  };
  table(api, "sales").put(sale as unknown as ModuleRow);
  return sale;
}
