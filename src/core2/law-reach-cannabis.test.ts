/**
 * Legal cannabis sales, in the played world (every module installed, a place
 * drawn from all 56 by seed): while the state's law stands, adults 21 and over
 * spend a month's share of a year's licensed retail sales at the town's
 * retailers, each sale is reported like any paid sale so the sales tax in
 * force collects on it, and a repeal ends the spending.
 */
import { randomBytes } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { advanceCore } from "./life";
import { gameStartDate } from "./game-start";
import { coreAPI } from "./state";
import { enactLaw, lawChain } from "./modules/laws";
import { purchaseTaxes, taxInside } from "./modules/purchase-tax";
import { ageOnDate, makeIsoDate } from "./kernel/dates";
import groupAParameters from "./data/laws/reach-group-a-parameters.json" with { type: "json" };
import type {
  CoreAPI,
  CoreModule,
  CoreState,
  SalesReceiptNotice,
} from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const place = drawPlace(seed, "law-reach-cannabis");
const KEY = "us-policy-positions:business-commerce.legalize-cannabis-sales";
const KIND = "household.cannabis";
let core: CoreState;
let api: CoreAPI;

interface Seen extends SalesReceiptNotice {
  /** Sales tax collected in the town up to and including this sale. */
  collectedMinor: number;
}
const seen: Seen[] = [];

const after = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);

beforeAll(() => {
  core = buildBenchWorld(place.seed, gameStartDate(), {
    placeKey: place.key,
    twoLevel: true,
  }).core;
  api = coreAPI(core);
  // Listen last, so the sales tax has collected on a sale when this sees it.
  const probe: CoreModule = {
    id: "test-cannabis-probe",
    onSalesReceipt(_api, sale) {
      if (sale.kind !== KIND) return;
      let collectedMinor = 0;
      for (const tax of purchaseTaxes(core).values())
        if (tax.placeId === sale.placeId) collectedMinor += tax.collectedMinor;
      seen.push({ ...sale, collectedMinor });
    },
  };
  (core.modules as Map<string, CoreModule>).set(probe.id, probe);
}, 600_000);

function enact(value: number, days = 2) {
  const level = lawChain(api).levels.find((l) => l.level === "state")!;
  enactLaw(api, {
    jurisdiction: level.jurisdiction,
    level: "state",
    series: KEY,
    value,
    effectiveDate: after(api.state.date, 1),
    measureId: `TEST-cannabis-${value}-${api.state.date}`,
    citation: `Test act cannabis ${value}`,
  });
  advanceCore(core, after(api.state.date, days));
}

describe("legal cannabis sales", () => {
  it("move adults' spending to the town's retailers and through the sales tax; a repeal ends it", () => {
    const where = `seed ${seed}, place ${place.key} (${place.name})`;
    const town = lawChain(api).townPlaceId;
    const retailers = () =>
      [...core.organizations.values()].filter(
        (o) =>
          o.placeId === town &&
          o.classification === "enterprise:retail" &&
          o.outsideFlow === undefined &&
          !core.finance.businesses.get(o.id)?.closedAt,
      );
    // A state whose law already allows sales sells from the first day: repeal it first.
    enact(0, 35);
    seen.length = 0;
    advanceCore(core, after(api.state.date, 35));
    expect(seen, `${where} before the law`).toEqual([]);
    enact(1, 2);
    advanceCore(core, after(api.state.date, 65));
    const sold = seen.filter((s) => s.placeId === town);
    if (retailers().length === 0) {
      // With no licensed seller in town, adults buy outside it and nothing is sold here.
      expect(sold, `${where} no retailer`).toEqual([]);
      return;
    }
    expect(sold.length, `${where} sales`).toBeGreaterThan(0);
    const licensed = new Set(retailers().map((o) => o.id));
    for (const sale of sold) {
      expect(licensed.has(sale.sellerId), `${where} seller`).toBe(true);
      expect(sale.paidMinor, where).toBeGreaterThan(0);
      // A named buyer is an adult of the law's age.
      for (const id of sale.buyerIds) {
        const person = core.people.get(id)!;
        expect(
          ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(sale.date)),
          `${where} ${id}`,
        ).toBeGreaterThanOrEqual(groupAParameters.parameters.cannabisAge.value);
      }
    }
    // The sales tax in force collects on the sale: the tax collected in town
    // rises by the tax inside the payment as each sale is reported.
    const taxes = [...purchaseTaxes(core).values()].filter(
      (t) => t.placeId === town && t.endedAt === undefined,
    );
    if (taxes.length > 0) {
      const rate = taxes.reduce((n, t) => n + t.ratePercent, 0);
      let checked = 0;
      for (let i = 1; i < sold.length; i += 1) {
        // Sales in one monthly run follow one another with nothing between them.
        if (sold[i]!.date !== sold[i - 1]!.date) continue;
        const delta = sold[i]!.collectedMinor - sold[i - 1]!.collectedMinor;
        const inside = taxes.reduce(
          (n, t) => n + taxInside(sold[i]!.paidMinor, t.ratePercent),
          0,
        );
        if (rate > 0 && inside > 0) {
          expect(delta, `${where} tax on sale ${sold[i]!.id}`).toBeGreaterThan(
            0,
          );
          expect(delta, where).toBeLessThanOrEqual(inside);
          checked += 1;
        }
      }
      if (sold.length > 1 && rate > 0)
        expect(checked, `${where} taxed sales`).toBeGreaterThan(0);
    }
    // A repeal ends the spending.
    enact(0, 2);
    seen.length = 0;
    advanceCore(core, after(api.state.date, 65));
    expect(seen, `${where} after the repeal`).toEqual([]);
  }, 900_000);
});
