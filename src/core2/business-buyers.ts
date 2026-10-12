/**
 * Buyers outside the town, as accounts. A business's sales outside the town
 * are split into buyer accounts of different sizes, each renewing on its own
 * month; as many again buy the same kind of thing elsewhere. At its renewal
 * a buyer weighs staying against going elsewhere: the seller's price against
 * the nation's and how long they've dealt with each other. A buyer elsewhere
 * weighs coming to the town's seller of its kind the same way, and goes to
 * the one with most room for it. A business's outside sales, and the staff
 * it needs, follow the accounts it holds.
 *
 * Who the buyers are (their sizes and renewal months) is seeded with the
 * world; what they do is their reasons, through the counted chooser
 * (`strongestPulls`).
 */
import type { ModuleTable } from "./module-state";
import { strongestPulls } from "./modules/jobs";
import {
  customerSalesByBusiness,
  setOutsideBuyerShare,
} from "./residents-economy";
import { stopgap } from "./stopgaps";
import type { CoreAPI, CoreState } from "./types";

export type BuyerRow = {
  id: string;
  placeId: string;
  kindId: string;
  /** The town business it buys from, or "" when it buys elsewhere. */
  sellerId: string;
  /** What it spends a year, at the opening's prices and demand. */
  sizeMinor: number;
  /** The month ("YYYY-MM") it next renews. */
  renewsMonth: string;
  /** Since when it has bought from its current seller. */
  since: string;
  isBuyer: true;
};

export type SellerRow = {
  id: string;
  placeId: string;
  kindId: string;
  /** Its buyers' spending a year at the opening. */
  openingMinor: number;
  /** Its buyers' spending a year now, at the opening's terms. */
  heldMinor: number;
  /** The share of its customers' spending that came from outside the town at the opening. */
  outsideShare: number;
  isSeller: true;
};

/** A uniform draw in [0, 1) from the world seed and a key (generation of who exists). */
function draw(seed: string, key: string): number {
  let hash = 0x811c9dc5;
  const text = `${seed}|${key}`;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  let value = (hash + 0x6d2b79f5) >>> 0;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 0x1_0000_0000;
}

/** A lognormal weight with median 1. */
function weight(seed: string, key: string, sigma: number): number {
  const u = Math.max(draw(seed, `${key}:u`), Number.EPSILON),
    v = draw(seed, `${key}:v`);
  return Math.exp(
    sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v),
  );
}

function addMonths(month: string, months: number): string {
  const at = new Date(`${month}-01T00:00:00Z`);
  at.setUTCMonth(at.getUTCMonth() + months);
  return at.toISOString().slice(0, "YYYY-MM".length);
}

/** Splits each open business's outside sales into buyer accounts, with as many buying the same kind elsewhere. */
export function openBuyers(
  api: CoreAPI,
  tables: { buyers: ModuleTable; sellers: ModuleTable },
): void {
  const c = api.state as CoreState,
    p = (key: string) => api.parameter(key);
  const sales = customerSalesByBusiness(c);
  const account = p("businessBuyerAccountMinor"),
    sigma = p("businessBuyerSizeSpread"),
    term = Math.max(1, Math.round(p("businessBuyerTermMonths")));
  const month = c.date.slice(0, "YYYY-MM".length);
  const ids = [...c.finance.businesses.keys()].sort();
  for (const [position, id] of ids.entries()) {
    const book = c.finance.businesses.get(id)!;
    const placeId = c.organizations.get(id)?.placeId;
    const row = sales.get(id);
    if (book.closedAt || !placeId || !row || row.outsideMinor <= 0) continue;
    const count = Math.max(1, Math.round(row.outsideMinor / account));
    // The same buyers in two lists: those buying here, and as many again buying elsewhere.
    for (const side of ["here", "elsewhere"] as const) {
      const weights = Array.from({ length: count }, (_, i) =>
        weight(c.seed, `buyer:${id}:${side}:${i}`, sigma),
      );
      const total = weights.reduce((n, w) => n + w, 0);
      weights.forEach((w, i) => {
        tables.buyers.put({
          id: `buyer:${id}:${side}:${i}`,
          placeId,
          kindId: book.kindId,
          sellerId: side === "here" ? id : "",
          sizeMinor: (row.outsideMinor * w) / total,
          // Renewals spread evenly over the year: each business's accounts in turn, those elsewhere half a cycle on.
          renewsMonth: addMonths(
            month,
            1 +
              ((position + i + (side === "here" ? 0 : Math.floor(term / 2))) %
                term),
          ),
          since: c.date,
          isBuyer: true,
        } satisfies BuyerRow);
      });
    }
    tables.sellers.put({
      id,
      placeId,
      kindId: book.kindId,
      openingMinor: row.outsideMinor,
      heldMinor: row.outsideMinor,
      outsideShare: row.allMinor > 0 ? row.outsideMinor / row.allMinor : 0,
      isSeller: true,
    } satisfies SellerRow);
  }
}

