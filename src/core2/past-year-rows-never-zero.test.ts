/**
 * A year with no record is not zero ("Unknown facts are not zero"): the
 * registry's year rows for a place hold no rent where no lease was running
 * and no home value where no home was owned. In played worlds in drawn places
 * from all 56, seed printed (PAST_ROWS_SEED fixes it; PAST_ROWS_PLACE_KEY
 * replays one place), no year row of the world's past carries a zero rent or
 * home value. Before, a town's years before its first lease read rent 0.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { coreAPI } from "./state";

const seed = process.env.PAST_ROWS_SEED || randomBytes(8).toString("hex");

describe(`Past year rows hold no zero figure (seed ${seed})`, () => {
  it(
    "has no zero rent or home value in any year row",
    { timeout: 300_000 },
    () => {
      setBookkeeping(false);
      const seen: string[] = [];
      for (let at = 0; at < 3; at += 1) {
        const drawn = drawPlace(at ? `${seed}:${at}` : seed, "past-year-rows");
        const key =
          at === 0 && process.env.PAST_ROWS_PLACE_KEY
            ? process.env.PAST_ROWS_PLACE_KEY
            : drawn.key;
        const where = `${drawn.name} (${key}), seed ${drawn.seed}`;
        const { core } = buildBenchWorld(drawn.seed, gameStartDate(), {
          twoLevel: true,
          placeKey: key,
        });
        const rows = coreAPI(core)
          .moduleState("world-metrics")
          .table("years")
          .rows() as unknown as Record<string, unknown>[];
        for (const row of rows) {
          expect(row.medianRentMinor, `${where}: ${row.id} rent`).not.toBe(0);
          expect(
            row.medianHomeValueMinor,
            `${where}: ${row.id} home value`,
          ).not.toBe(0);
        }
        seen.push(`${where}: ${rows.length} year rows`);
      }
      console.log(seen.join("\n"));
    },
  );
});
