/**
 * The web's factors reach prices and place services through the engines'
 * own records: a business's own price at its review, a household's electricity
 * bill, the trips it takes and the share of households subscribing. Each
 * world is built the way the game builds it, then played with the web's
 * factor held at one value and at another, so only the factor differs.
 */
import type * as OutcomeWebReach from "./outcome-web-reach";
import type * as WorldTransfer from "./world-transfer";
import { randomBytes } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import type { CoreState } from "./types";
import { enactLaw, lawChain } from "./modules/laws";
import { monthlyChange, worldGoods } from "./modules/place-prices";
import { coreAPI } from "./state";

const held = vi.hoisted(() => ({ factors: {} as Record<string, number> }));
const reachOf = (measure: string, subject?: { incomeFifth?: number }) => {
  const base = held.factors[measure] ?? 1;
  // The electricity link lands harder on the lowest fifth than the top one.
  const factor =
    measure === "energy.electricity-price" && subject?.incomeFifth !== undefined
      ? 1 + (base - 1) * (subject.incomeFifth === 0 ? 1.5 : 0.5)
      : base;
  return {
    factor,
    added: 0,
    recordId: factor === 1 ? null : "web:test",
    parts:
      factor === 1
        ? []
        : [
            {
              link: "clean-electricity-to-price",
              effect: factor - 1,
              weight: 1,
            },
          ],
  };
};
vi.mock("./outcome-web-reach", async (importOriginal) => ({
  // Every other export (the day cache the death web reads) stays real.
  ...(await importOriginal<typeof OutcomeWebReach>()),
  webReach: (
    _a: unknown,
    _p: string,
    m: string,
    s?: { incomeFifth?: number },
  ) => reachOf(m, s),
  webFactorFor: (
    _a: unknown,
    _p: string,
    m: string,
    s?: { incomeFifth?: number },
  ) => reachOf(m, s).factor,
  // No level outcome is mocked: the redemption read falls to its research base.
  webLevel: () => null,
}));

// Every electricity bill the price engine asks of a full household, by its
// payment id, whether or not the payer can pay it.
const asked = vi.hoisted(() => ({ bills: new Map<string, number>() }));
vi.mock("./world-transfer", async (importOriginal) => {
  const real = await importOriginal<typeof WorldTransfer>();
  return {
    ...real,
    transferCash: (...args: Parameters<typeof real.transferCash>) => {
      const [, id, , , amountMinor] = args;
      if (id.startsWith("price:") && id.includes(":electricity:"))
        asked.bills.set(id, (asked.bills.get(id) ?? 0) + amountMinor);
      return real.transferCash(...args);
    },
  };
});
/** A town where a clean-electricity standard and retail electric choice are both in force on day one (seed and place from the red of Nov 15, 2026). */
const WILTON = { seed: "056520284c241460", key: "2385815" } as const;
const STANDARD =
  "us-policy-positions:environment-energy.clean-electricity-standard";
const CHOICE =
  "us-policy-positions:environment-energy.allow-retail-electric-choice";

const seed = process.env.WEB_PRICES_SEED || randomBytes(8).toString("hex");
const place = drawPlace(seed, "web-prices");

function play<T>(
  factors: Record<string, number>,
  days: number,
  read: (core: CoreState) => T,
  at: { key: string } = place,
  worldSeed: string = seed,
): T {
  held.factors = factors;
  const opening = gameStartDate();
  // One world at a time: the read keeps only what the test compares.
  const world = buildBenchWorld(worldSeed, opening, {
    twoLevel: true,
    placeKey: at.key,
  });
  advanceCore(world.core, addDays(makeIsoDate(opening), days));
  return read(world.core);
}

const webReceipts = (core: CoreState, good: string) =>
  [...core.cashJournal.detailedReceipts.values()]
    .filter(
      (r) =>
        r.sourceRef.id.startsWith("price:") &&
        r.sourceRef.id.includes(`:${good}:`) &&
        r.sourceRef.id.includes(":web:"),
    )
    .map((r) => JSON.stringify(r.postings));

const MILEAGE =
  "us-policy-positions:transportation-infrastructure.mileage-fee-replaces-fuel-tax";

