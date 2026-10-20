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
import { adAudience, adTimeForSale, buyAdTime } from "./modules/campaigns";
import { countedFollowers, followersOf, outletsHere } from "./modules/press";

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

  // The counted population is most of a town: an ad reaches a counted group by
  // the same rule as a full person, times its count (one function, two tiers).
  it("reaches the outlet's counted followers as well as its full ones, in one proportion", () => {
    const outlets = outletsHere(api).filter((o) => o.tier !== "national");
    // The outlet an ad is bought from has full followers and counted ones.
    const seller = [...outlets].sort(
      (a, b) =>
        followersOf(api, b.id).length - followersOf(api, a.id).length ||
        a.id.localeCompare(b.id),
    )[0]!;
    const full = followersOf(api, seller.id).length;
    const counted = countedFollowers(api, seller.id);
    expect(full, `${place.name}`).toBeGreaterThan(0);
    expect(
      counted,
      `${place.name}: counted followers of ${seller.id}`,
    ).toBeGreaterThan(0);
    // A buy that covers every follower reaches every follower of both tiers.
    const everyone = adAudience(api, 1e12)!;
    expect(everyone.viewers.length).toBe(full);
    expect(everyone.countedViewers).toBe(counted);
    // A smaller buy reaches the same share of each tier.
    const half = adAudience(api, 1e12)!;
    const small = adAudience(api, 1000)!;
    const share = (n: number, of: number) => (of ? n / of : 0);
    expect(small.viewers.length + small.countedViewers).toBeLessThan(
      half.viewers.length + half.countedViewers,
    );
    expect(
      Math.abs(
        share(small.viewers.length, full) -
          share(small.countedViewers, counted),
      ),
    ).toBeLessThan(0.1);
  });
});
