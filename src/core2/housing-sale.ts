/**
 * Selling an owned home when its owners leave town (the replacement for
 * SG-P15-moves-owners-stay). An outside buyer pays the home's value from the
 * dwellings table; the lender is paid off from the price first, any surplus
 * goes to the household's first member, and a price under the payoff leaves
 * the lender to carry the rest as a loss, as at a foreclosure sale. The
 * mortgage ends, the home is no longer the household's, and the sale is a
 * record the housing ledger keeps.
 */
import { townOutsideOf } from "./opening-outside-market";
import { transferCash } from "./world-transfer";
import type { ModuleRow } from "./module-data";
import { formerHome } from "./housing-former-home";
import type { MortgageRow } from "./housing-foreclosure";
import { webFactorFor } from "./modules/laws";
import type { CoreAPI, CoreState } from "./types";

const HOUSING = "housing";
/** The outcome web's factor on what homes are worth here (a severe disaster's lower prices): the housing engine values each home, and prices each purchase and sale, at it. */
export const HOME_VALUE_MEASURE = "housing.home-value";
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
  /** For an estate's sale: probate's record and who the estate paid, once it closed. */
  readonly settledEventId?: string;
  readonly paid?: readonly {
    readonly toId: string;
    readonly amountMinor: number;
  }[];
}

/** An estate's home sale records probate's close and whom the estate paid. */
export function recordEstatePaid(
  api: CoreAPI,
  sale: HomeSale,
  settledEventId: string,
  paid: readonly { readonly toId: string; readonly amountMinor: number }[],
): void {
  table(api, "sales").put({
    ...sale,
    settledEventId,
    paid: paid.map((row) => ({ ...row })),
  } as unknown as ModuleRow);
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
  /**
   * A counted household's home: the households its record stands for (the
   * price and the payoff times that), the place it is in, and where the
   * surplus goes (the counted residents' own money, as the counted dead's
   * cash does). Returns what that took in.
   */
  counted?: {
    readonly placeId: string;
    readonly weight: number;
    readonly surplus: (
      amountMinor: number,
      id: string,
      buyerId: string,
    ) => number;
  },
): HomeSale | undefined {
  if (!api.state.modules.has(HOUSING)) return undefined;
  const c = api.state as CoreState;
  const dwelling = table(api, "dwellings").get(`dwelling:${householdId}`) as
    | {
        tenure?: string;
        kind?: string;
        valueMinor?: number;
        webFactor?: number;
      }
    | undefined;
  if (dwelling?.tenure !== "own") return undefined;
  const household = c.households.get(householdId);
  const placeId = counted?.placeId ?? household?.placeId;
  if (!placeId) return undefined;
  // A counted household's record stands for several: its home and its
  // mortgage are each that many.
  const times = counted?.weight ?? 1;
  const mortgages = (
    table(api, "mortgages").rows() as unknown as MortgageRow[]
  ).filter((row) => row.householdId === householdId && row.balanceMinor > 0);
  // The buyer pays the home's value moved by the outcome web's factor on home
  // values since the home was valued (a severe disaster's lower prices).
  const price = Math.round(
    (dwelling.valueMinor ?? 0) *
      times *
      (webFactorFor(api, placeId, HOME_VALUE_MEASURE) /
        (dwelling.webFactor ?? 1)),
  );
  const owed = Math.round(
    mortgages.reduce((sum, row) => sum + row.balanceMinor, 0) * times,
  );
  // The town's outside market stands for the buyer.
  const buyer = townOutsideOf(c.organizations.values(), placeId);
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
    const owedNow = Math.min(
      remaining,
      Math.round(mortgage.balanceMinor * times),
    );
    // The outside market that buys the home can also hold its mortgage: paying
    // itself moves no cash, and the loan is settled all the same.
    const paid =
      mortgage.holderId === buyer.id
        ? owedNow
        : transferCash(
            api,
            `home-sale:${stamp}:${mortgage.id}`,
            buyer.id,
            mortgage.holderId,
            owedNow,
            source,
          );
    toLender += paid;
    remaining -= paid;
  }
  // A sale for an estate pays its surplus into the estate, for the heirs; a
  // counted household's goes to the counted residents it belonged to.
  const first =
    estate?.decedentId ??
    household?.memberIds.find((id) => c.people.get(id)?.alive);
  const surplus = counted
    ? remaining > 0
      ? counted.surplus(remaining, `home-sale-surplus:${stamp}`, buyer.id)
      : 0
    : remaining > 0 && first
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
  table(api, "dwellings").put(
    formerHome(dwelling, {
      householdId,
      tenure: "sold",
      basis: "sale",
      date: c.date,
      soldForMinor: price,
    }) as unknown as ModuleRow,
  );
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