/** Every payment the mileage fee's rule made in a played stretch: what households paid the law's payee and what came back in fuel tax. */
function mileageMoney(factor: number, days: number) {
  held.factors = { "traffic.vehicle-miles": factor };
  const opening = gameStartDate();
  const world = buildBenchWorld(seed, opening, {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(world.core);
  for (const level of lawChain(api).levels)
    enactLaw(api, {
      jurisdiction: level.jurisdiction,
      level: level.level,
      series: MILEAGE,
      value: 1,
      effectiveDate: api.state.date,
      measureId: `test:web-miles:${MILEAGE}:1`,
      citation: "Controlled law case in a generated stretch.",
    });
  advanceCore(world.core, addDays(makeIsoDate(opening), days));
  let paid = 0,
    refunded = 0,
    posts = 0;
  for (const r of world.core.cashJournal.detailedReceipts.values()) {
    if (
      !r.sourceRef.id.startsWith("price:") ||
      !r.sourceRef.id.includes(":vehicle-miles:")
    )
      continue;
    posts += 1;
    for (const p of r.postings) {
      // The household's account is the one money leaves for the payee and enters from the outside.
      if (r.sourceRef.id.endsWith(":refund"))
        refunded += Math.abs(p.deltaMinor);
      else paid += Math.abs(p.deltaMinor);
    }
  }
  return { paid, refunded, posts };
}

const prices = (core: CoreState) =>
  new Map(
    [...core.finance.businesses].map(([id, book]) => [
      id,
      book.price / book.anchorPrice,
    ]),
  );

describe(`prices and place services take the web's factor (${place.name}, seed ${seed})`, () => {
  it("a business's own price follows the factor on household prices", () => {
    const a = play({}, 120, prices);
    const b = play({ "household.prices": 1.05 }, 120, prices);
    const ratios = [...b]
      .filter(([id]) => a.has(id))
      .map(([id, price]) => price / a.get(id)!);
    expect(ratios.length).toBeGreaterThan(0);
    const reviewed = ratios.filter((r) => Math.abs(r - 1) > 1e-9);
    expect(reviewed.length).toBeGreaterThan(0);
    // Demand reacts to the dearer price, so a ratio is near 1.05, not exactly.
    for (const r of reviewed) expect(r).toBeGreaterThan(1);
  }, 600_000);

  it("electricity bills rise with the factor, differently by income fifth, charged once with each statute's own share", () => {
    // Pinned (Nov 15, 2026): this test read itemized journal receipts, which
    // the journal keeps only for the player's household, and drew places until
    // one billed two households differently. At Wilton, Maine the player's
    // household's payer holds no cash, so its bills post nothing and its only
    // electricity receipt was retail electric choice's refund; at a dearer
    // price both statutes in force charged the whole web factor and nothing
    // was posted (laws thread, prices-web-dearer-electricity-bills-none-ashton).
    // It now reads the bills the price engine asks of every household at one
    // place where a clean-electricity standard and retail choice are both in
    // force, so the one figure and each statute's share are both seen.
    const at = { key: WILTON.key };
    const seen = (factors: Record<string, number>) => {
      asked.bills.clear();
      play(factors, 75, () => null, at, WILTON.seed);
      return new Map(asked.bills);
    };
    const total = (m: Map<string, number>, part: string) =>
      [...m].reduce((n, [id, x]) => (id.endsWith(part) ? n + x : n), 0);
    const byCause = (m: Map<string, number>, cause: string, part: string) =>
      [...m].filter(([id]) => id.includes(cause) && id.endsWith(part));
    const base = seen({});
    const dearer = seen({ "energy.electricity-price": 1.1 });
    // Both statutes bill at the base price: the standard charges, choice refunds.
    expect(byCause(base, STANDARD, ":pay").length).toBeGreaterThan(0);
    expect(byCause(base, CHOICE, ":refund").length).toBeGreaterThan(0);
    // Dearer: the web's figure carries the standard's effect, so the standard
    // asks nothing of its own, the web's change is asked once, and retail
    // choice still cuts its own share of the dearer figure.
    expect(byCause(dearer, STANDARD, ":pay")).toEqual([]);
    expect(byCause(dearer, CHOICE, ":pay")).toEqual([]);
    expect(byCause(dearer, CHOICE, ":refund").length).toBeGreaterThan(0);
    const web = byCause(dearer, "web:energy.electricity-price", ":pay");
    expect(web.length).toBeGreaterThan(0);
    // Higher by income fifth: the factor differs by fifth, so the asks differ.
    expect(new Set(web.map(([, x]) => x)).size).toBeGreaterThan(1);
    expect(total(dearer, ":pay") - total(dearer, ":refund")).toBeGreaterThan(
      total(base, ":pay") - total(base, ":refund"),
    );
  }, 600_000);

  it("riders take trips in proportion to the ridership factor", () => {
    expect(play({}, 75, (c) => webReceipts(c, "transit-fare"))).toHaveLength(0);
    const receipts = play({ "transit.ridership": 1.4 }, 75, (c) =>
      webReceipts(c, "transit-fare"),
    );
    expect(receipts.length).toBeGreaterThan(0);
  }, 600_000);

  it("a mileage fee is charged on the miles the web says households drive", () => {
    const rule = {
      good: "vehicle-miles",
      kind: "per-unit",
      value: 2,
      replacesFuelTax: true,
    } as const;
    const flat = monthlyChange(rule, 1, 2, worldGoods(seed).goods, {});
    const more = monthlyChange(rule, 1, 2, worldGoods(seed).goods, {
      miles: 1.1,
    });
    expect(more.payMinor).toBeCloseTo(flat.payMinor * 1.1, 6);
    expect(more.refundMinor).toBeCloseTo(flat.refundMinor * 1.1, 6);
    // In a played stretch the same households are billed in proportion.
    const base = mileageMoney(1, 75);
    const wider = mileageMoney(1.1, 75);
    expect(base.posts, "the fee billed nobody").toBeGreaterThan(0);
    expect(wider.paid / base.paid).toBeGreaterThan(1.05);
    expect(wider.paid / base.paid).toBeLessThan(1.15);
  }, 600_000);

  it("a fare-free price takes the extra trips for free and refunds only the old trips", () => {
    const rule = { good: "transit-fare", kind: "price", value: 0 } as const;
    const whole = monthlyChange(rule, 1, 2, worldGoods(seed).goods, {});
    const more = monthlyChange(rule, 1, 2, worldGoods(seed).goods, {
      trips: 1.4,
    });
    expect(more.refundMinor).toBe(whole.refundMinor);
    expect(more.payMinor).toBe(0);
    const offer = { good: "broadband", kind: "offer", value: 1000 } as const;
    const flat = monthlyChange(offer, 1, 2, worldGoods(seed).goods, {});
    const wider = monthlyChange(offer, 1, 2, worldGoods(seed).goods, {
      subscribe: 1.05,
    });
    expect(wider.payMinor).toBeGreaterThan(flat.payMinor);
    expect(wider.refundMinor).toBe(flat.refundMinor);
  });
});
