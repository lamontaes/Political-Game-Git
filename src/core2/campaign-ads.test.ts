/**
 * Ad time in the world the owner plays: the bench world, a place and seed
 * nobody chose, every module installed. A buyer pays the town's outlet for
 * ad time on the journal, and the ad reaches that outlet's followers.
 * Without a press there is no outlet, so nothing is bought and no one is
 * reached.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { coreAPI } from "./state";
import { adTimeForSale, buyAdTime } from "./modules/campaigns";
import { followersOf, outletsHere } from "./modules/press";
import { drawPlace } from "../../scripts/core2-year/place";

const seed = process.env.CAMPAIGN_ADS_SEED || randomBytes(8).toString("hex");
const place = drawPlace(seed, "campaign-ads");
console.log(`campaign-ads: ${place.name} (${place.key}), seed ${seed}`);
const world = buildBenchWorld(seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const core = world.core;
const api = coreAPI(core);
const cash = (id: string) => core.organizations.get(id)?.liquidMinor ?? 0;

describe(`ad time (${place.name}, seed ${seed})`, () => {
  it("is bought from the town's outlet and reaches its followers", () => {
    expect(adTimeForSale(api)).toBe(true);
    const outlets = outletsHere(api).filter((o) => o.tier !== "national");
    // A place whose press has no local outlet has no ad time to sell.
    if (!outlets.length) return;
    const buyer = [...core.people.values()]
      .filter((p) => p.alive && p.tier !== "husk" && p.liquidMinor > 50_000)
      .sort(
        (a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id),
      )[0];
    if (!buyer) return;
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
    // The seller is the outlet with the most followers; its books took the payment.
    const seller = outlets
      .map((o) => ({ o, n: followersOf(api, o.id).length }))
      .sort((a, b) => b.n - a.n || a.o.id.localeCompare(b.o.id))[0]!.o;
    expect(cash(seller.organizationId)).toBe(
      before[seller.organizationId]! + 50_000,
    );
    const followers = new Set(followersOf(api, seller.id));
    expect(reached.length).toBeGreaterThan(0);
    for (const p of reached) expect(followers.has(p.id)).toBe(true);
  });
});
