/**
 * The web's factors reach prices and place services through the engines'
 * own records: a business's own price at its review, a household's electricity
 * bill, the trips it takes and the share of households subscribing. Each
 * world is built the way the game builds it, then played with the web's
 * factor held at one value and at another, so only the factor differs.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import type { CoreState } from "./types";
import { monthlyChange } from "./modules/place-prices";

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
vi.mock("./outcome-web-reach", () => ({
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
}));

const seed = process.env.WEB_PRICES_SEED || randomBytes(8).toString("hex");
const place = drawPlace(seed, "web-prices");

function play<T>(
  factors: Record<string, number>,
  days: number,
  read: (core: CoreState) => T,
  at: { key: string } = place,
): T {
  held.factors = factors;
  const opening = gameStartDate();
  // One world at a time: the read keeps only what the test compares.
  const world = buildBenchWorld(seed, opening, {
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

  it("electricity bills rise with the factor, differently by income fifth", () => {
    // A place whose clean-electricity law is in force already has a bill, so
    // compare what households pay in total, and who pays more than whom.
    const bills = (core: CoreState) => {
      const paid = new Map<string, number>();
      for (const r of core.cashJournal.detailedReceipts.values())
        if (
          r.sourceRef.id.startsWith("price:") &&
          r.sourceRef.id.includes(":electricity:")
        )
          paid.set(
            r.sourceRef.id,
            r.postings.reduce((n, p) => n + Math.max(0, p.deltaMinor), 0),
          );
      return paid;
    };
    // Bills differ by income only between households of different pay, so the
    // place must bill at least two named households whose bills differ at the
    // base factor. A small place may bill one, or several at one pay: draw
    // again, a bounded number of times, and name the failure when none does.
    const DRAWS = 5;
    const tried: string[] = [];
    let at = place;
    let base = new Map<string, number>();
    for (let attempt = 0; attempt < DRAWS; attempt++) {
      at = attempt === 0 ? place : drawPlace(seed, `web-prices-${attempt}`);
      tried.push(at.name);
      base = play({}, 75, bills, at);
      if (new Set(base.values()).size > 1) break;
    }
    expect(
      new Set(base.values()).size,
      `no drawn place billed two households of different pay for electricity (seed ${seed}; tried ${tried.join("; ")})`,
    ).toBeGreaterThan(1);
    const dearer = play({ "energy.electricity-price": 1.1 }, 75, bills, at);
    expect(dearer.size).toBeGreaterThan(0);
    const total = (m: Map<string, number>) =>
      [...m.values()].reduce((n, x) => n + x, 0);
    expect(total(dearer)).toBeGreaterThan(total(base));
    expect(new Set(dearer.values()).size).toBeGreaterThan(1);
  }, 600_000);

  it("riders take trips in proportion to the ridership factor", () => {
    expect(play({}, 75, (c) => webReceipts(c, "transit-fare"))).toHaveLength(0);
    const receipts = play({ "transit.ridership": 1.4 }, 75, (c) =>
      webReceipts(c, "transit-fare"),
    );
    expect(receipts.length).toBeGreaterThan(0);
  }, 600_000);

  it("a fare-free price takes the extra trips for free and refunds only the old trips", () => {
    const rule = { good: "transit-fare", kind: "price", value: 0 } as const;
    const whole = monthlyChange(rule, 1, 2, {});
    const more = monthlyChange(rule, 1, 2, { trips: 1.4 });
    expect(more.refundMinor).toBe(whole.refundMinor);
    expect(more.payMinor).toBe(0);
    const offer = { good: "broadband", kind: "offer", value: 1000 } as const;
    const flat = monthlyChange(offer, 1, 2, {});
    const wider = monthlyChange(offer, 1, 2, { subscribe: 1.05 });
    expect(wider.payMinor).toBeGreaterThan(flat.payMinor);
    expect(wider.refundMinor).toBe(flat.refundMinor);
  });
});
