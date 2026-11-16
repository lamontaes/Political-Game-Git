/**
 * A town's own unemployment moves its people's leaving through the outcome web
 * (unemployment-to-out-migration, Foote, Grosz and Stevens 2019): each point
 * above 4% adds the link's size to the web's factor on out-migration, which
 * full people (moves.ts) and counted households (counted-moves.ts) both
 * multiply their leaving by (moves-web.test.ts). Pinned: Thief River Falls,
 * Minnesota (place key 2764570, seed ind-2764570), the town whose wholesaler
 * closes in its first year.
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
import { WEB_LINKS } from "./outcome-web-model";

const PLACE = "2764570";
const SEED = "ind-2764570";

describe("unemployment-to-out-migration: Thief River Falls, Minnesota (seed ind-2764570)", () => {
  it(
    "the town's own unemployment above 4% raises the web's factor on leaving by the link's size a point",
    { timeout: 160_000 },
    () => {
      const world = buildBenchWorld(SEED, gameStartDate(), {
        twoLevel: true,
        placeKey: PLACE,
      });
      advanceCore(world.core, addDays(makeIsoDate(world.core.date), 35));
      const api = coreAPI(world.core);
      const town = lawChain(api).townPlaceId;
      const link = WEB_LINKS.find(
        (row) => row.key === "unemployment-to-out-migration",
      )!;
      expect(link.size).toBe(0.025);
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
      expect(part!.effect).toBeCloseTo(
        link.size! * (unemployment!.value - 4),
        6,
      );
      expect(reach.factor).toBeGreaterThan(1);
    },
  );
});
