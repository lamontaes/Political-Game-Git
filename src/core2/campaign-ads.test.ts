/**
 * Ad time in the world the owner plays: the bench world, a place and seed
 * nobody chose, every module installed. A buyer pays the town's outlet for
 * ad time on the journal, and the ad reaches that outlet's followers.
 * Without a press there is no outlet, so nothing is bought and no one is
 * reached.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { worldWith, type PlayedWorld } from "./tooling/world-with";
import { coreAPI } from "./state";
import { adTimeForSale, buyAdTime } from "./modules/campaigns";
import { followersOf, outletsHere } from "./modules/press";

const seed = process.env.CAMPAIGN_ADS_SEED || randomBytes(8).toString("hex");
// A place whose press has a local outlet and a buyer with money to spend.
const buyerIn = (core: PlayedWorld["core"]) =>
  [...core.people.values()]
    .filter((p) => p.alive && p.tier !== "husk" && p.liquidMinor > 50_000)
    .sort(
      (a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id),
    )[0];
const { world, place } = worldWith(
  seed,
  "campaign-ads",
  (w) =>
    outletsHere(coreAPI(w.core)).some((o) => o.tier !== "national") &&
    !!buyerIn(w.core),
);
console.log(`campaign-ads: ${place.name} (${place.key}), seed ${seed}`);
const core = world.core;
const api = coreAPI(core);
const cash = (id: string) => core.organizations.get(id)?.liquidMinor ?? 0;

describe(`ad time (${place.name}, seed ${seed})`, () => {
  it("is bought from the town's outlet and reaches its followers", () => {
    expect(adTimeForSale(api)).toBe(true);
    const outlets = outletsHere(api).filter((o) => o.tier !== "national");
    const buyer = buyerIn(core)!;
    const buyerBefore = buyer.liquidMinor;
    const before = Object.fromEntries(
      outlets.map((o) => [o.organizationId, cash(o.organizationId)]),
    );
    const reached = buyAdTime(api, {
      buyerId: buyer.id,
      amountMinor: 50_000,
      recordId: `ad-test:${buyer.id}`,
      citation: "A test buyer's ad time",
    });
    expect(core.people.get(buyer.id)!.liquidMinor).toBe(buyerBefore - 50_000);
    // The seller is a local outlet with the most followers; its books took the payment.
    const most = Math.max(...outlets.map((o) => followersOf(api, o.id).length));
    const paid = outlets.filter(
      (o) => cash(o.organizationId) === before[o.organizationId]! + 50_000,
    );
    expect(paid.length, `${place.name}: one outlet was paid`).toBe(1);
    const seller = paid[0]!;
    expect(followersOf(api, seller.id).length).toBe(most);
    const followers = new Set(followersOf(api, seller.id));
    expect(reached.length).toBeGreaterThan(0);
    for (const p of reached) expect(followers.has(p.id)).toBe(true);
  });
});
