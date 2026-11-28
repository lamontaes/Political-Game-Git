/**
 * The housing market's writes that need nothing of the run: a home put up for sale, a sale marked bought, a place's stock row, and a new home taken off a builder's stock. Written for the homes engines, which re-export them.
 */
import { countOffered } from "./housing-price-level";
import type { CoreAPI } from "./types";
import type { Zoning, ConstructionLawIds } from "./housing-construction";
import type { ModuleTable } from "./module-state";
import type { CoreState } from "./types";
import type { HomeSale } from "./housing-sale";
import type { ModuleRow } from "./module-data";
import { townOutsideOf } from "./opening-outside-market";
import type { MortgageRow } from "./housing-foreclosure";
import { formerHome } from "./housing-former-home";

const HOUSING = "housing";

export const table = (api: CoreAPI, name: string) =>
  api.moduleState(HOUSING).table(name);

/** A home a household sold that no buyer has taken yet. */
export interface Listing {
  /** The `home-sale:` (or foreclosure sale) row that put it on the market. */
  readonly saleId: string;
  /** Homes left: a counted household's record stands for several. */
  homes: number;
  readonly listedAt: string;
  /** Who a buyer pays for it. */
  readonly payeeId: string;
  /** The home's value when last valued and the place's price level then, for its value today. */
  readonly valueMinor?: number;
  readonly priceLevel?: number;
}

type StockWithListings = {
  id: string;
  placeId: string;
  newHomesForSale: number;
  listings?: Listing[];
  /** Households that wanted to buy here and found nothing for sale, by the day their search began. */
  searching?: Record<string, string>;
};

export const stockOf = (api: CoreAPI, placeId: string) =>
  table(api, "stock").get(`stock:${placeId}`) as unknown as
    StockWithListings | undefined;

/**
 * A household sold its home (or homes, for a counted record): it is offered
 * this month, and stays for sale until a buyer takes it. A place the housing
 * engine keeps no stock for has no market of its own; the sale stands alone.
 */
export function listHome(
  api: CoreAPI,
  placeId: string,
  homes: number,
  saleId: string,
  payeeId: string,
  value?: { valueMinor: number; priceLevel?: number },
): void {
  if (!api.state.modules.has(HOUSING) || homes <= 0) return;
  countOffered(api, placeId, homes);
  const row = stockOf(api, placeId);
  if (!row) return;
  table(api, "stock").put({
    ...row,
    listings: [
      ...(row.listings ?? []),
      {
        saleId,
        homes,
        listedAt: api.state.date,
        payeeId,
        ...(value ? { valueMinor: value.valueMinor } : {}),
        ...(value?.priceLevel !== undefined
          ? { priceLevel: value.priceLevel }
          : {}),
      },
    ],
  } as never);
}

/** A foreclosure case whose home a purchase took names it (a household's sale is closed by housing-sale.ts `closeSale`). */
export function markSold(
  api: CoreAPI,
  saleIds: readonly string[],
  purchaseId: string,
): void {
  for (const id of saleIds) {
    const sales = table(api, "foreclosures");
    const row = sales.get(id) as { boughtBy?: string[] } | undefined;
    if (!row) continue;
    sales.put({
      ...row,
      boughtBy: [...(row.boughtBy ?? []), purchaseId],
    } as never);
  }
}

export interface StockRow {
  id: string;
  placeId: string;
  rentalUnits: number;
  vacantRental: number;
  newHomesForSale: number;
  /** Fractional starts carried between months. */
  carrySingle: number;
  carryMulti: number;
  /** Whether the buildings under way at the opening have been started. */
  backfilled?: boolean;
  openingHomeValueMinor: number;
  openingRentMinor: number;
  /** The price index at the opening; 0 until the economy has kept its first month, which is then the base. */
  openingPriceLevel: number;
  zoning: Zoning;
  /** Homes offered this month for the home price level (housing-price-level.ts). */
  priceOffered?: number;
}

export interface ProjectRow {
  id: string;
  placeId: string;
  kind: "single" | "multi";
  units: number;
  affordableUnits: number;
  askingRentMinor?: number;
  medianPayMinor?: number;
  startedAt: string;
  completesAt: string;
  payerId: string;
  builderId: string;
  /** The laws that governed the project when it started. */
  lawIds?: ConstructionLawIds;
  monthlyCostMinor: number;
  paidMinor: number;
  open: boolean;
  isProject: true;
}

