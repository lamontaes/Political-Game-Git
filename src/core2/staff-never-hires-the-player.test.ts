/**
 * The person the player controls is never put on an official's staff by the
 * engine's choice (owner, Oct 14: "No engine accepts a job ... for the
 * controlled person; the engine offers, the player decides"). In the played
 * world, in drawn places from all 56 with the seed printed (GOLDEN_PATH_SEED
 * fixes it): after a year no staff job belongs to the player, and the player
 * is in no official's candidate list.
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
import { staffCandidates } from "./modules/staff";
import { townSeats } from "./modules/offices";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

describe("staff hiring leaves the player's work to the player", () => {
  it(
    "no official's candidate list or staff holds the player",
    {
      timeout: 900_000,
    },
    () => {
      setBookkeeping(false);
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const place = drawPlace(
          attempt ? `${seed}:${attempt}` : seed,
          "player-job-offers",
        );
        console.log(
          `staff-never-hires-player: place ${place.key}, seed ${seed}`,
        );
        const { core } = buildBenchWorld(place.seed, gameStartDate(), {
          twoLevel: true,
          placeKey: place.key,
        });
        const api = coreAPI(core);
        const playerId = core.playerId!;
        const where = `${place.key}, seed ${seed}`;
        advanceCore(core, addDays(makeIsoDate(core.date), 12 * 7));
        for (const seat of townSeats(api)) {
          const officialId = seat.holder?.personId;
          if (!officialId) continue;
          const ids = staffCandidates(api, officialId).map((c) => c.personId);
          expect(ids, `candidates of ${officialId} (${where})`).not.toContain(
            playerId,
          );
        }
        const job = core.people.get(playerId)!.jobId ?? "";
        expect(job.startsWith("job:public:staff"), `${job} (${where})`).toBe(
          false,
        );
      }
    },
  );
});
