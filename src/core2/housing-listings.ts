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
 * A home stays the seller's until a buyer takes it: the buyer pays the seller
 * named on the listing (the household, its estate, or for a foreclosed home
 * the outside market that bought it at auction), and housing-sale.ts
 * `closeSale` pays the lender from that money. The purchase names the sale and
 * the sale names the purchase.
 */
import { takeNewHome } from "./housing-construction";
import { countBuyer, countOffered } from "./housing-price-level";
import { daysBetweenText } from "./kernel/dates";
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
  /** Who a buyer pays for it. */
  readonly payeeId: string;
}

/** One part of a purchase: who is paid for how many homes, and the sale they come from (none for a builder's new house). */
export interface HomePart {
  readonly sellerId: string;
  readonly homes: number;
  readonly saleId?: string;
}

type StockWithListings = {
  id: string;
  placeId: string;
  newHomesForSale: number;
  listings?: Listing[];
  /** Households that wanted to buy here and found nothing for sale, by the day their search began. */
  searching?: Record<string, string>;
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
  payeeId: string,
): void {
  if (!api.state.modules.has(HOUSING) || homes <= 0) return;
  countOffered(api, placeId, homes);
  const row = stockOf(api, placeId);
  if (!row) return;
  table(api, "stock").put({
    ...row,
    listings: [
      ...(row.listings ?? []),
      { saleId, homes, listedAt: api.state.date, payeeId },
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
 * new houses first, then the oldest homes households sold. Returns each part:
 * who is paid for how many homes and the sale it comes from; undefined when
 * not enough homes are for sale.
 */
export function takeHomes(
  api: CoreAPI,
  placeId: string,
  homes: number,
  /** A full household buys one whole home from one seller. */
  whole = false,
): HomePart[] | undefined {
  // A whole house or a counted record's share of one: what is left after whole
  // houses is matched to the households' homes for sale too.
  const tolerance = 1e-9;
  if (homesForSale(api, placeId) + tolerance < homes) return undefined;
  const builders = new Map<string, number>();
  let left = homes;
  while (left >= 1) {
    const builder = takeNewHome(
      table(api, "stock"),
      table(api, "projects"),
      placeId,
    );
    if (!builder) break;
    builders.set(builder, (builders.get(builder) ?? 0) + 1);
    left -= 1;
  }
  const parts: HomePart[] = [...builders].map(([sellerId, n]) => ({
    sellerId,
    homes: n,
  }));
  if (left > tolerance) {
    const row = stockOf(api, placeId)!;
    const listings = (row.listings ?? []).map((l) => ({ ...l }));
    for (const listing of listings) {
      if (left <= tolerance) break;
      if (whole && listing.homes + tolerance < left) continue;
      const took = Math.min(listing.homes, left);
      listing.homes -= took;
      left -= took;
      parts.push({
        sellerId: listing.payeeId,
        homes: took,
        saleId: listing.saleId,
      });
    }
    if (left > tolerance) return undefined;
    table(api, "stock").put({
      ...row,
      listings: listings.filter((l) => l.homes > tolerance),
    } as never);
  }
  return parts;
}

/**
 * A buyer who would have bought found no home for sale: the place's price
 * level weighs it as a buyer once for its search (demand unmet raises prices,
 * which every later buyer weighs), not again each month it keeps looking. A
 * search counts again after a year.
 */
export function countUnmetBuyer(
  api: CoreAPI,
  placeId: string,
  homes: number,
  householdId: string,
): void {
  const row = stockOf(api, placeId);
  if (!row) return;
  const today = api.state.date;
  const since = row.searching?.[householdId];
  if (since && daysBetweenText(since, today) < api.parameter("daysPerMeanYear"))
    return;
  // Searches a year old are dropped as each new one starts.
  const searching = Object.fromEntries(
    Object.entries(row.searching ?? {}).filter(
      ([, at]) => daysBetweenText(at, today) < api.parameter("daysPerMeanYear"),
    ),
  );
  table(api, "stock").put({
    ...row,
    searching: { ...searching, [householdId]: today },
  } as never);
  countBuyer(api, placeId, homes);
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
