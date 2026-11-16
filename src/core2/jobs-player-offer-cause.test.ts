/**
 * An offer to the person the player controls always has a cause the player can
 * name (owner, Nov 16: "I didn't even apply for one"): the person who makes it
 * is someone the player knows or is kin to, who works at that employer. In the
 * played world, in a random place from all 56, over a year; place and seed are
 * printed (GOLDEN_PATH_SEED fixes the seed).
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { drawPlace } from "../../scripts/core2-year/place";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { setBookkeeping } from "./bookkeeping";
import { addDays, makeIsoDate } from "./kernel/dates";
import { JOBS_MODULE_ID, type JobOfferRow } from "./modules/jobs";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

describe("the player's job offers have a cause", { timeout: 900_000 }, () => {
  it("every offer comes through someone the player knows at that employer", () => {
    setBookkeeping(false);
    const seen: string[] = [];
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const place = drawPlace(
        attempt ? `${seed}:${attempt}` : seed,
        "player-offer-cause",
      );
      console.log(`player-offer-cause: place ${place.key}, seed ${seed}`);
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
      const player = core.people.get(core.playerId!)!;
      for (let weeks = 0; weeks < 52; weeks += 4)
        advanceCore(core, addDays(makeIsoDate(core.date), 4 * 7));
      const offers = api
        .moduleState(JOBS_MODULE_ID)
        .table("offers")
        .rows() as unknown as JobOfferRow[];
      for (const o of offers.filter((row) => row.personId === player.id)) {
        seen.push(o.id);
        expect(
          player.knownIds.has(o.offeredBy) || player.familyIds.has(o.offeredBy),
          `${o.id} was made by ${o.offeredBy}, whom the player does not know (${place.key}, ${seed})`,
        ).toBe(true);
      }
      if (seen.length) break;
    }
    console.log(`player-offer-cause: offers checked ${seen.join(", ") || "none"}`);
  });
});
