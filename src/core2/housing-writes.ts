/**
 * The housing market's writes that need nothing of the run: a home put up for sale, a sale marked bought, a place's stock row, and a new home taken off a builder's stock. Written for the homes engines, which re-export them.
 */
import { countOffered } from "./housing-price-level";
import type { CoreAPI } from "./types";
import type { Zoning, ConstructionLawIds } from "./housing-construction";
import type { ModuleTable } from "./module-state";

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
