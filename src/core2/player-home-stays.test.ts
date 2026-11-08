/**
 * The player's household moves only by their choice (owner's playtest, Nov 8:
 * "the residency refusal came from a move"). In a played year at three places
 * drawn from all 56, the player's address never leaves the town, month by
 * month, through the moves engine, eviction rehousing and partnering. Set
 * GOLDEN_PATH_SEED to reproduce a run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { ELECTIONS_MODULE_ID } from "./modules/elections";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it(`the player's address stays in town for a year in three drawn places (seed ${seed})`, () => {
  setBookkeeping(false);
  for (let draw = 0; draw < 3; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "player-home-stays");
    const where = `${place.name} (${place.key}), run seed ${seed} draw ${draw}, world seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const town = (
      api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("town")
        .get("town") as unknown as {
        townPlaceId: string;
      }
    ).townPlaceId;
    const player = core.playerId!;
    const home = core.people.get(player)!.householdId;
    for (let month = 1; month <= 12; month += 1) {
      advanceCore(core, addDays(makeIsoDate(core.date), 30));
      const now = core.people.get(player)!;
      expect(now.placeId, `${where}, month ${month}`).toBe(town);
      expect(now.householdId, `${where}, month ${month}: household`).toBe(home);
    }
  }
}, 1_500_000);
