/**
 * A buyer takes a home a household sold, and pays for it (pool item
 * world-buyer-pays-the-selling-household). Pinned to Bastrop, Louisiana
 * (place 2204685, the seed home-price-paths draws from "c3"), on the first of
 * July of its first year: by then households have sold homes (they left, an
 * estate closed) and buyers have taken some of them. Each purchase of a sold
 * home names its sale and the sale names the purchase; the buyer paid the
 * seller the sale names, which paid its lender from that money. With nothing for sale, a renter who would buy does
 * not, and the price level still counts it.
 */
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { homesForSale } from "./housing-listings";
import { makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { weighCountedBuyers } from "./modules/housing";
import { residentsRuntime } from "./modules/residents";
import { coreAPI } from "./state";

const PLACE = "2204685";

it("a buyer takes a home a household sold and the two rows name each other; with nothing for sale nobody buys", () => {
  setBookkeeping(false);
  const drawn = drawPlace("c3", "home-price-paths");
  const { core } = buildBenchWorld(drawn.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: PLACE,
  });
  const api = coreAPI(core);
  advanceCore(core, makeIsoDate(`${core.date.slice(0, 4)}-07-01`));
  const town = core.placeMetadata!.housingTown!;
  const housing = api.moduleState("housing");
  const detail = `Bastrop LA (${PLACE}), world ${core.seed}, ${core.date}`;
  type Purchase = {
    id: string;
    householdId: string;
    date: string;
    weight?: number;
    downMinor: number;
    sellerIds?: string[];
    saleIds?: string[];
  };
  type Sale = {
    id: string;
    householdId: string;
    date: string;
    priceMinor: number;
    owedMinor: number;
    toLenderMinor: number;
    surplusMinor: number;
    reasonKey: string;
    boughtBy?: string[];
  };
  const purchases = housing.table("purchases").rows() as unknown as Purchase[];
  const sales = housing.table("sales").rows() as unknown as Sale[];
  expect(sales.length, `${detail}: homes sold`).toBeGreaterThan(0);
  const ofSale = purchases.filter((row) => row.saleIds?.length);
  expect(ofSale.length, `${detail}: purchases of sold homes`).toBeGreaterThan(
    0,
  );
  for (const purchase of ofSale) {
    for (const saleId of purchase.saleIds!) {
      const sale = sales.find((row) => row.id === saleId);
      // A foreclosure sold at auction is kept as its case.
      const row =
        sale ??
        (housing.table("foreclosures").get(saleId) as unknown as
          { boughtBy?: string[] } | undefined);
      expect(row, `${detail}: ${purchase.id} names ${saleId}`).toBeDefined();
      expect(row!.boughtBy, `${detail}: ${saleId}`).toContain(purchase.id);
      if (sale) {
        // Sold before it was bought, by a different household.
        expect(sale.date <= purchase.date, saleId).toBe(true);
        expect(sale.householdId, saleId).not.toBe(purchase.householdId);
        // The sale paid the lender first and the household the rest.
        expect(
          sale.toLenderMinor + sale.surplusMinor,
          saleId,
        ).toBeLessThanOrEqual(sale.priceMinor);
      }
    }
    // The buyer paid each seller named on the sales it bought: the household, its estate, or for a counted record the outside market that passes the money on.
    for (const saleId of purchase.saleIds!) {
      const sale = sales.find((row) => row.id === saleId) as
        (Sale & { payeeId: string }) | undefined;
      if (sale) expect(purchase.sellerIds, purchase.id).toContain(sale.payeeId);
    }
  }

  // Nothing for sale: the place's market is emptied, and this month's renters who would buy cannot.
  const stock = housing.table("stock");
  const row = stock.get(`stock:${town}`) as unknown as Record<string, unknown>;
  stock.put({ ...row, newHomesForSale: 0, listings: [] } as never);
  expect(homesForSale(api, town), detail).toBe(0);
  const buyersBefore = Number(
    (stock.get(`stock:${town}`) as unknown as { priceBuyers?: number })
      .priceBuyers ?? 0,
  );
  const rt = residentsRuntime(core)!;
  rt.newcomers.length = 0;
  const countedBefore = purchases.filter((p) => p.date === core.date).length;
  weighCountedBuyers(api);
  const after = (
    housing.table("purchases").rows() as unknown as Purchase[]
  ).filter((p) => p.date === core.date).length;
  expect(after, `${detail}: bought with nothing for sale`).toBe(countedBefore);
  // Those who would have bought still count toward the price level.
  expect(
    Number(
      (stock.get(`stock:${town}`) as unknown as { priceBuyers?: number })
        .priceBuyers ?? 0,
    ),
    `${detail}: buyers turned away`,
  ).toBeGreaterThan(buyersBefore);
}, 300_000);
