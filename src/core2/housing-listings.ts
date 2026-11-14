/**
 * Homes for sale in a place (pool item world-buyer-pays-the-selling-household).
 *
 * A home comes on the market only two ways: a household sells it (it leaves
 * town, its last owner's estate closes, or it is sold at foreclosure;
 * housing-sale.ts and housing-foreclosure.ts), or a builder finishes a new
 * house for sale (housing-construction.ts). A buyer, full or counted, takes a
 * home only from those: a builder's new house first, then the oldest home a
 * household sold. When none is left, the buyer does not buy this month: a
 * renter keeps renting and weighs again at its next turn, and a household
 * moving in rents.
 *
 * The household selling is paid when it sells (it is leaving, or its estate
 * is closing): the town's outside market pays it, and its lender, at the
 * sale, and holds the home until a buyer takes it. The buyer then pays the
 * outside market for that home, so each purchase repays the sale it names, and
 * the sale row names the purchases that took its homes.
 */
import { takeNewHome } from "./housing-construction";
import { countBuyer, countOffered } from "./housing-price-level";
import type { CoreAPI } from "./types";

const HOUSING = "housing";
const table = (api: CoreAPI, name: string) =>
  api.moduleState(HOUSING).table(name);

/** A home a household sold that no buyer has taken yet. */
interface Listing {
  /** The `home-sale:` (or foreclosure sale) row that put it on the market. */
  readonly saleId: string;
  /** Homes left: a counted household's record stands for several. */
  homes: number;
  readonly listedAt: string;
}

type StockWithListings = {
  id: string;
  placeId: string;
  newHomesForSale: number;
  listings?: Listing[];
};

const stockOf = (api: CoreAPI, placeId: string) =>
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
): void {
  if (!api.state.modules.has(HOUSING) || homes <= 0) return;
  countOffered(api, placeId, homes);
  const row = stockOf(api, placeId);
  if (!row) return;
  table(api, "stock").put({
    ...row,
    listings: [
      ...(row.listings ?? []),
      { saleId, homes, listedAt: api.state.date },
    ],
  } as never);
}

/** Homes for sale in a place now: new houses finished for sale and homes households sold. */
export function homesForSale(api: CoreAPI, placeId: string): number {
  const row = stockOf(api, placeId);
  if (!row) return 0;
  return (
    Math.max(0, row.newHomesForSale) +
    (row.listings ?? []).reduce((n, l) => n + l.homes, 0)
  );
}

/**
 * A buyer takes `homes` homes in a place, all or none: a builder's finished
 * new houses first, then the oldest homes households sold. Returns who is
 * paid for how many (a builder by its id, a sold home by the outside market
 * `outsideId`, which paid the household when it sold) and the sales whose
 * homes it took, or undefined when not enough homes are for sale.
 */
export function takeHomes(
  api: CoreAPI,
  placeId: string,
  homes: number,
  outsideId: string,
):
  | {
      sellers: { id: string; homes: number }[];
      saleIds: string[];
    }
  | undefined {
  // A whole house or a counted record's share of one: what is left after whole
  // houses is matched to the market's homes too.
  const tolerance = 1e-9;
  if (homesForSale(api, placeId) + tolerance < homes) return undefined;
  const sellers = new Map<string, number>();
  let left = homes;
  while (left >= 1) {
    const builder = takeNewHome(
      table(api, "stock"),
      table(api, "projects"),
      placeId,
    );
    if (!builder) break;
    sellers.set(builder, (sellers.get(builder) ?? 0) + 1);
    left -= 1;
  }
  const saleIds: string[] = [];
  if (left > tolerance) {
    const row = stockOf(api, placeId)!;
    const listings = (row.listings ?? []).map((l) => ({ ...l }));
    for (const listing of listings) {
      if (left <= tolerance) break;
      const took = Math.min(listing.homes, left);
      listing.homes -= took;
      left -= took;
      saleIds.push(listing.saleId);
    }
    table(api, "stock").put({
      ...row,
      listings: listings.filter((l) => l.homes > tolerance),
    } as never);
    sellers.set(
      outsideId,
      (sellers.get(outsideId) ?? 0) +
        (homes - [...sellers.values()].reduce((n, v) => n + v, 0)),
    );
  }
  return {
    sellers: [...sellers]
      .filter(([, n]) => n > 0)
      .map(([id, n]) => ({ id, homes: n })),
    saleIds,
  };
}

/**
 * A buyer who would have bought found no home for sale: the place's price
 * level still weighs it as a buyer this month (demand unmet raises prices,
 * which every later buyer weighs).
 */
export function countUnmetBuyer(
  api: CoreAPI,
  placeId: string,
  homes: number,
): void {
  countBuyer(api, placeId, homes);
}

/** The sales a purchase took homes from name it. */
export function markSold(
  api: CoreAPI,
  saleIds: readonly string[],
  purchaseId: string,
): void {
  for (const id of saleIds) {
    // A household's sale, or a foreclosure case sold at auction.
    const sales = table(
      api,
      table(api, "sales").get(id) ? "sales" : "foreclosures",
    );
    const row = sales.get(id) as { boughtBy?: string[] } | undefined;
    if (!row) continue;
    sales.put({
      ...row,
      boughtBy: [...(row.boughtBy ?? []), purchaseId],
    } as never);
  }
}
