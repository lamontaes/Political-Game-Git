/**
 * Dev mode's Businesses: cutting a business's outside orders goes through the engine's own output
 * limit, closing it goes through its owner's own closing, each writes a dev-mode mark, and "What came
 * of it" lists everyone the closing let go, the record they heard and where they are now, with the
 * town's months beside it. Pinned: Thief River Falls, Minnesota (place key 2764570, seed
 * ind-2764570), the wholesale town whose closings the industry trace found unheard.
 */
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../world";
import { gameStartDate } from "../../core2/game-start";
import { BenchPlayer } from "../player";
import { DevMode } from "../dev-mode";
import { addDays, makeIsoDate } from "../../core2/kernel/dates";
import view, {
  DEV_CLOSE_REASON,
  closeBusiness,
  type shrinkBusiness,
  type townBusinesses,
  type whatCameOf,
} from "./dev-closing";

const PLACE = "2764570";
const SEED = "ind-2764570";

describe("dev Businesses: Thief River Falls, Minnesota (seed ind-2764570)", () => {
  it(
    "cuts a plant's orders, closes it through its owner, and lists who it let go and where they are",
    { timeout: 120_000 },
    () => {
      const world = buildBenchWorld(SEED, gameStartDate(), {
        twoLevel: true,
        placeKey: PLACE,
      });
      const dev = new DevMode(
        world.core,
        world.director,
        new BenchPlayer(world.core, world.director),
        world.placeId,
      );
      // Every call goes through the view's own routes, as the page's controls send them.
      const call = <T>(
        key: string,
        query: Record<string, string>,
        input = {},
      ) =>
        view.routes![key]!({
          mode: dev,
          q: (name) => query[name] ?? "",
          input,
        }) as T;
      const businesses = call<ReturnType<typeof townBusinesses>>(
        "GET businesses",
        {},
      );
      const plant = businesses.find((row) => row.sellsOutside)!;
      expect(plant, "a business that sells outside the town").toBeDefined();
      const staff = plant.staff;
      expect(staff).toBeGreaterThan(0);

      const shrink = call<ReturnType<typeof shrinkBusiness>>(
        "POST shrink-business",
        {},
        {
          organizationId: plant.organizationId,
          keep: 0.25,
        },
      );
      expect(shrink.flows).toBeGreaterThan(0);
      expect(world.core.eventIds.has(shrink.mark.id)).toBe(true);

      dev.advance(addDays(makeIsoDate(world.core.date), 1));
      const closed = call<ReturnType<typeof closeBusiness>>(
        "POST close-business",
        {},
        {
          organizationId: plant.organizationId,
        },
      );
      expect(world.core.eventIds.has(closed.closure)).toBe(true);
      expect(world.core.eventIds.has(closed.mark.id)).toBe(true);
      dev.advance(addDays(makeIsoDate(world.core.date), 1));

      const came = call<ReturnType<typeof whatCameOf>>("GET closing", {
        organizationId: plant.organizationId,
      });
      expect(came.closedAt).toBe(
        world.core.finance.closures.get(plant.organizationId)!.date,
      );
      expect(came.closingReason).toBe(DEV_CLOSE_REASON);
      expect(came.closureId).toBe(closed.closure);
      // Everyone on its staff the day it closed is listed, in heads, each with the record they heard
      // and where they are now.
      const heads = came.letGo.reduce((n, row) => n + row.heads, 0);
      expect(heads).toBe(staff);
      expect(came.totals["lost:closure"]).toBe(staff);
      expect(came.letGo.every((row) => row.eventId === closed.closure)).toBe(
        true,
      );
      expect(came.totals["now:looking"]).toBeGreaterThan(0);
      expect(came.town.length).toBeGreaterThan(0);
      expect(() => closeBusiness(dev, plant.organizationId)).toThrow(
        "It is already closed.",
      );
    },
  );
});
