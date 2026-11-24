/**
 * The sales tax base by seller kind (data/laws/sales-tax-base.json, read by
 * syncSalesTax), in played worlds at two pinned places: in Center, North
 * Dakota a clinic, a care home, an insurance agency and a professional
 * office remit no sales tax while the town's stores, repair shop and
 * recreation remit on what they sell; in Pierre, South Dakota, whose sales
 * tax reaches most services, the professional office remits too and the
 * clinic still does not. What each seller remitted is read from the laws'
 * applied rows the purchase tax writes (sales-tax-paid), and its tax share
 * from sellerTaxShare, which the price review reads.
 */
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { appliedOn } from "./law-reach/applied";
import { sellerTaxShare } from "./modules/purchase-tax";
import { coreAPI } from "./state";
import base from "./data/laws/sales-tax-base.json" with { type: "json" };
import books from "./data/business-books.json" with { type: "json" };

/** Sales tax each seller in the town remitted, and its share, by its classification. */
function remitted(placeKey: string, seed: string, days: number) {
  const world = buildBenchWorld(seed, gameStartDate(), {
    twoLevel: true,
    placeKey,
  });
  const core = world.core;
  advanceCore(core, addDays(makeIsoDate(core.date), days));
  const paid = new Map<string, number>();
  for (const row of appliedOn(coreAPI(core), "sales-tax"))
    if (row.target === "organization" && row.what === "sales-tax-paid")
      paid.set(row.targetId, (paid.get(row.targetId) ?? 0) + row.amountMinor);
  const by = new Map<string, { paidMinor: number; share: number }[]>();
  for (const book of core.finance.businesses.values()) {
    const org = core.organizations.get(book.organizationId);
    if (org?.placeId !== world.placeId || !org.classification) continue;
    by.set(org.classification, [
      ...(by.get(org.classification) ?? []),
      {
        paidMinor: paid.get(org.id) ?? 0,
        share: sellerTaxShare(core, org.id, "now"),
      },
    ]);
  }
  return {
    where: `${world.place.displayName} (place ${placeKey}, seed ${seed}, ${core.date})`,
    by,
  };
}

const sum = (rows: readonly { paidMinor: number }[] | undefined) =>
  (rows ?? []).reduce((n, row) => n + row.paidMinor, 0);

// One world built and run 14 days each, about 40 seconds alone; the limit is about twice that beside other tests.
const LIMIT_MS = 120_000;

describe("the sales tax base by seller kind", () => {
  it("names only classifications the business books have", () => {
    const known = new Set(books.classifications.map((c) => c.classification));
    expect(
      base.rows
        .map((row) => row.classificationPrefix)
        .filter((prefix) => ![...known].some((c) => c.startsWith(prefix))),
    ).toEqual([]);
  });

  it(
    "Center, North Dakota: medical care, insurance and professional services remit nothing; stores, repair and recreation do",
    () => {
      const { where, by } = remitted("3813180", "ilt-3813180", 14);
      for (const kind of [
        "service:clinic",
        "service:nursing-home",
        "enterprise:insurance",
        "enterprise:professional-services",
      ]) {
        expect(
          by.get(kind)?.length,
          `${where}: a ${kind} seller`,
        ).toBeGreaterThan(0);
        expect(sum(by.get(kind)), `${where}: ${kind} remitted`).toBe(0);
        expect(
          by.get(kind)!.every((row) => row.share === 0),
          `${where}: ${kind} tax share`,
        ).toBe(true);
      }
      for (const kind of [
        "enterprise:retail",
        "enterprise:repair",
        "enterprise:recreation",
      ])
        expect(sum(by.get(kind)), `${where}: ${kind} remitted`).toBeGreaterThan(
          0,
        );
    },
    LIMIT_MS,
  );

  it(
    "Pierre, South Dakota, whose tax reaches most services: the professional office remits, the clinic does not",
    () => {
      const { where, by } = remitted("4649600", "ilt-pierre", 14);
      expect(
        sum(by.get("enterprise:professional-services")),
        `${where}: professional services remitted`,
      ).toBeGreaterThan(0);
      expect(
        by.get("service:clinic")?.length,
        `${where}: a clinic`,
      ).toBeGreaterThan(0);
      expect(sum(by.get("service:clinic")), `${where}: clinic remitted`).toBe(
        0,
      );
    },
    LIMIT_MS,
  );
});