/** A business's price against the nation's prices since the opening. */
function relativePrice(c: CoreState, id: string): number {
  const book = c.finance.businesses.get(id);
  const placeId = c.organizations.get(id)?.placeId;
  if (!book || !placeId) return 1;
  const general =
    (c.finance.conditionsByPlace.get(placeId) ?? [])
      .filter((row) => row.at <= c.date)
      .at(-1)?.generalPriceFactor ?? 1;
  return book.price / (book.anchorPrice || 1) / general;
}

/** This month's renewals: buyers here weigh leaving, buyers elsewhere weigh coming. */
export function renewBuyers(
  api: CoreAPI,
  tables: { buyers: ModuleTable; sellers: ModuleTable },
): void {
  const c = api.state as CoreState,
    p = (key: string) => api.parameter(key);
  const month = c.date.slice(0, "YYYY-MM".length);
  const term = Math.max(1, Math.round(p("businessBuyerTermMonths")));
  const baseline = p("businessBuyerSwitchBaseline"),
    priceWeight = p("businessBuyerPriceWeight"),
    tenureWeight = p("businessBuyerTenureWeight"),
    daysPerYear = p("jobsDaysPerYear");
  // New businesses win outside buyers through the market split at entry, not as accounts.
  stopgap("SG-WORLD-business-entrant-buyers");
  const due = tables.buyers.query("byRenewal", [
    month,
  ]) as unknown as BuyerRow[];
  if (!due.length) return;
  const sellers = new Map(
    (tables.sellers.query("all", [true]) as unknown as SellerRow[]).map(
      (row) => [row.id, { ...row }],
    ),
  );
  const open = (id: string) =>
    !!id && !c.finance.businesses.get(id)?.closedAt && sellers.has(id);
  const years = (since: string) =>
    (Date.parse(`${c.date}T00:00:00Z`) - Date.parse(`${since}T00:00:00Z`)) /
    (daysPerYear * 86_400_000);
  const markets = new Map<
    string,
    { here: BuyerRow[]; elsewhere: BuyerRow[] }
  >();
  for (const row of due) {
    const key = `${row.placeId}|${row.kindId}`;
    const market = markets.get(key) ?? { here: [], elsewhere: [] };
    (open(row.sellerId) ? market.here : market.elsewhere).push(row);
    markets.set(key, market);
  }
  const changed = new Set<string>();
  for (const [key, market] of [...markets].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    const [placeId, kindId] = key.split("|") as [string, string];
    const leaving = new Set(
      strongestPulls(
        api,
        `buyers-leave:${key}`,
        market.here.map((row) => ({
          id: row.id,
          score:
            baseline +
            priceWeight * Math.log(relativePrice(c, row.sellerId)) -
            tenureWeight * years(row.since),
        })),
      ).map((row) => row.id),
    );
    const rivals = [...sellers.values()].filter(
      (row) => row.placeId === placeId && row.kindId === kindId && open(row.id),
    );
    // A buyer elsewhere goes to the seller with most room for it: the least held against its size and price.
    const room = (row: SellerRow) =>
      row.heldMinor /
      (row.openingMinor * relativePrice(c, row.id) ** -priceWeight || 1);
    const best = () =>
      [...rivals].sort(
        (a, b) => room(a) - room(b) || a.id.localeCompare(b.id),
      )[0];
    const coming = new Set(
      rivals.length
        ? strongestPulls(
            api,
            `buyers-come:${key}`,
            market.elsewhere.map((row) => ({
              id: row.id,
              score:
                baseline - priceWeight * Math.log(relativePrice(c, best()!.id)),
            })),
          ).map((row) => row.id)
        : [],
    );
    for (const row of [...market.here, ...market.elsewhere]) {
      const next: BuyerRow = {
        ...row,
        renewsMonth: addMonths(month, term),
      };
      if (leaving.has(row.id)) {
        const seller = sellers.get(row.sellerId)!;
        seller.heldMinor -= row.sizeMinor;
        changed.add(seller.id);
        next.sellerId = "";
        next.since = c.date;
      } else if (coming.has(row.id)) {
        const seller = best()!;
        seller.heldMinor += row.sizeMinor;
        changed.add(seller.id);
        next.sellerId = seller.id;
        next.since = c.date;
      } else if (!open(row.sellerId) && row.sellerId) {
        // A closed seller's buyers went elsewhere when it closed.
        next.sellerId = "";
        next.since = c.date;
      }
      tables.buyers.put({ ...next });
    }
  }
  for (const id of [...changed].sort()) {
    const seller = sellers.get(id)!;
    seller.heldMinor = Math.max(0, seller.heldMinor);
    tables.sellers.put({ ...seller });
    setOutsideBuyerShare(c, id, seller.heldMinor / seller.openingMinor);
  }
}
