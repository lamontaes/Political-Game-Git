import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { advanceCore, createLifeCore } from "./life";
import { purchaseTaxes, taxInside } from "./modules/purchase-tax";
import { countedFundOf, residentsAccountFor } from "./modules/residents";
import { coreAPI } from "./state";
import { generatedOpening } from "./tooling/generated-world";
import type { CoreModule, CoreState, SalesReceiptNotice } from "./types";
import { daysAfterStart } from "./tooling/test-days";
import { countedRecords } from "./tooling/counted-records";

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
    advanceCore(core, daysAfterStart(9));
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
    advanceCore(core, daysAfterStart(19));
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
      ...(exempt
        ? { exemptions: [{ classificationPrefix: exempt, share: 1 }] }
        : {}),
      source: government.source,
    });
    advanceCore(core, daysAfterStart(50));
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

    // Benefits for the counted residents pay their place's account, which
    // holds each counted group's money in that group's own fund.
    const residents = residentsAccountFor(core, taxPlace)!;
    const funds = new Set(
      [...countedRecords(core).values()]
        .filter((row) => row.household.placeId === taxPlace)
        .map((row) => countedFundOf(core, row.household.id))
        .filter((id): id is string => id !== undefined),
    );
    expect(
      [residents, ...funds].reduce(
        (n, id) => n + api.accounts().balance(id),
        0,
      ),
    ).toBeGreaterThan(0);

    // Ended, it collects nothing more.
    api.endPurchaseTax("tax:sales:test");
    advanceCore(core, daysAfterStart(68));
    expect(api.accounts().balance(treasury)).toBe(expected);
  }, 300_000);
});
