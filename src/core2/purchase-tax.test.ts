import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { advanceCore, createLifeCore } from "./life";
import {
  PURCHASE_TAX_MODULE,
  purchaseTaxArrears,
  purchaseTaxes,
  taxInside,
} from "./modules/purchase-tax";
import { transferCash } from "./world-transfer";
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
    const local = [...core.organizations.values()].filter(
      (row) => row.outsideFlow === undefined && row.kind === "employer",
    );
    const government = local.find((row) => row.publicPayAuthority) ?? local[0]!;
    const treasury = api.accounts().open({
      ownerId: government.id,
      name: "Sales tax receipts",
      source: government.source,
    });
    // Exempt the classification with the smallest sales, as a grocery
    // exemption exempts food stores, so the taxed sales carry most of the
    // town's purchases (none exempt where only one kind of seller sells).
    advanceCore(core, "2021-01-20");
    const byClass = new Map<string, number>();
    for (const sale of sales) {
      const row = core.organizations.get(sale.sellerId)?.classification;
      if (row) byClass.set(row, (byClass.get(row) ?? 0) + sale.paidMinor);
    }
    const exempt =
      byClass.size > 1
        ? [...byClass].sort(
            (a, b) => a[1] - b[1] || a[0].localeCompare(b[0]),
          )[0]![0]
        : undefined;
    // Tax the place where the town's sellers are.
    const sellerPlaces = new Map<string, number>();
    for (const sale of sales) {
      const at = core.organizations.get(sale.sellerId)?.placeId;
      if (at) sellerPlaces.set(at, (sellerPlaces.get(at) ?? 0) + 1);
    }
    const taxPlace = [...sellerPlaces].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    )[0]![0];
    sales.length = 0;
    const startCash = cash(core) + outsideNet(core);
    api.setPurchaseTax({
      id: "tax:sales:test",
      placeId: taxPlace,
      ratePercent: 7,
      payeeAccountId: treasury,
      ...(exempt ? { exemptClassificationPrefixes: [exempt] } : {}),
      source: government.source,
    });
    advanceCore(core, "2021-02-20");
    const taxed = sales.filter((sale) => {
      const seller = core.organizations.get(sale.sellerId)!;
      return seller.placeId === taxPlace && seller.classification !== exempt;
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
    const residents = residentsAccountFor(core, taxPlace)!;
    expect(api.accounts().balance(residents)).toBeGreaterThan(0);

    // Ended, it collects nothing more.
    api.endPurchaseTax("tax:sales:test");
    advanceCore(core, "2021-03-10");
    expect(api.accounts().balance(treasury)).toBe(expected);
  }, 300_000);
});

describe("sales tax a short seller can't remit", () => {
  it("is kept as an arrears record for the seller; the next remittance adds it and pays it first; every dollar balances", () => {
    const core = createLifeCore(
        generatedOpening(place, {
          twoLevel: true,
          settings: { population: 1500 },
        }),
        { modules: [] },
      ),
      api = coreAPI(core);
    const seller = [...core.organizations.values()].find(
      (row) => row.outsideFlow === undefined && row.kind === "employer",
    )!;
    const treasury = api.accounts().open({
      ownerId: seller.id,
      name: "Sales tax receipts",
      source: seller.source,
    });
    api.setPurchaseTax({
      id: "tax:sales:short",
      placeId: seller.placeId,
      ratePercent: 10,
      payeeAccountId: treasury,
      source: seller.source,
    });
    const outside = [...core.organizations.values()].find(
      (row) => row.outsideFlow !== undefined,
    )!;
    // Leave the seller with exactly 50, less than the first sale's tax.
    const gap = seller.liquidMinor - 50;
    if (gap > 0)
      transferCash(
        api,
        "drain:seller",
        seller.id,
        outside.id,
        gap,
        seller.source,
      );
    else
      transferCash(
        api,
        "fill:seller",
        outside.id,
        seller.id,
        -gap,
        seller.source,
      );
    expect(seller.liquidMinor).toBe(50);
    const total = () =>
      [...core.people.values(), ...core.organizations.values()].reduce(
        (n, row) => n + row.liquidMinor,
        0,
      ) +
      [...core.cashJournal.externalFlowsByOwner.values()].reduce(
        (n, row) => n + row.netMinor,
        0,
      );
    const start = total();
    const sale = (id: string) => ({
      id,
      date: core.date,
      sellerId: seller.id,
      buyerIds: [],
      kind: "purchase",
      paidMinor: 11_000,
      placeId: seller.placeId,
      counted: true,
    });
    PURCHASE_TAX_MODULE.onSalesReceipt!(api, sale("sale:one"));
    const owed = taxInside(11_000, 10);
    const key = `tax:sales:short:${seller.id}`;
    expect(purchaseTaxes(core).get("tax:sales:short")!.collectedMinor).toBe(50);
    expect(purchaseTaxArrears(core).get(key)).toMatchObject({
      sellerId: seller.id,
      amountMinor: owed - 50,
      since: core.date,
      lawRowId: "tax:sales:short",
    });
    expect(total()).toBe(start);
    // Cash comes in; the next remittance covers this sale's tax plus the arrears.
    transferCash(
      api,
      "topup:seller",
      outside.id,
      seller.id,
      100_000,
      seller.source,
    );
    PURCHASE_TAX_MODULE.onSalesReceipt!(api, sale("sale:two"));
    expect(purchaseTaxArrears(core).get(key)).toBeUndefined();
    expect(api.accounts().balance(treasury)).toBe(owed * 2);
    expect(total()).toBe(start);
  }, 300_000);
});
