import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { advanceCore, createLifeCore } from "./life";
import { purchaseTaxes, taxInside } from "./modules/purchase-tax";
import { residentsAccountFor } from "./modules/residents";
import { coreAPI } from "./state";
import { generatedOpening } from "./tooling/generated-world";
import type { CoreModule, CoreState, SalesReceiptNotice } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
const place = drawPlace(seed, "core2-purchase-tax");

const cash = (core: CoreState) =>
  [...core.people.values(), ...core.organizations.values()].reduce(
    (n, row) => n + row.liquidMinor,
    0,
  );
const outsideNet = (core: CoreState) =>
  [...core.cashJournal.externalFlowsByOwner.values()].reduce(
    (n, row) => n + row.netMinor,
    0,
  );

describe(`a sales tax in ${place.name}, ${place.state} (seed ${seed})`, () => {
  it("collects the tax inside each taxed sale for the treasury, skips exempt sellers, and every dollar balances", () => {
    const sales: SalesReceiptNotice[] = [];
    const listener: CoreModule = {
      id: "fixture-sales",
      onSalesReceipt: (_api, sale) => void sales.push(sale),
    };
    const core = createLifeCore(
      generatedOpening(place, {
        twoLevel: true,
        settings: { population: 1500 },
      }),
      { modules: [listener] },
    );
    advanceCore(core, "2021-01-10");
    const api = coreAPI(core);
    // Tax the place where the town's sellers actually are, read from the
    // first sales: a place can have its government in one jurisdiction (a
    // municipio) and its businesses in another, and a tax applies only to
    // sellers located in the taxing jurisdiction.
    advanceCore(core, "2021-01-20");
    const salesByPlace = new Map<string, number>();
    for (const sale of sales) {
      const sellerPlace = core.organizations.get(sale.sellerId)?.placeId;
      if (sellerPlace)
        salesByPlace.set(sellerPlace, (salesByPlace.get(sellerPlace) ?? 0) + 1);
    }
    const taxingPlaceId = [...salesByPlace.entries()].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    )[0]?.[0];
    expect(taxingPlaceId).toBeDefined();
    const local = [...core.organizations.values()].filter(
      (row) =>
        row.outsideFlow === undefined &&
        row.kind === "employer" &&
        row.placeId === taxingPlaceId,
    );
    const government = local.find((row) => row.publicPayAuthority) ?? local[0]!;
    const treasury = api.accounts().open({
      ownerId: government.id,
      name: "Sales tax receipts",
      source: government.source,
    });
    // Exempt the classification of the town's first seller, as a grocery
    // exemption exempts food stores.
    const exempt = sales
      .map((sale) => core.organizations.get(sale.sellerId)?.classification)
      .find((row) => row);
    sales.length = 0;
    const startCash = cash(core) + outsideNet(core);
    api.setPurchaseTax({
      id: "tax:sales:test",
      placeId: government.placeId,
      ratePercent: 7,
      payeeAccountId: treasury,
      ...(exempt ? { exemptClassificationPrefixes: [exempt] } : {}),
      source: government.source,
    });
    advanceCore(core, "2021-02-20");
    const taxed = sales.filter((sale) => {
      const seller = core.organizations.get(sale.sellerId)!;
      return (
        seller.placeId === government.placeId &&
        seller.classification !== exempt
      );
    });
    expect(taxed.length).toBeGreaterThan(0);
    const expected = taxed.reduce(
      (n, sale) => n + taxInside(sale.paidMinor, 7),
      0,
    );
    expect(expected).toBeGreaterThan(0);
    expect(purchaseTaxes(core).get("tax:sales:test")!.collectedMinor).toBe(
      expected,
    );
    expect(api.accounts().balance(treasury)).toBe(expected);
    expect(cash(core) + outsideNet(core)).toBe(startCash);

    // Benefits for the counted residents pay their place's account.
    const residents = residentsAccountFor(core, government.placeId)!;
    expect(api.accounts().balance(residents)).toBeGreaterThan(0);

    // Ended, it collects nothing more.
    api.endPurchaseTax("tax:sales:test");
    advanceCore(core, "2021-03-10");
    expect(api.accounts().balance(treasury)).toBe(expected);
  }, 300_000);
});
