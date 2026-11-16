/**
 * A town's unemployment moves its people's leaving through the outcome web
 * (unemployment-to-out-migration, Blanchard and Katz 1992): the town's rate is
 * read against the nation's same month plus the gap the town opened with, and
 * each point beyond it raises leaving by exp(0.043) on the log scale. Named
 * people (moves.ts) and counted households (counted-moves.ts) both multiply
 * their leaving by the web's factor (moves-web.test.ts). The gap a town opened
 * with is already in its own ACS leaving rates, and a change the whole nation
 * shares gives nobody a better place to go, so neither moves anyone.
 * Pinned: Thief River Falls, Minnesota (place key 2764570, seed ind-2764570),
 * the town whose wholesaler closes in its first year.
 */
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { lawChain } from "./modules/laws";
import { placeOutcome } from "./modules/outcome-web";
import { webReach } from "./outcome-web-reach";
import { linkEffect, nationGapBaseline, WEB_LINKS } from "./outcome-web-model";

const PLACE = "2764570";
const SEED = "ind-2764570";
const link = WEB_LINKS.find(
  (row) => row.key === "unemployment-to-out-migration",
)!;

describe("unemployment-to-out-migration", () => {
  it("reads the town against the nation, beyond the gap it opened with", () => {
    expect(link.size).toBe(0.043);
    expect(link.shape.kind).toBe("exponential");
    expect(link.baselineFrom).toBe("nation-gap-at-opening");
    // A town that opened at 6% with the nation at 4%.
    const townAtOpening = 6;
    const nationAtOpening = 4;
    // The nation's rate rises five points and the town's rises with it:
    // nobody has a better place to go, so nobody extra leaves.
    const shared = nationGapBaseline(9, nationAtOpening, townAtOpening);
    expect(linkEffect(link, link.size!, 11, shared)).toBe(0);
    // The town keeps the gap it opened with while the nation holds: no drain.
    const standing = nationGapBaseline(4, nationAtOpening, townAtOpening);
    expect(linkEffect(link, link.size!, 6, standing)).toBe(0);
    // The town's own closing takes it ten points past the nation: leaving
    // rises by exp(0.43), about half again.
    const closing = linkEffect(link, link.size!, 16, standing);
    expect(closing).toBeCloseTo(Math.expm1(0.43), 10);
  });

  it(
    "Thief River Falls, Minnesota (seed ind-2764570): the web runs the link on the town's month",
    { timeout: 160_000 },
    () => {
      const world = buildBenchWorld(SEED, gameStartDate(), {
        twoLevel: true,
        placeKey: PLACE,
      });
      advanceCore(world.core, addDays(makeIsoDate(world.core.date), 35));
      const api = coreAPI(world.core);
      const town = lawChain(api).townPlaceId;
      const unemployment = placeOutcome(api, town, "labor.unemployment-pct");
      expect(
        unemployment,
        "the web reads the town's unemployment",
      ).toBeDefined();
      const reach = webReach(api, town, "population.out-migration");
      const part = reach.parts.find(
        (row) => row.link === "unemployment-to-out-migration",
      );
      expect(part, `the link runs on ${reach.recordId}`).toBeDefined();
      // One month in, the town sits near the gap it opened with: the factor is
      // near one, not the standing drain of reading the whole gap.
      expect(Math.abs(part!.effect)).toBeLessThan(Math.expm1(link.size! * 3));
    },
  );
});
