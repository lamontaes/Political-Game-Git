/**
 * For tests of a home sale: a buyer takes a listed home off the market and
 * pays its seller, as housing-listings.ts `takeHomes` and a buyer's purchase
 * do in play, so a test of what a sale pays (the lender first, the rest to the
 * household or the estate) can close one sale on the day it chooses. The buyer
 * pays the home's value today by the one value rule. Test buyers are a full
 * person or an outside organization, paid account to account.
 */
import { closeSale, type HomeSale } from "./housing-sale";
import { homeValueToday } from "./housing-price-level";
import type { CoreAPI } from "./types";

export function buyListedHome(
  api: CoreAPI,
  saleId: string,
  buyerId: string,
): HomeSale {
  const housing = api.moduleState("housing");
  const sale = housing.table("sales").get(saleId) as unknown as HomeSale;
  const price = Math.round(
    homeValueToday(
      api,
      sale.placeId,
      sale.homeValueMinor,
      sale.homePriceLevel,
    ) * sale.homesLeft,
  );
  // Take it off the market, as a buyer's purchase does.
  const stock = housing.table("stock");
  const row = stock.get(`stock:${sale.placeId}`) as unknown as
    { listings?: { saleId: string }[] } | undefined;
  if (row?.listings)
    stock.put({
      ...row,
      listings: row.listings.filter((l) => l.saleId !== saleId),
    } as never);
  const purchaseId = `purchase:test:${saleId}`;
  const paid =
    buyerId === sale.payeeId
      ? price
      : api.accounts().transfer({
          id: `${purchaseId}:price`,
          from: api.accounts().main(buyerId),
          to: api.accounts().main(sale.payeeId),
          amountMinor: price,
          reasonKey: "purchase",
          source: {
            tag: "ESTIMATED",
            asOf: api.state.date,
            citation: "Test buyer for a listed home.",
            estimatedFrom: "The home's value today.",
          },
          partial: true,
        }).paidMinor;
  closeSale(api, saleId, sale.homesLeft, paid, purchaseId);
  return housing.table("sales").get(saleId) as unknown as HomeSale;
}