/** A household buys one of the town's finished new houses, if any: its builder is the seller. */
export function takeNewHome(
  stock: ModuleTable,
  projects: ModuleTable,
  placeId: string,
): string | undefined {
  const row = stock.get(`stock:${placeId}`) as unknown as StockRow | undefined;
  if (!row || row.newHomesForSale < 1) return undefined;
  // Renters in town buy (full ones, and counted ones on their lease anniversary), and so do counted households moving in.
  const builder = (
    projects.query("all", [true]) as unknown as ProjectRow[]
  ).find(
    (p) => p.placeId === placeId && p.kind === "single" && !p.open,
  )?.builderId;
  stock.put({ ...row, newHomesForSale: row.newHomesForSale - 1 });
  return builder;
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
  if (!api.state.modules.has(HOUSING)) return undefined;
  // Only a household whose home went on the market has a sale.
  const home = table(api, "dwellings").get(`dwelling:${householdId}`) as
    { tenure?: string; basis?: string } | undefined;
  if (home?.basis !== "sale") return undefined;
  return (table(api, "sales").rows() as unknown as HomeSale[])
    .filter((row) => row.householdId === householdId)
    .sort((a, b) => a.date.localeCompare(b.date))
    .at(-1);
}

/**
 * Puts the household's home on the market, for what a buyer will pay. It
 * stays the household's (or its estate's) until a buyer takes it; its
 * mortgage stops being billed and is paid off, with interest for the months
 * it waited, from the sale. Returns the sale, or undefined when the household
 * owns no recorded home (or already has it on the market).
 */
export function sellHome(
  api: CoreAPI,
  householdId: string,
  reasonKey: string,
  estate?: { decedentId: string; deathEventId: string },
  /**
   * A counted household's home: the households its record stands for, the
   * place it is in, and the account its surplus goes to (its group's, for the
   * counted dead); none, the surplus leaves town with it.
   */
  counted?: {
    readonly placeId: string;
    readonly weight: number;
    readonly surplusAccountId?: string;
  },
): HomeSale | undefined {
  if (!api.state.modules.has(HOUSING)) return undefined;
  const c = api.state as CoreState;
  const dwelling = table(api, "dwellings").get(`dwelling:${householdId}`) as
    | {
        tenure?: string;
        kind?: string;
        valueMinor?: number;
        priceLevel?: number;
      }
    | undefined;
  if (dwelling?.tenure !== "own") return undefined;
  const household = c.households.get(householdId);
  const placeId = counted?.placeId ?? household?.placeId;
  if (!placeId) return undefined;
  const times = counted?.weight ?? 1;
  const market = townOutsideOf(c.organizations.values(), placeId);
  // The estate, or the household's first living member, is paid; a counted record has no account of its own, so the outside market takes the buyer's money for it and passes it on the same day.
  const payeeId = counted
    ? market?.id
    : (estate?.decedentId ??
      household?.memberIds.find((id) => c.people.get(id)?.alive) ??
      household?.memberIds[0]);
  if (!payeeId) return undefined;
  const mortgages = (
    table(api, "mortgages").rows() as unknown as MortgageRow[]
  ).filter((row) => row.householdId === householdId && row.balanceMinor > 0);
  for (const mortgage of mortgages) {
    table(api, "mortgages").put({
      ...mortgage,
      listedAt: c.date,
    } as unknown as ModuleRow);
    // The household stops paying it month by month: it is paid off from the sale.
    if (
      c.finance.contracts.has(mortgage.id) &&
      !c.finance.contracts.get(mortgage.id)!.endedAt
    )
      api.endStandingContract(mortgage.id);
  }
  const stamp = `${householdId}:${c.date}`;
  table(api, "dwellings").put(
    formerHome(dwelling, {
      householdId,
      tenure: "listed",
      basis: "sale",
      date: c.date,
    }) as unknown as ModuleRow,
  );
  const sale: HomeSale = {
    id: `home-sale:${stamp}`,
    householdId,
    placeId,
    date: c.date,
    status: "listed",
    homes: times,
    homesLeft: times,
    payeeId,
    ...(counted?.surplusAccountId
      ? { surplusAccountId: counted.surplusAccountId }
      : {}),
    homeValueMinor: dwelling.valueMinor ?? 0,
    ...(dwelling.priceLevel !== undefined
      ? { homePriceLevel: dwelling.priceLevel }
      : {}),
    mortgageIds: mortgages.map((row) => row.id),
    priceMinor: 0,
    owedMinor: Math.round(
      mortgages.reduce((sum, row) => sum + row.balanceMinor, 0) * times,
    ),
    toLenderMinor: 0,
    surplusMinor: 0,
    lossMinor: 0,
    reasonKey,
    ...(estate
      ? { decedentId: estate.decedentId, deathEventId: estate.deathEventId }
      : {}),
  };
  table(api, "sales").put(sale as unknown as ModuleRow);
  // A home offered this month, for sale until a buyer takes it: the place's price level weighs it against the month's buyers.
  listHome(api, placeId, times, sale.id, payeeId, {
    valueMinor: sale.homeValueMinor,
    ...(sale.homePriceLevel !== undefined
      ? { priceLevel: sale.homePriceLevel }
      : {}),
  });
  return sale;
}
