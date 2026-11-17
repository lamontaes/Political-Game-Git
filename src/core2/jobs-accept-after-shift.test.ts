/**
 * A player who holds a job, has worked today's shift and accepts a better
 * offer leaves the old job when that shift is over (its pay stands) and
 * takes the new one; the accept never throws "A job ends before its day's
 * work". In the played world, in places drawn from all 56; seed from
 * GOLDEN_PATH_SEED (random when unset), printed.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  acceptJobOffer,
  applyForOpening,
  fillableOpenings,
  jobOffersFor,
  workedToday,
} from "./modules/jobs";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

describe(
  "accepting a job offer after the day's shift",
  { timeout: 900_000 },
  () => {
    it("ends the old job after today's shift and starts the new one", () => {
      const tried: string[] = [];
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const place = drawPlace(
          attempt ? `${seed}:${attempt}` : seed,
          "accept-after-shift",
        );
        const { core } = buildBenchWorld(place.seed, gameStartDate(), {
          twoLevel: true,
          placeKey: place.key,
        });
        const api = coreAPI(core);
        const playerId = core.playerId!;
        const before = core.people.get(playerId)!.jobId;
        if (!before) {
          tried.push(`${place.name}: no job`);
          continue;
        }
        for (let weeks = 0; weeks < 52; weeks += 8) {
          for (const position of fillableOpenings(api))
            applyForOpening(api, position.id);
          advanceCore(core, addDays(makeIsoDate(core.date), 8 * 7));
          if (jobOffersFor(api, playerId).length) break;
        }
        const offer = jobOffersFor(api, playerId)[0];
        if (!offer || !core.people.get(playerId)!.jobId) {
          tried.push(`${place.name} (${place.key}): no offer while employed`);
          continue;
        }
        // Play on to a day the player has worked their shift.
        for (
          let day = 0;
          day < 10 && !workedToday(core, core.people.get(playerId)!);
          day++
        )
          advanceCore(core, addDays(makeIsoDate(core.date), 1));
        const held = core.people.get(playerId)!.jobId!;
        if (!workedToday(core, core.people.get(playerId)!)) {
          tried.push(`${place.name}: no shift in ten days`);
          continue;
        }
        expect(
          acceptJobOffer(api, offer.id),
          `${place.name} (${place.key}), seed ${seed}`,
        ).toBe(true);
        expect(core.jobs.get(held)!.endsAt).toBe(
          addDays(makeIsoDate(core.date), 1),
        );
        expect(
          core.jobs.get(core.people.get(playerId)!.jobId!)!.organizationId,
        ).toBe(offer.organizationId);
        console.log(
          `accept-after-shift: ${place.name} (${place.key}), seed ${seed}; ${held} ended after today's shift, new job ${core.people.get(playerId)!.jobId}`,
        );
        return;
      }
      throw new Error(
        `no drawn town gave an employed player an offer (seed ${seed}): ${tried.join("; ")}`,
      );
    });
  },
);
