/**
 * The person the player controls is never hired by the engine's own choice
 * (owner, Oct 14: the controlled person is never auto-answered). In the
 * played world, in a random place from all 56: an employer that picks the
 * player makes an offer and holds the position; the player's acceptance is
 * what hires them, and nothing else does. Seed and place from
 * GOLDEN_PATH_SEED (random when unset), printed.
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
import {
  acceptJobOffer,
  jobOffersFor,
  JOBS_MODULE_ID,
  type JobOfferRow,
} from "./modules/jobs";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

describe("the player's job offers", { timeout: 900_000 }, () => {
  it("an employer offers the player a job and only the player's acceptance hires them", () => {
    setBookkeeping(false);
    // Whether an employer picks the player in eight weeks is the town's to
    // decide: draw towns until one does.
    const tried: string[] = [];
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const place = drawPlace(
        attempt ? `${seed}:${attempt}` : seed,
        "player-job-offers",
      );
      console.log(`player-job-offers: place ${place.key}, seed ${seed}`);
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
      const playerId = core.playerId!;
      const before = core.people.get(playerId)!.jobId;
      // Eight weeks at a time for up to a year, until an employer picks them
      // (a town's openings and the player's fit decide when, if at all).
      for (let weeks = 0; weeks < 52; weeks += 8) {
        advanceCore(core, addDays(makeIsoDate(core.date), 8 * 7));
        if (jobOffersFor(api, playerId).length) break;
      }

      const jobs = api.moduleState(JOBS_MODULE_ID);
      const offers = jobs.table("offers").rows() as unknown as JobOfferRow[];
      const hires = (
        jobs.table("changes").rows() as unknown as {
          personId: string;
          kind: string;
          jobId: string;
        }[]
      ).filter((row) => row.personId === playerId && row.kind === "hire");
      // Nothing answered for the player: no hire, and the job they began with is theirs still.
      expect(hires).toEqual([]);
      expect(core.people.get(playerId)!.jobId).toBe(before);
      console.log(
        `player-job-offers: ${offers.length} offer(s): ${offers.map((row) => `${row.id} ${row.status}`).join(", ")}`,
      );
      const open = jobOffersFor(api, playerId);
      if (!open.length) {
        tried.push(`${place.name} (${place.key})`);
        continue;
      }
      // Each pending offer holds its position for the player alone.
      for (const row of open)
        expect(
          (
            jobs.table("positions").get(row.positionId) as {
              offeredTo?: string;
            }
          ).offeredTo,
        ).toBe(playerId);
      const offer = open[0]!;
      expect(acceptJobOffer(api, offer.id)).toBe(true);
      const job = core.jobs.get(core.people.get(playerId)!.jobId!)!;
      expect(job.organizationId).toBe(offer.organizationId);
      expect(job.hourlyMinor).toBe(offer.hourlyMinor);
      expect(
        (jobs.table("offers").get(offer.id) as unknown as JobOfferRow).status,
      ).toBe("accepted");
      console.log(`player-job-offers: accepted ${offer.id} as ${job.id}`);
      return;
    }
    throw new Error(
      `no drawn town made the player a job offer (seed ${seed}): ${tried.join("; ")}`,
    );
  });
});
