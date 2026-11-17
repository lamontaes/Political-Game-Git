/**
 * The person the player controls is always on the rolls (owner, Nov 16: "Keep
 * it for townspeople; you are always registered"). In played worlds in drawn
 * places from all 56, seed printed (REGISTERED_SEED fixes it): the player's
 * polling status is "on" on a day of the first year, including with their own
 * record staged as never registered (an edge case, named as staged); a
 * townsperson staged the same way is not on the rolls.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { drawPlace } from "../../scripts/core2-year/place";
import { coreAPI } from "./state";
import { setBookkeeping } from "./bookkeeping";
import { VOTING_MODULE_ID, pollingStatus } from "./modules/voting";

const seed = process.env.REGISTERED_SEED || randomBytes(8).toString("hex");

describe(`The player is always registered (seed ${seed})`, () => {
  it(
    "is on the rolls even when their record says never registered",
    { timeout: 300_000 },
    () => {
      setBookkeeping(false);
      for (let at = 0; at < 3; at += 1) {
        const place = drawPlace(
          at ? `${seed}:${at}` : seed,
          "player-registered",
        );
        const where = `${place.name} (${place.key}), seed ${place.seed}`;
        const { core } = buildBenchWorld(place.seed, gameStartDate(), {
          twoLevel: true,
          placeKey: place.key,
        });
        const api = coreAPI(core);
        const playerId = core.playerId!;
        const rows = api.moduleState(VOTING_MODULE_ID).table("registrations");
        // Staged: the player's own record says never registered, at an old address.
        const own = rows.get(`registration:${playerId}`) as
          Record<string, unknown> | undefined;
        rows.put({
          ...(own ?? { id: `registration:${playerId}`, personId: playerId }),
          registered: false,
          willing: false,
          addressKey: "elsewhere",
          lastAddress: "elsewhere",
        } as never);
        expect(pollingStatus(api, playerId, core.date), where).toBe("on");
      }
    },
  );
});
