import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { outletsHere } from "./modules/press";
import { coreAPI } from "./state";

// A local outlet opens with no cash, so before it held a small business's cash
// buffer the gap between a payday and its first sales closed it: a town's
// paper or station shut within weeks and its reporters were laid off.
// Pinned to a place where that happened (the draw of seed pq3 for "pclose":
// a station closed on day 105), so the test fails without the buffer.
const PINNED: readonly (readonly [string, string])[] = [["pq3", "pclose"]];

describe("a local outlet's working capital", () => {
  for (const [seed, purpose] of PINNED)
    it(`keeps its staff through the first months (seed ${seed}, draw ${purpose})`, () => {
      setBookkeeping(false);
      const place = drawPlace(seed, purpose);
      const where = `${place.name} (${place.key}), seed ${seed}`;
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
      const local = outletsHere(api).filter((o) => o.tier !== "national");
      expect(local.length, where).toBeGreaterThan(0);
      advanceCore(core, addDays(makeIsoDate(core.date), 150));
      const closed = (
        api.moduleState("business").table("closures").rows() as unknown as {
          organizationId: string;
          date: string;
          cause: string;
        }[]
      ).filter((row) => row.organizationId.startsWith("organization:press:"));
      expect(
        closed.map((row) => `${row.organizationId} ${row.date} ${row.cause}`),
        where,
      ).toEqual([]);
    }, 1_800_000);
});
